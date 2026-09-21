import Select from "react-select";
import { MantenimientoService, FallaService, VehiculoService } from "@/service";
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
import { TIPOS_MANTENIMIENTO } from "@/constants/enums";
import { formularioMantenimiento } from "@/formularios/formInicial";

export function MantenimientoPage() {
  const { data: mantenimientos, refetch: refetchMantenimientos, loading } = useCrud(MantenimientoService);
  const { data: fallas } = useCrud(FallaService);
  const { data: vehiculos } = useCrud(VehiculoService);

  const { mostrar: show, ocultarModal, mostrarModal } = useModal();
  const {
    formulario,
    setFormulario,
    reset: resetFormulario,
    editando,
    setEditando,
  } = useForm({ inicial: formularioMantenimiento });

  const { afterSave } = useFormLifecycle({
    reset: resetFormulario,
    close: ocultarModal,
    refetch: refetchMantenimientos,
  });

  const { save, errors, clearErrors } = useSave({
    service: MantenimientoService,
    onSaved: () => {
      afterSave();
      clearErrors();
    },
  });

  const { remove } = useDelete({
    service: MantenimientoService,
    onDeleted: refetchMantenimientos,
  });

  const confirm = useConfirm();
  const confirmarEliminacion = () => {
    remove(confirm.id);
    confirm.cancelar();
  };

  const vehiculoOptions = vehiculos.map((v) => ({
    value: v.id,
    label: `${v.marca} ${v.placa}`,
  }));

  const fallasOptions = fallas
    // .filter((f) => f.estado === "pendiente" || formulario.fallas?.includes(f.id))
    .map((f) => ({ value: f.id, label: f.descripcion }));

  const fallasSeleccionadas = fallasOptions.filter(
    (f) => Array.isArray(formulario.fallas_ids) && formulario.fallas_ids.includes(f.value),
  );

  const handleFieldChange = (name, value) => {
    setFormulario({ ...formulario, [name]: value });
  };

  const fields = [
    { name: "tipo_mantenimiento", label: "Tipo de mantenimiento", required: true, options: TIPOS_MANTENIMIENTO },
    { name: "descripcion", label: "Descripcion", required: true, placeholder: "Descripcion..." },
    { name: "costo", label: "Costo", type: "number" },
    { name: "fecha_inicio", label: "Fecha Inicio", type: "date" },
    { name: "fecha_fin", label: "Fecha Fin", type: "date" },
    { name: "proveedor", label: "Proveedor", placeholder: "Descripcion..." },
    { name: "vehiculo_id", label: "Vehiculo", required: true, options: vehiculoOptions, type: "number" },
  ];

  const columns = [
    { header: "Tipo", accessor: "tipo_mantenimiento" },
    { header: "Descripcion", accessor: "descripcion" },
    { header: "Costo", render: (m) => `S/. ${m.costo}` },
    { header: "Fecha Inicio", accessor: "fecha_inicio" },
    { header: "Fecha Fin", accessor: "fecha_fin" },
    { header: "Proveedor", accessor: "proveedor" },
    {
      header: "Vehiculo",
      render: (m) => (m.vehiculo ? `${m.vehiculo.marca} ${m.vehiculo.placa}` : "N/A"),
    },
    {
      header: "Fallas",
      render: (m) => (m.fallas && m.fallas.length > 0 ? m.fallas.map((f) => f.descripcion).join(", ") : "N/A"),
    },
  ];

  return (
    <>
      <h1 className="mb-3">Mantenimientos</h1>
      <button
        className="btn btn-primary mb-3"
        onClick={() => {
          resetFormulario();
          clearErrors();
          setEditando(false);
          mostrarModal();
        }}
      >
        Nuevo
      </button>

      <CrudTable
        columns={columns}
        data={mantenimientos}
        loading={loading}
        onEdit={(m) => {
          setEditando(true);
          setFormulario(MantenimientoService.normalize(m));
          clearErrors();
          mostrarModal();
        }}
        onDelete={confirm.pedir}
      />

      <BaseModal
        show={show}
        ocultarModal={() => {
          ocultarModal();
          clearErrors();
        }}
        editando={editando}
        guardar={() => save(formulario, editando)}
        titulo="mantenimiento"
        fields={fields}
        formulario={formulario}
        setFormulario={setFormulario}
        errors={errors}
      >
        <fieldset className="fieldset p-0">
          <legend className="fieldset-legend">Fallas</legend>
          <Select
            isMulti
            options={fallasOptions}
            value={fallasSeleccionadas}
            onChange={(selected) => {
              const valores = Array.isArray(selected) ? selected.map((s) => s.value) : [];
              handleFieldChange("fallas_ids", valores);
            }}
            placeholder="Seleccione fallas..."
          />
        </fieldset>
      </BaseModal>

      <ConfirmModal
        show={confirm.abierto}
        onHide={confirm.cancelar}
        onConfirm={confirmarEliminacion}
        titulo="Eliminar mantenimiento"
        mensaje="¿Estás seguro de eliminar este mantenimiento?"
        confirmText="Eliminar"
      />
    </>
  );
}
