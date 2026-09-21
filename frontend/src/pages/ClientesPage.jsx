import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search, Trash2 } from "lucide-react";
import { ClienteService, CiudadService, SedeService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal, Field, inputClass, selectClass } from "@/components/Modal";
import { CiudadFields, NuevaCiudadModal, asCiudades, mergeCiudad } from "@/components/CiudadSelect";
import { formatDate, formatKg, clasificarDocumento, NATURALEZA_CLIENTE } from "@/utils/format";
import { formatApiError } from "@/utils/formatApiError";

const TIPO = {
  publico: { label: "Público", className: "badge-info" },
  privado: { label: "Privado", className: "badge-secondary" },
};
const ESTADO = {
  activo: { label: "Activo", className: "badge-success" },
  suspendido: { label: "Suspendido", className: "badge-error" },
};

const emptyContacto = () => ({
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  cargo: "",
  celular: "",
});

const emptySede = () => ({
  nombre: "",
  direccion: "",
  ciudad: "",
  contacto: 0,
});

const emptyClienteForm = () => ({
  numero_documento: "",
  razon_social: "",
  tipo: "privado",
  estado: "activo",
  titular: emptyContacto(),
  contactos: [],
  sedes: [emptySede()],
});

const emptySedeForm = (clienteId = "") => ({
  cliente: clienteId ? String(clienteId) : "",
  nombre: "",
  direccion: "",
  ciudad: "",
  modoPersona: "existente",
  persona: "",
  persona_nueva: emptyContacto(),
});

function contactoLabel(c, i) {
  const nombre = `${c.nombre || ""} ${c.apellido_paterno || ""}`.trim();
  return nombre || `Contacto ${i + 1}`;
}

function personaLabel(p) {
  const nombre = p.celulares_lista?.length
    ? `${p.nombre} ${p.apellido_paterno} · ${p.celulares_lista[0]}`
    : `${p.nombre} ${p.apellido_paterno}`;
  return nombre.trim();
}

export function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("todos");
  const [seccion, setSeccion] = useState("clientes");
  const [q, setQ] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [ciudades, setCiudades] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modalCliente, setModalCliente] = useState(false);
  const [modalSede, setModalSede] = useState(false);
  const [modalCiudad, setModalCiudad] = useState(false);
  const [form, setForm] = useState(emptyClienteForm);
  const [sedeForm, setSedeForm] = useState(emptySedeForm);
  const ciudadAssignRef = useRef(null);

  const load = () => {
    setLoading(true);
    Promise.all([ClienteService.getAll(), CiudadService.getAll()])
      .then(([c, ci]) => {
        setClientes(c.data);
        setCiudades(asCiudades(ci.data));
        setSelected((prev) => (prev ? c.data.find((x) => x.id === prev.id) || null : null));
      })
      .catch(() => toast.error("No se pudieron cargar clientes o ciudades"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return clientes.filter((c) => {
      if (tab !== "todos" && c.tipo !== tab) return false;
      if (ciudad && String(c.ciudad_principal?.id) !== String(ciudad)) return false;
      const hay = `${c.razon_social} ${c.numero_documento}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [clientes, tab, q, ciudad]);

  const stats = {
    total: clientes.length,
    publicos: clientes.filter((c) => c.tipo === "publico").length,
    privados: clientes.filter((c) => c.tipo === "privado").length,
  };

  const naturaleza = clasificarDocumento(form.numero_documento);
  const encargadosForm = naturaleza === "persona" ? [form.titular, ...form.contactos] : form.contactos;
  const clienteSede = clientes.find((c) => String(c.id) === String(sedeForm.cliente));
  const personasCliente = clienteSede?.personas_data || [];

  const openNuevaCiudad = (assign) => {
    ciudadAssignRef.current = assign || null;
    setModalCiudad(true);
  };

  const onCiudadCreada = (nueva) => {
    setCiudades((prev) => mergeCiudad(prev, nueva));
    ciudadAssignRef.current?.(String(nueva.id));
    ciudadAssignRef.current = null;
  };

  const ciudadColumns = [
    { header: "Ciudad", accessor: "nombre" },
    { header: "Distrito", render: (c) => c.distrito || "—" },
    { header: "Departamento", render: (c) => c.departamento || "—" },
  ];

  const openCliente = () => {
    setForm(emptyClienteForm());
    setModalCliente(true);
  };

  const openSede = (clienteId) => {
    const id = clienteId || selected?.id || "";
    const cliente = clientes.find((c) => String(c.id) === String(id));
    const tienePersonas = (cliente?.personas_data || []).length > 0;
    setSedeForm({
      ...emptySedeForm(id),
      modoPersona: tienePersonas ? "existente" : "nueva",
      persona: tienePersonas ? String(cliente.personas_data[0].id) : "",
    });
    setModalSede(true);
  };

  const setContacto = (i, patch) => {
    setForm((prev) => {
      const contactos = prev.contactos.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
      return { ...prev, contactos };
    });
  };

  const addContacto = () => {
    setForm((prev) => ({ ...prev, contactos: [...prev.contactos, emptyContacto()] }));
  };

  const removeContacto = (i) => {
    setForm((prev) => {
      const min = clasificarDocumento(prev.numero_documento) === "persona" ? 0 : 1;
      if (prev.contactos.length <= min) return prev;
      const contactos = prev.contactos.filter((_, idx) => idx !== i);
      const offset = clasificarDocumento(prev.numero_documento) === "persona" ? 1 : 0;
      const maxIdx = Math.max(contactos.length + offset - 1, 0);
      const sedes = prev.sedes.map((s) => ({
        ...s,
        contacto: Math.min(s.contacto, maxIdx),
      }));
      return { ...prev, contactos, sedes };
    });
  };

  const setSede = (i, patch) => {
    setForm((prev) => {
      const sedes = prev.sedes.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
      return { ...prev, sedes };
    });
  };

  const addSede = () => {
    setForm((prev) => ({ ...prev, sedes: [...prev.sedes, emptySede()] }));
  };

  const removeSede = (i) => {
    setForm((prev) => {
      if (prev.sedes.length <= 1) return prev;
      return { ...prev, sedes: prev.sedes.filter((_, idx) => idx !== i) };
    });
  };

  const setDocumento = (value) => {
    const next = clasificarDocumento(value);
    setForm((prev) => ({
      ...prev,
      numero_documento: value,
      contactos: next === "empresa" && prev.contactos.length === 0 ? [emptyContacto()] : prev.contactos,
    }));
  };

  const setTitular = (patch) => {
    setForm((prev) => ({ ...prev, titular: { ...prev.titular, ...patch } }));
  };

  const saveCliente = async () => {
    const tipoCliente = clasificarDocumento(form.numero_documento);
    if (!tipoCliente) {
      toast.error("Ingresa un RUC (11 dígitos) o DNI (8 dígitos) válido");
      return;
    }
    if (tipoCliente === "empresa" && !form.razon_social.trim()) {
      toast.error("La razón social es obligatoria");
      return;
    }
    if (tipoCliente === "persona" && (!form.titular.nombre.trim() || !form.titular.apellido_paterno.trim())) {
      toast.error("La persona necesita nombre y apellido");
      return;
    }
    const contactos = tipoCliente === "empresa" ? form.contactos : form.contactos.filter((c) => c.nombre.trim() || c.apellido_paterno.trim());
    if (tipoCliente === "empresa") {
      for (const [i, c] of contactos.entries()) {
        if (!c.nombre.trim() || !c.apellido_paterno.trim()) {
          toast.error(`El contacto ${i + 1} necesita nombre y apellido`);
          return;
        }
      }
    }
    for (const [i, s] of form.sedes.entries()) {
      if (!s.direccion.trim() || !s.ciudad) {
        toast.error(`La sede ${i + 1} necesita ciudad y dirección`);
        return;
      }
    }
    try {
      await ClienteService.create({
        numero_documento: form.numero_documento.replace(/\D/g, ""),
        razon_social: tipoCliente === "empresa" ? form.razon_social.trim() : "",
        tipo: form.tipo,
        estado: form.estado,
        persona_input: tipoCliente === "persona" ? form.titular : undefined,
        contactos_input: contactos,
        sedes_input: form.sedes.map((s) => ({
          nombre: s.nombre.trim(),
          direccion: s.direccion.trim(),
          ciudad: Number(s.ciudad),
          contacto: Number(s.contacto),
        })),
      });
      toast.success("Cliente y sedes creados");
      setModalCliente(false);
      setForm(emptyClienteForm());
      load();
    } catch (err) {
      toast.error(formatApiError(err).join(" · "));
    }
  };

  const saveSede = async () => {
    if (!sedeForm.cliente || !sedeForm.ciudad || !sedeForm.direccion.trim()) {
      toast.error("Cliente, ciudad y dirección son obligatorios");
      return;
    }
    const payload = {
      cliente: Number(sedeForm.cliente),
      ciudad: Number(sedeForm.ciudad),
      direccion: sedeForm.direccion.trim(),
      nombre: sedeForm.nombre.trim(),
    };
    if (sedeForm.modoPersona === "nueva") {
      const p = sedeForm.persona_nueva;
      if (!p.nombre.trim() || !p.apellido_paterno.trim()) {
        toast.error("El encargado necesita nombre y apellido");
        return;
      }
      payload.persona_input = { ...p };
    } else {
      if (!sedeForm.persona) {
        toast.error("Selecciona un encargado o registra uno nuevo");
        return;
      }
      payload.persona = Number(sedeForm.persona);
    }
    try {
      await SedeService.create(payload);
      toast.success("Sede creada");
      setModalSede(false);
      load();
    } catch (err) {
      toast.error(formatApiError(err).join(" · "));
    }
  };

  const columns = [
    { header: "Cliente", accessor: "razon_social" },
    { header: "Documento", accessor: "numero_documento" },
    { header: "Naturaleza", render: (c) => <StatusBadge map={NATURALEZA_CLIENTE} value={c.naturaleza} /> },
    { header: "Tipo", render: (c) => <StatusBadge map={TIPO} value={c.tipo} /> },
    { header: "Ciudad", render: (c) => c.ciudad_principal?.nombre || "—" },
    { header: "Sedes", render: (c) => c.sedes_data?.length || 0 },
    { header: "Último recojo", render: (c) => formatDate(c.ultimo_recojo) },
    { header: "Kg mes", render: (c) => formatKg(c.kg_mes) },
    { header: "Estado", render: (c) => <StatusBadge map={ESTADO} value={c.estado} /> },
  ];

  return (
    <>
      <Topbar title="Clientes" />
      <div className="flex min-h-0 flex-1 gap-4 p-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {["clientes", "ciudades"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeccion(s)}
                className={`btn btn-sm ${seccion === s ? "btn-primary" : "btn-ghost bg-base-100"}`}
              >
                {s === "clientes" ? "Clientes" : "Ciudades"}
              </button>
            ))}
            {seccion === "clientes" && (
              <>
            {["todos", "publico", "privado"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`btn btn-sm rounded-full ${tab === t ? "btn-primary" : "btn-ghost bg-base-100"}`}
              >
                {t === "todos" ? "Todos" : t === "publico" ? "Públicos" : "Privados"}
              </button>
            ))}
            <div className="relative ml-auto">
              <Search size={16} className="absolute left-3 top-2.5 text-muted" />
              <input className={`${inputClass} w-56 pl-9`} placeholder="Buscar cliente…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <CiudadFields
              filter
              value={ciudad}
              onChange={setCiudad}
              ciudades={ciudades}
              placeholder="Ciudad"
              onNueva={() => openNuevaCiudad()}
            />
            <button type="button" onClick={() => openSede()} className="btn btn-ghost bg-base-100">
              <Plus size={16} /> Nueva sede
            </button>
            <button type="button" onClick={openCliente} className="btn btn-primary">
              <Plus size={16} /> Nuevo cliente
            </button>
              </>
            )}
            {seccion === "ciudades" && (
              <button type="button" className="btn btn-primary ml-auto" onClick={() => openNuevaCiudad()}>
                <Plus size={16} /> Nueva ciudad
              </button>
            )}
          </div>
          {seccion === "clientes" && (
            <>
          <div className="grid grid-cols-3 gap-3">
            <div className="stat rounded-box bg-base-100 shadow-sm">
              <div className="stat-value text-2xl">{stats.total}</div>
              <div className="stat-desc">clientes</div>
            </div>
            <div className="stat rounded-box bg-base-100 shadow-sm">
              <div className="stat-value text-2xl">{stats.publicos}</div>
              <div className="stat-desc">públicos</div>
            </div>
            <div className="stat rounded-box bg-base-100 shadow-sm">
              <div className="stat-value text-2xl">{stats.privados}</div>
              <div className="stat-desc">privados</div>
            </div>
          </div>
          <DataTable columns={columns} data={filtered} loading={loading} onRowClick={setSelected} selectedId={selected?.id} />
            </>
          )}
          {seccion === "ciudades" && (
            <DataTable
              columns={ciudadColumns}
              data={ciudades}
              loading={loading}
              empty="No hay ciudades. Crea la primera con Nueva ciudad."
            />
          )}
        </div>
        {seccion === "clientes" && selected && (
          <DetailPanel
            title={selected.razon_social}
            subtitle={selected.naturaleza === "persona" ? "Persona natural" : "Empresa"}
            badge={<StatusBadge map={ESTADO} value={selected.estado} />}
            onClose={() => setSelected(null)}
          >
            <Section title="Identificación">
              <Row label="Documento" value={selected.numero_documento} />
              <Row label="Naturaleza" value={selected.naturaleza === "persona" ? "Persona natural" : "Empresa"} />
              <Row label="Sector" value={selected.tipo === "publico" ? "Público" : "Privado"} />
            </Section>
            <Section title="Información de contacto">
              {(selected.personas_data || []).map((p) => (
                <div key={p.id} className="mb-2 rounded-box bg-base-200/60 p-2 text-sm">
                  <p className="font-medium">{p.nombre} {p.apellido_paterno} {p.apellido_materno}</p>
                  <p className="text-muted">{p.cargo || "Sin cargo"} · {p.celulares_lista?.[0] || "Sin celular"}</p>
                </div>
              ))}
              {!(selected.personas_data || []).length && <p className="text-sm text-muted">Sin contactos</p>}
            </Section>
            <Section title="Sedes">
              {(selected.sedes_data || []).map((s) => (
                <div key={s.id} className="mb-2 rounded-box bg-base-200/60 p-2 text-sm">
                  <p className="font-medium">{s.nombre}</p>
                  <p className="text-muted">{s.ciudad || "—"} · {s.direccion}</p>
                  <p className="text-muted">
                    Encargado: {s.persona?.nombre || "Sin asignar"}
                    {s.persona?.celular ? ` · ${s.persona.celular}` : ""}
                  </p>
                </div>
              ))}
              {!(selected.sedes_data || []).length && <p className="text-sm text-muted">Sin sedes</p>}
              <button type="button" className="btn btn-sm btn-primary mt-2" onClick={() => openSede(selected.id)}>
                <Plus size={14} /> Agregar sede
              </button>
            </Section>
            <Section title="Este mes">
              <Row label="Kg recolectados" value={formatKg(selected.kg_mes)} />
              <Row label="Último recojo" value={formatDate(selected.ultimo_recojo)} />
            </Section>
          </DetailPanel>
        )}
      </div>

      <Modal
        open={modalCliente}
        wide
        title="Nuevo cliente"
        submitLabel="Crear cliente"
        onClose={() => setModalCliente(false)}
        onSubmit={saveCliente}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="RUC / DNI">
            <input
              className={inputClass}
              value={form.numero_documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="20… empresa · 10… o DNI persona"
            />
          </Field>
          <Field label="Sector">
            <select className={selectClass} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="publico">Público</option>
              <option value="privado">Privado</option>
            </select>
          </Field>
          {naturaleza === "empresa" && (
            <Field label="Razón social">
              <input className={inputClass} value={form.razon_social} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
            </Field>
          )}
        </div>
        {!naturaleza && (
          <p className="text-sm text-muted">El RUC define si el cliente es empresa (20) o persona natural (10, 15, 17 o DNI).</p>
        )}

        {naturaleza === "persona" && (
          <>
            <div className="divider my-1">Persona</div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nombre">
                <input className={inputClass} value={form.titular.nombre} onChange={(e) => setTitular({ nombre: e.target.value })} />
              </Field>
              <Field label="Apellido paterno">
                <input className={inputClass} value={form.titular.apellido_paterno} onChange={(e) => setTitular({ apellido_paterno: e.target.value })} />
              </Field>
              <Field label="Apellido materno">
                <input className={inputClass} value={form.titular.apellido_materno} onChange={(e) => setTitular({ apellido_materno: e.target.value })} />
              </Field>
              <Field label="Celular">
                <input className={inputClass} maxLength={9} value={form.titular.celular} onChange={(e) => setTitular({ celular: e.target.value })} />
              </Field>
            </div>
          </>
        )}

        {naturaleza && (
          <>
        <div className="divider my-1">{naturaleza === "empresa" ? "Contactos" : "Otros contactos"}</div>
        <p className="text-xs text-muted">
          Cada sede necesita un encargado. Puede ser la misma persona en todas, pero conviene registrar más de un contacto.
        </p>
        {form.contactos.map((c, i) => (
          <div key={i} className="rounded-box border border-base-300 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{contactoLabel(c, i)}</span>
              {form.contactos.length > (naturaleza === "persona" ? 0 : 1) && (
                <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => removeContacto(i)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nombre">
                <input className={inputClass} value={c.nombre} onChange={(e) => setContacto(i, { nombre: e.target.value })} />
              </Field>
              <Field label="Apellido paterno">
                <input className={inputClass} value={c.apellido_paterno} onChange={(e) => setContacto(i, { apellido_paterno: e.target.value })} />
              </Field>
              <Field label="Apellido materno">
                <input className={inputClass} value={c.apellido_materno} onChange={(e) => setContacto(i, { apellido_materno: e.target.value })} />
              </Field>
              <Field label="Cargo">
                <input className={inputClass} value={c.cargo} onChange={(e) => setContacto(i, { cargo: e.target.value })} />
              </Field>
              <Field label="Celular">
                <input className={inputClass} maxLength={9} value={c.celular} onChange={(e) => setContacto(i, { celular: e.target.value })} />
              </Field>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-sm btn-ghost" onClick={addContacto}>
          <Plus size={14} /> Otro contacto
        </button>

        <div className="divider my-1">Sedes</div>
        {form.sedes.map((s, i) => (
          <div key={i} className="rounded-box border border-base-300 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Sede {i + 1}</span>
              {form.sedes.length > 1 && (
                <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => removeSede(i)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Nombre (opcional)">
                <input className={inputClass} placeholder="Se genera si lo dejas vacío" value={s.nombre} onChange={(e) => setSede(i, { nombre: e.target.value })} />
              </Field>
              <Field label="Ciudad">
                <CiudadFields
                  value={s.ciudad}
                  onChange={(v) => setSede(i, { ciudad: v })}
                  ciudades={ciudades}
                  onNueva={() => openNuevaCiudad((id) => setSede(i, { ciudad: id }))}
                />
              </Field>
              <Field label="Dirección">
                <input className={inputClass} value={s.direccion} onChange={(e) => setSede(i, { direccion: e.target.value })} />
              </Field>
              <Field label="Encargado">
                <select className={selectClass} value={s.contacto} onChange={(e) => setSede(i, { contacto: Number(e.target.value) })}>
                  {encargadosForm.map((c, idx) => (
                    <option key={idx} value={idx}>{contactoLabel(c, idx)}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-sm btn-ghost" onClick={addSede}>
          <Plus size={14} /> Otra sede
        </button>
          </>
        )}
      </Modal>

      <Modal
        open={modalSede}
        title="Nueva sede"
        submitLabel="Crear sede"
        onClose={() => setModalSede(false)}
        onSubmit={saveSede}
      >
        <Field label="Cliente">
          <select
            className={selectClass}
            value={sedeForm.cliente}
            onChange={(e) => {
              const id = e.target.value;
              const cliente = clientes.find((c) => String(c.id) === String(id));
              const tienePersonas = (cliente?.personas_data || []).length > 0;
              setSedeForm({
                ...sedeForm,
                cliente: id,
                modoPersona: tienePersonas ? "existente" : "nueva",
                persona: tienePersonas ? String(cliente.personas_data[0].id) : "",
              });
            }}
          >
            <option value="">Seleccionar</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
          </select>
        </Field>
        <Field label="Nombre (opcional)">
          <input className={inputClass} placeholder="Se genera si lo dejas vacío" value={sedeForm.nombre} onChange={(e) => setSedeForm({ ...sedeForm, nombre: e.target.value })} />
        </Field>
        <Field label="Ciudad">
          <CiudadFields
            value={sedeForm.ciudad}
            onChange={(v) => setSedeForm({ ...sedeForm, ciudad: v })}
            ciudades={ciudades}
            onNueva={() => openNuevaCiudad((id) => setSedeForm((prev) => ({ ...prev, ciudad: id })))}
          />
        </Field>
        <Field label="Dirección">
          <input className={inputClass} value={sedeForm.direccion} onChange={(e) => setSedeForm({ ...sedeForm, direccion: e.target.value })} />
        </Field>
        <Field label="Encargado">
          <div className="flex gap-2">
            <button
              type="button"
              className={`btn btn-sm ${sedeForm.modoPersona === "existente" ? "btn-primary" : "btn-ghost"}`}
              disabled={!personasCliente.length}
              onClick={() => setSedeForm({ ...sedeForm, modoPersona: "existente" })}
            >
              Contacto del cliente
            </button>
            <button
              type="button"
              className={`btn btn-sm ${sedeForm.modoPersona === "nueva" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setSedeForm({ ...sedeForm, modoPersona: "nueva" })}
            >
              Nuevo contacto
            </button>
          </div>
        </Field>
        {sedeForm.modoPersona === "existente" ? (
          <Field label="Persona">
            <select className={selectClass} value={sedeForm.persona} onChange={(e) => setSedeForm({ ...sedeForm, persona: e.target.value })}>
              <option value="">Seleccionar</option>
              {personasCliente.map((p) => (
                <option key={p.id} value={p.id}>{personaLabel(p)}</option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nombre">
              <input className={inputClass} value={sedeForm.persona_nueva.nombre} onChange={(e) => setSedeForm({ ...sedeForm, persona_nueva: { ...sedeForm.persona_nueva, nombre: e.target.value } })} />
            </Field>
            <Field label="Apellido paterno">
              <input className={inputClass} value={sedeForm.persona_nueva.apellido_paterno} onChange={(e) => setSedeForm({ ...sedeForm, persona_nueva: { ...sedeForm.persona_nueva, apellido_paterno: e.target.value } })} />
            </Field>
            <Field label="Cargo">
              <input className={inputClass} value={sedeForm.persona_nueva.cargo} onChange={(e) => setSedeForm({ ...sedeForm, persona_nueva: { ...sedeForm.persona_nueva, cargo: e.target.value } })} />
            </Field>
            <Field label="Celular">
              <input className={inputClass} maxLength={9} value={sedeForm.persona_nueva.celular} onChange={(e) => setSedeForm({ ...sedeForm, persona_nueva: { ...sedeForm.persona_nueva, celular: e.target.value } })} />
            </Field>
          </div>
        )}
      </Modal>
      <NuevaCiudadModal
        open={modalCiudad}
        onClose={() => { setModalCiudad(false); ciudadAssignRef.current = null; }}
        onCreated={onCiudadCreada}
      />
    </>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="mb-1 flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
