import { Link } from "react-router-dom";
import { DropMantenimiento } from "./Dropdown/DropMantenimiento";
import { DropRuta } from "./Dropdown/DropRuta";

export function NavbarMantenimiento() {
  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost text-xl">Sermin</Link>
      </div>
      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li><Link to="/">Inicio</Link></li>
          <li><DropMantenimiento /></li>
          <li><DropRuta /></li>
        </ul>
      </div>
    </div>
  );
}
