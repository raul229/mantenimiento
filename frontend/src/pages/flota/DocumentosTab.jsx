import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { DocumentoService } from "@/service/api";
import { DataTable } from "@/components/DataTable";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Modal, Field, inputClass, selectClass, filterClass, filterSelectClass } from "@/components/Modal";
import { documentoSchema } from "@/forms/schemas";
import {
  ESTADO_DOCUMENTO, TIPO_DOCUMENTO, TIPO_DOCUMENTO_CONDUCTOR, TIPO_DOCUMENTO_VEHICULO,
  formatDate, titularDocumento,
} from "@/utils/format";

const vacio = {
  tipo_entidad: "vehiculo",
  vehiculo: "",
  conductor: "",
  tipo_documento: "soat",
  numero_documento: "",
  fecha_emision: "",
  fecha_vencimiento: "",
};

function tiposDe(entidad) {
  return entidad === "user" ? TIPO_DOCUMENTO_CONDUCTOR : TIPO_DOCUMENTO_VEHICULO;
}

function payloadDocumento(value, archivo) {
  const fd = new FormData();
  fd.append("tipo_entidad", value.tipo_entidad);
  fd.append("entidad_id", value.tipo_entidad === "user" ? value.conductor : value.vehiculo);
  fd.append("tipo_documento", value.tipo_documento);
  fd.append("numero_documento", (value.numero_documento || "").trim());
  if (value.fecha_emision) fd.append("fecha_emision", value.fecha_emision);
  fd.append("fecha_vencimiento", value.fecha_vencimiento);
  if (archivo) fd.append("archivo", archivo);
  return fd;
}

export function DocumentosTab({
  documentos, vehiculos, conductores, loading, puedeTaller, puedeBorrar, onReload, q, setQ,
}) {
  const [ambito, setAmbito] = useState("");
  const [estado, setEstado] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(vacio);
  const [archivo, setArchivo] = useState(null);
  const [borrar, setBorrar] = useState(null);
  const [saving, setSaving] = useState(false);

  const selected = documentos.find((d) => d.id === selectedId) || null;

  const filtered = useMemo(() => {
    return documentos.filter((d) => {
      if (ambito && d.tipo_entidad !== ambito) return false;
      if (estado && d.estado_alerta !== estado) return false;
      const t = q.toLowerCase();
      if (!t) return true;
      return `${titularDocumento(d)} ${d.tipo_label || d.tipo_documento} ${d.numero_documento || ""}`.toLowerCase().includes(t);
    });
  }, [documentos, ambito, estado, q]);

  const abrirNuevo = () => {
    setEditando(null);
    setArchivo(null);
    setForm(vacio);
    setModal(true);
  };

  const abrirEditar = (doc) => {
    setEditando(doc);
    setArchivo(null);
    setForm({
      tipo_entidad: doc.tipo_entidad === "user" ? "user" : "vehiculo",
      vehiculo: doc.tipo_entidad === "vehiculo" ? String(doc.vehiculo?.id || doc.entidad_id || "") : "",
      conductor: doc.tipo_entidad === "user" ? String(doc.conductor?.id || doc.entidad_id || "") : "",
      tipo_documento: doc.tipo_documento,
      numero_documento: doc.numero_documento || "",
      fecha_emision: doc.fecha_emision || "",
      fecha_vencimiento: doc.fecha_vencimiento || "",
    });
    setModal(true);
  };

  const cambiarAmbito = (tipo_entidad) => {
    const tipos = Object.keys(tiposDe(tipo_entidad));
    setForm({
      ...form,
      tipo_entidad,
      tipo_documento: tipos.includes(form.tipo_documento) ? form.tipo_documento : tipos[0],
    });
  };

  const guardar = async () => {
    const parsed = documentoSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Revisa el formulario");
      return;
    }
    setSaving(true);
    try {
      const body = payloadDocumento(parsed.data, archivo);
      if (editando) await DocumentoService.patch(editando.id, body);
      else await DocumentoService.create(body);
      toast.success(editando ? "Documento actualizado" : "Documento registrado");
      setModal(false);
      setEditando(null);
      setArchivo(null);
      setForm(vacio);
      onReload();
    } catch (err) {
      const data = err?.response?.data;
      const msg = data?.detail || data?.fecha_vencimiento?.[0] || data?.entidad_id?.[0] || "No se pudo guardar";
      toast.error(typeof msg === "string" ? msg : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const confirmarBorrado = async () => {
    if (!borrar) return;
    try {
      await DocumentoService.remove(borrar.id);
      toast.success("Documento eliminado");
      if (selectedId === borrar.id) setSelectedId(null);
      setBorrar(null);
      onReload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "No se pudo eliminar");
      setBorrar(null);
    }
  };

  const columns = [
    { header: "De", render: (d) => (d.tipo_entidad === "user" ? "Conductor" : "Vehículo") },
    { header: "Titular", render: (d) => titularDocumento(d) },
    { header: "Tipo", render: (d) => d.tipo_label || TIPO_DOCUMENTO[d.tipo_documento] || d.tipo_documento },
    { header: "Número", render: (d) => d.numero_documento || "—" },
    { header: "Vence", render: (d) => formatDate(d.fecha_vencimiento) },
    { header: "Estado", render: (d) => <StatusBadge map={ESTADO_DOCUMENTO} value={d.estado_alerta} /> },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${filterSelectClass} w-40`} value={ambito} onChange={(e) => setAmbito(e.target.value)}>
          <option value="">Todos</option>
          <option value="vehiculo">Vehículos</option>
          <option value="user">Conductores</option>
        </select>
        <select className={`${filterSelectClass} w-40`} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Cualquier estado</option>
          <option value="vencido">Vencidos</option>
          <option value="por_vencer">Por vencer</option>
          <option value="vigente">Vigentes</option>
        </select>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-muted" />
          <input className={`${filterClass} w-56 pl-9`} placeholder="Titular, tipo o número" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {puedeTaller && (
          <button type="button" className="btn btn-primary ml-auto" onClick={abrirNuevo}>
            <Plus size={16} /> Nuevo documento
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="min-w-0 flex-1">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            onRowClick={(row) => setSelectedId(row.id)}
            selectedId={selected?.id}
            empty="Sin documentos"
          />
        </div>
        {selected && (
          <DetailPanel
            title={selected.tipo_label || TIPO_DOCUMENTO[selected.tipo_documento] || selected.tipo_documento}
            subtitle={titularDocumento(selected)}
            badge={<StatusBadge map={ESTADO_DOCUMENTO} value={selected.estado_alerta} />}
            onClose={() => setSelectedId(null)}
          >
            <Row label="De" value={selected.tipo_entidad === "user" ? "Conductor" : "Vehículo"} />
            <Row label="Número" value={selected.numero_documento || "—"} />
            <Row label="Emisión" value={formatDate(selected.fecha_emision)} />
            <Row label="Vence" value={formatDate(selected.fecha_vencimiento)} />
            <Row
              label="Faltan"
              value={
                selected.dias_para_vencer == null
                  ? "—"
                  : selected.dias_para_vencer < 0
                    ? `Venció hace ${Math.abs(selected.dias_para_vencer)} días`
                    : `${selected.dias_para_vencer} días`
              }
            />
            {selected.archivo_url && (
              <a href={selected.archivo_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-primary underline">
                Ver archivo
              </a>
            )}
            {puedeTaller && (
              <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => abrirEditar(selected)}>
                Editar
              </button>
            )}
            {puedeBorrar && (
              <button type="button" className="btn btn-ghost btn-error mt-2 w-full" onClick={() => setBorrar(selected)}>
                Eliminar
              </button>
            )}
          </DetailPanel>
        )}
      </div>

      <Modal
        open={modal}
        title={editando ? "Editar documento" : "Nuevo documento"}
        onClose={() => { setModal(false); setEditando(null); }}
        onSubmit={guardar}
        submitLabel={saving ? "Guardando…" : "Guardar"}
      >
        <Field label="De">
          <select className={selectClass} value={form.tipo_entidad} onChange={(e) => cambiarAmbito(e.target.value)}>
            <option value="vehiculo">Vehículo</option>
            <option value="user">Conductor</option>
          </select>
        </Field>
        {form.tipo_entidad === "user" ? (
          <Field label="Conductor">
            <select className={selectClass} value={form.conductor} onChange={(e) => setForm({ ...form, conductor: e.target.value })}>
              <option value="">Elige conductor</option>
              {conductores.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre || c.username}{c.rol_label ? ` · ${c.rol_label}` : ""}</option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Vehículo">
            <select className={selectClass} value={form.vehiculo} onChange={(e) => setForm({ ...form, vehiculo: e.target.value })}>
              <option value="">Elige vehículo</option>
              {vehiculos.map((v) => (
                <option key={v.id} value={v.id}>{v.placa} · {v.marca}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Tipo">
          <select className={selectClass} value={form.tipo_documento} onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}>
            {Object.entries(tiposDe(form.tipo_entidad)).map(([id, label]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="Número">
          <input className={inputClass} value={form.numero_documento} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} />
        </Field>
        <Field label="Emisión">
          <input type="date" className={inputClass} value={form.fecha_emision} onChange={(e) => setForm({ ...form, fecha_emision: e.target.value })} />
        </Field>
        <Field label="Vencimiento">
          <input type="date" className={inputClass} value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} />
        </Field>
        <Field label="Archivo (opcional)">
          <input type="file" className="file-input file-input-bordered w-full" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
          {editando?.archivo_url && !archivo && (
            <p className="mt-1 text-xs text-muted">Ya hay un archivo. Elige otro para reemplazarlo.</p>
          )}
        </Field>
      </Modal>

      <ConfirmModal
        show={!!borrar}
        onHide={() => setBorrar(null)}
        onConfirm={confirmarBorrado}
        titulo="Eliminar documento"
        mensaje={borrar ? `¿Eliminar ${borrar.tipo_label || borrar.tipo_documento} de ${titularDocumento(borrar)}?` : ""}
        confirmText="Eliminar"
      />
    </>
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
