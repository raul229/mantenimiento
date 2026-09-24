export function formatKg(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("es-PE", { maximumFractionDigits: 0 })} kg`;
}

export function formatKgPrecise(value) {
  const n = Number(value || 0);
  return `${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

export function formatKm(value) {
  if (value === null || value === undefined || value === "") return "—";
  return `${Number(value).toLocaleString("es-PE")} km`;
}

export function formatMoney(value) {
  const n = Number(value || 0);
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function monthISO() {
  return new Date().toISOString().slice(0, 7);
}

export const ESTADO_VIAJE = {
  programado: { label: "Pendiente", className: "badge-warning" },
  "en curso": { label: "En proceso", className: "badge-success" },
  completado: { label: "Completado", className: "badge-info" },
  cancelado: { label: "Cancelado", className: "badge-ghost" },
};

export const ESTADO_FLOTA = {
  en_ruta: { label: "En ruta", className: "badge-success" },
  en_taller: { label: "En taller", className: "badge-warning" },
  detenido: { label: "Detenido", className: "badge-error" },
  disponible: { label: "Disponible", className: "badge-info" },
};

export function clasificarDocumento(raw) {
  const n = String(raw || "").replace(/\D/g, "");
  if (n.length === 11 && n.startsWith("20")) return "empresa";
  if (n.length === 11 && ["10", "15", "17"].includes(n.slice(0, 2))) return "persona";
  if (n.length === 8) return "persona";
  return null;
}

export const NATURALEZA_CLIENTE = {
  empresa: { label: "Empresa", className: "badge-info" },
  persona: { label: "Persona", className: "badge-secondary" },
};

export const ESTADO_CAJA = {
  sin_fondo: { label: "Sin fondo", className: "badge-ghost" },
  abierta: { label: "Abierta", className: "badge-warning" },
  cerrada: { label: "Cerrada", className: "badge-success" },
};

export const ESTADO_RECOJO = {
  pendiente: { label: "Pendiente", className: "badge-ghost" },
  en_sitio: { label: "En sitio", className: "badge-warning" },
  completado: { label: "Completado", className: "badge-success" },
};
