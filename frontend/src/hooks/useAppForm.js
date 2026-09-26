import { useForm } from "@tanstack/react-form";

export function firstError(errors) {
  const err = errors?.[0];
  if (!err) return "";
  if (typeof err === "string") return err;
  return err.message || "";
}

export function useAppForm({ defaultValues, schema, onSubmit }) {
  return useForm({
    defaultValues,
    validators: schema ? { onChange: schema, onSubmit: schema } : undefined,
    onSubmit: async ({ value }) => onSubmit(value),
  });
}
