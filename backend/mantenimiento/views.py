from rest_framework import  viewsets
from .models import Vehiculo, Mantenimiento, Documento, Falla
from .serializers import VehiculoSerializer, MantenimientoSerializer, FallaSerializer, DocumentoSerializer

from .services import MantenimientoService

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer

class MantenimientoViewSet(viewsets.ModelViewSet):
    queryset = Mantenimiento.objects.all()

    serializer_class = MantenimientoSerializer
    
    def perform_create(self, serializer):
        # Guardar el mantenimiento y actualizar las fallas relacionadas
        fallas_ids = serializer.validated_data.pop('fallas_ids', [])
        vehiculo = serializer.validated_data.pop('vehiculo')
        data = serializer.validated_data
        mantenimiento = MantenimientoService.crear_mantenimiento(vehiculo, fallas_ids, **data)
        serializer.instance = mantenimiento
    

class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = Documento.objects.all()
    serializer_class = DocumentoSerializer

class FallaViewSet(viewsets.ModelViewSet):
    queryset = Falla.objects.all()
    serializer_class = FallaSerializer