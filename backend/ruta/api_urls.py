from .views import CiudadViewSet, ClienteViewSet, SedeViewSet, RutaViewSet, ViajeViewSet, RecojoViewSet, CelularViewSet, PersonaViewSet

ruta_urls =[

(r'ciudades', CiudadViewSet),
(r'clientes', ClienteViewSet),
(r'sedes', SedeViewSet),
(r'rutas', RutaViewSet),
(r'viajes', ViajeViewSet),
(r'recojos', RecojoViewSet),
(r'celulares', CelularViewSet),
(r'personas', PersonaViewSet),
]
