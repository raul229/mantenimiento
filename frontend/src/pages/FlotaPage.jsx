import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Truck } from "lucide-react";
import { VehiculoService, MantenimientoService, DocumentoService, UsuarioService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal, Field, inputClass, selectClass } from "@/components/Modal";
import { ESTADO_FLOTA, formatDate, formatMoney } from "@/utils/format";

const emptyForm = {
  marca: "",
  modelo: "",
  placa: "",
  anio: "",
  tipo: "furgon",
  estado: "activo",
  kilometraje_actual: 0,
  nivel_combustible: 50,
  conductor_asignado: "",
};

export function FlotaPage() {
  const [tab, setTab] = useState("flota");
  const [vehiculos, setVehiculos] = useState([]);
  const [mantenimientos, setMantenimientos] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    Promise.all([
      VehiculoService.getAll(),
      MantenimientoService.getAll(),
      DocumentoService.getAll({ tipo_entidad: "vehiculo" }),
      UsuarioService.getAll(),
    ])
      .then(([v, m, d, u]) => {
        setVehiculos(v.data);
        setMantenimientos(m.data);
        setDocumentos(d.data);
        setUsuarios(u.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const ops = { total: vehiculos.length, operativos: 0, en_taller: 0, detenido: 0 };
    vehiculos.forEach((v) => {
      if (v.estado_operativo === "en_taller") ops.en_taller += 1;
      else if (v.estado_operativo === "detenido") ops.detenido += 1;
      else ops.operativos += 1;
    });
    return ops;
  }, [vehiculos]);

  const docsOf = (vehiculo) => documentos.filter((d) => d.entidad_id === vehiculo?.id);
  const mantsOf = (vehiculo) => mantenimientos.filter((m) => m.vehiculo?.id === vehiculo?.id);

  const save = async () => {
    try {
      const payload = {
        ...form,
        anio: form.anio ? Number(form.anio) : null,
        conductor_asignado: form.conductor_asignado || null,
      };
      await VehiculoService.create(payload);
      toast.success("Vehículo creado");
      setModal(false);
      setForm(emptyForm);
      load();
    } catch {
      toast.error("No se pudo crear el vehículo");
    }
  };

  return (
    <>
      <Topbar title="Flota y mantenimiento" />
      <div className="flex min-h-0 flex-1 gap-4 p-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {[["flota", "Flota"], ["ordenes", "Órdenes de mantenimiento"], ["documentos", "Documentos"]].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`btn btn-sm rounded-full ${tab === id ? "btn-primary" : "btn-ghost bg-base-100"}`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setModal(true)}
              className="btn btn-primary ml-auto"
            >
              Nuevo vehículo
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Stat n={stats.total} label="vehículos" />
            <Stat n={stats.operativos} label="operativos" color="text-emerald-700" />
            <Stat n={stats.en_taller} label="en taller" color="text-amber-700" />
            <Stat n={stats.detenido} label="detenido" color="text-rose-600" />
          </div>

          {tab === "flota" && (
            <div className="space-y-2">
              {loading && <p className="text-muted">Cargando…</p>}
              {vehiculos.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className={`flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ${selected?.id === v.id ? "ring-2 ring-accent" : ""}`}
                >
                  <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-muted">
                    {v.foto_url ? <img src={v.foto_url} alt="" className="h-full w-full object-cover" /> : <Truck />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{v.placa}</p>
                      <StatusBadge map={ESTADO_FLOTA} value={v.estado_operativo} />
                    </div>
                    <p className="text-sm text-muted">{v.marca} {v.modelo} {v.anio || ""}</p>
                    <p className="text-xs text-muted">km {Number(v.kilometraje_actual || 0).toLocaleString("es-PE")}
                      {v.proximo_mantenimiento_km ? ` · Próximo mant. ${Number(v.proximo_mantenimiento_km).toLocaleString("es-PE")} km` : ""}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    Combustible {v.nivel_combustible ?? 0}%
                  </div>
                </button>
              ))}
            </div>
          )}

          {tab === "ordenes" && (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th>Vehículo</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {mantenimientos.map((m) => (
                    <tr key={m.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{formatDate(m.fecha_inicio)}</td>
                      <td>{m.vehiculo ? `${m.vehiculo.marca} ${m.vehiculo.placa}` : "—"}</td>
                      <td className="capitalize">{m.tipo_mantenimiento}</td>
                      <td>{m.descripcion}</td>
                      <td>{m.costo != null ? formatMoney(m.costo) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "documentos" && (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Tipo</th>
                    <th>Número</th>
                    <th>Vence</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((d) => (
                    <tr key={d.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 capitalize">{d.tipo_documento.replace("_", " ")}</td>
                      <td>{d.numero_documento || "—"}</td>
                      <td>{formatDate(d.fecha_vencimiento)}</td>
                      <td className="capitalize">{d.estado}</td>
                    </tr>
                  ))}
                  {!documentos.length && (
                    <tr><td className="px-4 py-8 text-muted" colSpan={4}>Sin documentos de flota</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && tab === "flota" && (
          <DetailPanel
            title={selected.placa}
            subtitle={`${selected.marca} ${selected.modelo}`}
            badge={<StatusBadge map={ESTADO_FLOTA} value={selected.estado_operativo} />}
            onClose={() => setSelected(null)}
          >
            <Row label="Tipo" value={selected.tipo} />
            <Row label="Año" value={selected.anio || "—"} />
            <Row label="VIN" value={selected.vin || "—"} />
            <Row label="Kilometraje" value={Number(selected.kilometraje_actual || 0).toLocaleString("es-PE")} />
            <Row label="Combustible" value={`${selected.nivel_combustible ?? 0}%`} />
            <Row label="Conductor" value={selected.conductor_asignado_data?.nombre || "Sin asignar"} />
            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Últimos mantenimientos</h3>
            {mantsOf(selected).slice(0, 4).map((m) => (
              <p key={m.id} className="mb-1 text-sm">{formatDate(m.fecha_inicio)} · {m.descripcion}</p>
            ))}
            {!mantsOf(selected).length && <p className="text-sm text-muted">Sin mantenimientos</p>}
            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Documentos</h3>
            {docsOf(selected).map((d) => (
              <p key={d.id} className="mb-1 text-sm capitalize">{d.tipo_documento.replace("_", " ")} · vence {formatDate(d.fecha_vencimiento)}</p>
            ))}
            {!docsOf(selected).length && <p className="text-sm text-muted">Sin documentos</p>}
          </DetailPanel>
        )}
      </div>
      <Modal open={modal} title="Nuevo vehículo" onClose={() => setModal(false)} onSubmit={save}>
        <Field label="Marca"><input className={inputClass} value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></Field>
        <Field label="Modelo"><input className={inputClass} value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></Field>
        <Field label="Placa"><input className={inputClass} value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} /></Field>
        <Field label="Año"><input className={inputClass} type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} /></Field>
        <Field label="Conductor">
          <select className={selectClass} value={form.conductor_asignado} onChange={(e) => setForm({ ...form, conductor_asignado: e.target.value })}>
            <option value="">Sin asignar</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </Field>
      </Modal>
    </>
  );
}

function Stat({ n, label, color = "text-ink" }) {
  return (
    <div className="stat rounded-box bg-base-100 p-4 shadow-sm">
      <p className={`stat-value text-2xl ${color}`}>{n}</p>
      <p className="stat-desc">{label}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="mb-1 flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
