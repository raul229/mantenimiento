import { Link } from "react-router-dom";

export default function Navbar() {


    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark px-3">
      <a className="navbar-brand" href="#">Mi App</a>

      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarContent"
        aria-controls="navbarContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse" id="navbarContent">
        <ul className="navbar-nav ms-auto">
          <li className="nav-item">
            <Link to="/" className="nav-link active">Dashboard</Link>
          </li>
          <li className="nav-item">
            <Link to="/mantenimiento" className="nav-link" >Mantenimientos</Link>
          </li>
          <li className="nav-item">
            <Link to="/ruta" className="nav-link" >Rutas</Link>
           
          </li>
        </ul>
      </div>
    </nav>
    )
}