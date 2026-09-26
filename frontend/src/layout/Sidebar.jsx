import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Route,
  Recycle,
  Truck,
  FileText,
  Shield,
  Wallet,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { etiquetaRol } from "@/utils/roles";
import { useLayout } from "./LayoutContext";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true, modulo: "dashboard" },
  { to: "/clientes", label: "Clientes", icon: Users, modulo: "clientes" },
  { to: "/viajes", label: "Rutas y viajes", icon: Route, modulo: "viajes" },
  { to: "/recojos", label: "Recojos", icon: Recycle, modulo: "recojos" },
  { to: "/gastos", label: "Caja y gastos", icon: Wallet, modulo: "gastos" },
  { to: "/flota", label: "Flota y taller", icon: Truck, modulo: "flota" },
  { to: "/emisor", label: "Datos de emisión", icon: FileText, modulo: "emisor" },
  { to: "/usuarios", label: "Usuarios", icon: Shield, modulo: "usuarios" },
];

export function Sidebar() {
  const { user, logout, can } = useAuth();
  const { navOpen, setNavOpen } = useLayout();
  const visibles = items.filter((item) => can(item.modulo));
  const cerrar = () => setNavOpen(false);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[min(18rem,85vw)] flex-col bg-sidebar text-white shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 lg:shadow-none ${
        navOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
          <Truck size={20} />
        </div>
        <div>
          <p className="text-lg font-semibold leading-none">Sermin</p>
          <p className="mt-1 text-xs text-white/60">Flota y rutas</p>
        </div>
      </div>
      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
        {visibles.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={cerrar}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                isActive ? "bg-accent text-white" : "text-white/75 hover:bg-sidebar-2 hover:text-white"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={() => {
            cerrar();
            logout();
          }}
          className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left hover:bg-sidebar-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
              {(user?.nombre || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.nombre || user?.username}</p>
              <p className="truncate text-xs text-white/50">{etiquetaRol(user) || "Cerrar sesión"}</p>
            </div>
          </div>
          <ChevronDown size={16} className="shrink-0 text-white/50" />
        </button>
      </div>
    </aside>
  );
}
