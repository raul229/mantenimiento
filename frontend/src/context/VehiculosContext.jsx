import { useEffect, useMemo, useState } from "react";
import { VehiculoService } from "@/service";
import { VehiculosContext } from "./vehiculosContext";

export function VehiculosProvider({ children }) {
  const [vehiculos, setVehiculos] = useState([]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await VehiculoService.getAll();
        setVehiculos(data);
      } catch (error) {
        console.error("Error cargando vehículos:", error);
      }
    };
    cargar();
  }, []);

  const cargarVehiculos = async () => {
    try {
      const { data } = await VehiculoService.getAll();
      setVehiculos(data);
    } catch (error) {
      console.error("Error cargando vehículos:", error);
    }
  };

  const value = useMemo(() => ({ vehiculos, cargarVehiculos }), [vehiculos]);

  return (
    <VehiculosContext.Provider value={value}>
      {children}
    </VehiculosContext.Provider>
  );
}
