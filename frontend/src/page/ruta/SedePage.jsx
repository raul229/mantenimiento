import toast from "react-hot-toast";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useCrud } from "@/hooks/useCrud";
import { useConfirm } from "@/hooks/useConfirm";
import Select from "react-select";
import { BaseModal } from "@/components/BaseModal";
import { BaseFormField } from "@/components/BaseFormField";
import { CrudTable } from "@/components/CrudTable";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BotonNuevo } from "@/components/BotonNuevo";
import { SedeService, ClienteService, CiudadService, PersonaService } from "@/service";
import { formularioSede } from "@/formularios/formInicial";

export function SedePage() {
  const { data: clientes } = useCrud(ClienteService);
  const { data: ciudades } = useCrud(CiudadService);
  const { data: personas } = useCrud(PersonaService);

  const {
    data: sedes,
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
    setErrors,
    clearErrors,
  } = useCrudPage({ service: SedeService, formularioInicial: formularioSede });

  const confirm = useConfirm();

  const confirmarEliminacion = () => {
    eliminar(confirm.id);
    confirm.cancelar();
  };

  const guardarConValidacion = async () => {
    const nuevosErrores = {};
    if (!formulario.cliente) nuevosErrores.cliente = "Debe seleccionar un cliente";
    if (!formulario.ciudad) nuevosErrores.ciudad = "Debe seleccionar una ciudad";
    if (!formulario.direccion || String(formulario.direccion).trim() === "") {
      nuevosErrores.direccion = "La dirección es obligatoria";
    }

    if (Object.keys(nuevosErrores).length > 0) {
      setErrors(nuevosErrores);
      toast.error("Revisa los campos del formulario");
      return;
    }

    clearErrors();

    let toSave = { ...formulario };
    if (!toSave.nombre || String(toSave.nombre).trim() === "") {
      const cliente = clientes.find((c) => c.id === toSave.cliente);
      const ciudad = ciudades.find((ci) => ci.id === toSave.ciudad);
      toSave.nombre = `${cliente?.razon_social || ""} - ${ciudad?.nombre || ""}`.trim();
    }
    setFormulario(toSave);
    await guardar();
  };

  const clienteOptions = clientes.map((c) => ({ value: c.id, label: c.razon_social }));
  const ciudadOptions = ciudades.map((c) => ({ value: c.id, label: c.nombre }));
  const personaOptions = personas.map((p) => ({ value: p.id, label: p.nombre }));

  const selectedCliente = clienteOptions.find((o) => o.value === formulario.cliente) || null;
  const selectedCiudad = ciudadOptions.find((o) => o.value === formulario.ciudad) || null;
  const selectedPersona = personaOptions.find((o) => o.value === formulario.persona) || null;

  const columns = [
    { header: "Nombre", accessor: "nombre" },
    { header: "Direccion", accessor: "direccion" },
    { header: "Coordenadas", accessor: "coordenadas" },
    { header: "Cliente", render: (s) => clientes.find((c) => c.id === s.cliente)?.razon_social },
    { header: "Ciudad", render: (s) => ciudades.find((c) => c.id === s.ciudad)?.nombre },
    { header: "Persona", render: (s) => personas.find((p) => p.id === s.persona)?.nombre },
  ];

  return (
    <>
      <h1>Sedes</h1>
      <BotonNuevo
        limpiarFormulario={() => {
          limpiarFormulario();
          clearErrors();
        }}
        setEditando={setEditando}
        mostrarModal={mostrarModal}
      />
      <CrudTable
        columns={columns}
        data={sedes}
        loading={loading}
        onEdit={(sede) => {
          setEditando(true);
          setFormulario(sede);
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
        guardar={guardarConValidacion}
        titulo="Sede"
        formulario={formulario}
        setFormulario={setFormulario}
        errors={errors}
      >
        <BaseFormField
          label="Nombre"
          name="nombre"
          value={formulario.nombre}
          onChange={(name, value) => setFormulario({ ...formulario, [name]: value })}
          placeholder="Nombre... (se autocompletará si se deja vacío)"
          errors={errors}
        />
        <BaseFormField
          label="Direccion"
          name="direccion"
          value={formulario.direccion}
          onChange={(name, value) => setFormulario({ ...formulario, [name]: value })}
          placeholder="Direccion..."
          errors={errors}
        />
        <BaseFormField
          label="Coordenadas"
          name="coordenadas"
          value={formulario.coordenadas}
          onChange={(name, value) => setFormulario({ ...formulario, [name]: value })}
          placeholder="Coordenadas..."
          errors={errors}
        />
        <fieldset className="fieldset p-0">
          <legend className="fieldset-legend">Persona</legend>
          <Select
            options={personaOptions}
            value={selectedPersona}
            onChange={(opt) => setFormulario({ ...formulario, persona: opt ? Number(opt.value) : null })}
            placeholder="Seleccione persona..."
          />
        </fieldset>
        <fieldset className="fieldset p-0">
          <legend className="fieldset-legend">Cliente</legend>
          <Select
            options={clienteOptions}
            value={selectedCliente}
            onChange={(opt) => setFormulario({ ...formulario, cliente: opt ? Number(opt.value) : null })}
            placeholder="Seleccione cliente..."
          />
          {errors?.cliente && <p className="label text-error">{errors.cliente}</p>}
        </fieldset>
        <fieldset className="fieldset p-0">
          <legend className="fieldset-legend">Ciudad</legend>
          <Select
            options={ciudadOptions}
            value={selectedCiudad}
            onChange={(opt) => setFormulario({ ...formulario, ciudad: opt ? Number(opt.value) : null })}
            placeholder="Seleccione ciudad..."
          />
          {errors?.ciudad && <p className="label text-error">{errors.ciudad}</p>}
        </fieldset>
      </BaseModal>
      <ConfirmModal
        show={confirm.abierto}
        onHide={confirm.cancelar}
        onConfirm={confirmarEliminacion}
        titulo="Eliminar sede"
        mensaje="¿Estás seguro de eliminar esta sede?"
        confirmText="Eliminar"
      />
    </>
  );
}
