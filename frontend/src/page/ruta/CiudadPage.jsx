import { CiudadService } from "@/service";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useConfirm } from "@/hooks/useConfirm";
import { CrudTable } from "@/components/CrudTable";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BaseModal } from "@/components/BaseModal";
import { formularioCiudad } from "@/formularios/formInicial";

export function CiudadPage() {
  const {
    data: ciudades,
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
  } = useCrudPage({ service: CiudadService, formularioInicial: formularioCiudad });

  const confirm = useConfirm();

  const confirmarEliminacion = () => {
    eliminar(confirm.id);
    confirm.cancelar();
  };

  const columns = [
    { header: "Nombre", accessor: "nombre" },
    { header: "Distrito", accessor: "distrito" },
    { header: "Departamento", accessor: "departamento" },
  ];

  const fields = [
    { name: "nombre", label: "Nombre", required: true, placeholder: "Nombre..." },
    { name: "distrito", label: "Distrito", required: true, placeholder: "Distrito..." },
    { name: "departamento", label: "Departamento", required: true, placeholder: "Departamento..." },
  ];

  const editar = (ciudad) => {
    setEditando(true);
    setFormulario(ciudad);
    mostrarModal();
  };

  return (
    <>
      <h1>Ciudad</h1>
      <button type="button" className="btn btn-primary mb-3" onClick={() => {
        limpiarFormulario();
        setEditando(false);
        mostrarModal();
      }}>Nuevo</button>
      <CrudTable
        columns={columns}
        data={ciudades}
        loading={loading}
        onEdit={editar}
        onDelete={confirm.pedir}
      />
      <BaseModal
        show={show}
        ocultarModal={ocultarModal}
        editando={editando}
        guardar={guardar}
        titulo="Ciudad"
        fields={fields}
        formulario={formulario}
        setFormulario={setFormulario}
        errors={errors}
      />
      <ConfirmModal
        show={confirm.abierto}
        onHide={confirm.cancelar}
        onConfirm={confirmarEliminacion}
        titulo="Eliminar ciudad"
        mensaje="¿Estás seguro de eliminar esta ciudad?"
        confirmText="Eliminar"
      />
    </>
  );
}
