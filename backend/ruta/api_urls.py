from .views import (
    CiudadViewSet, ClienteViewSet, SedeViewSet, RutaViewSet, ViajeViewSet,
    RecojoViewSet, CelularViewSet, PersonaViewSet,
    ViajeGastoViewSet, CajaViajeViewSet, CategoriaGastoViewSet,
    GuiaRemisionViewSet,
)

ruta_urls = [
    (r'ciudades', CiudadViewSet),
    (r'clientes', ClienteViewSet),
    (r'sedes', SedeViewSet),
    (r'rutas', RutaViewSet),
    (r'viajes', ViajeViewSet),
    (r'recojos', RecojoViewSet),
    (r'celulares', CelularViewSet),
    (r'personas', PersonaViewSet),
    (r'viaje-gastos', ViajeGastoViewSet),
    (r'cajas', CajaViajeViewSet),
    (r'categorias-gasto', CategoriaGastoViewSet),
    (r'guias', GuiaRemisionViewSet),
]
