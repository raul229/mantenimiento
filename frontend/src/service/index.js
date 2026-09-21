import api from "./AxiosConfig";

function createCrudService(endpoint, config = {}) {
  const { fk = [], m2m = [] } = config;

  const normalize = (data) => {
    if (!data) return data;
    const result = { ...data };
    fk.forEach((campo) => {
      result[`${campo}_id`] = data[campo]?.id ?? "";
    });
    m2m.forEach((campo) => {
      result[`${campo}_ids`] = data[campo]?.map((item) => item.id) ?? [];
    });
    return result;
  };

  const service = {
    getAll() {
      return api.get(endpoint);
    },
    create(item) {
      console.log(`[POST ${endpoint}]`, item);
      return api.post(endpoint, item);
    },
    update(id, item) {
      console.log(`[PUT ${endpoint}${id}/]`, item);
      return api.put(`${endpoint}${id}/`, item);
    },
    remove(id) {
      return api.delete(`${endpoint}${id}/`);
    },
    normalize,
  };
  return service;
}

export const VehiculoService = createCrudService("/vehiculos/");
export const FallaService = createCrudService("/fallas/", { fk: ["vehiculo"] });
export const ClienteService = createCrudService("/clientes/");
export const PersonaService = createCrudService("/personas/");
export const CelularService = createCrudService("/celulares/");
export const CiudadService = createCrudService("/ciudades/");
export const SedeService = createCrudService("/sedes/");
export const RutaService = createCrudService("/rutas/");
export const RecojoService = createCrudService("/recojos/");
export const ViajeService = createCrudService("/viajes/");

export const MantenimientoService = createCrudService("/mantenimientos/", {
  fk: ["vehiculo"],
  m2m: ["fallas"],
});

