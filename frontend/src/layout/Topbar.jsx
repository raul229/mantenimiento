import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { etiquetaRol } from "@/utils/roles";

export function Topbar({ title, children }) {
  const { user } = useAuth();
  return (
    <header className="navbar min-h-14 border-b border-base-300 bg-base-100/80 px-6 backdrop-blur">
      <div className="flex-1">
        {title && <h1 className="truncate text-xl font-semibold">{title}</h1>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        <button type="button" className="btn btn-ghost btn-circle">
          <div className="indicator">
            <Bell size={18} />
            <span className="indicator-item status status-error h-2 w-2" />
          </div>
        </button>
        <div className="flex items-center gap-2 rounded-full bg-base-200 py-1 pl-1 pr-3">
          <div className="avatar placeholder">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-content">
              {(user?.nombre || "U").slice(0, 1).toUpperCase()}
            </div>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium leading-none">{user?.nombre || user?.username}</p>
            <p className="text-xs text-muted">{etiquetaRol(user)}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
