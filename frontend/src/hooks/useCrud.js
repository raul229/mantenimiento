import { useEffect, useState, useCallback } from "react";

export function useCrud(service) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const response = await service.getAll();
      setData(response.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [service]);

  const crear = useCallback(
    async (nuevo) => {
      await service.create(nuevo);
      await refetch();
    },
    [service, refetch],
  );

  const actualizar = useCallback(
    async (id, actualizado) => {
      await service.update(id, actualizado);
      await refetch();
    },
    [service, refetch],
  );

  const eliminar = useCallback(
    async (id) => {
      await service.remove(id);
      await refetch();
    },
    [service, refetch],
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, crear, actualizar, eliminar, refetch };
}
