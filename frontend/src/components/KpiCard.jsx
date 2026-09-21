export function KpiCard({ title, value, hint, icon, accent, children }) {
  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{title}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
            {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
          </div>
          {icon && (
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent || "bg-primary/10 text-primary"}`}>
              {icon}
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
