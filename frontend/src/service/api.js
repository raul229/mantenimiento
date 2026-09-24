import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sermin_access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("sermin_refresh");
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh/`,
            { refresh },
          );
          localStorage.setItem("sermin_access", data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.removeItem("sermin_access");
          localStorage.removeItem("sermin_refresh");
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;

export const AuthService = {
  login: (username, password) =>
    api.post("/auth/token/", { username, password }),
  me: () => api.get("/auth/me/"),
};

export const DashboardService = {
  get: (params) => api.get("/dashboard/", { params }),
};

function crud(endpoint) {
  return {
    getAll: (params) => api.get(endpoint, { params }),
    get: (id) => api.get(`${endpoint}${id}/`),
    create: (item) => api.post(endpoint, item),
    update: (id, item) => api.put(`${endpoint}${id}/`, item),
    patch: (id, item) => api.patch(`${endpoint}${id}/`, item),
    remove: (id) => api.delete(`${endpoint}${id}/`),
  };
}

export const ClienteService = crud("/clientes/");
export const VehiculoService = crud("/vehiculos/");
export const ViajeService = crud("/viajes/");
export const MantenimientoService = crud("/mantenimientos/");
export const DocumentoService = crud("/documentos/");
export const RutaService = crud("/rutas/");
export const CiudadService = crud("/ciudades/");
export const RecojoService = crud("/recojos/");
export const SedeService = crud("/sedes/");
export const PersonaService = crud("/personas/");
export const TipoResiduoService = crud("/tipos-residuo/");
export const CategoriaGastoService = crud("/categorias-gasto/");
export const CajaService = {
  getAll: (params) => api.get("/cajas/", { params }),
  get: (id) => api.get(`/cajas/${id}/`),
  asignar: (datos) => api.post("/cajas/asignar/", datos),
  aumentar: (id, datos) => api.post(`/cajas/${id}/aumentar/`, datos),
  gastar: (id, datos) => api.post(`/cajas/${id}/gastos/`, datos),
  borrarMovimiento: (id, movId) => api.post(`/cajas/${id}/movimientos/${movId}/borrar/`),
  cerrar: (id, datos) => api.post(`/cajas/${id}/cerrar/`, datos),
  reabrir: (id) => api.post(`/cajas/${id}/reabrir/`),
};

export const UsuarioService = { getAll: (params) => api.get("/usuarios/", { params }) };
export const PersonalService = crud("/personal/");
export const RolService = {
  ...crud("/roles/"),
  catalogo: () => api.get("/roles/catalogo/"),
};

export const ConfiguracionEmisorService = {
  get: () => api.get("/configuracion-emisor/"),
  update: (datos) => api.put("/configuracion-emisor/", datos),
};

// Los endpoints de impresión exigen el token JWT, así que se piden como blob
// y se muestran con una URL temporal en lugar de abrir la URL directa.
export const GuiaService = {
  ...crud("/guias/"),
  emitir: (datos) => api.post("/guias/emitir/", datos),
  anular: (id) => api.post(`/guias/${id}/anular/`),
  previewHtml: (params) =>
    api.get("/guias/preview/", { params, responseType: "blob" }),
  pdf: (params) => api.get("/guias/pdf/", { params, responseType: "blob" }),
};

export function blobUrl(respuesta, tipo) {
  return URL.createObjectURL(new Blob([respuesta.data], { type: tipo }));
}
