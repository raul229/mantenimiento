import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ClientesPage } from "@/pages/ClientesPage";
import { FlotaPage } from "@/pages/FlotaPage";
import { ViajesPage } from "@/pages/ViajesPage";
import { RecojosPage } from "@/pages/RecojosPage";
import { EmisorPage } from "@/pages/EmisorPage";

function Guard({ children }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Cargando…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        element={
          <Guard>
            <AppLayout />
          </Guard>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/flota" element={<FlotaPage />} />
        <Route path="/viajes" element={<ViajesPage />} />
        <Route path="/recojos" element={<RecojosPage />} />
        <Route path="/emisor" element={<EmisorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
