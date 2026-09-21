import { useCrudPage } from "@/hooks/useCrudPage";
import { useCrud } from "@/hooks/useCrud";
import { useConfirm } from "@/hooks/useConfirm";
import { RutaService, SedeService } from "@/service";
import { BotonNuevo } from "@/components/BotonNuevo";
import { CrudTable } from "@/components/CrudTable";
import { ConfirmModal } from "@/components/ConfirmModal";
import { BaseModal } from "@/components/BaseModal";
import { BaseFormField } from "@/components/BaseFormField";
import { formularioRuta } from "@/formularios/formInicial";

export function RutaPage() {
    const { data: sedes } = useCrud(SedeService);
    const {
        data: rutas,
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
    } = useCrudPage({ service: RutaService, formularioInicial: formularioRuta });

    const confirm = useConfirm();

    const confirmarEliminacion = () => {
        eliminar(confirm.id);
        confirm.cancelar();
    };

    const columns = [
        { header: "Nombre", accessor: "nombre" },
        { header: "Descripcion", accessor: "descripcion" },
        {
            header: "Sedes",
            render: (ruta) =>
                sedes.filter((sede) => ruta.sedes.includes(sede.id)).map((sede) => sede.nombre).join(", "),
        },
    ];

    return (
        <>
            <h1>Rutas</h1>
            <BotonNuevo
                limpiarFormulario={limpiarFormulario}
                setEditando={setEditando}
                mostrarModal={mostrarModal}
            />
            <CrudTable
                columns={columns}
                data={rutas}
                loading={loading}
                onEdit={(ruta) => {
                    setEditando(true);
                    setFormulario(ruta);
                    mostrarModal();
                }}
                onDelete={confirm.pedir}
            />
            <BaseModal
                show={show}
                ocultarModal={ocultarModal}
                editando={editando}
                guardar={guardar}
                titulo="Ruta"
                formulario={formulario}
                setFormulario={setFormulario}
                errors={errors}
            >
                <BaseFormField
                    label="Nombre"
                    name="nombre"
                    value={formulario.nombre}
                    onChange={(name, value) => setFormulario({ ...formulario, [name]: value })}
                    placeholder="Nombre"
                    errors={errors}
                />
                <BaseFormField
                    label="Descripcion"
                    name="descripcion"
                    value={formulario.descripcion}
                    onChange={(name, value) => setFormulario({ ...formulario, [name]: value })}
                    placeholder="Descripcion"
                    errors={errors}
                />
                <BaseFormField
                    label="Sedes"
                    name="sedes"
                    value={formulario.sedes}
                    onChange={() => {}}
                    errors={errors}
                >
                    <select
                        multiple
                        className="select select-bordered w-full h-auto min-h-24"
                        value={formulario.sedes || []}
                        onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, (o) => Number(o.value));
                            setFormulario({ ...formulario, sedes: selected });
                        }}
                    >
                        {sedes.map((sede) => (
                            <option key={sede.id} value={sede.id}>
                                {sede.nombre}
                            </option>
                        ))}
                    </select>
                </BaseFormField>
            </BaseModal>
            <ConfirmModal
                show={confirm.abierto}
                onHide={confirm.cancelar}
                onConfirm={confirmarEliminacion}
                titulo="Eliminar ruta"
                mensaje="¿Estás seguro de eliminar esta ruta?"
                confirmText="Eliminar"
            />
        </>
    );
}
