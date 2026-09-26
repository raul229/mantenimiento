import { z } from "zod";
import { clasificarDocumento } from "@/utils/format";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Indica el usuario"),
  password: z.string().min(1, "Indica la contraseña"),
});

export const ciudadSchema = z.object({
  nombre: z.string().trim().min(1, "El nombre de la ciudad es obligatorio"),
  distrito: z.string(),
  departamento: z.string(),
});

export const viajeSchema = z.object({
  vehiculo: z.string().min(1, "Asigna un vehículo"),
  conductor: z.string().min(1, "Asigna un conductor"),
  ruta: z.string(),
  fecha_inicio: z.string().min(1, "Indica la fecha"),
  hora_salida: z.string(),
});

export const rutaSchema = z.object({
  nombre: z.string().trim().min(1, "Indica el nombre de la ruta"),
  descripcion: z.string(),
  sedes: z.array(z.number()),
});

export const recojoSchema = z.object({
  viaje: z.string().min(1, "Selecciona un viaje en proceso"),
  sede: z.string().min(1, "Selecciona una sede"),
  peso_kg: z.coerce.number().positive("Indica los kilogramos"),
  observaciones: z.string(),
});

export const vehiculoSchema = z.object({
  marca: z.string().trim().min(1, "Indica la marca"),
  modelo: z.string().trim().min(1, "Indica el modelo"),
  placa: z.string().trim().min(1, "Indica la placa"),
  anio: z.string(),
  kilometraje_actual: z.coerce.number().min(0, "Kilometraje inválido"),
});

export const montoSchema = z.object({
  monto: z.coerce.number().positive("Indica un monto"),
  descripcion: z.string(),
});

export const gastoSchema = montoSchema.extend({
  categoria: z.union([z.string(), z.number()]).refine((v) => v !== "" && v != null, "Elige una categoría"),
});

export const categoriaGastoSchema = z.object({
  nombre: z.string().trim().min(1, "Indica el nombre"),
});

export const usuarioSchema = z.object({
  username: z.string().trim().min(1, "Indica el usuario"),
  first_name: z.string(),
  last_name: z.string(),
  email: z.union([z.literal(""), z.string().email("Correo inválido")]),
  rol: z.string().min(1, "Elige un rol"),
  password: z.string(),
  is_active: z.boolean(),
  id: z.any().optional(),
}).superRefine((value, ctx) => {
  if (!value.id && !value.password) {
    ctx.addIssue({ code: "custom", path: ["password"], message: "Indica una contraseña" });
  }
});

export const rolSchema = z.object({
  nombre: z.string().trim().min(1, "Indica el nombre del rol"),
  descripcion: z.string(),
  solo_asignados: z.boolean(),
  permisos: z.record(z.string(), z.string()),
});

export const emisorSchema = z.object({
  ruc: z.string().trim().min(11, "El RUC del emisor es obligatorio").max(11),
  razon_social: z.string().trim().min(1, "La razón social es obligatoria"),
  nombre_comercial: z.string(),
  direccion: z.string(),
  registro_mtc: z.string(),
  telefono: z.string(),
  serie_guia: z.string().trim().min(1, "Indica la serie"),
  destinatario_documento: z.string(),
  destinatario_razon_social: z.string(),
  punto_llegada: z.string(),
  motivo_traslado: z.string(),
});

const contactoSchema = z.object({
  nombre: z.string(),
  apellido_paterno: z.string(),
  apellido_materno: z.string().optional(),
  cargo: z.string().optional(),
  celular: z.string().optional(),
});

export const clienteSchema = z.object({
  numero_documento: z.string(),
  razon_social: z.string(),
  tipo: z.string(),
  estado: z.string(),
  titular: contactoSchema,
  contactos: z.array(contactoSchema),
  sedes: z.array(z.object({
    nombre: z.string(),
    direccion: z.string(),
    ciudad: z.union([z.string(), z.number()]),
    contacto: z.number(),
  })),
}).superRefine((value, ctx) => {
  const tipo = clasificarDocumento(value.numero_documento);
  if (!tipo) {
    ctx.addIssue({ code: "custom", path: ["numero_documento"], message: "Ingresa un RUC (11 dígitos) o DNI (8 dígitos) válido" });
    return;
  }
  if (tipo === "empresa" && !value.razon_social.trim()) {
    ctx.addIssue({ code: "custom", path: ["razon_social"], message: "La razón social es obligatoria" });
  }
  if (tipo === "persona" && (!value.titular.nombre.trim() || !value.titular.apellido_paterno.trim())) {
    ctx.addIssue({ code: "custom", path: ["titular"], message: "La persona necesita nombre y apellido" });
  }
  if (tipo === "empresa") {
    value.contactos.forEach((c, i) => {
      if (!c.nombre.trim() || !c.apellido_paterno.trim()) {
        ctx.addIssue({ code: "custom", path: ["contactos", i], message: `El contacto ${i + 1} necesita nombre y apellido` });
      }
    });
  }
  value.sedes.forEach((s, i) => {
    if (!String(s.direccion).trim() || !s.ciudad) {
      ctx.addIssue({ code: "custom", path: ["sedes", i], message: `La sede ${i + 1} necesita ciudad y dirección` });
    }
  });
});

export const sedeSchema = z.object({
  cliente: z.string().min(1, "Cliente, ciudad y dirección son obligatorios"),
  ciudad: z.string().min(1, "Cliente, ciudad y dirección son obligatorios"),
  direccion: z.string().trim().min(1, "Cliente, ciudad y dirección son obligatorios"),
  nombre: z.string(),
  modoPersona: z.string(),
  persona: z.string(),
  persona_nueva: contactoSchema,
}).superRefine((value, ctx) => {
  if (value.modoPersona === "nueva") {
    if (!value.persona_nueva.nombre.trim() || !value.persona_nueva.apellido_paterno.trim()) {
      ctx.addIssue({ code: "custom", path: ["persona_nueva"], message: "El encargado necesita nombre y apellido" });
    }
  } else if (!value.persona) {
    ctx.addIssue({ code: "custom", path: ["persona"], message: "Selecciona un encargado o registra uno nuevo" });
  }
});
