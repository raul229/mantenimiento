import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FileText, Plus, Search } from "lucide-react";
import { RecojoService, ViajeService, CiudadService, GuiaService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal, Field, inputClass, selectClass, filterClass, filterSelectClass } from "@/components/Modal";
import { CiudadFields, NuevaCiudadModal, asCiudades, mergeCiudad } from "@/components/CiudadSelect";
import { GuiaRemisionModal, avisarOmitidos } from "@/components/GuiaRemisionModal";
import { ESTADO_RECOJO, formatDate, formatTime, formatKg, formatKgPrecise, monthISO } from "@/utils/format";
import { useAuth } from "@/context/AuthContext";

const VIAJE_EN_PROCESO = new Set(["programado", "en curso"]);

export function RecojosPage() {
  const { can } = useAuth();
  const [recojos, setRecojos] = useState([]);
  const [viajes, setViajes] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [fecha, setFecha] = useState("");
  const [modal, setModal] = useState(false);
  const [modalCiudad, setModalCiudad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pesoEdit, setPesoEdit] = useState("");
  const [seleccion, setSeleccion] = useState([]);
  const [guiaIds, setGuiaIds] = useState(null);
  const [emitiendo, setEmitiendo] = useState(false);
  const [form, setForm] = useState({
    viaje: "",
    sede: "",
    peso_kg: "",
    observaciones: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [r, v, c] = await Promise.all([
        RecojoService.getAll(),
        ViajeService.getAll(),
        CiudadService.getAll(),
      ]);
      setRecojos(r.data);
      setViajes(v.data);
      setCiudades(asCiudades(c.data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selected = recojos.find((r) => r.id === selectedId) || null;

  useEffect(() => {
    if (selected) setPesoEdit(String(selected.peso_kg ?? ""));
  }, [selectedId, recojos]);

  const viajesEnProceso = useMemo(
    () => viajes.filter((v) => {
      if (!VIAJE_EN_PROCESO.has(v.estado)) return false;
      const total = Number(v.paradas_total || 0);
      return total > 0 && Number(v.paradas_hechas || 0) < total;
    }),
    [viajes],
  );

  const viajeForm = viajes.find((v) => String(v.id) === String(form.viaje));
  const sedesPendientes = useMemo(() => {
    if (!viajeForm) return [];
    const ya = new Set((viajeForm.recojos || []).map((r) => String(r.sede)));
    return (viajeForm.sedes_data || []).filter((s) => !ya.has(String(s.id)));
  }, [viajeForm]);

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

  const todosSeleccionados =
    filtered.length > 0 && filtered.every((r) => seleccion.includes(r.id));

  const mes = monthISO();
  const kpis = useMemo(() => {
    const delMes = recojos.filter((r) => (r.fecha || "").startsWith(mes));
    const kgMes = delMes.reduce((s, r) => s + Number(r.peso_kg || 0), 0);
    return { total: recojos.length, kgMes, delMes: delMes.length };
  }, [recojos, mes]);

  const openNew = () => {
    setForm({ viaje: "", sede: "", peso_kg: "", observaciones: "" });
    setModal(true);
  };

  const saveNew = async () => {
    if (!form.viaje) {
      toast.error("Selecciona un viaje en proceso");
      return;
    }
    if (!form.sede) {
      toast.error("Selecciona una sede");
      return;
    }
    if (!form.peso_kg || Number(form.peso_kg) <= 0) {
      toast.error("Indica los kilogramos");
      return;
    }
    try {
      await RecojoService.create({
        viaje: form.viaje,
        sede: form.sede,
        peso_kg: Number(form.peso_kg),
        observaciones: form.observaciones,
      });
      toast.success("Recojo registrado");
      setModal(false);
      load();
    } catch (err) {
      const data = err?.response?.data;
      const msg = data?.sede?.[0] || data?.viaje?.[0] || data?.peso_kg?.[0] || "No se pudo guardar el recojo";
      toast.error(msg);
    }
  };

  const savePeso = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await RecojoService.patch(selected.id, { peso_kg: Number(pesoEdit) || 0 });
      toast.success("Kilogramos actualizados");
      load();
    } catch {
      toast.error("No se pudo actualizar el recojo");
    } finally {
      setSaving(false);
    }
  };

  const toggleSeleccion = (id) =>
    setSeleccion((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleTodos = () =>
    setSeleccion(todosSeleccionados ? [] : filtered.map((r) => r.id));

  // Emitir es idempotente: si el recojo ya tiene guía devuelve la existente.
  const emitirGuias = async (recojoIds) => {
    if (!recojoIds.length) return;
    setEmitiendo(true);
    try {
      const { data } = await GuiaService.emitir({ recojos: recojoIds });
      if (data.nuevas) {
        toast.success(data.nuevas === 1 ? "Guía emitida" : `${data.nuevas} guías emitidas`);
      }
      avisarOmitidos(data.omitidos);
      setGuiaIds(data.guias.map((g) => g.id));
      setSeleccion([]);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "No se pudieron emitir las guías", {
        duration: 7000,
      });
    } finally {
      setEmitiendo(false);
    }
  };

  const columns = [
    {
      key: "seleccion",
      headerRender: () => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          aria-label="Seleccionar todos"
          checked={todosSeleccionados}
          onChange={toggleTodos}
        />
      ),
      render: (r) => (
        <input
          type="checkbox"
          className="checkbox checkbox-sm"
          aria-label={`Seleccionar recojo ${r.id}`}
          checked={seleccion.includes(r.id)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => toggleSeleccion(r.id)}
        />
      ),
    },
    { header: "Fecha", render: (r) => formatDate(r.fecha) },
    { header: "Hora", render: (r) => formatTime(r.hora) },
    { header: "Cliente", render: (r) => r.cliente_nombre || "—" },
    { header: "Sede", render: (r) => r.sede_nombre || "—" },
    { header: "Viaje", render: (r) => r.viaje_ruta || (r.viaje ? `#${r.viaje}` : "—") },
    { header: "Kg", render: (r) => formatKgPrecise(r.peso_kg) },
    { header: "Estado", render: (r) => <StatusBadge map={ESTADO_RECOJO} value={r.estado} /> },
    {
      header: "Guía",
      render: (r) =>
        r.guia_numero ? (
          <span className="font-mono text-xs">{r.guia_numero}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <>
      <Topbar title="Recojos" />
      <div className="flex min-h-0 flex-1 gap-4 p-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" className={`${filterClass} w-40`} value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <CiudadFields
              filter
              value={ciudad}
              onChange={setCiudad}
              ciudades={ciudades}
              placeholder="Ciudad"
              onNueva={can("clientes") ? () => setModalCiudad(true) : undefined}
            />
            <select className={`${filterSelectClass} w-40`} value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Estado</option>
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completado</option>
            </select>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-muted" />
              <input className={`${filterClass} w-52 pl-9`} placeholder="Cliente, sede o ruta" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {can("guias") && (
            <button
              type="button"
              disabled={!seleccion.length || emitiendo}
              onClick={() => emitirGuias(seleccion)}
              className="btn btn-outline ml-auto"
            >
              <FileText size={16} />
              {seleccion.length > 1
                ? `Guías de ${seleccion.length} recojos`
                : "Guía de remisión"}
            </button>
            )}
            <button type="button" onClick={openNew} className={`btn btn-primary ${can("guias") ? "" : "ml-auto"}`}>
              <Plus size={16} /> Nuevo recojo
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Mini n={kpis.total} label="recojos" />
            <Mini n={formatKg(kpis.kgMes)} label="kg este mes" />
            <Mini n={kpis.delMes} label="recojos del mes" />
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
            <Row label="Hora" value={formatTime(selected.hora)} />
            <Row label="Ciudad" value={selected.ciudad_nombre || "—"} />
            <Row label="Dirección" value={selected.sede_direccion || "—"} />
            <Row label="Viaje" value={selected.viaje_ruta || "—"} />
            <Row label="Vehículo" value={selected.vehiculo_placa || "—"} />
            <Row label="Guía" value={selected.guia_numero || "Sin emitir"} />
            <fieldset className="fieldset mt-4 p-0">
              <legend className="fieldset-legend">Kilogramos</legend>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={pesoEdit}
                onChange={(e) => setPesoEdit(e.target.value)}
              />
            </fieldset>
            {selected.observaciones && (
              <p className="mt-3 text-sm text-muted">{selected.observaciones}</p>
            )}
            <button type="button" disabled={saving} onClick={savePeso} className="btn btn-primary mt-4 w-full">
              Guardar kg
            </button>
            {can("guias") && (
            <button
              type="button"
              disabled={emitiendo}
              onClick={() => emitirGuias([selected.id])}
              className="btn btn-outline mt-2 w-full"
            >
              <FileText size={16} />
              {selected.guia_numero ? "Ver guía de remisión" : "Emitir guía de remisión"}
            </button>
            )}
          </DetailPanel>
        )}
      </div>

      <Modal open={modal} title="Nuevo recojo" onClose={() => setModal(false)} onSubmit={saveNew}>
        <Field label="Viaje en proceso">
          <select className={selectClass} value={form.viaje} onChange={(e) => setForm({ ...form, viaje: e.target.value, sede: "" })}>
            <option value="">Seleccione</option>
            {viajesEnProceso.map((v) => (
              <option key={v.id} value={v.id}>
                #{v.id} {v.ruta_data?.nombre || ""} · {v.vehiculo_data?.placa || ""} · {v.paradas_hechas}/{v.paradas_total} sedes
              </option>
            ))}
          </select>
        </Field>
        {!viajesEnProceso.length && (
          <p className="text-sm text-muted">No hay viajes con sedes pendientes de recojo.</p>
        )}
        <Field label="Sede">
          <select className={selectClass} value={form.sede} onChange={(e) => setForm({ ...form, sede: e.target.value })} disabled={!form.viaje}>
            <option value="">{form.viaje ? "Seleccione una sede pendiente" : "Primero elige un viaje"}</option>
            {sedesPendientes.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre} {s.cliente_nombre ? `· ${s.cliente_nombre}` : ""}</option>
            ))}
          </select>
        </Field>
        {form.viaje && !sedesPendientes.length && (
          <p className="text-sm text-warning">Todas las sedes de este viaje ya tienen recojo.</p>
        )}
        <Field label="Kilogramos">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={form.peso_kg}
            onChange={(e) => setForm({ ...form, peso_kg: e.target.value })}
          />
        </Field>
        <Field label="Observaciones">
          <input className={inputClass} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
        </Field>
      </Modal>
      <NuevaCiudadModal
        open={modalCiudad}
        onClose={() => setModalCiudad(false)}
        onCreated={(nueva) => setCiudades((prev) => mergeCiudad(prev, nueva))}
      />
      <GuiaRemisionModal
        open={!!guiaIds}
        ids={guiaIds || []}
        onClose={() => setGuiaIds(null)}
      />
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
