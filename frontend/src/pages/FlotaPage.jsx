import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Truck } from "lucide-react";
import {
  DocumentoService, FallaService, MantenimientoService, ServicioVehiculoService,
  TipoFallaService, TipoServicioService, VehiculoService,
} from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { Modal } from "@/components/Modal";
import { ESTADO_FLOTA, ESTADO_SERVICIO, formatKm } from "@/utils/format";
import { useAuth } from "@/context/AuthContext";
import { FallasTab } from "@/pages/flota/FallasTab";
import { OrdenesTab } from "@/pages/flota/OrdenesTab";
import { PreventivosTab } from "@/pages/flota/PreventivosTab";
import { useApiList, useInvalidate } from "@/hooks/useApiQuery";
import { qk } from "@/query/keys";
import { TextField } from "@/components/AppForm";
import { useAppForm } from "@/hooks/useAppForm";
import { vehiculoSchema } from "@/forms/schemas";

const emptyForm = {
  marca: "",
  modelo: "",
  placa: "",
  anio: "",
  tipo: "furgon",
  estado: "activo",
  kilometraje_actual: 0,
  nivel_combustible: 50,
};

export function FlotaPage() {
  const { user, canWrite } = useAuth();
  const puedeTaller = canWrite("flota") && !user?.solo_asignados;
  const puedeReportar = canWrite("flota");

  const invalidate = useInvalidate();
  const [tab, setTab] = useState("flota");
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");

  const { data: vehiculos = [], isLoading: loadingFlota } = useApiList(qk.vehiculos, () => VehiculoService.getAll());
  const { data: mantenimientos = [], isLoading: loadingOrdenes } = useApiList(
    qk.mantenimientos,
    () => MantenimientoService.getAll(),
    { enabled: tab === "flota" || tab === "ordenes" },
  );
  const { data: documentos = [] } = useApiList(
    qk.documentos({ tipo_entidad: "vehiculo" }),
    () => DocumentoService.getAll({ tipo_entidad: "vehiculo" }),
    { enabled: tab === "flota" || tab === "documentos" },
  );
  const { data: fallas = [], isLoading: loadingFallas } = useApiList(
    qk.fallas,
    () => FallaService.getAll(),
    { enabled: tab === "fallas" || tab === "ordenes" },
  );
  const { data: tiposFalla = [] } = useApiList(qk.tiposFalla, () => TipoFallaService.getAll(), { enabled: tab === "fallas" });
  const { data: tiposServicio = [] } = useApiList(
    qk.tiposServicio,
    () => TipoServicioService.getAll(),
    { enabled: tab === "ordenes" || tab === "preventivos" },
  );
  const { data: servicios = [], isLoading: loadingPrev } = useApiList(
    qk.servicios,
    () => ServicioVehiculoService.getAll(),
    { enabled: tab === "flota" || tab === "preventivos" },
  );
  const selected = vehiculos.find((v) => v.id === selectedId) || null;
  const loading = tab === "flota" ? loadingFlota : tab === "fallas" ? loadingFallas : tab === "ordenes" ? loadingOrdenes : tab === "preventivos" ? loadingPrev : false;

  const recargar = () => invalidate(
    qk.vehiculos,
    qk.mantenimientos,
    qk.fallas,
    qk.servicios,
    qk.tiposFalla,
    qk.tiposServicio,
    qk.documentos({ tipo_entidad: "vehiculo" }),
    qk.notificaciones,
  );

  const form = useAppForm({
    defaultValues: emptyForm,
    schema: vehiculoSchema,
    onSubmit: async (value) => {
      try {
        await VehiculoService.create({
          ...value,
          anio: value.anio ? Number(value.anio) : null,
          kilometraje_actual: Number(value.kilometraje_actual) || 0,
          tipo: "furgon",
          estado: "activo",
          nivel_combustible: 50,
        });
        toast.success("Vehículo creado");
        setModal(false);
        form.reset(emptyForm);
        recargar();
      } catch {
        toast.error("No se pudo crear el vehículo");
      }
    },
  });

  useEffect(() => {
    if (modal) form.reset(emptyForm);
  }, [modal]);

  const stats = useMemo(() => {
    const ops = { total: vehiculos.length, operativos: 0, en_taller: 0, detenido: 0, fallas: 0 };
    vehiculos.forEach((v) => {
      if (v.estado_operativo === "en_taller") ops.en_taller += 1;
      else if (v.estado_operativo === "detenido") ops.detenido += 1;
      else ops.operativos += 1;
      ops.fallas += Number(v.fallas_abiertas || 0);
    });
    return ops;
  }, [vehiculos]);

  const docsOf = (vehiculo) => documentos.filter((d) => d.entidad_id === vehiculo?.id);
  const mantsOf = (vehiculo) => mantenimientos.filter((m) => m.vehiculo?.id === vehiculo?.id);
  const preventivosOf = (vehiculo) => (vehiculo?.preventivos || servicios.filter((s) => s.vehiculo?.id === vehiculo?.id));

  const openVehiculo = () => {
    form.reset(emptyForm);
    setModal(true);
  };

  const tabs = [
    ["flota", "Flota"],
    ["fallas", "Fallas"],
    ["ordenes", "Órdenes"],
    ["preventivos", "Preventivos"],
    ["documentos", "Documentos"],
  ];

  return (
    <>
      <Topbar title="Flota y taller" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => { setTab(id); setQ(""); }}
              className={`btn btn-sm rounded-full ${tab === id ? "btn-primary" : "btn-ghost bg-base-100"}`}
            >
              {label}
            </button>
          ))}
          {tab === "flota" && puedeTaller && (
            <button type="button" onClick={openVehiculo} className="btn btn-primary ml-auto">
              <Plus size={16} /> Nuevo vehículo
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Stat n={stats.total} label="vehículos" />
          <Stat n={stats.operativos} label="operativos" color="text-emerald-700" />
          <Stat n={stats.en_taller} label="en taller" color="text-amber-700" />
          <Stat n={stats.fallas} label="fallas abiertas" color="text-rose-600" />
        </div>

        {tab === "flota" && (
          <div className="flex min-h-0 flex-1 gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              {loading && <p className="text-muted">Cargando…</p>}
              {vehiculos.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm ${selected?.id === v.id ? "ring-2 ring-accent" : ""}`}
                >
                  <div className="flex h-16 w-24 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-muted">
                    {v.foto_url ? <img src={v.foto_url} alt="" className="h-full w-full object-cover" /> : <Truck />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{v.placa}</p>
                      <StatusBadge map={ESTADO_FLOTA} value={v.estado_operativo} />
                    </div>
                    <p className="text-sm text-muted">{v.marca} {v.modelo} {v.anio || ""}</p>
                    <p className="text-xs text-muted">
                      {formatKm(v.kilometraje_actual)}
                      {v.fallas_abiertas ? ` · ${v.fallas_abiertas} fallas` : ""}
                      {v.proximo_mantenimiento_km ? ` · Próximo ${formatKm(v.proximo_mantenimiento_km)}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {selected && (
              <DetailPanel
                title={selected.placa}
                subtitle={`${selected.marca} ${selected.modelo}`}
                badge={<StatusBadge map={ESTADO_FLOTA} value={selected.estado_operativo} />}
                onClose={() => setSelectedId(null)}
              >
                <Row label="Tipo" value={selected.tipo} />
                <Row label="Año" value={selected.anio || "—"} />
                <Row label="Kilometraje" value={formatKm(selected.kilometraje_actual)} />
                <Row label="Fallas abiertas" value={selected.fallas_abiertas ?? 0} />
                <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Preventivos</h3>
                {preventivosOf(selected).map((s) => (
                  <p key={s.tipo_id || s.id} className="mb-1 flex justify-between gap-2 text-sm">
                    <span>{s.tipo || s.tipo_nombre}</span>
                    <StatusBadge map={ESTADO_SERVICIO} value={s.estado} />
                  </p>
                ))}
                {!preventivosOf(selected).length && <p className="text-sm text-muted">Sin plan preventivo</p>}
                <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Últimas órdenes</h3>
                {mantsOf(selected).slice(0, 4).map((m) => (
                  <p key={m.id} className="mb-1 text-sm">{m.fecha_inicio} · {m.descripcion || m.tipo_mantenimiento} · {m.estado_label}</p>
                ))}
                <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Documentos</h3>
                {docsOf(selected).map((d) => (
                  <p key={d.id} className="mb-1 text-sm capitalize">{d.tipo_documento.replace("_", " ")}</p>
                ))}
                {puedeReportar && (
                  <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => setTab("fallas")}>
                    Reportar falla
                  </button>
                )}
              </DetailPanel>
            )}
          </div>
        )}

        {tab === "fallas" && (
          <FallasTab
            fallas={fallas}
            vehiculos={vehiculos}
            tipos={tiposFalla}
            loading={loading}
            puedeTaller={puedeTaller}
            puedeReportar={puedeReportar}
            onReload={recargar}
            q={q}
            setQ={setQ}
          />
        )}
        {tab === "ordenes" && (
          <OrdenesTab
            ordenes={mantenimientos}
            vehiculos={vehiculos}
            fallas={fallas}
            tiposServicio={tiposServicio}
            loading={loading}
            puedeTaller={puedeTaller}
            onReload={recargar}
            q={q}
            setQ={setQ}
          />
        )}
        {tab === "preventivos" && (
          <PreventivosTab
            servicios={servicios}
            tipos={tiposServicio}
            vehiculos={vehiculos}
            loading={loading}
            puedeTaller={puedeTaller}
            onReload={recargar}
            q={q}
            setQ={setQ}
          />
        )}

        {tab === "documentos" && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th>Número</th>
                  <th>Vence</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 capitalize">{d.tipo_documento.replace("_", " ")}</td>
                    <td>{d.numero_documento || "—"}</td>
                    <td>{d.fecha_vencimiento || "—"}</td>
                    <td className="capitalize">{d.estado}</td>
                  </tr>
                ))}
                {!documentos.length && (
                  <tr><td className="px-4 py-8 text-muted" colSpan={4}>Sin documentos de flota</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Modal open={modal} title="Nuevo vehículo" onClose={() => setModal(false)} onSubmit={() => form.handleSubmit()}>
        <TextField form={form} name="marca" label="Marca" />
        <TextField form={form} name="modelo" label="Modelo" />
        <TextField form={form} name="placa" label="Placa" />
        <TextField form={form} name="anio" label="Año" type="number" />
        <TextField form={form} name="kilometraje_actual" label="Kilometraje actual (odómetro)" type="number" min="0" />
      </Modal>
    </>
  );
}

function Stat({ n, label, color = "text-ink" }) {
  return (
    <div className="stat rounded-box bg-base-100 p-4 shadow-sm">
      <p className={`stat-value text-2xl ${color}`}>{n}</p>
      <p className="stat-desc">{label}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="mb-1 flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
