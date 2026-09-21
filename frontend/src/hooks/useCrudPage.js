import { useCrud } from "./useCrud";
import { useForm } from "./useForm";
import { useModal } from "./useModal";
import { useApiErrors } from "./useApiErrors";
import toast from "react-hot-toast";

export function useCrudPage({
  service,
  formularioInicial,
  actulizacionDatosSecundarios,
}) {
  const {
    data,
    loading,
    crear,
    actualizar,
    eliminar: eliminarRegistro,
    refetch,
  } = useCrud(service);
  const { mostrar: show, ocultarModal, mostrarModal } = useModal();
  const {
    formulario,
    setFormulario,
    limpiarFormulario,
    editando,
    setEditando,
  } = useForm({
    inicial: formularioInicial,
  });
  const { errors, setErrors, handleApiError, clearErrors } = useApiErrors();

  const eliminar = async (id) => {
    try {
      await eliminarRegistro(id);
      toast.success("Registro eliminado correctamente");
      if (typeof actulizacionDatosSecundarios === "function") {
        actulizacionDatosSecundarios();
      }
    } catch (error) {
      console.log(error);
      toast.error("Hubo un error al eliminar");
    }
  };

  const guardar = async () => {
    try {
      if (editando) {
        await actualizar(formulario.id, formulario);
        toast.success("Registro actualizado correctamente");
      } else {
        await crear(formulario);
        toast.success("Registro creado correctamente");
      }

      if (typeof actulizacionDatosSecundarios === "function") {
        actulizacionDatosSecundarios();
      }

      clearErrors();
      limpiarFormulario();
      ocultarModal();
    } catch (error) {
      console.error("Hubo un error al guardar", error);
      handleApiError(error);
      toast.error("Hubo un error al guardar");
      throw error;
    }
  };

  return {
    data,
    loading,
    refetch,
    errors,
    setErrors,
    clearErrors,
    handleApiError,
    eliminar,
    show,
    ocultarModal,
    mostrarModal,
    formulario,
    setFormulario,
    limpiarFormulario,
    editando,
    setEditando,
    guardar,
  };
}
