import { useCrudPage } from "@/hooks/useCrudPage";
import { useCrud } from "@/hooks/useCrud";
import { useConfirm } from "@/hooks/useConfirm";
import { VehiculoService, RutaService, ViajeService } from "@/service";
import { BotonNuevo } from "@/components/BotonNuevo";
import { CrudTable } from "@/components/CrudTable";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BaseModal } from "@/components/BaseModal";
import { ESTADOS_VIAJE } from "@/constants/enums";
import { formularioViaje } from "@/formularios/formInicial";

export function ViajePage() {
    const { data: vehiculos } = useCrud(VehiculoService);
    const { data: rutas } = useCrud(RutaService);
    const {
        data: viajes,
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
    } = useCrudPage({ service: ViajeService, formularioInicial: formularioViaje });

    const confirm = useConfirm();

    const confirmarEliminacion = () => {
        eliminar(confirm.id);
        confirm.cancelar();
    };

    const vehiculoOptions = vehiculos.map((v) => ({ value: v.id, label: v.marca }));
    const rutaOptions = rutas.map((r) => ({ value: r.id, label: r.nombre }));

    const fields = [
        ...(editando ? [{ name: "kilometraje_final", label: "Kilometraje Final", type: "number", placeholder: "Ingrese el kilometraje final" }] : []),
        { name: "estado", label: "Estado", required: true, options: ESTADOS_VIAJE },
        { name: "fecha_inicio", label: "Fecha Inicio", type: "date" },
        { name: "fecha_fin", label: "Fecha Fin", type: "date" },
        { name: "observaciones", label: "Observaciones", placeholder: "Ingrese las observaciones" },
        { name: "vehiculo", label: "Vehiculo", required: true, options: vehiculoOptions, type: "number" },
        { name: "conductor", label: "Conductor", placeholder: "Ingrese el conductor" },
        { name: "ruta", label: "Ruta", required: true, options: rutaOptions, type: "number" },
    ];

    const columns = [
        { header: "Kilometraje Inicio", accessor: "kilometraje_inicio" },
        { header: "Kilometraje Final", accessor: "kilometraje_final" },
        { header: "Estado", accessor: "estado" },
        { header: "Fecha Inicio", accessor: "fecha_inicio" },
        { header: "Fecha Fin", accessor: "fecha_fin" },
        { header: "Observaciones", accessor: "observaciones" },
        { header: "Vehiculo", render: (v) => vehiculos.find((vh) => vh.id === v.vehiculo)?.marca },
        { header: "Conductor", accessor: "conductor" },
        { header: "Ruta", render: (v) => rutas.find((r) => r.id === v.ruta)?.nombre },
    ];

    return (
        <>
            <h1>Viajes</h1>
            <BotonNuevo
                limpiarFormulario={limpiarFormulario}
                setEditando={setEditando}
                mostrarModal={mostrarModal}
            />
            <CrudTable
                columns={columns}
                data={viajes}
                loading={loading}
                onEdit={(viaje) => {
                    setEditando(true);
                    setFormulario(viaje);
                    mostrarModal();
                }}
                onDelete={confirm.pedir}
            />
            <BaseModal
                show={show}
                ocultarModal={ocultarModal}
                editando={editando}
                guardar={guardar}
                titulo="Viaje"
                fields={fields}
                formulario={formulario}
                setFormulario={setFormulario}
                errors={errors}
            />
            <ConfirmModal
                show={confirm.abierto}
                onHide={confirm.cancelar}
                onConfirm={confirmarEliminacion}
                titulo="Eliminar viaje"
                mensaje="¿Estás seguro de eliminar este viaje?"
                confirmText="Eliminar"
            />
        </>
    );
}
