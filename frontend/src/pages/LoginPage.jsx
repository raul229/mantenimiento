import { useState } from "react";
import { Truck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { inputClass } from "@/components/Modal";

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError("Usuario o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-6">
      <form onSubmit={submit} className="card w-full max-w-md bg-base-100 shadow-xl">
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
          <fieldset className="fieldset p-0">
            <legend className="fieldset-legend">Usuario</legend>
            <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} />
          </fieldset>
          <fieldset className="fieldset p-0">
            <legend className="fieldset-legend">Contraseña</legend>
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </fieldset>
          {error && <p className="text-sm text-error">{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary mt-2">
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Ingresar"}
          </button>
        </div>
      </form>
    </div>
  );
}
