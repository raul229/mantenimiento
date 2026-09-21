import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { ClienteService, CiudadService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal, Field, inputClass, selectClass } from "@/components/Modal";
import { formatDate, formatKg } from "@/utils/format";

const TIPO = {
  publico: { label: "Público", className: "badge-info" },
  privado: { label: "Privado", className: "badge-secondary" },
};
const ESTADO = {
  activo: { label: "Activo", className: "badge-success" },
  suspendido: { label: "Suspendido", className: "badge-error" },
};

const emptyForm = { numero_documento: "", razon_social: "", tipo: "privado", estado: "activo" };

export function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("todos");
  const [q, setQ] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [ciudades, setCiudades] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    Promise.all([ClienteService.getAll(), CiudadService.getAll()])
      .then(([c, ci]) => {
        setClientes(c.data);
        setCiudades(ci.data);
      })
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

  const save = async () => {
    try {
      await ClienteService.create(form);
      toast.success("Cliente creado");
      setModal(false);
      setForm(emptyForm);
      load();
    } catch {
      toast.error("No se pudo crear el cliente");
    }
  };

  const columns = [
    { header: "Cliente", accessor: "razon_social" },
    { header: "Tipo", render: (c) => <StatusBadge map={TIPO} value={c.tipo} /> },
    { header: "Ciudad", render: (c) => c.ciudad_principal?.nombre || "—" },
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
            <select className={`${selectClass} w-40`} value={ciudad} onChange={(e) => setCiudad(e.target.value)}>
              <option value="">Ciudad</option>
              {ciudades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setModal(true)}
              className="btn btn-primary"
            >
              <Plus size={16} /> Nuevo cliente
            </button>
          </div>
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
        </div>
        {selected && (
          <DetailPanel
            title={selected.razon_social}
            subtitle={selected.tipo === "publico" ? "Público" : "Privado"}
            badge={<StatusBadge map={ESTADO} value={selected.estado} />}
            onClose={() => setSelected(null)}
          >
            <Section title="Información de contacto">
              <Row label="RUC / DNI" value={selected.numero_documento} />
              <Row label="Contacto" value={selected.contacto?.nombre || "—"} />
              <Row label="Cargo" value={selected.contacto?.cargo || "—"} />
              <Row label="Celular" value={selected.contacto?.celular || "—"} />
            </Section>
            <Section title="Sedes">
              {(selected.sedes_data || []).map((s) => (
                <p key={s.id} className="mb-1 text-sm">{s.nombre} · {s.direccion}</p>
              ))}
              {!(selected.sedes_data || []).length && <p className="text-sm text-muted">Sin sedes</p>}
            </Section>
            <Section title="Este mes">
              <Row label="Kg recolectados" value={formatKg(selected.kg_mes)} />
              <Row label="Último recojo" value={formatDate(selected.ultimo_recojo)} />
            </Section>
          </DetailPanel>
        )}
      </div>
      <Modal open={modal} title="Nuevo cliente" onClose={() => setModal(false)} onSubmit={save}>
        <Field label="RUC / DNI">
          <input className={inputClass} value={form.numero_documento} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} />
        </Field>
        <Field label="Razón social">
          <input className={inputClass} value={form.razon_social} onChange={(e) => setForm({ ...form, razon_social: e.target.value })} />
        </Field>
        <Field label="Tipo">
          <select className={selectClass} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="publico">Público</option>
            <option value="privado">Privado</option>
          </select>
        </Field>
      </Modal>
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
