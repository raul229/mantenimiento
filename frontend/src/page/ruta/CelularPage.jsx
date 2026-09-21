import { CelularService } from "@/service";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useConfirm } from "@/hooks/useConfirm";
import { CrudTable } from "@/components/CrudTable";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BaseModal } from "@/components/BaseModal";
import { formularioCelular } from "@/formularios/formInicial";

export function CelularPage() {
  const {
    data: celulares,
    loading,
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
    errors,
  } = useCrudPage({ service: CelularService, formularioInicial: formularioCelular });

  const confirm = useConfirm();

  const confirmarEliminacion = () => {
    eliminar(confirm.id);
    confirm.cancelar();
  };

  const fields = [
    { name: "numero", label: "Numero", placeholder: "Numero" },
  ];

  const columns = [
    { header: "Numero", accessor: "numero" },
  ];

  const editar = (celular) => {
    setEditando(true);
    setFormulario(celular);
    mostrarModal();
  };

  return (
    <>
      <h1>Celulares</h1>
      <button type="button" className="btn btn-primary mb-3" onClick={() => {
        limpiarFormulario();
        setEditando(false);
        mostrarModal();
      }}>Agregar</button>
      <CrudTable
        columns={columns}
        data={celulares}
        loading={loading}
        onEdit={editar}
        onDelete={confirm.pedir}
      />
      <BaseModal
        show={show}
        ocultarModal={ocultarModal}
        editando={editando}
        guardar={guardar}
        titulo="Celular"
        fields={fields}
        formulario={formulario}
        setFormulario={setFormulario}
        errors={errors}
      />
      <ConfirmModal
        show={confirm.abierto}
        onHide={confirm.cancelar}
        onConfirm={confirmarEliminacion}
        titulo="Eliminar celular"
        mensaje="¿Estás seguro de eliminar este celular?"
        confirmText="Eliminar"
      />
    </>
  );
}
