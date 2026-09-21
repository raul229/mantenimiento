import { VehiculoService } from "@/service";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useConfirm } from "@/hooks/useConfirm";
import { CrudTable } from "@/components/CrudTable";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BaseModal } from "@/components/BaseModal";
import { ESTADOS_VEHICULO } from "@/constants/enums";

export function VehiculoPage() {
    const formularioInicial = {
        marca: "",
        modelo: "",
        placa: "",
        carga_neta_kg: "",
        estado: "",
    };
    const {
        data: vehiculos,
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
    } = useCrudPage({ service: VehiculoService, formularioInicial });

    const confirm = useConfirm();

    const confirmarEliminacion = () => {
        eliminar(confirm.id);
        confirm.cancelar();
    };

    const columns = [
        { header: "Marca", accessor: "marca" },
        { header: "Modelo", accessor: "modelo" },
        { header: "Placa", accessor: "placa" },
        { header: "Carga Neta (kg)", accessor: "carga_neta_kg" },
        { header: "Kilometraje actual", accessor: "kilometraje_actual" },
        { header: "Estado", accessor: "estado" },
    ];

    const fields = [
        { name: "marca", label: "Marca", required: true, placeholder: "Marca..." },
        { name: "modelo", label: "Modelo", required: true, placeholder: "Modelo..." },
        { name: "placa", label: "Placa", required: true, placeholder: "Placa..." },
        { name: "carga_neta_kg", label: "Carga neta (kg)", type: "number", required: true, placeholder: "Carga neta (kg)..." },
        { name: "estado", label: "Estado", required: true, options: ESTADOS_VEHICULO },
    ];

    const editar = (vehiculo) => {
        mostrarModal();
        setEditando(true);
        setFormulario(vehiculo);
    };

    return (
        <>
            <h1>Vehiculos</h1>
            <button type="button" className="btn btn-primary mb-3" onClick={() => {
                limpiarFormulario();
                setEditando(false);
                mostrarModal();
            }}>Nuevo</button>
            <CrudTable
                columns={columns}
                data={vehiculos}
                loading={loading}
                onEdit={editar}
                onDelete={confirm.pedir}
            />
            <BaseModal
                show={show}
                ocultarModal={ocultarModal}
                editando={editando}
                guardar={guardar}
                titulo="Vehiculo"
                fields={fields}
                formulario={formulario}
                setFormulario={setFormulario}
            />
            <ConfirmModal
                show={confirm.abierto}
                onHide={confirm.cancelar}
                onConfirm={confirmarEliminacion}
                titulo="Eliminar vehiculo"
                mensaje="¿Estás seguro de eliminar este vehiculo?"
                confirmText="Eliminar"
            />
        </>
    );
}
