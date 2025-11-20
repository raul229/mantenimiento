from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VehiculoViewSet, MantenimientoViewSet, DocumentoViewSet, FallaViewSet

router = DefaultRouter()

router.register(r'vehiculos', VehiculoViewSet)

router.register(r'mantenimientos', MantenimientoViewSet)

router.register(r'documentos', DocumentoViewSet)

router.register(r'fallas', FallaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]