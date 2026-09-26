import { X } from "lucide-react";

export function DetailPanel({ title, subtitle, badge, onClose, children }) {
  if (!title && !children) return null;
  return (
    <>
      {onClose && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Cerrar detalle"
          onClick={onClose}
        />
      )}
      <aside className="fixed inset-x-0 bottom-0 top-14 z-40 flex min-h-0 flex-col overflow-hidden bg-base-100 shadow-xl lg:static lg:inset-auto lg:z-auto lg:h-full lg:w-full lg:max-w-md lg:shrink-0 lg:rounded-box lg:shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-base-300 p-4 lg:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle shrink-0">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:p-5">
          {children}
        </div>
      </aside>
    </>
  );
}
