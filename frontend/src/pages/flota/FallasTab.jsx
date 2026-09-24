import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { FallaService, MantenimientoService, TipoFallaService } from "@/service/api";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Modal, Field, inputClass, selectClass, filterClass, filterSelectClass } from "@/components/Modal";
import { ESTADO_FALLA, PRIORIDAD_FALLA, formatDate, formatKm } from "@/utils/format";

const vacioFalla = { vehiculo_id: "", tipo_id: "", prioridad: "media", descripcion: "" };

export function FallasTab({
  fallas, vehiculos, tipos, loading, puedeTaller, puedeReportar, onReload, q, setQ,
}) {
  const [estado, setEstado] = useState("pendientes");
  const [selectedId, setSelectedId] = useState(null);
  const [modalFalla, setModalFalla] = useState(false);
  const [modalTipo, setModalTipo] = useState(false);
  const [modalOrden, setModalOrden] = useState(false);
  const [form, setForm] = useState(vacioFalla);
  const [nombreTipo, setNombreTipo] = useState("");
  const [borrarTipo, setBorrarTipo] = useState(null);
  const [saving, setSaving] = useState(false);

  const selected = fallas.find((f) => f.id === selectedId) || null;

  const filtered = useMemo(() => {
    return fallas.filter((f) => {
      if (estado === "pendientes" && !["abierta", "en_orden", "no_reparada"].includes(f.estado)) return false;
      if (estado && estado !== "pendientes" && f.estado !== estado) return false;
      const t = q.toLowerCase();
      if (!t) return true;
      return `${f.vehiculo?.placa || ""} ${f.descripcion} ${f.tipo_nombre || ""}`.toLowerCase().includes(t);
    });
  }, [fallas, estado, q]);

  const errorApi = (err, fallback) => {
    const data = err?.response?.data;
    const msg = data?.detail || data?.descripcion?.[0] || data?.vehiculo_id?.[0] || data?.nombre?.[0] || fallback;
    toast.error(typeof msg === "string" ? msg : fallback);
  };

  const reportar = async () => {
    if (!form.vehiculo_id || !form.descripcion.trim()) {
      toast.error("Elige vehículo y describe la falla");
      return;
    }
    setSaving(true);
    try {
      await FallaService.create({
        vehiculo_id: form.vehiculo_id,
        tipo_id: form.tipo_id || null,
        prioridad: form.prioridad,
        descripcion: form.descripcion.trim(),
      });
      toast.success("Falla reportada");
      setModalFalla(false);
      setForm(vacioFalla);
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo reportar");
    } finally {
      setSaving(false);
    }
  };

  const crearTipo = async () => {
    if (!nombreTipo.trim()) {
      toast.error("Indica el nombre");
      return;
    }
    setSaving(true);
    try {
      await TipoFallaService.create({ nombre: nombreTipo.trim(), orden: tipos.length + 1 });
      toast.success("Tipo creado");
      setModalTipo(false);
      setNombreTipo("");
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo crear");
    } finally {
      setSaving(false);
    }
  };

  const confirmarBorrarTipo = async () => {
    if (!borrarTipo) return;
    try {
      await TipoFallaService.remove(borrarTipo.id);
      toast.success("Tipo eliminado");
      setBorrarTipo(null);
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo eliminar");
      setBorrarTipo(null);
    }
  };

  const abrirOrden = () => {
    if (!selected) return;
    const delVehiculo = fallas.filter(
      (f) => f.vehiculo?.id === selected.vehiculo?.id && ["abierta", "no_reparada"].includes(f.estado),
    );
    setForm({
      ...vacioFalla,
      vehiculo_id: selected.vehiculo?.id,
      fallas_ids: delVehiculo.map((f) => f.id),
      descripcion: `Correctivo ${selected.vehiculo?.placa || ""}`,
    });
    setModalOrden(true);
  };

  const crearOrden = async () => {
    if (!form.vehiculo_id) {
      toast.error("Elige un vehículo");
      return;
    }
    setSaving(true);
    try {
      await MantenimientoService.create({
        vehiculo_id: form.vehiculo_id,
        tipo_mantenimiento: "correctivo",
        descripcion: form.descripcion,
        fallas_ids: form.fallas_ids || [],
      });
      toast.success("Orden creada");
      setModalOrden(false);
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo crear la orden");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: "Fecha", render: (f) => formatDate(f.fecha_reportado) },
    { header: "Vehículo", render: (f) => f.vehiculo?.placa || "—" },
    { header: "Tipo", render: (f) => f.tipo_nombre || "—" },
    { header: "Prioridad", render: (f) => <StatusBadge map={PRIORIDAD_FALLA} value={f.prioridad} /> },
    { header: "Falla", accessor: "descripcion" },
    { header: "Estado", render: (f) => <StatusBadge map={ESTADO_FALLA} value={f.estado} /> },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${filterSelectClass} w-40`} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="pendientes">Pendientes</option>
          <option value="abierta">Abiertas</option>
          <option value="en_orden">En orden</option>
          <option value="reparada">Reparadas</option>
          <option value="">Todas</option>
        </select>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-muted" />
          <input className={`${filterClass} w-56 pl-9`} placeholder="Placa o falla" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {puedeTaller && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setNombreTipo(""); setModalTipo(true); }}>
            Tipos de falla
          </button>
        )}
        {puedeReportar && (
          <button type="button" className="btn btn-primary ml-auto" onClick={() => { setForm(vacioFalla); setModalFalla(true); }}>
            <Plus size={16} /> Reportar falla
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
            empty="No hay fallas para estos filtros"
          />
        </div>
        {selected && (
          <DetailPanel
            title={selected.vehiculo?.placa || "Falla"}
            subtitle={selected.tipo_nombre || "Sin tipo"}
            badge={<StatusBadge map={ESTADO_FALLA} value={selected.estado} />}
            onClose={() => setSelectedId(null)}
          >
            <Row label="Prioridad" value={<StatusBadge map={PRIORIDAD_FALLA} value={selected.prioridad} />} />
            <Row label="Reportó" value={selected.reportado_por || "—"} />
            <Row label="Fecha" value={formatDate(selected.fecha_reportado)} />
            <Row label="Odómetro" value={formatKm(selected.kilometraje_reportado)} />
            <p className="mt-3 text-sm">{selected.descripcion}</p>
            {selected.nota_cierre && <p className="mt-2 text-sm text-muted">{selected.nota_cierre}</p>}
            {puedeTaller && ["abierta", "no_reparada"].includes(selected.estado) && (
              <button type="button" className="btn btn-primary mt-4 w-full" onClick={abrirOrden}>
                Crear orden con esta falla
              </button>
            )}
          </DetailPanel>
        )}
      </div>

      <Modal open={modalFalla} title="Reportar falla" onClose={() => setModalFalla(false)} onSubmit={reportar} submitLabel={saving ? "Guardando…" : "Reportar"}>
        <Field label="Vehículo">
          <select className={selectClass} value={form.vehiculo_id} onChange={(e) => setForm({ ...form, vehiculo_id: e.target.value })}>
            <option value="">Elige vehículo</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>{v.placa} · {v.marca}</option>
            ))}
          </select>
        </Field>
        <Field label="Tipo">
          <select className={selectClass} value={form.tipo_id} onChange={(e) => setForm({ ...form, tipo_id: e.target.value })}>
            <option value="">Sin tipo</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </Field>
        <Field label="Prioridad / gravedad">
          <select className={selectClass} value={form.prioridad} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
            {Object.entries(PRIORIDAD_FALLA).map(([id, meta]) => (
              <option key={id} value={id}>{meta.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Qué ocurrió">
          <textarea className="textarea textarea-bordered h-24 w-full" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej. ruido al frenar, testigo de aceite…" />
        </Field>
      </Modal>

      <Modal open={modalTipo} title="Tipos de falla" onClose={() => setModalTipo(false)} onSubmit={crearTipo} submitLabel={saving ? "Guardando…" : "Agregar"}>
        <ul className="mb-3 space-y-2 text-sm">
          {tipos.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2">
              <span>{t.nombre}</span>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setBorrarTipo(t)}>Quitar</button>
            </li>
          ))}
          {!tipos.length && <li className="text-muted">Aún no hay tipos</li>}
        </ul>
        <Field label="Nuevo tipo">
          <input className={inputClass} value={nombreTipo} onChange={(e) => setNombreTipo(e.target.value)} placeholder="Ej. Refrigeración" />
        </Field>
      </Modal>

      <Modal open={modalOrden} title="Nueva orden correctiva" onClose={() => setModalOrden(false)} onSubmit={crearOrden} submitLabel={saving ? "Creando…" : "Crear orden"}>
        <p className="text-sm text-muted">Se incluyen las fallas abiertas de este vehículo.</p>
        <ul className="my-3 space-y-1 text-sm">
          {fallas.filter((f) => (form.fallas_ids || []).includes(f.id)).map((f) => (
            <li key={f.id}>· {f.descripcion}</li>
          ))}
        </ul>
        <Field label="Nota">
          <input className={inputClass} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </Field>
      </Modal>

      <ConfirmModal
        show={!!borrarTipo}
        onHide={() => setBorrarTipo(null)}
        onConfirm={confirmarBorrarTipo}
        titulo="Eliminar tipo"
        mensaje={borrarTipo ? `¿Eliminar ${borrarTipo.nombre}?` : ""}
        confirmText="Eliminar"
      />
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
