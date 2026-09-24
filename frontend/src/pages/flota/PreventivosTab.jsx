import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { HistorialServicioService, ServicioVehiculoService, TipoServicioService } from "@/service/api";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Modal, Field, inputClass, filterClass, filterSelectClass } from "@/components/Modal";
import { ESTADO_SERVICIO, formatDate, formatKm } from "@/utils/format";

export function PreventivosTab({
  servicios, tipos, vehiculos, loading, puedeTaller, onReload, q, setQ,
}) {
  const [estado, setEstado] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [modalReg, setModalReg] = useState(false);
  const [modalTipo, setModalTipo] = useState(false);
  const [form, setForm] = useState({ vehiculo: "", tipo: "", kilometraje: "", fecha: "", nota: "" });
  const [tipoForm, setTipoForm] = useState({ nombre: "", intervalo_km: "", alerta_antes_km: "500" });
  const [borrarTipo, setBorrarTipo] = useState(null);
  const [saving, setSaving] = useState(false);

  const selected = servicios.find((s) => s.id === selectedId) || null;

  const filtered = useMemo(() => {
    return servicios.filter((s) => {
      if (estado && s.estado !== estado) return false;
      const t = q.toLowerCase();
      if (!t) return true;
      return `${s.vehiculo?.placa || ""} ${s.tipo_nombre}`.toLowerCase().includes(t);
    });
  }, [servicios, estado, q]);

  const errorApi = (err, fallback) => {
    const data = err?.response?.data;
    const msg = data?.detail || data?.nombre?.[0] || data?.intervalo_km?.[0] || fallback;
    toast.error(typeof msg === "string" ? msg : fallback);
  };

  const abrirDetalle = async (row) => {
    setSelectedId(row.id);
    try {
      const { data } = await HistorialServicioService.getAll({ vehiculo: row.vehiculo?.id, tipo: row.tipo });
      setHistorial(data);
    } catch {
      setHistorial([]);
    }
  };

  const registrar = async () => {
    if (!form.vehiculo || !form.tipo) {
      toast.error("Elige vehículo y servicio");
      return;
    }
    setSaving(true);
    try {
      await ServicioVehiculoService.registrar({
        vehiculo: form.vehiculo,
        tipo: form.tipo,
        kilometraje: form.kilometraje || undefined,
        fecha: form.fecha || undefined,
        nota: form.nota,
      });
      toast.success("Servicio registrado");
      setModalReg(false);
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo registrar");
    } finally {
      setSaving(false);
    }
  };

  const guardarTipo = async () => {
    if (!tipoForm.nombre.trim() || !tipoForm.intervalo_km) {
      toast.error("Nombre e intervalo son obligatorios");
      return;
    }
    setSaving(true);
    try {
      if (tipoForm.id) {
        await TipoServicioService.update(tipoForm.id, {
          nombre: tipoForm.nombre.trim(),
          intervalo_km: Number(tipoForm.intervalo_km),
          alerta_antes_km: Number(tipoForm.alerta_antes_km) || 500,
          orden: tipoForm.orden || 0,
        });
        toast.success("Intervalo actualizado");
      } else {
        await TipoServicioService.create({
          nombre: tipoForm.nombre.trim(),
          intervalo_km: Number(tipoForm.intervalo_km),
          alerta_antes_km: Number(tipoForm.alerta_antes_km) || 500,
          orden: tipos.length + 1,
        });
        toast.success("Servicio creado");
      }
      setModalTipo(false);
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const confirmarBorrarTipo = async () => {
    if (!borrarTipo) return;
    try {
      await TipoServicioService.remove(borrarTipo.id);
      toast.success("Servicio eliminado");
      setBorrarTipo(null);
      onReload();
    } catch (err) {
      errorApi(err, "No se pudo eliminar");
      setBorrarTipo(null);
    }
  };

  const columns = [
    { header: "Vehículo", render: (s) => s.vehiculo?.placa || "—" },
    { header: "Servicio", accessor: "tipo_nombre" },
    { header: "Cada", render: (s) => formatKm(s.intervalo_km) },
    { header: "Último", render: (s) => formatKm(s.ultimo_km) },
    { header: "Próximo", render: (s) => formatKm(s.proximo_km) },
    { header: "Faltan", render: (s) => (s.faltan_km == null ? "—" : formatKm(s.faltan_km)) },
    { header: "Estado", render: (s) => <StatusBadge map={ESTADO_SERVICIO} value={s.estado} /> },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${filterSelectClass} w-40`} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Estado</option>
          <option value="vencido">Vencido</option>
          <option value="por_vencer">Por vencer</option>
          <option value="al_dia">Al día</option>
          <option value="sin_registro">Sin registro</option>
        </select>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-muted" />
          <input className={`${filterClass} w-56 pl-9`} placeholder="Placa o servicio" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {puedeTaller && (
          <>
            <button
              type="button"
              className="btn btn-ghost btn-sm ml-auto"
              onClick={() => { setTipoForm({ nombre: "", intervalo_km: "", alerta_antes_km: "500" }); setModalTipo(true); }}
            >
              Intervalos
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const veh = vehiculos[0];
                setForm({
                  vehiculo: veh?.id || "",
                  tipo: tipos[0]?.id || "",
                  kilometraje: veh?.kilometraje_actual || "",
                  fecha: "",
                  nota: "",
                });
                setModalReg(true);
              }}
            >
              <Plus size={16} /> Registrar servicio
            </button>
          </>
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-w-0 flex-1">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            onRowClick={abrirDetalle}
            selectedId={selected?.id}
            empty="No hay planes preventivos"
          />
        </div>
        {selected && (
          <DetailPanel
            title={selected.tipo_nombre}
            subtitle={selected.vehiculo ? `${selected.vehiculo.placa} · ${selected.vehiculo.marca}` : ""}
            badge={<StatusBadge map={ESTADO_SERVICIO} value={selected.estado} />}
            onClose={() => setSelectedId(null)}
          >
            <Row label="Intervalo" value={formatKm(selected.intervalo_km)} />
            <Row label="Avisa antes" value={formatKm(selected.alerta_antes_km)} />
            <Row label="Último" value={`${formatKm(selected.ultimo_km)} · ${formatDate(selected.ultima_fecha)}`} />
            <Row label="Próximo" value={formatKm(selected.proximo_km)} />
            <Row label="Faltan" value={selected.faltan_km == null ? "—" : formatKm(selected.faltan_km)} />
            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Historial</h3>
            {historial.map((h) => (
              <p key={h.id} className="mb-1 text-sm">{formatDate(h.fecha)} · {formatKm(h.kilometraje)}{h.nota ? ` · ${h.nota}` : ""}</p>
            ))}
            {!historial.length && <p className="text-sm text-muted">Aún no hay registros</p>}
            {puedeTaller && (
              <button
                type="button"
                className="btn btn-outline mt-4 w-full"
                onClick={() => {
                  setForm({
                    vehiculo: selected.vehiculo?.id || "",
                    tipo: selected.tipo,
                    kilometraje: "",
                    fecha: "",
                    nota: "",
                  });
                  setModalReg(true);
                }}
              >
                Registrar este servicio
              </button>
            )}
          </DetailPanel>
        )}
      </div>

      {puedeTaller && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase text-muted">Cada cuántos km se hace</p>
          <div className="grid gap-2 md:grid-cols-2">
            {tipos.map((t) => (
              <button
                key={t.id}
                type="button"
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-left text-sm"
                onClick={() => { setTipoForm({ ...t }); setModalTipo(true); }}
              >
                <span>{t.nombre}</span>
                <span className="text-muted">{formatKm(t.intervalo_km)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalReg} title="Registrar servicio hecho" onClose={() => setModalReg(false)} onSubmit={registrar} submitLabel={saving ? "Guardando…" : "Registrar"}>
        <Field label="Vehículo">
          <select className="select select-bordered w-full" value={form.vehiculo} onChange={(e) => setForm({ ...form, vehiculo: e.target.value })}>
            <option value="">Elige vehículo</option>
            {vehiculos.map((v) => (
              <option key={v.id} value={v.id}>{v.placa} · {formatKm(v.kilometraje_actual)}</option>
            ))}
          </select>
        </Field>
        <Field label="Servicio">
          <select className="select select-bordered w-full" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="">Elige servicio</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </Field>
        <Field label="Kilometraje">
          <input className={inputClass} type="number" min="0" value={form.kilometraje} onChange={(e) => setForm({ ...form, kilometraje: e.target.value })} placeholder="Odómetro al hacerlo" />
        </Field>
        <Field label="Fecha">
          <input className={inputClass} type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
        </Field>
        <Field label="Nota">
          <input className={inputClass} value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} />
        </Field>
      </Modal>

      <Modal open={modalTipo} title={tipoForm.id ? "Editar intervalo" : "Nuevo servicio preventivo"} onClose={() => setModalTipo(false)} onSubmit={guardarTipo} submitLabel={saving ? "Guardando…" : "Guardar"}>
        <Field label="Nombre">
          <input className={inputClass} value={tipoForm.nombre} onChange={(e) => setTipoForm({ ...tipoForm, nombre: e.target.value })} />
        </Field>
        <Field label="Cada cuántos km">
          <input className={inputClass} type="number" min="1" value={tipoForm.intervalo_km} onChange={(e) => setTipoForm({ ...tipoForm, intervalo_km: e.target.value })} />
        </Field>
        <Field label="Avisar cuántos km antes">
          <input className={inputClass} type="number" min="0" value={tipoForm.alerta_antes_km} onChange={(e) => setTipoForm({ ...tipoForm, alerta_antes_km: e.target.value })} />
        </Field>
        {tipoForm.id && (
          <button type="button" className="btn btn-ghost btn-error w-full" onClick={() => setBorrarTipo(tipoForm)}>
            Eliminar tipo
          </button>
        )}
      </Modal>

      <ConfirmModal
        show={!!borrarTipo}
        onHide={() => setBorrarTipo(null)}
        onConfirm={confirmarBorrarTipo}
        titulo="Eliminar servicio"
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
