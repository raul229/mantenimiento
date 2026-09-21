import { BaseModal } from "@/components/BaseModal";
import { inputClass } from "@/components/Modal";
import Select from "react-select";

export function PersonaModal({ show, ocultarModal, editando, formulario, setFormulario, guardar, errors = {}, clienteOptions = [] }) {
  const celularesFormulario = Array.isArray(formulario.celulares) && formulario.celulares.length > 0 ? formulario.celulares : [""];

  const agregarCampoCelular = () => {
    setFormulario({ ...formulario, celulares: [...celularesFormulario, ""] });
  };

  const eliminarCampoCelular = (index) => {
    if (celularesFormulario.length > 1) {
      const nuevosCelulares = [...celularesFormulario];
      nuevosCelulares.splice(index, 1);
      setFormulario({ ...formulario, celulares: nuevosCelulares });
    }
  };

  const actualizarCelular = (index, valor) => {
    const nuevosCelulares = [...celularesFormulario];
    nuevosCelulares[index] = valor;
    setFormulario({ ...formulario, celulares: nuevosCelulares });
  };

  const selectedCliente = clienteOptions.find((o) => o.value === formulario.cliente) || null;

  return (
    <BaseModal
      show={show}
      ocultarModal={ocultarModal}
      editando={editando}
      guardar={guardar}
      titulo="Persona"
    >
      <fieldset className="fieldset p-0">
        <legend className="fieldset-legend">Nombre</legend>
        <input
          className={inputClass}
          type="text"
          placeholder="Nombre"
          value={formulario.nombre}
          onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
        />
        {errors?.nombre && (Array.isArray(errors.nombre) ? errors.nombre : [errors.nombre]).map((m, i) => (
          <p key={i} className="label text-error">{m}</p>
        ))}
      </fieldset>
      <fieldset className="fieldset p-0">
        <legend className="fieldset-legend">Apellido Paterno</legend>
        <input
          className={inputClass}
          type="text"
          placeholder="Apellido Paterno"
          value={formulario.apellido_paterno}
          onChange={(e) => setFormulario({ ...formulario, apellido_paterno: e.target.value })}
        />
      </fieldset>
      <fieldset className="fieldset p-0">
        <legend className="fieldset-legend">Apellido Materno</legend>
        <input
          className={inputClass}
          type="text"
          placeholder="Apellido Materno"
          value={formulario.apellido_materno}
          onChange={(e) => setFormulario({ ...formulario, apellido_materno: e.target.value })}
        />
      </fieldset>
      <fieldset className="fieldset p-0">
        <legend className="fieldset-legend">Cargo</legend>
        <input
          className={inputClass}
          type="text"
          placeholder="Cargo"
          value={formulario.cargo}
          onChange={(e) => setFormulario({ ...formulario, cargo: e.target.value })}
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
      </fieldset>
      <fieldset className="fieldset p-0">
        <legend className="fieldset-legend">Celulares</legend>
        {celularesFormulario.map((celular, index) => (
          <div key={index} className="join mb-2 w-full">
            <input
              className={`${inputClass} join-item`}
              type="tel"
              placeholder="Número de celular (9 dígitos)"
              value={String(celular || "")}
              onChange={(e) => actualizarCelular(index, e.target.value)}
              pattern="[0-9]{9}"
              maxLength="9"
            />
            <button
              type="button"
              className="btn btn-error btn-outline join-item"
              onClick={() => eliminarCampoCelular(index)}
              disabled={celularesFormulario.length <= 1}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-outline btn-primary btn-sm" onClick={agregarCampoCelular}>
          + Agregar otro celular
        </button>
      </fieldset>
    </BaseModal>
  );
}
