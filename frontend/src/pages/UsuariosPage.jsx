import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { PersonalService, RolService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Modal, Field, inputClass, filterClass } from "@/components/Modal";
import { useAuth } from "@/context/AuthContext";
import { etiquetaPermiso } from "@/utils/roles";
import { useApiList, useInvalidate } from "@/hooks/useApiQuery";
import { qk } from "@/query/keys";
import { TextField, SelectField, CheckField } from "@/components/AppForm";
import { useAppForm } from "@/hooks/useAppForm";
import { usuarioSchema, rolSchema } from "@/forms/schemas";

const vacioUsuario = {
  id: undefined,
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  rol: "",
  is_active: true,
  password: "",
};

const vacioRol = {
  nombre: "",
  descripcion: "",
  solo_asignados: false,
  permisos: {},
};

function etiqueta(roles, codigo) {
  return roles.find((r) => r.codigo === codigo)?.nombre || codigo || "—";
}

export function UsuariosPage() {
  const { user: yo, reload, canDelete } = useAuth();
  const invalidate = useInvalidate();
  const [tab, setTab] = useState("usuarios");
  const { data: usuarios = [], isLoading: loading } = useApiList(qk.personal, () => PersonalService.getAll());
  const { data: roles = [] } = useApiList(qk.roles, () => RolService.getAll());
  const { data: catalogo = [] } = useApiList(qk.rolesCatalogo, () => RolService.catalogo());
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [rolId, setRolId] = useState(null);
  const [modalUser, setModalUser] = useState(false);
  const [modalRol, setModalRol] = useState(false);
  const [rolForm, setRolForm] = useState(vacioRol);
  const [saving, setSaving] = useState(false);
  const [borrarRol, setBorrarRol] = useState(null);

  const recargar = () => invalidate(qk.personal, qk.roles, qk.usuarios);

  const form = useAppForm({
    defaultValues: vacioUsuario,
    schema: usuarioSchema,
    onSubmit: async (value) => {
      setSaving(true);
      try {
        const payload = {
          username: value.username.trim(),
          first_name: value.first_name,
          last_name: value.last_name,
          email: value.email,
          rol: value.rol,
          is_active: value.is_active,
        };
        if (value.password) payload.password = value.password;
        if (value.id) {
          await PersonalService.patch(value.id, payload);
          toast.success("Usuario actualizado");
        } else {
          await PersonalService.create(payload);
          toast.success("Usuario creado");
        }
        setModalUser(false);
        form.reset(vacioUsuario);
        recargar();
      } catch (err) {
        const data = err?.response?.data;
        const msg = data?.username?.[0] || data?.password?.[0] || data?.rol?.[0] || data?.detail || "No se pudo guardar";
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    },
  });

  const selected = usuarios.find((u) => u.id === selectedId) || null;
  const selectedRol = roles.find((r) => r.id === rolId) || null;

  const filteredUsers = useMemo(() => {
    const t = q.toLowerCase();
    return usuarios.filter((u) =>
      `${u.username} ${u.nombre} ${u.rol} ${u.rol_label || ""}`.toLowerCase().includes(t),
    );
  }, [usuarios, q]);

  const filteredRoles = useMemo(() => {
    const t = q.toLowerCase();
    return roles.filter((r) =>
      `${r.nombre} ${r.codigo} ${r.descripcion}`.toLowerCase().includes(t),
    );
  }, [roles, q]);

  const abrirNuevoUsuario = () => {
    const preferido = roles.find((r) => r.codigo === "conductor") || roles[0];
    form.reset({ ...vacioUsuario, rol: preferido?.codigo || "" });
    setModalUser(true);
  };

  const setPermiso = (modulo, nivel) => {
    setRolForm((prev) => {
      const permisos = { ...prev.permisos };
      if (!nivel) delete permisos[modulo];
      else permisos[modulo] = nivel;
      return { ...prev, permisos };
    });
  };

  const guardarRol = async () => {
    const parsed = rolSchema.safeParse({
      nombre: rolForm.nombre,
      descripcion: rolForm.descripcion,
      solo_asignados: rolForm.solo_asignados,
      permisos: rolForm.permisos,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Revisa el rol");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nombre: rolForm.nombre.trim(),
        descripcion: rolForm.descripcion.trim(),
        solo_asignados: rolForm.solo_asignados,
        permisos: rolForm.permisos,
      };
      if (rolForm.id) {
        await RolService.patch(rolForm.id, payload);
        toast.success("Rol actualizado");
        if (yo?.rol_id === rolForm.id) await reload();
      } else {
        await RolService.create(payload);
        toast.success("Rol creado");
      }
      setModalRol(false);
      setRolForm(vacioRol);
      recargar();
    } catch (err) {
      const data = err?.response?.data;
      const msg = data?.nombre?.[0] || data?.permisos?.[0] || data?.detail || "No se pudo guardar";
      toast.error(typeof msg === "string" ? msg : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const confirmarBorrado = async () => {
    if (!borrarRol) return;
    try {
      await RolService.remove(borrarRol.id);
      toast.success("Rol eliminado");
      if (rolId === borrarRol.id) setRolId(null);
      setBorrarRol(null);
      recargar();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "No se pudo eliminar");
      setBorrarRol(null);
    }
  };

  const userColumns = [
    { header: "Usuario", accessor: "username" },
    { header: "Nombre", render: (u) => u.nombre },
    { header: "Rol", render: (u) => u.rol_label || etiqueta(roles, u.rol) },
    {
      header: "Estado",
      render: (u) => (
        <span className={`badge ${u.is_active ? "badge-success" : "badge-ghost"}`}>
          {u.is_active ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  const rolColumns = [
    { header: "Rol", accessor: "nombre" },
    {
      header: "Permisos",
      render: (r) => `${Object.keys(r.permisos || {}).length} módulos`,
    },
    {
      header: "Usuarios",
      render: (r) => r.usuarios_count ?? 0,
    },
    {
      header: "Alcance",
      render: (r) => (r.solo_asignados ? "Solo asignados" : "Toda la operación"),
    },
  ];

  return (
    <>
      <Topbar title="Usuarios y roles" />
      <div className="flex min-h-0 flex-1 gap-4 p-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`btn btn-sm rounded-full ${tab === "usuarios" ? "btn-primary" : "btn-ghost bg-base-100"}`}
              onClick={() => { setTab("usuarios"); setQ(""); }}
            >
              Usuarios
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-full ${tab === "roles" ? "btn-primary" : "btn-ghost bg-base-100"}`}
              onClick={() => { setTab("roles"); setQ(""); }}
            >
              Roles
            </button>
            {tab === "usuarios" && (
              <button type="button" className="btn btn-primary ml-auto" onClick={abrirNuevoUsuario}>
                <Plus size={16} /> Nuevo usuario
              </button>
            )}
            {tab === "roles" && (
              <button
                type="button"
                className="btn btn-primary ml-auto"
                onClick={() => { setRolForm({ ...vacioRol, permisos: { dashboard: "ver" } }); setModalRol(true); }}
              >
                <Plus size={16} /> Nuevo rol
              </button>
            )}
          </div>

          <div className="relative w-fit">
            <Search size={16} className="absolute left-3 top-2.5 text-muted" />
            <input
              className={`${filterClass} w-56 pl-9`}
              placeholder={tab === "usuarios" ? "Buscar usuario" : "Buscar rol"}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {tab === "usuarios" ? (
            <DataTable
              columns={userColumns}
              data={filteredUsers}
              loading={loading}
              onRowClick={(row) => setSelectedId(row.id)}
              selectedId={selected?.id}
              empty="No hay usuarios"
            />
          ) : (
            <DataTable
              columns={rolColumns}
              data={filteredRoles}
              loading={loading}
              onRowClick={(row) => setRolId(row.id)}
              selectedId={selectedRol?.id}
              empty="No hay roles"
            />
          )}
        </div>

        {tab === "usuarios" && selected && (
          <DetailPanel
            title={selected.nombre}
            subtitle={`@${selected.username}`}
            badge={<span className="badge badge-info">{selected.rol_label || etiqueta(roles, selected.rol)}</span>}
            onClose={() => setSelectedId(null)}
          >
            <Row label="Rol" value={selected.rol_label || etiqueta(roles, selected.rol)} />
            <Row label="Correo" value={selected.email || "—"} />
            <Row label="Estado" value={selected.is_active ? "Activo" : "Inactivo"} />
            <button
              type="button"
              className="btn btn-outline mt-4 w-full"
              onClick={() => {
                form.reset({
                  id: selected.id,
                  username: selected.username,
                  first_name: selected.first_name || "",
                  last_name: selected.last_name || "",
                  email: selected.email || "",
                  rol: selected.rol,
                  is_active: selected.is_active,
                  password: "",
                });
                setModalUser(true);
              }}
            >
              Editar
            </button>
            {yo?.id === selected.id && (
              <p className="mt-2 text-xs text-muted">No puedes cambiar tu propio rol ni desactivarte.</p>
            )}
          </DetailPanel>
        )}

        {tab === "roles" && selectedRol && (
          <DetailPanel
            title={selectedRol.nombre}
            subtitle={selectedRol.es_sistema ? "Rol del sistema" : selectedRol.codigo}
            badge={selectedRol.solo_asignados ? <span className="badge">Solo asignados</span> : null}
            onClose={() => setRolId(null)}
          >
            <p className="mb-3 text-sm text-muted">{selectedRol.descripcion || "Sin descripción"}</p>
            <Row label="Usuarios" value={selectedRol.usuarios_count ?? 0} />
            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase text-muted">Permisos</h3>
            <ul className="space-y-1 text-sm">
              {catalogo.map((mod) => {
                const nivel = selectedRol.permisos?.[mod.id];
                return (
                  <li key={mod.id} className="flex justify-between gap-3">
                    <span className="text-muted">{mod.label}</span>
                    <span className="font-medium">{etiquetaPermiso(nivel)}</span>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="btn btn-outline mt-4 w-full"
              onClick={() => {
                setRolForm({
                  id: selectedRol.id,
                  codigo: selectedRol.codigo,
                  nombre: selectedRol.nombre,
                  descripcion: selectedRol.descripcion || "",
                  solo_asignados: selectedRol.solo_asignados,
                  permisos: { ...(selectedRol.permisos || {}) },
                });
                setModalRol(true);
              }}
            >
              Editar permisos
            </button>
            {!selectedRol.es_sistema && canDelete("usuarios") && (
              <button
                type="button"
                className="btn btn-ghost btn-error mt-2 w-full"
                onClick={() => setBorrarRol(selectedRol)}
              >
                Eliminar rol
              </button>
            )}
          </DetailPanel>
        )}
      </div>

      <Modal
        open={modalUser}
        title={form.state.values.id ? "Editar usuario" : "Nuevo usuario"}
        onClose={() => setModalUser(false)}
        onSubmit={() => form.handleSubmit()}
        submitLabel={saving ? "Guardando…" : "Guardar"}
      >
        <TextField form={form} name="username" label="Usuario" />
        <TextField form={form} name="first_name" label="Nombre" />
        <TextField form={form} name="last_name" label="Apellido" />
        <TextField form={form} name="email" label="Correo" type="email" />
        <form.Subscribe selector={(s) => s.values.id}>
          {(id) => (
            <SelectField form={form} name="rol" label="Rol" disabled={yo?.id === id}>
              <option value="">Seleccione</option>
              {roles.map((r) => (
                <option key={r.codigo} value={r.codigo}>{r.nombre}</option>
              ))}
            </SelectField>
          )}
        </form.Subscribe>
        <form.Subscribe selector={(s) => s.values.id}>
          {(id) => (
            <>
              <TextField form={form} name="password" label={id ? "Nueva contraseña (opcional)" : "Contraseña"} type="password" />
              {id && <CheckField form={form} name="is_active" label="Activo" disabled={yo?.id === id} />}
            </>
          )}
        </form.Subscribe>
      </Modal>

      <Modal
        open={modalRol}
        wide
        title={rolForm.id ? "Editar rol" : "Nuevo rol"}
        onClose={() => setModalRol(false)}
        onSubmit={guardarRol}
        submitLabel={saving ? "Guardando…" : "Guardar"}
      >
        <Field label="Nombre">
          <input className={inputClass} value={rolForm.nombre} onChange={(e) => setRolForm({ ...rolForm, nombre: e.target.value })} />
        </Field>
        <Field label="Descripción">
          <input className={inputClass} value={rolForm.descripcion} onChange={(e) => setRolForm({ ...rolForm, descripcion: e.target.value })} />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm mt-0.5"
            checked={rolForm.solo_asignados}
            disabled={rolForm.codigo === "administrador"}
            onChange={(e) => setRolForm({ ...rolForm, solo_asignados: e.target.checked })}
          />
          <span>
            Solo viajes y recojos asignados
            <span className="block text-xs text-muted">Como un conductor: ve únicamente lo que se le asignó y puede cerrar el odómetro.</span>
          </span>
        </label>
        <div className="overflow-x-auto rounded-box border border-base-300">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Sin acceso</th>
                <th>Ver</th>
                <th>Editar</th>
                <th>Eliminar</th>
              </tr>
            </thead>
            <tbody>
              {catalogo.map((mod) => {
                const nivel = rolForm.permisos[mod.id] || "";
                const bloquear = rolForm.codigo === "administrador";
                return (
                  <tr key={mod.id}>
                    <td className="font-medium">{mod.label}</td>
                    <td>
                      <input
                        type="radio"
                        className="radio radio-sm"
                        name={`perm-${mod.id}`}
                        checked={!nivel}
                        disabled={bloquear}
                        onChange={() => setPermiso(mod.id, "")}
                      />
                    </td>
                    <td>
                      <input
                        type="radio"
                        className="radio radio-sm"
                        name={`perm-${mod.id}`}
                        checked={nivel === "ver"}
                        disabled={bloquear}
                        onChange={() => setPermiso(mod.id, "ver")}
                      />
                    </td>
                    <td>
                      {mod.escribe ? (
                        <input
                          type="radio"
                          className="radio radio-sm"
                          name={`perm-${mod.id}`}
                          checked={nivel === "escribir"}
                          disabled={bloquear}
                          onChange={() => setPermiso(mod.id, "escribir")}
                        />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {mod.escribe ? (
                        <input
                          type="radio"
                          className="radio radio-sm"
                          name={`perm-${mod.id}`}
                          checked={nivel === "eliminar"}
                          disabled={bloquear}
                          onChange={() => setPermiso(mod.id, "eliminar")}
                        />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          Eliminar incluye editar. Editar no permite borrar registros.
        </p>
        {rolForm.codigo === "administrador" && (
          <p className="text-xs text-muted">El administrador siempre conserva todos los permisos.</p>
        )}
      </Modal>

      <ConfirmModal
        show={!!borrarRol}
        onHide={() => setBorrarRol(null)}
        onConfirm={confirmarBorrado}
        titulo="Eliminar rol"
        mensaje={borrarRol ? `¿Borrar el rol “${borrarRol.nombre}”?` : ""}
        confirmText="Eliminar"
      />
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
