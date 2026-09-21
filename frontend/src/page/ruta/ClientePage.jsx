import { PersonaService, ClienteService } from "@/service";
import { formularioCliente } from "@/formularios/formInicial";
import { useCrud } from "@/hooks/useCrud";
import { useForm } from "@/hooks/useForm";
import { useModal } from "@/hooks/useModal";
import { useConfirm } from "@/hooks/useConfirm";
import { useSave } from "@/hooks/useSave";
import { useDelete } from "@/hooks/useDelete";
import { useFormLifecycle } from "@/hooks/useFormLifecycle";
import { CrudTable } from "@/components/CrudTable";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BaseModal } from "@/components/BaseModal";

export function ClientePage() {
  const { data: personas } = useCrud(PersonaService);

  const {
    data: clientes,
    loading,
    refetch: refetchClientes,
  } = useCrud(ClienteService);

  const confirm = useConfirm();

  const { mostrar: show, ocultarModal, mostrarModal } = useModal();

  const { formulario, setFormulario, reset: resetFormulario, editando, setEditando } = useForm({ inicial: formularioCliente });

  const { afterSave } = useFormLifecycle({
    reset: resetFormulario,
    close: ocultarModal,
    refetch: refetchClientes,
  });

  const { save, errors, clearErrors } = useSave({
    service: ClienteService,
    onSaved: () => {
      afterSave();
      clearErrors();
    },
  });

  const { remove } = useDelete({
    service: ClienteService,
    onDeleted: refetchClientes,
  });



  const confirmarEliminacion = () => {
    remove(confirm.id);
    confirm.cancelar();
  };

  const columns = [
    { header: "Documento", accessor: "numero_documento" },
    { header: "Razon Social", accessor: "razon_social" },
    {
      header: "Personas",
      render: (cliente) =>
        personas
          .filter((p) => p.cliente == cliente.id)
          .map((p) => p.nombre)
          .join(", "),
    },
  ];

  const fields = [
    { name: "numero_documento", label: "Numero documento", required: true, placeholder: "Numero documento..." },
    { name: "razon_social", label: "Razon social", required: true, placeholder: "Razon social..." },
  ];

  const editar = (cliente) => {
    setEditando(true);
    setFormulario(cliente);
    mostrarModal();
  };

  return (
    <>
      <h1>Clientes</h1>
      <button type="button" className="btn btn-primary mb-3" onClick={() => {
        resetFormulario();
        setEditando(false);
        mostrarModal();
      }}>Nuevo</button>
      <CrudTable
        columns={columns}
        data={clientes}
        loading={loading}
        onEdit={editar}
        onDelete={confirm.pedir}
      />
      <BaseModal
        show={show}
        ocultarModal={ocultarModal}
        editando={editando}
        guardar={() => save(formulario, editando)}
        titulo="Cliente"
        fields={fields}
        formulario={formulario}
        setFormulario={setFormulario}
        errors={errors}
      />
      <ConfirmModal
        show={confirm.abierto}
        onHide={confirm.cancelar}
        onConfirm={confirmarEliminacion}
        titulo="Eliminar cliente"
        mensaje="¿Estás seguro de eliminar este cliente?"
        confirmText="Eliminar"
      />
    </>
  );
}
