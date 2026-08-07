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
        data= serializer.validated_data.copy()
        
        vehiculo = data.pop('vehiculo')
        fallas=data.pop('fallas', [])
        
        serializer.instance = MantenimientoService.crear_mantenimiento(
            vehiculo=vehiculo,
            fallas=fallas,
            **data
            )
        
        
    def perform_update(self, serializer):
        data= serializer.validated_data.copy()
        
        vehiculo = data.pop('vehiculo', None)
        fallas=data.pop('fallas', None)
        
        serializer.instance = MantenimientoService.actualizar_mantenimiento(
            mantenimiento=serializer.instance,
            vehiculo=vehiculo,
            fallas=fallas,
            **data
            )
            

class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = Documento.objects.all()
    serializer_class = DocumentoSerializer

class FallaViewSet(viewsets.ModelViewSet):
    queryset = Falla.objects.all()
    serializer_class = FallaSerializer