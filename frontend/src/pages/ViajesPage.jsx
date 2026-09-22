import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FileText, Plus, Search, X } from "lucide-react";
import { ViajeService, VehiculoService, RutaService, UsuarioService, CiudadService, SedeService, GuiaService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal, Field, inputClass, selectClass, filterClass, filterSelectClass } from "@/components/Modal";
import { CiudadFields, NuevaCiudadModal, asCiudades, mergeCiudad } from "@/components/CiudadSelect";
import { GuiaRemisionModal, avisarOmitidos } from "@/components/GuiaRemisionModal";
import { ESTADO_VIAJE, formatKg, formatMoney, formatDate, todayISO } from "@/utils/format";

const emptyViaje = {
  vehiculo: "",
  conductor: "",
  ruta: "",
  fecha_inicio: todayISO(),
  estado: "programado",
  hora_salida: "",
};

const emptyRuta = { nombre: "", descripcion: "", sedes: [] };

export function ViajesPage() {
  const [tab, setTab] = useState("viajes");
  const [viajes, setViajes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [rutas, setRutas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [rutaId, setRutaId] = useState(null);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [fecha, setFecha] = useState("");
  const [modalViaje, setModalViaje] = useState(false);
  const [modalRuta, setModalRuta] = useState(false);
  const [modalCiudad, setModalCiudad] = useState(false);
  const [form, setForm] = useState(emptyViaje);
  const [rutaForm, setRutaForm] = useState(emptyRuta);
  const [sedeToAdd, setSedeToAdd] = useState("");
  const [guiaViaje, setGuiaViaje] = useState(null);
  const [emitiendo, setEmitiendo] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [v, ve, r, u, c, s] = await Promise.all([
        ViajeService.getAll(),
        VehiculoService.getAll(),
        RutaService.getAll(),
        UsuarioService.getAll(),
        CiudadService.getAll(),
        SedeService.getAll(),
      ]);
      setViajes(v.data);
      setVehiculos(ve.data);
      setRutas(r.data);
      setUsuarios(u.data);
      setCiudades(asCiudades(c.data));
      setSedes(s.data);
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
      const hay = `${v.ruta_data?.nombre || ""} ${v.vehiculo_data?.placa || ""} ${v.conductor_data?.nombre || ""}`.toLowerCase();
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

  const selected = viajes.find((v) => v.id === selectedId) || null;
  const selectedRuta = rutas.find((r) => r.id === rutaId) || null;
  const recojoPorSede = Object.fromEntries((selected?.recojos || []).map((r) => [r.sede, r]));

  // Emite las guías de todos los recojos del viaje y abre la vista previa del lote.
  const emitirGuiasViaje = async (viajeId) => {
    setEmitiendo(true);
    try {
      const { data } = await GuiaService.emitir({ viaje: viajeId });
      if (data.nuevas) {
        toast.success(data.nuevas === 1 ? "Guía emitida" : `${data.nuevas} guías emitidas`);
      }
      avisarOmitidos(data.omitidos);
      setGuiaViaje(viajeId);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "No se pudieron emitir las guías", {
        duration: 7000,
      });
    } finally {
      setEmitiendo(false);
    }
  };

  const saveViaje = async () => {
    if (!form.vehiculo || !form.conductor) {
      toast.error("Asigna vehículo y conductor");
      return;
    }
    try {
      await ViajeService.create({
        vehiculo: form.vehiculo,
        conductor: form.conductor,
        ruta: form.ruta || null,
        fecha_inicio: form.fecha_inicio,
        estado: form.estado,
        hora_salida: form.hora_salida || null,
      });
      toast.success("Viaje creado con las sedes de la ruta");
      setModalViaje(false);
      setForm({ ...emptyViaje, fecha_inicio: todayISO() });
      load();
    } catch (err) {
      const data = err?.response?.data;
      const msg = data?.conductor?.[0] || data?.vehiculo?.[0] || "No se pudo crear el viaje";
      toast.error(msg);
    }
  };

  const saveRuta = async () => {
    if (!rutaForm.nombre.trim()) {
      toast.error("Indica el nombre de la ruta");
      return;
    }
    try {
      const { id, ...payload } = rutaForm;
      if (id) {
        await RutaService.update(id, payload);
        toast.success("Ruta actualizada");
      } else {
        await RutaService.create(payload);
        toast.success("Ruta creada");
      }
      setModalRuta(false);
      setRutaForm(emptyRuta);
      load();
    } catch {
      toast.error("No se pudo guardar la ruta");
    }
  };

  const patchSedesViaje = async (nextIds) => {
    if (!selected) return;
    try {
      await ViajeService.patch(selected.id, { sedes: nextIds });
      load();
    } catch {
      toast.error("No se pudieron actualizar las sedes del viaje");
    }
  };

  const addSedeViaje = () => {
    if (!sedeToAdd) return;
    const current = (selected?.sedes_data || []).map((s) => s.id);
    if (current.includes(Number(sedeToAdd))) return;
    patchSedesViaje([...current, Number(sedeToAdd)]);
    setSedeToAdd("");
  };

  const removeSedeViaje = (sedeId) => {
    if (recojoPorSede[sedeId]) {
      toast.error("No se puede quitar una sede que ya tiene recojo");
      return;
    }
    patchSedesViaje((selected?.sedes_data || []).map((s) => s.id).filter((id) => id !== sedeId));
  };

  const toggleSedeRuta = (sedeId) => {
    const ids = rutaForm.sedes.map(Number);
    setRutaForm({
      ...rutaForm,
      sedes: ids.includes(sedeId) ? ids.filter((id) => id !== sedeId) : [...ids, sedeId],
    });
  };

  const columns = [
    { header: "Ruta", render: (v) => v.ruta_data?.nombre || `Viaje #${v.id}` },
    { header: "Vehículo", render: (v) => v.vehiculo_data?.placa || "—" },
    { header: "Conductor", render: (v) => v.conductor_data?.nombre || "—" },
    { header: "Estado", render: (v) => <StatusBadge map={ESTADO_VIAJE} value={v.estado} /> },
    {
      header: "Progreso",
      render: (v) => {
        const total = v.paradas_total || 0;
        const hechas = v.paradas_hechas || 0;
        const pct = total ? Math.round((hechas / total) * 100) : 0;
        return `${hechas}/${total} sedes · ${pct}%`;
      },
    },
    { header: "Kg", render: (v) => formatKg(v.kg_total) },
  ];

  const rutaColumns = [
    { header: "Ruta", accessor: "nombre" },
    { header: "Sedes", render: (r) => r.sedes_count ?? (r.sedes_data || []).length },
    { header: "Descripción", render: (r) => r.descripcion || "—" },
  ];

  const sedesDisponiblesViaje = sedes.filter((s) => !(selected?.sedes_data || []).some((x) => x.id === s.id));
  const gastos = selected?.gastos || [];

  return (
    <>
      <Topbar title="Rutas y viajes" />
      <div className="flex min-h-0 flex-1 gap-4 p-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={`btn btn-sm rounded-full ${tab === "viajes" ? "btn-primary" : "btn-ghost bg-base-100"}`} onClick={() => setTab("viajes")}>
              Viajes
            </button>
            <button type="button" className={`btn btn-sm rounded-full ${tab === "rutas" ? "btn-primary" : "btn-ghost bg-base-100"}`} onClick={() => setTab("rutas")}>
              Rutas
            </button>
            {tab === "viajes" && (
              <button type="button" onClick={() => setModalViaje(true)} className="btn btn-primary ml-auto">
                <Plus size={16} /> Nuevo viaje
              </button>
            )}
            {tab === "rutas" && (
              <button
                type="button"
                onClick={() => { setRutaForm(emptyRuta); setModalRuta(true); }}
                className="btn btn-primary ml-auto"
              >
                <Plus size={16} /> Nueva ruta
              </button>
            )}
          </div>

          {tab === "viajes" && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <CiudadFields
                  filter
                  value={ciudad}
                  onChange={setCiudad}
                  ciudades={ciudades}
                  placeholder="Ciudad"
                  onNueva={() => setModalCiudad(true)}
                />
                <input type="date" className={`${filterClass} w-40`} value={fecha} onChange={(e) => setFecha(e.target.value)} />
                <select className={`${filterSelectClass} w-40`} value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="">Estado</option>
                  <option value="programado">Pendiente</option>
                  <option value="en curso">En proceso</option>
                  <option value="completado">Completado</option>
                </select>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-muted" />
                  <input className={`${filterClass} w-48 pl-9`} placeholder="Buscar ruta, placa o conductor" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <Mini n={kpis.total} label="viajes" />
                <Mini n={kpis.curso} label="en proceso" />
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
            </>
          )}

          {tab === "rutas" && (
            <DataTable
              columns={rutaColumns}
              data={rutas}
              loading={loading}
              onRowClick={(row) => setRutaId(row.id)}
              selectedId={selectedRuta?.id}
              empty="No hay rutas. Crea un paquete de sedes."
            />
          )}
        </div>

        {tab === "viajes" && selected && (
          <DetailPanel
            title={selected.ruta_data?.nombre || `Viaje #${selected.id}`}
            badge={<StatusBadge map={ESTADO_VIAJE} value={selected.estado} />}
            onClose={() => setSelectedId(null)}
          >
            <Row label="Vehículo" value={selected.vehiculo_data ? `${selected.vehiculo_data.placa} ${selected.vehiculo_data.marca}` : "—"} />
            <Row label="Conductor" value={selected.conductor_data?.nombre || "—"} />
            <Row label="Ciudad" value={selected.ciudad || "—"} />
            <Row label="Salida" value={selected.hora_salida || "—"} />
            <Row label="Fecha" value={formatDate(selected.fecha_inicio)} />

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">
              Progreso {selected.paradas_hechas}/{selected.paradas_total} sedes
            </h3>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-base-300">
              <div
                className="h-full bg-primary"
                style={{ width: `${selected.paradas_total ? (selected.paradas_hechas / selected.paradas_total) * 100 : 0}%` }}
              />
            </div>
            <ol className="space-y-2">
              {(selected.sedes_data || []).map((s, i) => {
                const recojo = recojoPorSede[s.id];
                return (
                  <li key={s.id} className="flex items-start justify-between gap-2 text-sm">
                    <span>
                      <span className="mr-2 font-semibold text-primary">{i + 1}</span>
                      {s.nombre}
                      <span className="block text-xs text-muted">
                        {s.cliente_nombre || "—"} · {recojo ? formatKg(recojo.peso_kg) : "sin recojo"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      {recojo
                        ? <span className="badge badge-success">Con recojo</span>
                        : (
                          <button type="button" className="btn btn-ghost btn-xs" onClick={() => removeSedeViaje(s.id)} title="Quitar sede">
                            <X size={14} />
                          </button>
                        )}
                    </span>
                  </li>
                );
              })}
              {!(selected.sedes_data || []).length && <p className="text-sm text-muted">Sin sedes. Agrégalas abajo o asocia una ruta.</p>}
            </ol>
            <div className="mt-3 flex gap-2">
              <select className={selectClass} value={sedeToAdd} onChange={(e) => setSedeToAdd(e.target.value)}>
                <option value="">Agregar sede</option>
                {sedesDisponiblesViaje.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre} {s.cliente_nombre ? `· ${s.cliente_nombre}` : ""}</option>
                ))}
              </select>
              <button type="button" className="btn btn-outline" onClick={addSedeViaje} disabled={!sedeToAdd}>Añadir</button>
            </div>

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Costos del viaje</h3>
            {gastos.map((g) => (
              <Row key={g.id} label={g.tipo.replace("_", " ")} value={formatMoney(g.monto)} />
            ))}
            <Row label="Total" value={formatMoney(selected.costo_total)} />
            {!gastos.length && <p className="text-sm text-muted">Sin gastos registrados</p>}

            <button
              type="button"
              disabled={emitiendo || !selected.paradas_hechas}
              onClick={() => emitirGuiasViaje(selected.id)}
              className="btn btn-outline mt-5 w-full"
            >
              <FileText size={16} /> Guías de toda la ruta
            </button>
            {!selected.paradas_hechas && (
              <p className="mt-2 text-xs text-muted">
                Aún no hay recojos registrados en este viaje.
              </p>
            )}
          </DetailPanel>
        )}

        {tab === "rutas" && selectedRuta && (
          <DetailPanel
            title={selectedRuta.nombre}
            subtitle={`${(selectedRuta.sedes_data || []).length} sedes`}
            onClose={() => setRutaId(null)}
          >
            <p className="mb-4 text-sm text-muted">{selectedRuta.descripcion || "Sin descripción"}</p>
            <ol className="space-y-2">
              {(selectedRuta.sedes_data || []).map((s, i) => (
                <li key={s.id} className="text-sm">
                  <span className="mr-2 font-semibold text-primary">{i + 1}</span>
                  {s.nombre}
                  <span className="block text-xs text-muted">{s.cliente_nombre} · {s.ciudad_nombre || "—"}</span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn btn-outline mt-4 w-full"
              onClick={() => {
                setRutaForm({
                  id: selectedRuta.id,
                  nombre: selectedRuta.nombre,
                  descripcion: selectedRuta.descripcion || "",
                  sedes: (selectedRuta.sedes || selectedRuta.sedes_data || []).map((s) => s.id || s),
                });
                setModalRuta(true);
              }}
            >
              Editar sedes de la ruta
            </button>
          </DetailPanel>
        )}
      </div>

      <Modal open={modalViaje} title="Nuevo viaje" onClose={() => setModalViaje(false)} onSubmit={saveViaje}>
        <Field label="Ruta">
          <select className={selectClass} value={form.ruta} onChange={(e) => setForm({ ...form, ruta: e.target.value })}>
            <option value="">Sin ruta (agregar sedes después)</option>
            {rutas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre} · {r.sedes_count ?? (r.sedes_data || []).length} sedes
              </option>
            ))}
          </select>
        </Field>
        <Field label="Vehículo">
          <select className={selectClass} value={form.vehiculo} onChange={(e) => setForm({ ...form, vehiculo: e.target.value })}>
            <option value="">Seleccione</option>
            {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.marca}</option>)}
          </select>
        </Field>
        <Field label="Conductor responsable">
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

      <Modal
        open={modalRuta}
        wide
        title={rutaForm.id ? "Editar ruta" : "Nueva ruta"}
        onClose={() => setModalRuta(false)}
        onSubmit={saveRuta}
      >
        <Field label="Nombre">
          <input className={inputClass} value={rutaForm.nombre} onChange={(e) => setRutaForm({ ...rutaForm, nombre: e.target.value })} />
        </Field>
        <Field label="Descripción">
          <input className={inputClass} value={rutaForm.descripcion} onChange={(e) => setRutaForm({ ...rutaForm, descripcion: e.target.value })} />
        </Field>
        <p className="text-xs font-semibold uppercase text-muted">Sedes del paquete</p>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-box border border-base-300 p-2">
          {sedes.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-base-200">
              <input
                type="checkbox"
                className="checkbox checkbox-sm checkbox-primary"
                checked={rutaForm.sedes.map(Number).includes(s.id)}
                onChange={() => toggleSedeRuta(s.id)}
              />
              <span>{s.nombre} {s.cliente_nombre ? `· ${s.cliente_nombre}` : ""}</span>
            </label>
          ))}
          {!sedes.length && <p className="p-2 text-sm text-muted">No hay sedes cargadas</p>}
        </div>
      </Modal>
      <NuevaCiudadModal
        open={modalCiudad}
        onClose={() => setModalCiudad(false)}
        onCreated={(nueva) => setCiudades((prev) => mergeCiudad(prev, nueva))}
      />
      <GuiaRemisionModal
        open={!!guiaViaje}
        viaje={guiaViaje}
        onClose={() => setGuiaViaje(null)}
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
      <span className="text-muted capitalize">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
