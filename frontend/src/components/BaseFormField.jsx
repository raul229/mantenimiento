import { inputClass, selectClass } from "@/components/Modal";

export function BaseFormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  options,
  errors,
  as,
  rows,
  step,
  pattern,
  maxLength,
  children,
}) {
  const handleChange = (e) => {
    let newValue = e.target.value;
    if (type === "number") {
      newValue = e.target.value === "" ? "" : Number(e.target.value);
    }
    onChange(name, newValue);
  };

  const renderControl = () => {
    if (children) {
      return children;
    }

    if (options) {
      return (
        <select className={selectClass} value={value ?? ""} onChange={handleChange} required={required}>
          <option value="">Seleccione</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    const Control = as === "textarea" ? "textarea" : "input";
    return (
      <Control
        className={as === "textarea" ? "textarea textarea-bordered w-full" : inputClass}
        type={as === "textarea" ? undefined : type}
        value={value ?? ""}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        step={step}
        pattern={pattern}
        maxLength={maxLength}
      />
    );
  };

  const list = errors?.[name] ? (Array.isArray(errors[name]) ? errors[name] : [errors[name]]) : [];

  return (
    <fieldset className="fieldset p-0">
      {label && <legend className="fieldset-legend">{label}</legend>}
      {renderControl()}
      {list.map((msg, i) => (
        <p key={i} className="label text-error">{msg}</p>
      ))}
    </fieldset>
  );
}
