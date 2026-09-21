from rest_framework import viewsets
from .models import (
    Ciudad, Cliente, Sede, Ruta, Viaje, Recojo, Celular, Persona,
    TipoResiduo, RecojoDetalle, ViajeGasto,
)
from .serializers import (
    CiudadSerializer, ClienteSerializer, SedeSerializer, RutaSerializer,
    ViajeSerializer, RecojoSerializer, CelularSerializer, PersonaSerializer,
    TipoResiduoSerializer, RecojoDetalleSerializer, ViajeGastoSerializer,
)


class CelularViewSet(viewsets.ModelViewSet):
    queryset = Celular.objects.all()
    serializer_class = CelularSerializer


class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.prefetch_related('celulares').all()
    serializer_class = PersonaSerializer


class CiudadViewSet(viewsets.ModelViewSet):
    queryset = Ciudad.objects.all()
    serializer_class = CiudadSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.prefetch_related('personas__celulares', 'sedes__ciudad').all()
    serializer_class = ClienteSerializer


class SedeViewSet(viewsets.ModelViewSet):
    queryset = Sede.objects.select_related('cliente', 'ciudad', 'persona').all()
    serializer_class = SedeSerializer


class RutaViewSet(viewsets.ModelViewSet):
    queryset = Ruta.objects.prefetch_related('sedes').all()
    serializer_class = RutaSerializer


class ViajeViewSet(viewsets.ModelViewSet):
    queryset = Viaje.objects.select_related('vehiculo', 'conductor', 'ruta').prefetch_related(
        'recojos__sede__cliente',
        'recojos__sede__ciudad',
        'recojos__detalles__tipo',
        'gastos',
        'ruta__sedes',
    ).all()
    serializer_class = ViajeSerializer


class RecojoViewSet(viewsets.ModelViewSet):
    queryset = Recojo.objects.select_related(
        'viaje',
        'viaje__vehiculo',
        'viaje__ruta',
        'sede',
        'sede__cliente',
        'sede__ciudad',
    ).prefetch_related('detalles__tipo').order_by('-fecha', '-id')
    serializer_class = RecojoSerializer


class TipoResiduoViewSet(viewsets.ModelViewSet):
    queryset = TipoResiduo.objects.all()
    serializer_class = TipoResiduoSerializer


class RecojoDetalleViewSet(viewsets.ModelViewSet):
    queryset = RecojoDetalle.objects.select_related('tipo', 'recojo').all()
    serializer_class = RecojoDetalleSerializer


class ViajeGastoViewSet(viewsets.ModelViewSet):
    queryset = ViajeGasto.objects.all()
    serializer_class = ViajeGastoSerializer
