import { X } from "lucide-react";

export function DetailPanel({ title, subtitle, badge, onClose, children }) {
  if (!title && !children) return null;
  return (
    <aside className="flex h-full min-h-0 w-full max-w-md shrink-0 flex-col overflow-hidden rounded-box bg-base-100 shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-base-300 p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X size={18} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
    </aside>
  );
}
