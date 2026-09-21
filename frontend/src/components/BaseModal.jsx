import { BaseFormField } from "./BaseFormField";
import { Modal } from "@/components/Modal";

export function BaseModal({
  show,
  ocultarModal,
  editando,
  guardar,
  titulo,
  fields,
  formulario,
  setFormulario,
  errors = {},
  children,
}) {
  const handleFieldChange = (name, value) => {
    setFormulario({ ...formulario, [name]: value });
  };

  return (
    <Modal
      open={show}
      title={`${editando ? "Editar" : "Nuevo"} ${titulo}`}
      onClose={ocultarModal}
      onSubmit={guardar}
    >
      {errors.non_field_errors && (
        <div className="mb-2">
          {errors.non_field_errors.map((m, i) => (
            <p key={i} className="text-error">{m}</p>
          ))}
        </div>
      )}
      {fields && fields.map((field) => (
        <BaseFormField
          key={field.name}
          label={field.label}
          name={field.name}
          value={formulario?.[field.name]}
          onChange={handleFieldChange}
          type={field.type}
          required={field.required}
          placeholder={field.placeholder}
          options={field.options}
          errors={errors}
          as={field.as}
          rows={field.rows}
          step={field.step}
        />
      ))}
      {children}
    </Modal>
  );
}
