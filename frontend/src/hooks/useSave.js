import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useApiErrors } from "./useApiErrors";

export function useSave({ service, onSaved }) {
  const [saving, setSaving] = useState(false);
  const { errors, setErrors, clearErrors } = useApiErrors();

  const save = useCallback(
    async (form, isEditing) => {
      setSaving(true);
      clearErrors();
      try {
        if (isEditing) {
          await service.update(form.id, form);
          toast.success("Registro actualizado correctamente");
        } else {
          await service.create(form);
          toast.success("Registro creado correctamente");
        }
        onSaved?.();
        return true;
      } catch (e) {
        console.error("Error al guardar:", e);
        const resp = e?.response?.data;
        if (resp && typeof resp === "object") {
          setErrors(resp);
        }
        toast.error("Hubo un error al guardar");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [service, onSaved, setErrors, clearErrors],
  );

  return { save, saving, errors, clearErrors };
}
