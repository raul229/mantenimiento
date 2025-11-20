from rest_framework import  viewsets
from .models import Vehiculo, Mantenimiento, Documento, Falla
from .serializers import VehiculoSerializer, MantenimientoSerializer, FallaSerializer, DocumentoSerializer

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer

class MantenimientoViewSet(viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.all()

    serializer_class = MantenimientoSerializer

class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = Documento.objects.all()
    serializer_class = DocumentoSerializer

class FallaViewSet(viewsets.ModelViewSet):
    queryset = Falla.objects.all()
    serializer_class = FallaSerializer