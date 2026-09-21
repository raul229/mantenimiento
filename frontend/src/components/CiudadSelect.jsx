import { useState } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { CiudadService } from "@/service/api";
import { Modal, Field, inputClass, selectClass, filterSelectClass } from "@/components/Modal";
import { formatApiError } from "@/utils/formatApiError";

const emptyCiudad = () => ({ nombre: "", distrito: "", departamento: "" });

export function asCiudades(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

export function mergeCiudad(list, ciudad) {
  const next = list.some((c) => c.id === ciudad.id)
    ? list.map((c) => (c.id === ciudad.id ? ciudad : c))
    : [...list, ciudad];
  return next.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export function CiudadFields({
  value,
  onChange,
  ciudades,
  onNueva,
  placeholder = "Seleccionar",
  filter = false,
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        className={`${filter ? `${filterSelectClass} w-40` : selectClass} bg-base-100`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {ciudades.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      {onNueva && (
        <button
          type="button"
          className="btn btn-square btn-ghost shrink-0 bg-base-100"
          onClick={onNueva}
          title="Nueva ciudad"
        >
          <Plus size={16} />
        </button>
      )}
    </div>
  );
}

export function NuevaCiudadModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(emptyCiudad);

  const save = async () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre de la ciudad es obligatorio");
      return;
    }
    try {
      const { data } = await CiudadService.create({
        nombre: form.nombre.trim(),
        distrito: form.distrito.trim(),
        departamento: form.departamento.trim(),
      });
      toast.success("Ciudad creada");
      onCreated?.(data);
      setForm(emptyCiudad());
      onClose();
    } catch (err) {
      toast.error(formatApiError(err).join(" · "));
    }
  };

  return (
    <Modal open={open} title="Nueva ciudad" submitLabel="Crear ciudad" onClose={onClose} onSubmit={save}>
      <Field label="Nombre">
        <input className={inputClass} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
      </Field>
      <Field label="Distrito">
        <input className={inputClass} value={form.distrito} onChange={(e) => setForm({ ...form, distrito: e.target.value })} />
      </Field>
      <Field label="Departamento">
        <input className={inputClass} value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} />
      </Field>
    </Modal>
  );
}
