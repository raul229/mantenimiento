import { useCrudPage } from "@/hooks/useCrudPage";
import { useCrud } from "@/hooks/useCrud";
import { useConfirm } from "@/hooks/useConfirm";
import { PersonaService, CelularService, ClienteService } from "@/service";
import { BotonNuevo } from "@/components/BotonNuevo";
import { CrudTable } from "@/components/CrudTable";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PersonaModal } from "./modals/PersonaModal";
import { formularioPersona } from "@/formularios/formInicial";

export function PersonaPage() {
    const { data: celulares, refetch: refetchCelulares } = useCrud(CelularService);
    const { data: clientes } = useCrud(ClienteService);
    const {
        data: personas,
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
        errors,
    } = useCrudPage({
        service: PersonaService,
        formularioInicial: formularioPersona,
        actulizacionDatosSecundarios: refetchCelulares,
    });

    const confirm = useConfirm();

    const confirmarEliminacion = () => {
        eliminar(confirm.id);
        confirm.cancelar();
    };

    const clienteOptions = clientes.map((c) => ({ value: c.id, label: c.razon_social }));

    const columns = [
        { header: "Nombre", accessor: "nombre" },
        { header: "Apellido", render: (p) => `${p.apellido_paterno} ${p.apellido_materno}` },
        { header: "Cargo", accessor: "cargo" },
        { header: "Cliente", render: (p) => clientes.find((c) => c.id === p.cliente)?.razon_social || "N/A" },
        { header: "Celulares", render: (p) => celulares?.filter((c) => c?.persona === p.id).map((c) => c.numero).join(", ") || "Sin celulares" },
    ];

    return (
        <>
            <h1>Personas</h1>
            <BotonNuevo
                limpiarFormulario={limpiarFormulario}
                setEditando={setEditando}
                mostrarModal={mostrarModal}
            />
            <CrudTable
                columns={columns}
                data={personas}
                loading={loading}
                onEdit={(persona) => {
                    setEditando(true);
                    const celularesPersona = celulares?.filter((c) => c?.persona === persona.id).map((c) => c.numero) || [];
                    setFormulario({ ...persona, celulares: celularesPersona });
                    mostrarModal();
                }}
                onDelete={confirm.pedir}
            />
            <PersonaModal
                show={show}
                ocultarModal={ocultarModal}
                editando={editando}
                formulario={formulario}
                setFormulario={setFormulario}
                guardar={guardar}
                errors={errors}
                clienteOptions={clienteOptions}
            />
            <ConfirmModal
                show={confirm.abierto}
                onHide={confirm.cancelar}
                onConfirm={confirmarEliminacion}
                titulo="Eliminar persona"
                mensaje="¿Estás seguro de eliminar esta persona?"
                confirmText="Eliminar"
            />
        </>
    );
}
