import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ConfiguracionEmisorService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { Field, inputClass } from "@/components/Modal";

const vacio = {
  ruc: "",
  razon_social: "",
  nombre_comercial: "",
  direccion: "",
  registro_mtc: "",
  telefono: "",
  serie_guia: "T001",
  destinatario_documento: "",
  destinatario_razon_social: "",
  punto_llegada: "",
  motivo_traslado: "",
};

export function EmisorPage() {
  const [form, setForm] = useState(vacio);
  const [correlativo, setCorrelativo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await ConfiguracionEmisorService.get();
        setForm({ ...vacio, ...data });
        setCorrelativo(data.correlativo || 0);
      } catch {
        toast.error("No se pudo cargar la configuración");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const guardar = async () => {
    if (!form.ruc || !form.razon_social) {
      toast.error("El RUC y la razón social del emisor son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const { data } = await ConfiguracionEmisorService.update(form);
      setForm({ ...vacio, ...data });
      toast.success("Datos de emisión actualizados");
    } catch {
      toast.error("No se pudieron guardar los datos");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Topbar title="Datos de emisión" />
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex justify-center rounded-box bg-base-100 p-8">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : (
          <div className="max-w-3xl space-y-4">
            <Bloque
              titulo="Transportista emisor"
              descripcion="Aparece en la cabecera de cada guía de remisión."
            >
              <Field label="RUC">
                <input className={inputClass} maxLength={11} value={form.ruc} onChange={set("ruc")} />
              </Field>
              <Field label="Razón social">
                <input className={inputClass} value={form.razon_social} onChange={set("razon_social")} />
              </Field>
              <Field label="Nombre comercial">
                <input className={inputClass} value={form.nombre_comercial} onChange={set("nombre_comercial")} />
              </Field>
              <Field label="Dirección fiscal">
                <input className={inputClass} value={form.direccion} onChange={set("direccion")} />
              </Field>
              <Field label="Registro MTC">
                <input className={inputClass} value={form.registro_mtc} onChange={set("registro_mtc")} />
              </Field>
              <Field label="Teléfono">
                <input className={inputClass} value={form.telefono} onChange={set("telefono")} />
              </Field>
            </Bloque>

            <Bloque
              titulo="Numeración"
              descripcion={`Última guía emitida: ${correlativo || "ninguna"}. La serie solo afecta a las guías nuevas.`}
            >
              <Field label="Serie">
                <input className={inputClass} maxLength={8} value={form.serie_guia} onChange={set("serie_guia")} />
              </Field>
            </Bloque>

            <Bloque
              titulo="Destino por defecto"
              descripcion="Planta de disposición final a la que se traslada el residuo."
            >
              <Field label="RUC del destinatario">
                <input className={inputClass} maxLength={11} value={form.destinatario_documento} onChange={set("destinatario_documento")} />
              </Field>
              <Field label="Razón social del destinatario">
                <input className={inputClass} value={form.destinatario_razon_social} onChange={set("destinatario_razon_social")} />
              </Field>
              <Field label="Punto de llegada">
                <input className={inputClass} value={form.punto_llegada} onChange={set("punto_llegada")} />
              </Field>
              <Field label="Motivo del traslado">
                <input className={inputClass} value={form.motivo_traslado} onChange={set("motivo_traslado")} />
              </Field>
            </Bloque>

            <button type="button" disabled={saving} onClick={guardar} className="btn btn-primary">
              {saving ? "Guardando…" : "Guardar datos"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Bloque({ titulo, descripcion, children }) {
  return (
    <section className="rounded-box bg-base-100 p-5 shadow-sm">
      <h2 className="font-semibold">{titulo}</h2>
      <p className="mb-3 text-sm text-muted">{descripcion}</p>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}
