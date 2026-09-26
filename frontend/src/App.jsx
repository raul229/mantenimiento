import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { queryClient } from "@/query/client";
import { AppLayout } from "@/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ClientesPage } from "@/pages/ClientesPage";
import { FlotaPage } from "@/pages/FlotaPage";
import { ViajesPage } from "@/pages/ViajesPage";
import { RecojosPage } from "@/pages/RecojosPage";
import { EmisorPage } from "@/pages/EmisorPage";
import { UsuariosPage } from "@/pages/UsuariosPage";
import { GastosPage } from "@/pages/GastosPage";

function Guard({ children, modulo }) {
  const { user, ready, can } = useAuth();
  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Cargando…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  if (modulo && !can(modulo)) return <Navigate to="/" replace />;
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
        <Route path="/clientes" element={<Guard modulo="clientes"><ClientesPage /></Guard>} />
        <Route path="/flota" element={<Guard modulo="flota"><FlotaPage /></Guard>} />
        <Route path="/viajes" element={<Guard modulo="viajes"><ViajesPage /></Guard>} />
        <Route path="/recojos" element={<Guard modulo="recojos"><RecojosPage /></Guard>} />
        <Route path="/gastos" element={<Guard modulo="gastos"><GastosPage /></Guard>} />
        <Route path="/emisor" element={<Guard modulo="emisor"><EmisorPage /></Guard>} />
        <Route path="/usuarios" element={<Guard modulo="usuarios"><UsuariosPage /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}
