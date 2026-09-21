export function BotonNuevo({ limpiarFormulario, setEditando, mostrarModal, texto = "Nuevo" }) {
  const handleClick = () => {
    limpiarFormulario();
    setEditando(false);
    mostrarModal();
  };
  return (
    <button type="button" className="btn btn-primary mb-3" onClick={handleClick}>
      {texto}
    </button>
  );
}
