export const ROLES = {
  administrador: { label: "Administrador" },
  operaciones: { label: "Operaciones" },
  conductor: { label: "Conductor" },
};

const MODULOS = {
  dashboard: ["administrador", "operaciones", "conductor"],
  clientes: ["administrador", "operaciones"],
  viajes: ["administrador", "operaciones", "conductor"],
  recojos: ["administrador", "operaciones", "conductor"],
  flota: ["administrador", "operaciones"],
  emisor: ["administrador", "operaciones"],
  guias: ["administrador", "operaciones"],
  usuarios: ["administrador"],
};

export function puede(rol, modulo) {
  if (!rol || !modulo) return false;
  if (rol === "administrador") return true;
  return (MODULOS[modulo] || []).includes(rol);
}

export function puedeEscribir(rol, modulo) {
  if (!puede(rol, modulo)) return false;
  if (rol === "conductor") return modulo === "recojos";
  return true;
}
