import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Download, Printer, X } from "lucide-react";
import { GuiaService, blobUrl } from "@/service/api";

/**
 * Vista previa imprimible de una o varias guías de remisión.
 * Recibe los ids de las guías ya emitidas o el id de un viaje completo.
 */
export function GuiaRemisionModal({ open, ids = [], viaje = null, onClose }) {
  const [url, setUrl] = useState(null);
  const [descargando, setDescargando] = useState(false);
  const iframe = useRef(null);
  const listaIds = ids.join(",");

  useEffect(() => {
    if (!open) {
      setUrl(null);
      return;
    }
    let vigente = true;
    let creada = null;
    (async () => {
      try {
        const res = await GuiaService.previewHtml(params(listaIds, viaje));
        creada = blobUrl(res, "text/html");
        if (vigente) setUrl(creada);
        else URL.revokeObjectURL(creada);
      } catch {
        toast.error("No se pudo cargar la vista previa de la guía");
        onClose?.();
      }
    })();
    return () => {
      vigente = false;
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [open, listaIds, viaje]);

  const imprimir = () => {
    const ventana = iframe.current?.contentWindow;
    if (!ventana) return;
    ventana.focus();
    ventana.print();
  };

  const descargar = async () => {
    setDescargando(true);
    try {
      const res = await GuiaService.pdf(params(listaIds, viaje));
      const enlace = document.createElement("a");
      enlace.href = blobUrl(res, "application/pdf");
      enlace.download = nombreArchivo(res, ids.length);
      enlace.click();
      URL.revokeObjectURL(enlace.href);
    } catch {
      toast.error("No se pudo generar el PDF");
    } finally {
      setDescargando(false);
    }
  };

  if (!open) return null;

  const total = viaje ? null : ids.length;
  return (
    <dialog className="modal modal-open">
      <div className="modal-box flex h-[90vh] max-w-5xl flex-col bg-base-100">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">
            {total === 1 ? "Guía de remisión" : "Guías de remisión"}
            {total > 1 && <span className="ml-2 text-sm font-normal text-muted">{total} documentos</span>}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-box border border-base-300 bg-white">
          {url ? (
            <iframe ref={iframe} src={url} title="Vista previa de la guía" className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          )}
        </div>

        <div className="modal-action">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="btn" disabled={!url} onClick={imprimir}>
            <Printer size={16} /> Imprimir
          </button>
          <button type="button" className="btn btn-primary" disabled={!url || descargando} onClick={descargar}>
            <Download size={16} /> {descargando ? "Generando…" : "Descargar PDF"}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Avisa de los recojos que quedaron sin guía por datos incompletos. */
export function avisarOmitidos(omitidos = []) {
  if (!omitidos.length) return;
  const [primero] = omitidos;
  const resto = omitidos.length - 1;
  const extra = resto ? ` (y ${resto} recojo${resto > 1 ? "s" : ""} más sin guía)` : "";
  toast.error(`Recojo #${primero.recojo}: ${primero.motivo}${extra}`, { duration: 7000 });
}

function params(listaIds, viaje) {
  return viaje ? { viaje } : { ids: listaIds };
}

function nombreArchivo(respuesta, cantidad) {
  const cabecera = respuesta.headers?.["content-disposition"] || "";
  const encontrado = /filename="?([^";]+)"?/.exec(cabecera);
  return encontrado?.[1] || (cantidad === 1 ? "guia-remision.pdf" : "guias-remision.pdf");
}
