import { Link } from "react-router-dom";

export function DropMantenimiento() {
  return (
    <details>
      <summary>Mantenimiento</summary>
      <ul className="bg-base-100 rounded-box p-2 shadow">
        <li><Link to="/mantenimientos">Mantenimientos</Link></li>
        <li><Link to="/fallas">Fallas</Link></li>
        <li><Link to="/vehiculos">Vehiculos</Link></li>
      </ul>
    </details>
  );
}
