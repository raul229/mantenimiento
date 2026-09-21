import { useState } from "react";

export function useModal() {
  const [mostrar, setMostrar] = useState(false);
  const ocultarModal = () => setMostrar(false);
  const mostrarModal = () => setMostrar(true);
  return { mostrar, ocultarModal, mostrarModal };
}
