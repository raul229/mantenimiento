export function StatusBadge({ map, value, fallback }) {
  const item = map?.[value] || { label: fallback || value || "—", className: "badge-ghost" };
  return <span className={`badge ${item.className}`}>{item.label}</span>;
}
