import { useEffect } from "react";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import { CiudadService } from "@/service/api";
import { Modal, selectClass, filterSelectClass } from "@/components/Modal";
import { formatApiError } from "@/utils/formatApiError";
import { TextField } from "@/components/AppForm";
import { useAppForm } from "@/hooks/useAppForm";
import { ciudadSchema } from "@/forms/schemas";
import { useInvalidate } from "@/hooks/useApiQuery";
import { qk } from "@/query/keys";

const emptyCiudad = () => ({ nombre: "", distrito: "", departamento: "" });

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
  const invalidate = useInvalidate();
  const form = useAppForm({
    defaultValues: emptyCiudad(),
    schema: ciudadSchema,
    onSubmit: async (value) => {
      try {
        const { data } = await CiudadService.create({
          nombre: value.nombre.trim(),
          distrito: value.distrito.trim(),
          departamento: value.departamento.trim(),
        });
        toast.success("Ciudad creada");
        await invalidate(qk.ciudades);
        onCreated?.(data);
        form.reset(emptyCiudad());
        onClose();
      } catch (err) {
        toast.error(formatApiError(err).join(" · "));
      }
    },
  });

  useEffect(() => {
    if (open) form.reset(emptyCiudad());
  }, [open]);

  return (
    <Modal open={open} title="Nueva ciudad" submitLabel="Crear ciudad" onClose={onClose} onSubmit={() => form.handleSubmit()}>
      <TextField form={form} name="nombre" label="Nombre" />
      <TextField form={form} name="distrito" label="Distrito" />
      <TextField form={form} name="departamento" label="Departamento" />
    </Modal>
  );
}
