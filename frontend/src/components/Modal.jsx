export function Modal({ open, title, onClose, onSubmit, submitLabel = "Guardar", wide = false, children }) {
  if (!open) return null;
  return (
    <dialog className="modal modal-open" aria-labelledby="modal-title">
      <div className={`modal-box bg-base-100 ${wide ? "max-w-2xl" : ""}`}>
        <h2 id="modal-title" className="text-lg font-bold">{title}</h2>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto py-4">{children}</div>
        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={onSubmit}>
            {submitLabel}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose} aria-label="Cerrar">close</button>
      </form>
    </dialog>
  );
}

export function Field({ label, children }) {
  return (
    <fieldset className="fieldset p-0">
      {label && <legend className="fieldset-legend">{label}</legend>}
      {children}
    </fieldset>
  );
}

export const inputClass = "input input-bordered w-full";
export const selectClass = "select select-bordered w-full";
export const filterClass = "input input-bordered h-10";
export const filterSelectClass = "select select-bordered h-10";
