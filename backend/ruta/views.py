from rest_framework import viewsets
from .models import Ciudad, Cliente, Sede, Ruta, Viaje, Recojo
from .serializers import CiudadSerializer, ClienteSerializer, SedeSerializer, RutaSerializer, ViajeSerializer, \
    RecojoSerializer


class CiudadViewSet(viewsets.ModelViewSet):
    queryset = Ciudad.objects.all()
    serializer_class = CiudadSerializer

class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer

class SedeViewSet(viewsets.ModelViewSet):
    queryset = Sede.objects.all()
    serializer_class = SedeSerializer

class RutaViewSet(viewsets.ModelViewSet):
    queryset = Ruta.objects.all()
    serializer_class = RutaSerializer

class ViajeViewSet(viewsets.ModelViewSet):
    queryset = Viaje.objects.all()
    serializer_class = ViajeSerializer

class RecojoViewSet(viewsets.ModelViewSet):
    queryset = Recojo.objects.all()
    serializer_class = RecojoSerializer
    