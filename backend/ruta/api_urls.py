from .views import (
    CiudadViewSet, ClienteViewSet, SedeViewSet, RutaViewSet, ViajeViewSet,
    RecojoViewSet, CelularViewSet, PersonaViewSet, TipoResiduoViewSet,
    RecojoDetalleViewSet, ViajeGastoViewSet, CajaViajeViewSet, CategoriaGastoViewSet,
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
    (r'tipos-residuo', TipoResiduoViewSet),
    (r'recojo-detalles', RecojoDetalleViewSet),
    (r'viaje-gastos', ViajeGastoViewSet),
    (r'cajas', CajaViajeViewSet),
    (r'categorias-gasto', CategoriaGastoViewSet),
    (r'guias', GuiaRemisionViewSet),
]
