import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ViajeService, VehiculoService, RutaService, UsuarioService, CiudadService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal, Field, inputClass, selectClass } from "@/components/Modal";
import {
  ESTADO_VIAJE, ESTADO_RECOJO, formatKg, formatMoney, formatDate, todayISO,
} from "@/utils/format";

const emptyForm = {
  vehiculo: "",
  conductor: "",
  ruta: "",
  fecha_inicio: todayISO(),
  estado: "programado",
  hora_salida: "",
  hora_retorno_est: "",
};

export function ViajesPage() {
  const [viajes, setViajes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const [v, ve, r, u, c] = await Promise.all([
        ViajeService.getAll(),
        VehiculoService.getAll(),
        RutaService.getAll(),
        UsuarioService.getAll(),
        CiudadService.getAll(),
      ]);
      setViajes(v.data);
      setVehiculos(ve.data);
      setRutas(r.data);
      setUsuarios(u.data);
      setCiudades(c.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return viajes.filter((v) => {
      if (fecha && v.fecha_inicio !== fecha) return false;
      if (estado && v.estado !== estado) return false;
      if (ciudad && v.ciudad !== ciudades.find((c) => String(c.id) === String(ciudad))?.nombre) return false;
      const hay = `${v.ruta_data?.nombre || ""} ${v.vehiculo_data?.placa || ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [viajes, fecha, estado, ciudad, q, ciudades]);

  const kpis = useMemo(() => {
    const list = viajes.filter((v) => !fecha || v.fecha_inicio === fecha);
    return {
      total: list.length,
      curso: list.filter((v) => v.estado === "en curso").length,
      done: list.filter((v) => v.estado === "completado").length,
      pend: list.filter((v) => v.estado === "programado").length,
      kg: list.reduce((s, v) => s + Number(v.kg_total || 0), 0),
    };
  }, [viajes, fecha]);

  const selected = viajes.find((v) => v.id === selectedId) || filtered[0] || null;

  const save = async () => {
    try {
      await ViajeService.create({
        vehiculo: form.vehiculo || null,
        conductor: form.conductor || null,
        ruta: form.ruta || null,
        fecha_inicio: form.fecha_inicio,
        estado: form.estado,
        hora_salida: form.hora_salida || null,
        hora_retorno_est: form.hora_retorno_est || null,
      });
      toast.success("Viaje creado");
      setModal(false);
      setForm({ ...emptyForm, fecha_inicio: todayISO() });
      load();
    } catch {
      toast.error("No se pudo crear el viaje");
    }
  };

  const columns = [
    { header: "Ruta", render: (v) => v.ruta_data?.nombre || `Viaje #${v.id}` },
    { header: "Vehículo", render: (v) => v.vehiculo_data?.placa || "—" },
    { header: "Conductor", render: (v) => v.conductor_data?.nombre || "—" },
    { header: "Estado", render: (v) => <StatusBadge map={ESTADO_VIAJE} value={v.estado} /> },
    { header: "Progreso", render: (v) => `${v.paradas_hechas}/${v.paradas_total} paradas` },
    { header: "Kg", render: (v) => formatKg(v.kg_total) },
  ];

  const gastos = selected?.gastos || [];
  const residuos = selected?.residuos || [];

  return (
    <>
      <Topbar title="Rutas y viajes" />
      <div className="flex min-h-0 flex-1 gap-4 p-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${selectClass} w-40`} value={ciudad} onChange={(e) => setCiudad(e.target.value)}>
              <option value="">Ciudad</option>
              {ciudades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <input type="date" className={`${inputClass} w-40`} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <select className={`${selectClass} w-40`} value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Estado</option>
              <option value="programado">Pendiente</option>
              <option value="en curso">En curso</option>
              <option value="completado">Completado</option>
            </select>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-muted" />
              <input className={`${inputClass} w-48 pl-9`} placeholder="Buscar ruta o placa" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button
              type="button"
              onClick={() => setModal(true)}
              className="btn btn-primary ml-auto"
            >
              <Plus size={16} /> Nuevo viaje
            </button>
          </div>
          <div className="grid grid-cols-5 gap-3">
            <Mini n={kpis.total} label="viajes" />
            <Mini n={kpis.curso} label="en curso" />
            <Mini n={kpis.done} label="completados" />
            <Mini n={kpis.pend} label="pendientes" />
            <Mini n={formatKg(kpis.kg)} label="recolectados" />
          </div>
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            onRowClick={(row) => setSelectedId(row.id)}
            selectedId={selected?.id}
            empty="No hay viajes para estos filtros"
          />
        </div>
        {selected && (
          <DetailPanel
            title={selected.ruta_data?.nombre || `Viaje #${selected.id}`}
            badge={<StatusBadge map={ESTADO_VIAJE} value={selected.estado} />}
            onClose={() => setSelectedId(null)}
          >
            <Row label="Vehículo" value={selected.vehiculo_data ? `${selected.vehiculo_data.placa} ${selected.vehiculo_data.marca}` : "—"} />
            <Row label="Conductor" value={selected.conductor_data?.nombre || "—"} />
            <Row label="Ciudad" value={selected.ciudad || "—"} />
            <Row label="Salida" value={selected.hora_salida || "—"} />
            <Row label="Retorno est." value={selected.hora_retorno_est || "—"} />
            <Row label="Fecha" value={formatDate(selected.fecha_inicio)} />

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">
              Progreso {selected.paradas_hechas}/{selected.paradas_total} paradas
            </h3>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-accent"
                style={{ width: `${selected.paradas_total ? (selected.paradas_hechas / selected.paradas_total) * 100 : 0}%` }}
              />
            </div>
            <ol className="space-y-2">
              {(selected.recojos || []).map((r, i) => (
                <li key={r.id} className="flex items-start justify-between gap-2 text-sm">
                  <span>
                    <span className="mr-2 font-semibold text-accent">{i + 1}</span>
                    {r.sede_nombre || r.cliente_nombre || `Parada ${i + 1}`}
                    <span className="block text-xs text-muted">{formatKg(r.peso_kg)}</span>
                  </span>
                  <StatusBadge map={ESTADO_RECOJO} value={r.estado} />
                </li>
              ))}
              {!(selected.recojos || []).length && <p className="text-sm text-muted">Sin paradas aún</p>}
            </ol>

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Costos del viaje</h3>
            {gastos.map((g) => (
              <Row key={g.id} label={g.tipo.replace("_", " ")} value={formatMoney(g.monto)} />
            ))}
            <Row label="Total" value={formatMoney(selected.costo_total)} />
            {!gastos.length && <p className="text-sm text-muted">Sin gastos registrados</p>}

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Residuos del viaje</h3>
            {residuos.length > 0 && (
              <div className="h-28">
                <ResponsiveContainer>
                  <BarChart data={residuos}>
                    <XAxis dataKey="nombre" tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => formatKg(v)} />
                    <Bar dataKey="peso" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {!residuos.length && <p className="text-sm text-muted">Sin residuos clasificados</p>}
          </DetailPanel>
        )}
      </div>
      <Modal open={modal} title="Nuevo viaje" onClose={() => setModal(false)} onSubmit={save}>
        <Field label="Vehículo">
          <select className={selectClass} value={form.vehiculo} onChange={(e) => setForm({ ...form, vehiculo: e.target.value })}>
            <option value="">Seleccione</option>
            {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.marca}</option>)}
          </select>
        </Field>
        <Field label="Ruta">
          <select className={selectClass} value={form.ruta} onChange={(e) => setForm({ ...form, ruta: e.target.value })}>
            <option value="">Seleccione</option>
            {rutas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </Field>
        <Field label="Conductor">
          <select className={selectClass} value={form.conductor} onChange={(e) => setForm({ ...form, conductor: e.target.value })}>
            <option value="">Seleccione</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </select>
        </Field>
        <Field label="Fecha">
          <input type="date" className={inputClass} value={form.fecha_inicio} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
        </Field>
        <Field label="Hora salida">
          <input type="time" className={inputClass} value={form.hora_salida} onChange={(e) => setForm({ ...form, hora_salida: e.target.value })} />
        </Field>
      </Modal>
    </>
  );
}

function Mini({ n, label }) {
  return (
    <div className="stat rounded-box bg-base-100 p-3 shadow-sm">
      <p className="stat-value text-xl">{n}</p>
      <p className="stat-desc">{label}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="mb-1 flex justify-between gap-3 text-sm">
      <span className="text-muted capitalize">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
