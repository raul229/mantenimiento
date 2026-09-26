import { Field, inputClass, selectClass } from "@/components/Modal";
import { firstError } from "@/hooks/useAppForm";

export function FieldError({ field }) {
  const msg = firstError(field.state.meta.errors);
  if (!msg) return null;
  return <p className="mt-1 text-xs text-error">{msg}</p>;
}

export function TextField({ form, name, label, type = "text", className = inputClass, ...props }) {
  const FormField = form.Field;
  return (
    <FormField name={name}>
      {(field) => (
        <Field label={label}>
          <input
            type={type}
            className={className}
            value={field.state.value ?? ""}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            {...props}
          />
          <FieldError field={field} />
        </Field>
      )}
    </FormField>
  );
}

export function SelectField({ form, name, label, children, className = selectClass, onValueChange, ...props }) {
  const FormField = form.Field;
  return (
    <FormField name={name}>
      {(field) => (
        <Field label={label}>
          <select
            className={className}
            value={field.state.value ?? ""}
            onBlur={field.handleBlur}
            onChange={(e) => {
              field.handleChange(e.target.value);
              onValueChange?.(e.target.value);
            }}
            {...props}
          >
            {children}
          </select>
          <FieldError field={field} />
        </Field>
      )}
    </FormField>
  );
}

export function CheckField({ form, name, label, disabled }) {
  const FormField = form.Field;
  return (
    <FormField name={name}>
      {(field) => (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={!!field.state.value}
            disabled={disabled}
            onChange={(e) => field.handleChange(e.target.checked)}
          />
          {label}
        </label>
      )}
    </FormField>
  );
}
