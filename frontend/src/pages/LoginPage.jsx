import { useState } from "react";
import { Truck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { TextField } from "@/components/AppForm";
import { useAppForm } from "@/hooks/useAppForm";
import { loginSchema } from "@/forms/schemas";

export function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState("");

  const form = useAppForm({
    defaultValues: { username: "admin", password: "" },
    schema: loginSchema,
    onSubmit: async (value) => {
      setError("");
      try {
        await login(value.username, value.password);
      } catch {
        setError("Usuario o contraseña incorrectos");
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="card w-full max-w-md bg-base-100 shadow-xl"
      >
        <div className="card-body">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-content">
              <Truck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Sermin</h1>
              <p className="text-sm text-muted">Flota y rutas</p>
            </div>
          </div>
          <TextField form={form} name="username" label="Usuario" />
          <TextField form={form} name="password" label="Contraseña" type="password" />
          {error && <p className="text-sm text-error">{error}</p>}
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <button type="submit" disabled={isSubmitting} className="btn btn-primary mt-2">
                {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : "Ingresar"}
              </button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  );
}
