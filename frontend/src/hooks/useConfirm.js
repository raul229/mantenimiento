import { useCallback, useState } from "react";

export function useConfirm() {
  const [estado, setEstado] = useState({ abierto: false, id: null });

  const pedir = useCallback((id) => setEstado({ abierto: true, id }), []);

  const cancelar = useCallback(() => setEstado({ abierto: false, id: null }), []);

  return { ...estado, pedir, cancelar };
}
