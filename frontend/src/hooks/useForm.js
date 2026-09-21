import { useState } from "react";

export function useForm({ inicial, formularioInicial }) {
  const initial = inicial ?? formularioInicial;
  const [formulario, setFormulario] = useState(initial);
  const [editando, setEditando] = useState(false);

  const reset = () => {
    setFormulario(initial);
    setEditando(false);
  };

  return {
    formulario,
    setFormulario,
    reset,
    limpiarFormulario: reset,
    editando,
    setEditando,
  };
}
