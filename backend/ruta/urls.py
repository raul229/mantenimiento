from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CiudadViewSet, ClienteViewSet, SedeViewSet, RutaViewSet, ViajeViewSet, RecojoViewSet

router =  DefaultRouter()

router.register(r'ciudades', CiudadViewSet)
router.register(r'clientes', ClienteViewSet)
router.register(r'sedes', SedeViewSet)
router.register(r'rutas', RutaViewSet)
router.register(r'viajes', ViajeViewSet)
router.register(r'recojos', RecojoViewSet)




urlpatterns = [
    path('', include(router.urls)),
]