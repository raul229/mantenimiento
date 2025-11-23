export interface Mantenimiento {
    id: number;
    tipo_mantenimiento: string;
    descripcion: string;
    costo: number;
    fecha_inicio: string; // en el futuro o segun necesidad cambiar a Date
    fecha_fin: string;// en el futuro o segun necesidad cambiar a Date
    proveedor: string
    vehiculo: number;
    fallas: number[];
    }

