import { useCallback } from "react";
import toast from "react-hot-toast";

export function useDelete({ service, onDeleted }) {
  const remove = useCallback(
    async (id) => {
      try {
        await service.remove(id);
        toast.success("Registro eliminado correctamente");
        onDeleted?.();
      } catch (e) {
        console.error("Error al eliminar:", e);
        toast.error("Hubo un error al eliminar");
      }
    },
    [service, onDeleted],
  );

  return { remove };
}
