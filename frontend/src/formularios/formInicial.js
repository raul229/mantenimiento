export const formularioViaje = {
  kilometraje_final: null,
  estado: "",
  fecha_inicio: "",
  fecha_fin: "",
  observaciones: "",
  vehiculo: "",
  conductor: "",
  ruta: "",
};

export const formularioSede = {
  nombre: "",
  direccion: "",
  coordenadas: "",
  cliente: "",
  ciudad: "",
  persona: "",
};

export const formularioFalla = {
  descripcion: "",
  fecha_reportado: "",
  fecha_solucionado: "",
  vehiculo_id: "",
  usuario_reporta: "",
  estado: "pendiente",
  prioridad: "baja",
};

export const formularioMantenimiento = {
  tipo_mantenimiento: "",
  descripcion: "",
  costo: "",
  fecha_inicio: "",
  fecha_fin: "",
  proveedor: "",
  vehiculo_id: "",
  fallas_ids: [],
};

export const formularioCelular = {
  numero: "",
};

export const formularioCiudad = {
  nombre: "",
  distrito: "",
  departamento: "",
};

export const formularioCliente = {
  numero_documento: "",
  razon_social: "",
  // personas: array of persona ids (new), persona kept for backwards compatibility
  personas: [],
  persona: "",
};

export const formularioPersona = {
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  cargo: "",
  cliente: "",
  celulares: [""],
};

export const formularioRuta = {
  nombre: "",
  descripcion: "",
  sedes: [],
};

export const formularioRecojo = {
  viaje: "",
  sede: "",
  peso_kg: "",
  fecha: "",
  observaciones: "",
};
