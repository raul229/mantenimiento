import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { PersonalService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { Modal, Field, inputClass, selectClass, filterClass } from "@/components/Modal";
import { ROLES } from "@/utils/roles";
import { useAuth } from "@/context/AuthContext";

const vacio = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  rol: "conductor",
  is_active: true,
  password: "",
};

export function UsuariosPage() {
  const { user: yo } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(vacio);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await PersonalService.getAll();
      setUsuarios(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const selected = usuarios.find((u) => u.id === selectedId) || null;
  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return usuarios.filter((u) =>
      `${u.username} ${u.nombre} ${u.rol}`.toLowerCase().includes(t),
    );
  }, [usuarios, q]);

  const guardar = async () => {
    if (!form.username.trim()) {
      toast.error("Indica el usuario");
      return;
    }
    if (!form.id && !form.password) {
      toast.error("Indica una contraseña");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        username: form.username.trim(),
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        rol: form.rol,
        is_active: form.is_active,
      };
      if (form.password) payload.password = form.password;
      if (form.id) {
        await PersonalService.patch(form.id, payload);
        toast.success("Usuario actualizado");
      } else {
        await PersonalService.create(payload);
        toast.success("Usuario creado");
      }
      setModal(false);
      setForm(vacio);
      load();
    } catch (err) {
      const data = err?.response?.data;
      const msg = data?.username?.[0] || data?.password?.[0] || data?.rol?.[0] || data?.detail || "No se pudo guardar";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { header: "Usuario", accessor: "username" },
    { header: "Nombre", render: (u) => u.nombre },
    { header: "Rol", render: (u) => ROLES[u.rol]?.label || u.rol },
    {
      header: "Estado",
      render: (u) => (
        <span className={`badge ${u.is_active ? "badge-success" : "badge-ghost"}`}>
          {u.is_active ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  return (
    <>
      <Topbar title="Usuarios y roles" />
      <div className="flex min-h-0 flex-1 gap-4 p-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-muted" />
              <input className={`${filterClass} w-56 pl-9`} placeholder="Buscar usuario" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn btn-primary ml-auto"
              onClick={() => { setForm(vacio); setModal(true); }}
            >
              <Plus size={16} /> Nuevo usuario
            </button>
          </div>
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            onRowClick={(row) => setSelectedId(row.id)}
            selectedId={selected?.id}
            empty="No hay usuarios"
          />
        </div>

        {selected && (
          <DetailPanel
            title={selected.nombre}
            subtitle={`@${selected.username}`}
            badge={<span className="badge badge-info">{ROLES[selected.rol]?.label}</span>}
            onClose={() => setSelectedId(null)}
          >
            <Row label="Rol" value={ROLES[selected.rol]?.label || selected.rol} />
            <Row label="Correo" value={selected.email || "—"} />
            <Row label="Estado" value={selected.is_active ? "Activo" : "Inactivo"} />
            <button
              type="button"
              className="btn btn-outline mt-4 w-full"
              onClick={() => {
                setForm({
                  id: selected.id,
                  username: selected.username,
                  first_name: selected.first_name || "",
                  last_name: selected.last_name || "",
                  email: selected.email || "",
                  rol: selected.rol,
                  is_active: selected.is_active,
                  password: "",
                });
                setModal(true);
              }}
            >
              Editar
            </button>
            {yo?.id === selected.id && (
              <p className="mt-2 text-xs text-muted">No puedes cambiar tu propio rol ni desactivarte.</p>
            )}
          </DetailPanel>
        )}
      </div>

      <Modal
        open={modal}
        title={form.id ? "Editar usuario" : "Nuevo usuario"}
        onClose={() => setModal(false)}
        onSubmit={guardar}
        submitLabel={saving ? "Guardando…" : "Guardar"}
      >
        <Field label="Usuario">
          <input className={inputClass} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        </Field>
        <Field label="Nombre">
          <input className={inputClass} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </Field>
        <Field label="Apellido">
          <input className={inputClass} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </Field>
        <Field label="Correo">
          <input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Rol">
          <select
            className={selectClass}
            value={form.rol}
            disabled={yo?.id === form.id}
            onChange={(e) => setForm({ ...form, rol: e.target.value })}
          >
            {Object.entries(ROLES).map(([id, meta]) => (
              <option key={id} value={id}>{meta.label}</option>
            ))}
          </select>
        </Field>
        <Field label={form.id ? "Nueva contraseña (opcional)" : "Contraseña"}>
          <input className={inputClass} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {form.id && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={form.is_active}
              disabled={yo?.id === form.id}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Activo
          </label>
        )}
      </Modal>
    </>
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
