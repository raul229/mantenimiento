import { Route } from "react-router-dom";
import { ClientePage } from "./ClientePage";
import { SedePage } from "./SedePage";
import { CiudadPage } from "./CiudadPage";
import { CelularPage } from "./CelularPage";
import { PersonaPage } from "./PersonaPage";
import { RutaPage } from "./RutaPage";
import { RecojoPage } from "./RecojoPage";
import { ViajePage } from "./ViajePage";

export const RoutePathRuta = (
    <>
        <Route path="/clientes" element={<ClientePage />} />
        <Route path="/sedes" element={<SedePage />} />
        <Route path="/ciudades" element={<CiudadPage />} />
        <Route path="/celulares" element={<CelularPage />} />
        <Route path="/personas" element={<PersonaPage />} />
        <Route path="/rutas" element={<RutaPage />} />
        <Route path="/recojos" element={<RecojoPage />} />
        <Route path="/viajes" element={<ViajePage />} />
    </>
)
