import { useContext } from "react";
import { VehiculosContext } from "./vehiculosContext";

export function useVehiculos() {
  return useContext(VehiculosContext);
}
