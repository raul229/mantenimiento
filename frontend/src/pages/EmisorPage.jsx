import { useEffect } from "react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { ConfiguracionEmisorService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { TextField } from "@/components/AppForm";
import { useAppForm } from "@/hooks/useAppForm";
import { emisorSchema } from "@/forms/schemas";
import { qk } from "@/query/keys";
import { useInvalidate } from "@/hooks/useApiQuery";

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
  const invalidate = useInvalidate();
  const { data, isLoading: loading } = useQuery({
    queryKey: qk.emisor,
    queryFn: async () => (await ConfiguracionEmisorService.get()).data,
  });

  const form = useAppForm({
    defaultValues: vacio,
    schema: emisorSchema,
    onSubmit: async (value) => {
      try {
        const { data: saved } = await ConfiguracionEmisorService.update(value);
        form.reset({ ...vacio, ...saved });
        await invalidate(qk.emisor);
        toast.success("Datos de emisión actualizados");
      } catch {
        toast.error("No se pudieron guardar los datos");
      }
    },
  });

  useEffect(() => {
    if (data) form.reset({ ...vacio, ...data });
  }, [data]);

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
              <TextField form={form} name="ruc" label="RUC" maxLength={11} />
              <TextField form={form} name="razon_social" label="Razón social" />
              <TextField form={form} name="nombre_comercial" label="Nombre comercial" />
              <TextField form={form} name="direccion" label="Dirección fiscal" />
              <TextField form={form} name="registro_mtc" label="Registro MTC" />
              <TextField form={form} name="telefono" label="Teléfono" />
            </Bloque>

            <Bloque
              titulo="Numeración"
              descripcion={`Última guía emitida: ${data?.correlativo || "ninguna"}. La serie solo afecta a las guías nuevas.`}
            >
              <TextField form={form} name="serie_guia" label="Serie" maxLength={8} />
            </Bloque>

            <Bloque
              titulo="Destino por defecto"
              descripcion="Planta de disposición final a la que se traslada el residuo."
            >
              <TextField form={form} name="destinatario_documento" label="RUC del destinatario" maxLength={11} />
              <TextField form={form} name="destinatario_razon_social" label="Razón social del destinatario" />
              <TextField form={form} name="punto_llegada" label="Punto de llegada" />
              <TextField form={form} name="motivo_traslado" label="Motivo del traslado" />
            </Bloque>

            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(saving) => (
                <button type="button" disabled={saving} onClick={() => form.handleSubmit()} className="btn btn-primary">
                  {saving ? "Guardando…" : "Guardar datos"}
                </button>
              )}
            </form.Subscribe>
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
