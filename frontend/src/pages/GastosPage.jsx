import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { ViajeService, CajaService, CategoriaGastoService } from "@/service/api";
import { Topbar } from "@/layout/Topbar";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Modal, Field, inputClass, filterClass, filterSelectClass } from "@/components/Modal";
import { ESTADO_CAJA, ESTADO_VIAJE, formatMoney, formatDate } from "@/utils/format";
import { useAuth } from "@/context/AuthContext";
import { useApiList, useInvalidate } from "@/hooks/useApiQuery";
import { qk } from "@/query/keys";
import { TextField, SelectField } from "@/components/AppForm";
import { useAppForm } from "@/hooks/useAppForm";
import { montoSchema, gastoSchema, categoriaGastoSchema } from "@/forms/schemas";

const vacioMonto = { monto: "", descripcion: "", categoria: "" };

function estadoCajaDe(viaje) {
  if (!viaje?.caja) return "sin_fondo";
  return viaje.caja.estado || "abierta";
}

export function GastosPage() {
  const { user, canWrite } = useAuth();
  const [params] = useSearchParams();
  const puedeAsignar = canWrite("gastos") && !user?.solo_asignados;
  const puedeRendir = canWrite("gastos");

  const invalidate = useInvalidate();
  const [tab, setTab] = useState("viajes");
  const { data: viajes = [], isLoading: loading } = useApiList(qk.viajes, () => ViajeService.getAll());
  const { data: categorias = [] } = useApiList(qk.categoriasGasto, () => CategoriaGastoService.getAll());
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [selectedId, setSelectedId] = useState(params.get("viaje") ? Number(params.get("viaje")) : null);
  const [catId, setCatId] = useState(null);
  const [modalAsignar, setModalAsignar] = useState(false);
  const [modalAumento, setModalAumento] = useState(false);
  const [modalGasto, setModalGasto] = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [form, setForm] = useState(vacioMonto);
  const [saving, setSaving] = useState(false);
  const [borrarMov, setBorrarMov] = useState(null);
  const [borrarCat, setBorrarCat] = useState(null);

  const recargar = () => invalidate(qk.viajes, qk.categoriasGasto);

  const formAsignar = useAppForm({
    defaultValues: vacioMonto,
    schema: montoSchema,
    onSubmit: async (value) => {
      setSaving(true);
      try {
        await CajaService.asignar({ viaje: selected.id, monto: value.monto, descripcion: value.descripcion });
        toast.success("Fondo asignado");
        setModalAsignar(false);
        formAsignar.reset(vacioMonto);
        recargar();
      } catch (err) {
        errorApi(err, "No se pudo guardar");
      } finally {
        setSaving(false);
      }
    },
  });

  const formAumento = useAppForm({
    defaultValues: vacioMonto,
    schema: montoSchema,
    onSubmit: async (value) => {
      setSaving(true);
      try {
        await CajaService.aumentar(caja.id, { monto: value.monto, descripcion: value.descripcion });
        toast.success("Caja aumentada");
        setModalAumento(false);
        formAumento.reset(vacioMonto);
        recargar();
      } catch (err) {
        errorApi(err, "No se pudo guardar");
      } finally {
        setSaving(false);
      }
    },
  });

  const formGasto = useAppForm({
    defaultValues: vacioMonto,
    schema: gastoSchema,
    onSubmit: async (value) => {
      setSaving(true);
      try {
        await CajaService.gastar(caja.id, {
          monto: value.monto,
          categoria: value.categoria,
          descripcion: value.descripcion,
        });
        toast.success("Gasto registrado");
        setModalGasto(false);
        formGasto.reset(vacioMonto);
        recargar();
      } catch (err) {
        errorApi(err, "No se pudo guardar");
      } finally {
        setSaving(false);
      }
    },
  });

  const formCategoria = useAppForm({
    defaultValues: { nombre: "" },
    schema: categoriaGastoSchema,
    onSubmit: async (value) => {
      setSaving(true);
      try {
        await CategoriaGastoService.create({ nombre: value.nombre.trim(), orden: categorias.length + 1 });
        toast.success("Categoría creada");
        setModalCategoria(false);
        formCategoria.reset({ nombre: "" });
        recargar();
      } catch (err) {
        errorApi(err, "No se pudo crear");
      } finally {
        setSaving(false);
      }
    },
  });

  const selected = viajes.find((v) => v.id === selectedId) || null;
  const selectedCat = categorias.find((c) => c.id === catId) || null;
  const caja = selected?.caja || null;
  const categoriasFiltradas = useMemo(() => {
    const t = q.toLowerCase();
    if (!t) return categorias;
    return categorias.filter((c) => c.nombre.toLowerCase().includes(t));
  }, [categorias, q]);

  const filtered = useMemo(() => {
    return viajes.filter((v) => {
      const est = estadoCajaDe(v);
      if (estado && est !== estado) return false;
      const t = q.toLowerCase();
      if (!t) return true;
      return `${v.ruta_data?.nombre || ""} ${v.vehiculo_data?.placa || ""} ${v.conductor_data?.nombre || ""}`.toLowerCase().includes(t);
    });
  }, [viajes, q, estado]);

  const kpis = useMemo(() => {
    return filtered.reduce((acc, v) => {
      acc.fondo += Number(v.caja?.fondo || 0);
      acc.gastado += Number(v.caja?.gastado || 0);
      acc.saldo += Number(v.caja?.saldo || 0);
      if (estadoCajaDe(v) === "abierta") acc.abiertas += 1;
      return acc;
    }, { fondo: 0, gastado: 0, saldo: 0, abiertas: 0 });
  }, [filtered]);

  const errorApi = (err, fallback) => {
    const data = err?.response?.data;
    const msg = data?.detail || data?.monto?.[0] || data?.viaje?.[0] || data?.categoria?.[0] || data?.nombre?.[0] || fallback;
    toast.error(typeof msg === "string" ? msg : fallback);
  };

  const cerrarCaja = async () => {
    setSaving(true);
    try {
      await CajaService.cerrar(caja.id, {
        observacion: form.descripcion,
        saldo_devuelto: form.monto === "" ? undefined : form.monto,
      });
      toast.success("Caja cerrada");
      setModalCerrar(false);
      setForm(vacioMonto);
      recargar();
    } catch (err) {
      errorApi(err, "No se pudo cerrar la caja");
    } finally {
      setSaving(false);
    }
  };

  const reabrir = async () => {
    try {
      await CajaService.reabrir(caja.id);
      toast.success("Caja reabierta");
      recargar();
    } catch (err) {
      errorApi(err, "No se pudo reabrir");
    }
  };

  const confirmarBorrado = async () => {
    if (!borrarMov || !caja) return;
    try {
      await CajaService.borrarMovimiento(caja.id, borrarMov.id);
      toast.success("Movimiento eliminado");
      setBorrarMov(null);
      recargar();
    } catch (err) {
      errorApi(err, "No se pudo eliminar");
      setBorrarMov(null);
    }
  };

  const confirmarBorrarCat = async () => {
    if (!borrarCat) return;
    try {
      await CategoriaGastoService.remove(borrarCat.id);
      toast.success("Categoría eliminada");
      if (catId === borrarCat.id) setCatId(null);
      setBorrarCat(null);
      recargar();
    } catch (err) {
      errorApi(err, "No se pudo eliminar");
      setBorrarCat(null);
    }
  };

  const abrirGasto = () => {
    formGasto.reset({ ...vacioMonto, categoria: categorias[0]?.id || "" });
    setModalGasto(true);
  };

  const catColumns = [
    { header: "Categoría", render: (c) => c.nombre },
    { header: "Gastos", render: (c) => c.gastos_count ?? 0 },
  ];

  const columns = [
    { header: "Fecha", render: (v) => formatDate(v.fecha_inicio) },
    { header: "Viaje", render: (v) => v.ruta_data?.nombre || `Viaje #${v.id}` },
    { header: "Vehículo", render: (v) => v.vehiculo_data?.placa || "—" },
    { header: "Encargado", render: (v) => v.conductor_data?.nombre || "—" },
    { header: "Fondo", render: (v) => formatMoney(v.caja?.fondo) },
    { header: "Gastos", render: (v) => formatMoney(v.caja?.gastado) },
    { header: "Saldo", render: (v) => formatMoney(v.caja?.saldo) },
    {
      header: "Caja",
      render: (v) => <StatusBadge map={ESTADO_CAJA} value={estadoCajaDe(v)} />,
    },
  ];

  const abierta = caja?.estado === "abierta";
  const sinFondo = !caja || !Number(caja.asignado);

  return (
    <>
      <Topbar title="Caja y gastos" />
      <div className="flex min-h-0 flex-1 gap-4 p-6">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={`btn btn-sm rounded-full ${tab === "viajes" ? "btn-primary" : "btn-ghost bg-base-100"}`}
              onClick={() => { setTab("viajes"); setQ(""); }}
            >
              Viajes
            </button>
            <button
              type="button"
              className={`btn btn-sm rounded-full ${tab === "categorias" ? "btn-primary" : "btn-ghost bg-base-100"}`}
              onClick={() => { setTab("categorias"); setQ(""); }}
            >
              Categorías
            </button>
            {tab === "categorias" && puedeAsignar && (
              <button
                type="button"
                className="btn btn-primary ml-auto"
                onClick={() => { formCategoria.reset({ nombre: "" }); setModalCategoria(true); }}
              >
                <Plus size={16} /> Nueva categoría
              </button>
            )}
          </div>
          {tab === "viajes" && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${filterSelectClass} w-40`} value={estado} onChange={(e) => setEstado(e.target.value)}>
                  <option value="">Estado de caja</option>
                  <option value="sin_fondo">Sin fondo</option>
                  <option value="abierta">Abierta</option>
                  <option value="cerrada">Cerrada</option>
                </select>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-muted" />
                  <input className={`${filterClass} w-56 pl-9`} placeholder="Ruta, placa o encargado" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <Mini n={formatMoney(kpis.fondo)} label="fondo asignado" />
                <Mini n={formatMoney(kpis.gastado)} label="gastos" />
                <Mini n={formatMoney(kpis.saldo)} label="saldo" />
                <Mini n={kpis.abiertas} label="cajas abiertas" />
              </div>
              <DataTable
                columns={columns}
                data={filtered}
                loading={loading}
                onRowClick={(row) => setSelectedId(row.id)}
                selectedId={selected?.id}
                empty="No hay viajes para estos filtros"
              />
            </>
          )}
          {tab === "categorias" && (
            <>
              <div className="relative w-fit">
                <Search size={16} className="absolute left-3 top-2.5 text-muted" />
                <input className={`${filterClass} w-56 pl-9`} placeholder="Buscar categoría" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <DataTable
                columns={catColumns}
                data={categoriasFiltradas}
                loading={loading}
                onRowClick={(row) => setCatId(row.id)}
                selectedId={selectedCat?.id}
                empty="No hay categorías"
              />
            </>
          )}
        </div>

        {tab === "viajes" && selected && (
          <DetailPanel
            title={selected.ruta_data?.nombre || `Viaje #${selected.id}`}
            subtitle={`${selected.vehiculo_data?.placa || "Sin vehículo"} · ${selected.conductor_data?.nombre || "Sin encargado"}`}
            badge={<StatusBadge map={ESTADO_CAJA} value={estadoCajaDe(selected)} />}
            onClose={() => setSelectedId(null)}
          >
            <Row label="Fecha" value={formatDate(selected.fecha_inicio)} />
            <Row label="Viaje" value={<StatusBadge map={ESTADO_VIAJE} value={selected.estado} />} />
            <Row label="Fondo" value={formatMoney(caja?.fondo)} />
            <Row label="Aumentos" value={formatMoney(caja?.aumentos)} />
            <Row label="Gastos" value={formatMoney(caja?.gastado)} />
            <Row label="Saldo" value={formatMoney(caja?.saldo)} />
            {caja?.estado === "cerrada" && (
              <>
                <Row label="Devuelto" value={formatMoney(caja.saldo_devuelto)} />
                {caja.observacion_cierre && <p className="mt-2 text-sm text-muted">{caja.observacion_cierre}</p>}
              </>
            )}

            <h3 className="mb-2 mt-5 text-xs font-semibold uppercase text-muted">Movimientos</h3>
            <ul className="space-y-2">
              {(caja?.movimientos || []).map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium">{m.tipo_label}</span>
                    {m.categoria_label ? ` · ${m.categoria_label}` : ""}
                    <span className="block text-xs text-muted">{m.descripcion || "—"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className={m.tipo === "gasto" ? "text-error" : "text-success"}>
                      {m.tipo === "gasto" ? "−" : "+"}{formatMoney(m.monto)}
                    </span>
                    {abierta && puedeRendir && (
                      <button type="button" className="btn btn-ghost btn-xs" onClick={() => setBorrarMov(m)}>
                        Quitar
                      </button>
                    )}
                  </span>
                </li>
              ))}
              {!(caja?.movimientos || []).length && <p className="text-sm text-muted">Aún no hay movimientos.</p>}
            </ul>

            <div className="mt-4 space-y-2">
              {puedeAsignar && sinFondo && selected.estado !== "cancelado" && (
                <button type="button" className="btn btn-primary w-full" onClick={() => { formAsignar.reset(vacioMonto); setModalAsignar(true); }}>
                  <Plus size={16} /> Asignar fondo
                </button>
              )}
              {puedeAsignar && caja && abierta && !sinFondo && (
                <button type="button" className="btn btn-outline w-full" onClick={() => { formAumento.reset(vacioMonto); setModalAumento(true); }}>
                  Aumentar caja
                </button>
              )}
              {puedeRendir && caja && abierta && !sinFondo && (
                <button type="button" className="btn btn-outline w-full" onClick={abrirGasto}>
                  Registrar gasto
                </button>
              )}
              {puedeRendir && caja && abierta && !sinFondo && (
                <button
                  type="button"
                  className="btn btn-primary w-full"
                  onClick={() => { setForm({ ...vacioMonto, monto: caja.saldo ?? "" }); setModalCerrar(true); }}
                >
                  Cerrar caja chica
                </button>
              )}
              {puedeAsignar && caja?.estado === "cerrada" && (
                <button type="button" className="btn btn-ghost w-full" onClick={reabrir}>
                  Reabrir caja
                </button>
              )}
            </div>
          </DetailPanel>
        )}

        {tab === "categorias" && selectedCat && (
          <DetailPanel
            title={selectedCat.nombre}
            subtitle={`${selectedCat.gastos_count ?? 0} gastos registrados`}
            onClose={() => setCatId(null)}
          >
            <Row label="Categoría" value={selectedCat.nombre} />
            <Row label="Gastos" value={selectedCat.gastos_count ?? 0} />
            {puedeAsignar && (
              <button
                type="button"
                className="btn btn-ghost btn-error mt-4 w-full"
                onClick={() => setBorrarCat(selectedCat)}
              >
                Eliminar categoría
              </button>
            )}
          </DetailPanel>
        )}
      </div>

      <Modal open={modalAsignar} title="Asignar fondo" onClose={() => setModalAsignar(false)} onSubmit={() => formAsignar.handleSubmit()} submitLabel={saving ? "Guardando…" : "Asignar"}>
        <TextField form={formAsignar} name="monto" label="Monto" type="number" min="0.01" step="0.01" />
        <TextField form={formAsignar} name="descripcion" label="Nota" placeholder="Fondo inicial" />
      </Modal>

      <Modal open={modalAumento} title="Aumentar caja" onClose={() => setModalAumento(false)} onSubmit={() => formAumento.handleSubmit()} submitLabel={saving ? "Guardando…" : "Aumentar"}>
        <TextField form={formAumento} name="monto" label="Monto" type="number" min="0.01" step="0.01" />
        <TextField form={formAumento} name="descripcion" label="Nota" placeholder="Reposición" />
      </Modal>

      <Modal open={modalGasto} title="Registrar gasto" onClose={() => setModalGasto(false)} onSubmit={() => formGasto.handleSubmit()} submitLabel={saving ? "Guardando…" : "Registrar"}>
        <SelectField form={formGasto} name="categoria" label="Categoría">
          {!categorias.length && <option value="">Sin categorías</option>}
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </SelectField>
        <TextField form={formGasto} name="monto" label="Monto" type="number" min="0.01" step="0.01" />
        <TextField form={formGasto} name="descripcion" label="Detalle" placeholder="Ej. peaje Serpentín" />
      </Modal>

      <Modal open={modalCerrar} title="Cerrar caja chica" onClose={() => setModalCerrar(false)} onSubmit={cerrarCaja} submitLabel={saving ? "Cerrando…" : "Cerrar caja"}>
        <Row label="Fondo" value={formatMoney(caja?.fondo)} />
        <Row label="Gastos" value={formatMoney(caja?.gastado)} />
        <Row label="Saldo" value={formatMoney(caja?.saldo)} />
        <Field label="Efectivo que se devuelve">
          <input className={inputClass} type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
        </Field>
        <Field label="Observación">
          <input className={inputClass} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </Field>
      </Modal>

      <Modal
        open={modalCategoria}
        title="Nueva categoría"
        onClose={() => setModalCategoria(false)}
        onSubmit={() => formCategoria.handleSubmit()}
        submitLabel={saving ? "Guardando…" : "Crear"}
      >
        <TextField form={formCategoria} name="nombre" label="Nombre" placeholder="Ej. Estacionamiento" />
      </Modal>

      <ConfirmModal
        show={!!borrarMov}
        onHide={() => setBorrarMov(null)}
        onConfirm={confirmarBorrado}
        titulo="Quitar movimiento"
        mensaje={borrarMov ? `¿Quitar ${borrarMov.tipo_label} de ${formatMoney(borrarMov.monto)}?` : ""}
        confirmText="Quitar"
      />
      <ConfirmModal
        show={!!borrarCat}
        onHide={() => setBorrarCat(null)}
        onConfirm={confirmarBorrarCat}
        titulo="Eliminar categoría"
        mensaje={
          borrarCat
            ? (borrarCat.gastos_count
              ? `¿Eliminar ${borrarCat.nombre}? Los ${borrarCat.gastos_count} gastos quedan sin categoría.`
              : `¿Eliminar ${borrarCat.nombre}?`)
            : ""
        }
        confirmText="Eliminar"
      />
    </>
  );
}

function Mini({ n, label }) {
  return (
    <div className="stat rounded-box bg-base-100 p-3 shadow-sm">
      <p className="stat-value text-xl">{n}</p>
      <p className="stat-desc">{label}</p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="mb-1 flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
