import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { MantenimientoService } from "@/service/api";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal, Field, inputClass, selectClass, filterClass, filterSelectClass } from "@/components/Modal";
import {
  ESTADO_ORDEN, TIPO_MANTENIMIENTO, ESTADO_FALLA, CATEGORIA_TALLER,
  formatDate, formatKm, formatMoney,
} from "@/utils/format";

const vacioOrden = { vehiculo_id: "", tipo_mantenimiento: "preventivo", descripcion: "", proveedor: "", fallas_ids: [] };
const vacioGasto = { concepto: "", categoria: "repuesto", monto: "" };

export function OrdenesTab({
  ordenes, vehiculos, fallas, tiposServicio, loading, puedeTaller, onReload, q, setQ,
}) {
  const [estado, setEstado] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [modalOrden, setModalOrden] = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [form, setForm] = useState(vacioOrden);
  const [gasto, setGasto] = useState(vacioGasto);
  const [cierre, setCierre] = useState({ kilometraje: "", observacion: "", resultados: {}, servicios: [] });
  const [saving, setSaving] = useState(false);

  const selected = ordenes.find((o) => o.id === selectedId) || null;

  const filtered = useMemo(() => {
    return ordenes.filter((o) => {
      if (estado && o.estado !== estado) return false;
      const t = q.toLowerCase();
      if (!t) return true;
      return `${o.vehiculo?.placa || ""} ${o.descripcion} ${o.tipo_mantenimiento}`.toLowerCase().includes(t);
    });
  }, [ordenes, estado, q]);

  const errorApi = (err, fallback) => {
    const data = err?.response?.data;
    const msg = data?.detail || data?.monto?.[0] || data?.concepto?.[0] || fallback;
    toast.error(typeof msg === "string" ? msg : fallback);
  };

  const crear = async () => {
    if (!form.vehiculo_id) {
      toast.error("Elige un vehículo");
      return;
    }
    setSaving(true);
    try {
      await MantenimientoService.create({
        vehiculo_id: form.vehiculo_id,
        tipo_mantenimiento: form.tipo_mantenimiento,
        descripcion: form.descripcion,
        proveedor: form.proveedor,
        fallas_ids: form.tipo_mantenimiento === "correctivo" ? (form.fallas_ids || []) : [],
      });
      toast.success("Orden creada");
      setModalOrden(false);
      setForm(vacioOrden);
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo crear");
    } finally {
      setSaving(false);
    }
  };

  const enviarTaller = async () => {
    try {
      await MantenimientoService.enviarTaller(selected.id);
      toast.success("Vehículo en taller");
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo enviar");
    }
  };

  const agregarGasto = async () => {
    if (!gasto.concepto.trim() || !gasto.monto) {
      toast.error("Indica concepto y monto");
      return;
    }
    try {
      await MantenimientoService.gastar(selected.id, gasto);
      toast.success("Gasto registrado");
      setGasto(vacioGasto);
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo registrar el gasto");
    }
  };

  const quitarGasto = async (g) => {
    try {
      await MantenimientoService.borrarGasto(selected.id, g.id);
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo quitar");
    }
  };

  const abrirCerrar = () => {
    const resultados = {};
    (selected.fallas || []).forEach((f) => { resultados[f.id] = "reparada"; });
    const veh = vehiculos.find((v) => v.id === selected.vehiculo?.id);
    setCierre({
      kilometraje: selected.kilometraje ?? veh?.kilometraje_actual ?? "",
      observacion: "",
      resultados,
      servicios: [],
    });
    setModalCerrar(true);
  };

  const cerrar = async () => {
    setSaving(true);
    try {
      await MantenimientoService.cerrar(selected.id, {
        kilometraje: cierre.kilometraje,
        observacion: cierre.observacion,
        resultados: Object.entries(cierre.resultados).map(([falla, resultado]) => ({ falla, resultado })),
        servicios: cierre.servicios,
      });
      toast.success("Orden cerrada");
      setModalCerrar(false);
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo cerrar");
    } finally {
      setSaving(false);
    }
  };

  const toggleServicio = (id) => {
    setCierre((prev) => ({
      ...prev,
      servicios: prev.servicios.includes(id)
        ? prev.servicios.filter((x) => x !== id)
        : [...prev.servicios, id],
    }));
  };

  const fallasVehiculo = fallas.filter(
    (f) => String(f.vehiculo?.id) === String(form.vehiculo_id) && ["abierta", "no_reparada"].includes(f.estado),
  );

  const columns = [
    { header: "Fecha", render: (o) => formatDate(o.fecha_inicio) },
    { header: "Vehículo", render: (o) => o.vehiculo?.placa || "—" },
    { header: "Tipo", render: (o) => <StatusBadge map={TIPO_MANTENIMIENTO} value={o.tipo_mantenimiento} /> },
    { header: "Estado", render: (o) => <StatusBadge map={ESTADO_ORDEN} value={o.estado} /> },
    { header: "Descripción", accessor: "descripcion" },
    { header: "Costo", render: (o) => formatMoney(o.costo) },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${filterSelectClass} w-40`} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Estado</option>
          <option value="abierta">Abierta</option>
          <option value="en_taller">En taller</option>
          <option value="cerrada">Cerrada</option>
        </select>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-muted" />
          <input className={`${filterClass} w-56 pl-9`} placeholder="Placa u orden" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {puedeTaller && (
          <button type="button" className="btn btn-primary ml-auto" onClick={() => { setForm(vacioOrden); setModalOrden(true); }}>
            <Plus size={16} /> Nueva orden
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-w-0 flex-1">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            onRowClick={(row) => setSelectedId(row.id)}
            selectedId={selected?.id}
            empty="No hay órdenes"
          />
        </div>
        {selected && (
          <DetailPanel
            title={selected.vehiculo?.placa || `Orden #${selected.id}`}
            subtitle={selected.descripcion || selected.tipo_label}
            badge={<StatusBadge map={ESTADO_ORDEN} value={selected.estado} />}
            onClose={() => setSelectedId(null)}
          >
            <Row label="Tipo" value={selected.tipo_label || selected.tipo_mantenimiento} />
            <Row label="Inicio" value={formatDate(selected.fecha_inicio)} />
            <Row label="Fin" value={formatDate(selected.fecha_fin)} />
            <Row label="Odómetro" value={formatKm(selected.kilometraje)} />
            <Row label="Proveedor" value={selected.proveedor || "—"} />
            <Row label="Costo" value={formatMoney(selected.costo)} />

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Fallas</h3>
            {(selected.fallas || []).map((f) => (
              <p key={f.id} className="mb-1 flex justify-between gap-2 text-sm">
                <span>{f.descripcion}</span>
                <StatusBadge map={ESTADO_FALLA} value={f.estado} />
              </p>
            ))}
            {!(selected.fallas || []).length && <p className="text-sm text-muted">Sin fallas asociadas</p>}

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Gastos</h3>
            {(selected.gastos || []).map((g) => (
              <p key={g.id} className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span>{g.concepto} · {g.categoria_label}</span>
                <span className="flex items-center gap-2">
                  {formatMoney(g.monto)}
                  {puedeTaller && selected.estado !== "cerrada" && (
                    <button type="button" className="btn btn-ghost btn-xs" onClick={() => quitarGasto(g)}>Quitar</button>
                  )}
                </span>
              </p>
            ))}
            {!(selected.gastos || []).length && <p className="text-sm text-muted">Sin gastos</p>}

            {puedeTaller && selected.estado !== "cerrada" && (
              <div className="mt-3 space-y-2">
                <input className={inputClass} placeholder="Concepto" value={gasto.concepto} onChange={(e) => setGasto({ ...gasto, concepto: e.target.value })} />
                <div className="flex gap-2">
                  <select className={selectClass} value={gasto.categoria} onChange={(e) => setGasto({ ...gasto, categoria: e.target.value })}>
                    {Object.entries(CATEGORIA_TALLER).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                  <input className={inputClass} type="number" min="0.01" step="0.01" placeholder="Monto" value={gasto.monto} onChange={(e) => setGasto({ ...gasto, monto: e.target.value })} />
                </div>
                <button type="button" className="btn btn-outline btn-sm w-full" onClick={agregarGasto}>Agregar gasto</button>
                {selected.estado === "abierta" && (
                  <button type="button" className="btn btn-outline w-full" onClick={enviarTaller}>Enviar a taller</button>
                )}
                <button type="button" className="btn btn-primary w-full" onClick={abrirCerrar}>Cerrar orden</button>
              </div>
            )}
          </DetailPanel>
        )}
      </div>

      <Modal open={modalOrden} title="Nueva orden" onClose={() => setModalOrden(false)} onSubmit={crear} submitLabel={saving ? "Creando…" : "Crear"}>
        <Field label="Vehículo">
          <select className={selectClass} value={form.vehiculo_id} onChange={(e) => setForm({ ...form, vehiculo_id: e.target.value, fallas_ids: [] })}>
            <option value="">Elige vehículo</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>{v.placa} · {v.marca}</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <select className={selectClass} value={form.tipo_mantenimiento} onChange={(e) => setForm({ ...form, tipo_mantenimiento: e.target.value })}>
            <option value="preventivo">Preventivo</option>
            <option value="correctivo">Correctivo</option>
          </select>
        </Field>
        {form.tipo_mantenimiento === "correctivo" && (
          <Field label="Fallas abiertas">
            <div className="space-y-1">
              {fallasVehiculo.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={(form.fallas_ids || []).includes(f.id)}
                    onChange={(e) => {
                      const ids = new Set(form.fallas_ids || []);
                      if (e.target.checked) ids.add(f.id);
                      else ids.delete(f.id);
                      setForm({ ...form, fallas_ids: [...ids] });
                    }}
                  />
                  {f.descripcion}
                </label>
              ))}
              {!fallasVehiculo.length && <p className="text-sm text-muted">No hay fallas abiertas</p>}
            </div>
          </Field>
        )}
        <Field label="Proveedor">
          <input className={inputClass} value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })} />
        </Field>
        <Field label="Descripción">
          <input className={inputClass} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </Field>
      </Modal>

      <Modal open={modalCerrar} title="Cerrar orden" onClose={() => setModalCerrar(false)} onSubmit={cerrar} submitLabel={saving ? "Cerrando…" : "Cerrar"}>
        <Field label="Kilometraje del servicio">
          <input className={inputClass} type="number" min="0" value={cierre.kilometraje} onChange={(e) => setCierre({ ...cierre, kilometraje: e.target.value })} />
        </Field>
        {(selected?.fallas || []).map((f) => (
          <Field key={f.id} label={f.descripcion}>
            <select
              className={selectClass}
              value={cierre.resultados[f.id] || "reparada"}
              onChange={(e) => setCierre({ ...cierre, resultados: { ...cierre.resultados, [f.id]: e.target.value } })}
            >
              <option value="reparada">Reparada</option>
              <option value="no_reparada">No se reparó (queda abierta)</option>
            </select>
          </Field>
        ))}
        <Field label="Servicios preventivos hechos en esta visita">
          <div className="space-y-1">
            {tiposServicio.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="checkbox checkbox-sm" checked={cierre.servicios.includes(t.id)} onChange={() => toggleServicio(t.id)} />
                {t.nombre} <span className="text-muted">cada {t.intervalo_km.toLocaleString("es-PE")} km</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Observación">
          <input className={inputClass} value={cierre.observacion} onChange={(e) => setCierre({ ...cierre, observacion: e.target.value })} />
        </Field>
      </Modal>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="mb-1 flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
