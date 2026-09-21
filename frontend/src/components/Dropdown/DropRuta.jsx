import { Link } from "react-router-dom";

export function DropRuta() {
  return (
    <details>
      <summary>Rutas</summary>
      <ul className="bg-base-100 rounded-box p-2 shadow">
        <li><Link to="/clientes">Clientes</Link></li>
        <li><Link to="/sedes">Sedes</Link></li>
        <li><Link to="/ciudades">Ciudades</Link></li>
        <li><Link to="/celulares">Celulares</Link></li>
        <li><Link to="/personas">Personas</Link></li>
        <li><Link to="/rutas">Rutas</Link></li>
        <li><Link to="/recojos">Recojos</Link></li>
        <li><Link to="/viajes">Viajes</Link></li>
      </ul>
    </details>
  );
}
