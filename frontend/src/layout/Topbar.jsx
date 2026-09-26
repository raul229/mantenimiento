import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NotificacionService } from "@/service/api";
import { etiquetaRol } from "@/utils/roles";
import { formatDateTime } from "@/utils/format";
import { useApiList } from "@/hooks/useApiQuery";
import { qk } from "@/query/keys";

export function Topbar({ title, children }) {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const puedeFlota = can("flota");
  const { data: notifs = [] } = useApiList(
    qk.notificaciones,
    () => NotificacionService.getAll(),
    { enabled: puedeFlota, staleTime: 60_000 },
  );

  const unread = notifs.filter((n) => !n.leida).length;

  const marcarLocal = (updater) => {
    queryClient.setQueryData(qk.notificaciones, (prev) => (Array.isArray(prev) ? updater(prev) : prev));
  };

  const abrir = async (n) => {
    if (!n.leida) {
      try { await NotificacionService.leer(n.id); } catch { /* ignore */ }
    }
    marcarLocal((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    navigate("/flota");
  };

  const leerTodas = async () => {
    try {
      await NotificacionService.leerTodas();
      marcarLocal((prev) => prev.map((n) => ({ ...n, leida: true })));
    } catch { /* ignore */ }
  };

  return (
    <header className="navbar min-h-14 border-b border-base-300 bg-base-100/80 px-6 backdrop-blur">
      <div className="flex-1">
        {title && <h1 className="truncate text-xl font-semibold">{title}</h1>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {can("flota") && (
          <div className="dropdown dropdown-end">
            <button type="button" tabIndex={0} className="btn btn-ghost btn-circle">
              <div className="indicator">
                <Bell size={18} />
                {unread > 0 && (
                  <span className="indicator-item badge badge-error badge-xs">{unread > 9 ? "9+" : unread}</span>
                )}
              </div>
            </button>
            <div tabIndex={0} className="dropdown-content z-30 mt-2 w-80 rounded-box bg-base-100 p-2 shadow-lg">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-sm font-semibold">Avisos de taller</p>
                {unread > 0 && (
                  <button type="button" className="btn btn-ghost btn-xs" onClick={leerTodas}>Marcar leídas</button>
                )}
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {notifs.slice(0, 12).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`w-full rounded-xl px-3 py-2 text-left ${n.leida ? "opacity-60" : "bg-primary/5"}`}
                      onClick={() => abrir(n)}
                    >
                      <p className="text-sm font-medium">{n.titulo}</p>
                      <p className="text-xs text-muted">{n.mensaje}</p>
                      <p className="mt-1 text-xs text-muted">{formatDateTime(n.creado_en)}</p>
                    </button>
                  </li>
                ))}
                {!notifs.length && <li className="px-3 py-6 text-center text-sm text-muted">Sin avisos</li>}
              </ul>
            </div>
          </div>
        )}
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
