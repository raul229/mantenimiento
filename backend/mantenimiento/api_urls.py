from .views import (
    DocumentoViewSet, FallaViewSet, HistorialServicioViewSet, MantenimientoViewSet,
    NotificacionViewSet, ServicioVehiculoViewSet, TipoFallaViewSet, TipoServicioViewSet,
    VehiculoViewSet,
)

mantenimiento_urls = [
    (r'vehiculos', VehiculoViewSet),
    (r'mantenimientos', MantenimientoViewSet),
    (r'documentos', DocumentoViewSet),
    (r'fallas', FallaViewSet),
    (r'tipos-falla', TipoFallaViewSet),
    (r'tipos-servicio', TipoServicioViewSet),
    (r'servicios-vehiculo', ServicioVehiculoViewSet),
    (r'historial-servicios', HistorialServicioViewSet),
    (r'notificaciones', NotificacionViewSet),
]
