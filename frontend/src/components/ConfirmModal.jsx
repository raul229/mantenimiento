export function ConfirmModal({
  show,
  onHide,
  onConfirm,
  titulo = "Confirmar",
  mensaje,
  confirmText = "Confirmar",
  variant = "error",
}) {
  if (!show) return null;
  const confirmClass = variant === "danger" || variant === "error" ? "btn-error" : "btn-primary";
  return (
    <dialog className="modal modal-open">
      <div className="modal-box bg-base-100">
        <h3 className="text-lg font-bold">{titulo}</h3>
        <p className="py-4">{mensaje}</p>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onHide}>Cancelar</button>
          <button type="button" className={`btn ${confirmClass}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onHide} aria-label="Cerrar">close</button>
      </form>
    </dialog>
  );
}
