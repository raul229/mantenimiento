export function formatKg(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("es-PE", { maximumFractionDigits: 0 })} kg`;
}

export function formatKgPrecise(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

export function formatMoney(value) {
  const n = Number(value || 0);
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthISO() {
  return new Date().toISOString().slice(0, 7);
}

export const ESTADO_VIAJE = {
  programado: { label: "Pendiente", className: "badge-warning" },
  "en curso": { label: "En ruta", className: "badge-success" },
  completado: { label: "Completado", className: "badge-info" },
  cancelado: { label: "Cancelado", className: "badge-ghost" },
};

export const ESTADO_FLOTA = {
  en_ruta: { label: "En ruta", className: "badge-success" },
  en_taller: { label: "En taller", className: "badge-warning" },
  detenido: { label: "Detenido", className: "badge-error" },
  disponible: { label: "Disponible", className: "badge-info" },
};

export const ESTADO_RECOJO = {
  pendiente: { label: "Pendiente", className: "badge-ghost" },
  en_sitio: { label: "En sitio", className: "badge-warning" },
  completado: { label: "Completado", className: "badge-success" },
};
