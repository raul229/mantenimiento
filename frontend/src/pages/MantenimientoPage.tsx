import { useEffect, useState } from "react"
import type { Mantenimiento}  from "./interfaces/mantenimiento"

export default function MantenimientoPage(){

   const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([ {
    id:1 ,
    tipo_mantenimiento: "correctivo",
    descripcion: "se cambio las llantas",
    costo: 300.2,
    fecha_inicio: "2025-11-22",
    fecha_fin: "2025-11-23",
    proveedor: "Estela",
    vehiculo: 1,
    fallas: [1,2,3]
  }])

    useEffect(()=>{

        fetch("http://127.0.0.1:8000/api/mantenimientos")
        .then((r)=> r.json())
        .then((d)=> setMantenimientos(d))
        .catch((e)=> console.error(e))

    }, [mantenimientos])


    return (
        <div>

        <h2> Mantenimientos</h2>
        {/*Formulario*/}
        <div className="card p-3 mb-4">
            <div className="row mb-2">
                <div className="col">
                    <input
                    type="text"
                    placeholder="Nombre"
                    className="form-control"
                    />
                </div>

            </div>

        </div>
        {/*Tabla*/}

        <table className="table table-table-striped table-bordered">
            <thead className="table-dark">
                <tr>
                    <th>#</th>
                    <th>Tipo</th>
                    <th>Descripcion</th>
                    <th>costo</th>
                    <th>Inicio</th>
                    <th>Fin</th>
                    <th>Proveedor</th>
                    <th>Vehiculo</th>
                    <th>Fallas</th>
                    <th className="text-center">Acciones</th>
                </tr>
            </thead>
            <tbody>
                {
                    mantenimientos.length ===0? (
                        <tr>
                            <td colSpan={10} className="text-center">No hay mantenimientos</td>
                        </tr>
                    ): (
                        mantenimientos.map((mantenimiento, index)=>(
                            <tr key={mantenimiento.id}>
                                <th>{index+1}</th>
                                <th>{mantenimiento.tipo_mantenimiento}</th>
                                <th>{mantenimiento.descripcion}</th>
                                <th>{mantenimiento.costo}</th>
                                <th>{mantenimiento.fecha_inicio}</th>
                                <th>{mantenimiento.fecha_fin}</th>
                                <th>{mantenimiento.proveedor}</th>
                                <th>{mantenimiento.vehiculo}</th>
                                <th>{mantenimiento.fallas.join(", ")}</th>
                                <th>
                                    <button className="btn btn-sm btn-warning me-2">Editar</button>
                                    <button className="btn btn-sm btn-danger">Eliminar</button>
                                </th>
                            </tr>
                        ))
                    )
                }
            </tbody>
        </table>

        </div>
    )
}