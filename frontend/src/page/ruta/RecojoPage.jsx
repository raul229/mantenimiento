import { useCrudPage } from "@/hooks/useCrudPage";
import { useCrud } from "@/hooks/useCrud";
import { useConfirm } from "@/hooks/useConfirm";
import { RecojoService, ViajeService, SedeService } from "@/service";
import { BotonNuevo } from "@/components/BotonNuevo";
import { CrudTable } from "@/components/CrudTable";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BaseModal } from "@/components/BaseModal";
import { formularioRecojo } from "@/formularios/formInicial";

export function RecojoPage() {
    const {
        data: recojos,
        loading,
        eliminar,
        show,
        ocultarModal,
        mostrarModal,
        formulario,
        setFormulario,
        limpiarFormulario,
        editando,
        setEditando,
        guardar,
    } = useCrudPage({ service: RecojoService, formularioInicial: formularioRecojo });

    const { data: sedes } = useCrud(SedeService);
    const { data: viajes } = useCrud(ViajeService);

    const confirm = useConfirm();

    const confirmarEliminacion = () => {
        eliminar(confirm.id);
        confirm.cancelar();
    };

    const viajeOptions = viajes.map((v) => ({ value: v.id, label: `#${v.id} - ${v.estado}` }));
    const sedeOptions = sedes.map((s) => ({ value: s.id, label: s.nombre }));

    const fields = [
        { name: "viaje", label: "Viaje", required: true, options: viajeOptions, type: "number" },
        { name: "sede", label: "Sede", required: true, options: sedeOptions, type: "number" },
        { name: "peso_kg", label: "Peso (kg)", type: "number", step: "0.01", required: true, placeholder: "Ingrese el peso" },
        { name: "fecha", label: "Fecha", type: "date", required: true },
        { name: "observaciones", label: "Observaciones", as: "textarea", rows: 3 },
    ];

    const columns = [
        { header: "Viaje", render: (r) => { const viaje = viajes.find((v) => v.id === r.viaje); return viaje ? `#${viaje.id} ${viaje.estado || ""}` : "-"; } },
        { header: "Sede", render: (r) => sedes.find((s) => s.id === r.sede)?.nombre ?? "-" },
        { header: "Peso (kg)", accessor: "peso_kg" },
        { header: "Fecha", accessor: "fecha" },
        { header: "Observaciones", accessor: "observaciones" },
    ];

    return (
        <>
            <h1>Recojos</h1>
            <BotonNuevo
                limpiarFormulario={limpiarFormulario}
                setEditando={setEditando}
                mostrarModal={mostrarModal}
            />
            <CrudTable
                columns={columns}
                data={recojos}
                loading={loading}
                onEdit={(recojo) => {
                    setEditando(true);
                    setFormulario(recojo);
                    mostrarModal();
                }}
                onDelete={confirm.pedir}
            />
            <BaseModal
                show={show}
                ocultarModal={ocultarModal}
                editando={editando}
                guardar={guardar}
                titulo="Recojo"
                fields={fields}
                formulario={formulario}
                setFormulario={setFormulario}
            />
            <ConfirmModal
                show={confirm.abierto}
                onHide={confirm.cancelar}
                onConfirm={confirmarEliminacion}
                titulo="Eliminar recojo"
                mensaje="¿Estás seguro de eliminar este recojo?"
                confirmText="Eliminar"
            />
        </>
    );
}
