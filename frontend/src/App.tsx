import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navbar from './Components/Navbar'
import DashboardPage from './pages/DashboardPage'
import MantenimientoPage from './pages/MantenimientoPage'
import RutaPage from './pages/RutaPage'

export default function App() {

  return (

    <BrowserRouter>
   
    <Navbar/>
     <div className="container mt-4 text-center">
        <Routes>
          <Route path="/" element={<DashboardPage/> }/>
          <Route path="/mantenimiento" element={<MantenimientoPage/> }/>
          <Route path="/ruta" element={<RutaPage/> }/>
        </Routes>
      </div>
      
    </BrowserRouter>

  )
}

