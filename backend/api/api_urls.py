from rest_framework.routers import DefaultRouter
from mantenimiento.api_urls import mantenimiento_urls
from ruta.api_urls import ruta_urls
from cuentas.views import UsuarioViewSet


router = DefaultRouter()

for prefix, viewset in mantenimiento_urls + ruta_urls:
    router.register(prefix, viewset)

router.register(r'personal', UsuarioViewSet, basename='personal')

