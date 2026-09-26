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
      <div className="modal-box w-[min(32rem,calc(100vw-1.5rem))] bg-base-100">
        <h3 className="text-lg font-bold">{titulo}</h3>
        <div className="py-4 text-sm">{mensaje}</div>
        <div className="modal-action flex-col-reverse sm:flex-row">
          <button type="button" className="btn btn-ghost w-full sm:w-auto" onClick={onHide}>Cancelar</button>
          <button type="button" className={`btn w-full sm:w-auto ${confirmClass}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onHide} aria-label="Cerrar">close</button>
      </form>
    </dialog>
  );
}
