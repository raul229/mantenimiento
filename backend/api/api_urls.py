from  rest_framework.routers import DefaultRouter
from  mantenimiento.api_urls import mantenimiento_urls
from  ruta.api_urls import ruta_urls


router= DefaultRouter()

for prefix, viewset in mantenimiento_urls + ruta_urls:
    router.register(prefix, viewset)

