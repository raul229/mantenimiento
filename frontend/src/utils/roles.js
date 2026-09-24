const LECTURA = new Set(["ver", "escribir", "eliminar"]);
const ESCRITURA = new Set(["escribir", "eliminar"]);

export function puede(user, modulo) {
  return LECTURA.has(user?.permisos?.[modulo]);
}

export function puedeEscribir(user, modulo) {
  return ESCRITURA.has(user?.permisos?.[modulo]);
}

export function puedeEliminar(user, modulo) {
  return user?.permisos?.[modulo] === "eliminar";
}

export function etiquetaRol(user) {
  return user?.rol_label || user?.rol || "";
}

export function etiquetaPermiso(nivel) {
  if (nivel === "eliminar") return "Eliminar";
  if (nivel === "escribir") return "Editar";
  if (nivel === "ver") return "Ver";
  return "Sin acceso";
}
