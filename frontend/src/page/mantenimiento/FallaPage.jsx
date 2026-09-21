import { FallaService, VehiculoService } from "@/service";
import { useModal } from "@/hooks/useModal";
import { useForm } from "@/hooks/useForm";
import { useSave } from "@/hooks/useSave";
import { useDelete } from "@/hooks/useDelete";
import { useFormLifecycle } from "@/hooks/useFormLifecycle";
import { useConfirm } from "@/hooks/useConfirm";
import { CrudTable } from "@/components/CrudTable";
import { useCrud } from "@/hooks/useCrud";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BaseModal } from "@/components/BaseModal";
import { ESTADOS_FALLA, PRIORIDADES_FALLA } from "@/constants/enums";
import { formularioFalla } from "@/formularios/formInicial";

export function FallaPage() {
  const { data: fallas, refetch: refetchFallas, loading } = useCrud(FallaService);
  const { data: vehiculos } = useCrud(VehiculoService);
  const {
    formulario,
    setFormulario,
    reset: resetFormulario,
    editando,
    setEditando
  } = useForm({ inicial: formularioFalla });

  const { mostrar: show, mostrarModal, ocultarModal } = useModal();


  const confirm = useConfirm();

  const { afterSave } = useFormLifecycle({
    reset: resetFormulario,
    close: ocultarModal,
    refetch: refetchFallas,
  });


  const { save, errors, clearErrors } = useSave({
    service: FallaService,
    onSaved: () => {
      afterSave();
      clearErrors();
    }
  });

  const { remove } = useDelete({
    service: FallaService,
    onDeleted: refetchFallas,
  });

  const confirmarEliminacion = () => {
    remove(confirm.id);
    confirm.cancelar();
  };

  const vehiculoOptions = vehiculos.map((v) => ({
    value: v.id,
    label: `${v.marca} ${v.placa}`,
  }));

  const fields = [
    ...(editando ? [{ name: "estado", label: "Estado", required: true, options: ESTADOS_FALLA }] : []),
    { name: "prioridad", label: "Prioridad", required: true, options: PRIORIDADES_FALLA },
    { name: "descripcion", label: "Descripcion", required: true, placeholder: "Descripcion..." },
    ...(editando ? [{ name: "fecha_reportado", label: "Fecha Reportado", type: "date", required: true }] : []),
    //{ name: "fecha_solucionado", label: "Fecha Solucionado", type: "date", required: editando },
    { name: "vehiculo_id", label: "Vehiculo", required: true, options: vehiculoOptions, type: "number" },
    { name: "usuario_reporta", label: "Usuario que reporta", required: true, placeholder: "Usuario que reporta..." },
  ];

  const columns = [
    { header: "Estado", accessor: "estado" },
    { header: "Prioridad", accessor: "prioridad" },
    { header: "Descripcion", accessor: "descripcion" },
    { header: "Fecha Reportado", accessor: "fecha_reportado" },
    { header: "Fecha Solucionado", accessor: "fecha_solucionado" },
    {
      header: "Vehiculo",
      render: (f) => f.vehiculo ? `${f.vehiculo.marca} ${f.vehiculo.placa}` : "N/A",
    },
    { header: "Usuario que reporta", accessor: "usuario_reporta" },
  ];

  return (
    <>
      <h1>Fallas</h1>
      <button type="button" className="btn btn-primary mb-3" onClick={() => {
        resetFormulario();
        setEditando(false);
        mostrarModal();
      }}>Nuevo</button>
      <CrudTable
        columns={columns}
        data={fallas}
        loading={loading}
        onEdit={(falla) => {
          setEditando(true);
          setFormulario(FallaService.normalize(falla));
          mostrarModal();
        }}
        onDelete={confirm.pedir}
      />
      <BaseModal
        show={show}
        ocultarModal={ocultarModal}
        editando={editando}
        guardar={() => save(formulario, editando)}
        titulo="Falla"
        fields={fields}
        formulario={formulario}
        setFormulario={setFormulario}
        errors={errors}
      />
      <ConfirmModal
        show={confirm.abierto}
        onHide={confirm.cancelar}
        onConfirm={confirmarEliminacion}
        titulo="Eliminar falla"
        mensaje="¿Estás seguro de eliminar esta falla?"
        confirmText="Eliminar"
      />
    </>
  );
}
