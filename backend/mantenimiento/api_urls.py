from .views import VehiculoViewSet, MantenimientoViewSet, DocumentoViewSet, FallaViewSet

mantenimiento_urls = [
(r'vehiculos', VehiculoViewSet),
(r'mantenimientos', MantenimientoViewSet),
(r'documentos', DocumentoViewSet),
(r'fallas', FallaViewSet),
]
