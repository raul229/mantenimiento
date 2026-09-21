import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { RecojoService, TipoResiduoService, ViajeService, SedeService, CiudadService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal, Field, inputClass, selectClass, filterClass, filterSelectClass } from "@/components/Modal";
import { ESTADO_RECOJO, formatDate, formatKg, formatKgPrecise, todayISO, monthISO } from "@/utils/format";

function pesosFrom(recojo, tipos) {
  const map = {};
  tipos.forEach((t) => { map[t.id] = ""; });
  (recojo?.detalles || []).forEach((d) => {
    map[d.tipo] = String(d.peso_kg ?? "");
  });
  return map;
}

function toDetallesInput(pesos) {
  return Object.entries(pesos)
    .map(([tipo, peso]) => ({ tipo: Number(tipo), peso_kg: peso === "" ? 0 : Number(peso) }))
    .filter((d) => d.peso_kg > 0);
}

export function RecojosPage() {
  const [recojos, setRecojos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [fecha, setFecha] = useState("");
  const [modal, setModal] = useState(false);
  const [pesos, setPesos] = useState({});
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    viaje: "",
    sede: "",
    fecha: todayISO(),
    hora: "",
    estado: "completado",
    observaciones: "",
    pesos: {},
  });

  const load = async () => {
    setLoading(true);
    try {
      const [r, t, v, s, c] = await Promise.all([
        RecojoService.getAll(),
        TipoResiduoService.getAll(),
        ViajeService.getAll(),
        SedeService.getAll(),
        CiudadService.getAll(),
      ]);
      setRecojos(r.data);
      setTipos(t.data);
      setViajes(v.data);
      setSedes(s.data);
      setCiudades(c.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selected = recojos.find((r) => r.id === selectedId) || null;

  useEffect(() => {
    if (selected) setPesos(pesosFrom(selected, tipos));
  }, [selectedId, recojos, tipos]);

  const filtered = useMemo(() => {
    return recojos.filter((r) => {
      if (fecha && r.fecha !== fecha) return false;
      if (estado && r.estado !== estado) return false;
      if (ciudad) {
        const nombre = ciudades.find((c) => String(c.id) === String(ciudad))?.nombre;
        if (r.ciudad_nombre !== nombre) return false;
      }
      const hay = `${r.cliente_nombre || ""} ${r.sede_nombre || ""} ${r.viaje_ruta || ""} ${r.vehiculo_placa || ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [recojos, fecha, estado, ciudad, q, ciudades]);

  const mes = monthISO();
  const kpis = useMemo(() => {
    const delMes = recojos.filter((r) => (r.fecha || "").startsWith(mes));
    const kgMes = delMes.reduce((s, r) => s + Number(r.peso_kg || 0), 0);
    const pend = recojos.filter((r) => r.estado !== "completado").length;
    const porTipo = {};
    recojos.forEach((r) => {
      if (!(r.fecha || "").startsWith(mes)) return;
      (r.detalles || []).forEach((d) => {
        const name = d.tipo_data?.nombre || "Otro";
        porTipo[name] = (porTipo[name] || 0) + Number(d.peso_kg || 0);
      });
    });
    return { total: recojos.length, kgMes, pend, porTipo };
  }, [recojos, mes]);

  const sedesFiltradas = useMemo(() => {
    if (!form.viaje) return sedes;
    const viaje = viajes.find((v) => String(v.id) === String(form.viaje));
    const ids = new Set((viaje?.recojos || []).map((r) => r.sede).filter(Boolean));
    if (ids.size) return sedes.filter((s) => ids.has(s.id));
    return sedes;
  }, [form.viaje, viajes, sedes]);

  const openNew = () => {
    const initial = {};
    tipos.forEach((t) => { initial[t.id] = ""; });
    setForm({
      viaje: "",
      sede: "",
      fecha: todayISO(),
      hora: "",
      estado: "completado",
      observaciones: "",
      pesos: initial,
    });
    setModal(true);
  };

  const saveNew = async () => {
    if (!form.sede) {
      toast.error("Selecciona una sede");
      return;
    }
    try {
      await RecojoService.create({
        viaje: form.viaje || null,
        sede: form.sede,
        fecha: form.fecha,
        hora: form.hora || null,
        estado: form.estado,
        observaciones: form.observaciones,
        detalles_input: toDetallesInput(form.pesos),
      });
      toast.success("Recojo registrado");
      setModal(false);
      load();
    } catch {
      toast.error("No se pudo guardar el recojo");
    }
  };

  const savePesos = async (marcarCompletado = false) => {
    if (!selected) return;
    setSaving(true);
    try {
      await RecojoService.patch(selected.id, {
        estado: marcarCompletado ? "completado" : selected.estado,
        detalles_input: toDetallesInput(pesos),
      });
      toast.success(marcarCompletado ? "Recojo completado" : "Pesos actualizados");
      load();
    } catch {
      toast.error("No se pudo actualizar el recojo");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: "Fecha", render: (r) => formatDate(r.fecha) },
    { header: "Cliente", render: (r) => r.cliente_nombre || "—" },
    { header: "Sede", render: (r) => r.sede_nombre || "—" },
    { header: "Viaje", render: (r) => r.viaje_ruta || (r.viaje ? `#${r.viaje}` : "—") },
    {
      header: "Residuos",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {(r.detalles || []).length === 0 && <span className="text-muted">Sin clasificar</span>}
          {(r.detalles || []).map((d) => (
            <span
              key={d.id}
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ background: d.tipo_data?.color || "#0f9d8e" }}
            >
              {d.tipo_data?.nombre}
            </span>
          ))}
        </div>
      ),
    },
    { header: "Kg", render: (r) => formatKgPrecise(r.peso_kg) },
    { header: "Estado", render: (r) => <StatusBadge map={ESTADO_RECOJO} value={r.estado} /> },
  ];

  return (
    <>
      <Topbar title="Recojos" />
      <div className="flex min-h-0 flex-1 gap-4 p-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" className={`${filterClass} w-40`} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <select className={`${filterSelectClass} w-40`} value={ciudad} onChange={(e) => setCiudad(e.target.value)}>
              <option value="">Ciudad</option>
              {ciudades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select className={`${filterSelectClass} w-40`} value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Estado</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_sitio">En sitio</option>
              <option value="completado">Completado</option>
            </select>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-muted" />
              <input className={`${filterClass} w-52 pl-9`} placeholder="Cliente, sede o ruta" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button
              type="button"
              onClick={openNew}
              className="btn btn-primary ml-auto"
            >
              <Plus size={16} /> Nuevo recojo
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Mini n={kpis.total} label="recojos" />
            <Mini n={formatKg(kpis.kgMes)} label="kg este mes" />
            <Mini n={kpis.pend} label="pendientes" />
            <div className="rounded-box bg-base-100 p-3 shadow-sm">
              <p className="text-xs text-muted">Por tipo (mes)</p>
              <div className="mt-1 space-y-1">
                {Object.entries(kpis.porTipo).length === 0 && <p className="text-sm text-muted">Sin clasificar</p>}
                {Object.entries(kpis.porTipo).slice(0, 3).map(([name, kg]) => (
                  <p key={name} className="flex justify-between text-xs">
                    <span>{name}</span>
                    <span className="font-medium">{formatKg(kg)}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            onRowClick={(row) => setSelectedId(row.id)}
            selectedId={selected?.id}
            empty="No hay recojos para estos filtros"
          />
        </div>

        {selected && (
          <DetailPanel
            title={selected.cliente_nombre || selected.sede_nombre || `Recojo #${selected.id}`}
            subtitle={selected.sede_nombre}
            badge={<StatusBadge map={ESTADO_RECOJO} value={selected.estado} />}
            onClose={() => setSelectedId(null)}
          >
            <Row label="Fecha" value={formatDate(selected.fecha)} />
            <Row label="Hora" value={selected.hora || "—"} />
            <Row label="Ciudad" value={selected.ciudad_nombre || "—"} />
            <Row label="Dirección" value={selected.sede_direccion || "—"} />
            <Row label="Viaje" value={selected.viaje_ruta || "—"} />
            <Row label="Vehículo" value={selected.vehiculo_placa || "—"} />
            <Row label="Total" value={formatKgPrecise(selected.peso_kg)} />

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Residuos (kg)</h3>
            <div className="space-y-2">
              {tipos.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
                  <span className="w-36 shrink-0">{t.nombre}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    value={pesos[t.id] ?? ""}
                    onChange={(e) => setPesos((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            {selected.observaciones && (
              <p className="mt-3 text-sm text-muted">{selected.observaciones}</p>
            )}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => savePesos(false)}
                className="btn btn-outline w-full"
              >
                Guardar pesos
              </button>
              {selected.estado !== "completado" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => savePesos(true)}
                  className="btn btn-primary w-full"
                >
                  Marcar completado
                </button>
              )}
            </div>
          </DetailPanel>
        )}
      </div>

      <Modal open={modal} wide title="Nuevo recojo" onClose={() => setModal(false)} onSubmit={saveNew}>
        <Field label="Viaje (opcional)">
          <select className={selectClass} value={form.viaje} onChange={(e) => setForm({ ...form, viaje: e.target.value, sede: "" })}>
            <option value="">Sin viaje</option>
            {viajes.map((v) => (
              <option key={v.id} value={v.id}>
                #{v.id} {v.ruta_data?.nombre || ""} · {v.fecha_inicio} · {v.vehiculo_data?.placa || ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sede">
          <select className={selectClass} value={form.sede} onChange={(e) => setForm({ ...form, sede: e.target.value })}>
            <option value="">Seleccione</option>
            {sedesFiltradas.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre} {s.cliente_nombre ? `· ${s.cliente_nombre}` : ""}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha">
            <input type="date" className={inputClass} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Field>
          <Field label="Hora">
            <input type="time" className={inputClass} value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
          </Field>
        </div>
        <Field label="Estado">
          <select className={selectClass} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            <option value="pendiente">Pendiente</option>
            <option value="en_sitio">En sitio</option>
            <option value="completado">Completado</option>
          </select>
        </Field>
        <p className="text-xs font-semibold uppercase text-muted">Residuos (kg)</p>
        {tipos.map((t) => (
          <label key={t.id} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
            <span className="w-36 shrink-0">{t.nombre}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={form.pesos[t.id] ?? ""}
              onChange={(e) => setForm({ ...form, pesos: { ...form.pesos, [t.id]: e.target.value } })}
            />
          </label>
        ))}
        <Field label="Observaciones">
          <input className={inputClass} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
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
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
