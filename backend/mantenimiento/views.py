from rest_framework import viewsets
from .models import Vehiculo, Mantenimiento, Documento, Falla
from .serializers import VehiculoSerializer, MantenimientoSerializer, FallaSerializer, DocumentoSerializer
from .services import MantenimientoService


class VehiculoViewSet(viewsets.ModelViewSet):
    modulo = 'flota'
    queryset = Vehiculo.objects.select_related('conductor_asignado').all()
    serializer_class = VehiculoSerializer


class MantenimientoViewSet(viewsets.ModelViewSet):
    modulo = 'flota'
    queryset = Mantenimiento.objects.select_related('vehiculo').prefetch_related('fallas').all()
    serializer_class = MantenimientoSerializer

    def perform_create(self, serializer):
        data = serializer.validated_data.copy()
        vehiculo = data.pop('vehiculo')
        fallas = data.pop('fallas', [])
        serializer.instance = MantenimientoService.crear_mantenimiento(
            vehiculo=vehiculo,
            fallas=fallas,
            **data,
        )

    def perform_update(self, serializer):
        data = serializer.validated_data.copy()
        vehiculo = data.pop('vehiculo', None)
        fallas = data.pop('fallas', None)
        serializer.instance = MantenimientoService.actualizar_mantenimiento(
            mantenimiento=serializer.instance,
            vehiculo=vehiculo,
            fallas=fallas,
            **data,
        )


class DocumentoViewSet(viewsets.ModelViewSet):
    modulo = 'flota'
    queryset = Documento.objects.all()
    serializer_class = DocumentoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        tipo_entidad = self.request.query_params.get('tipo_entidad')
        entidad_id = self.request.query_params.get('entidad_id')
        if tipo_entidad:
            qs = qs.filter(tipo_entidad=tipo_entidad)
        if entidad_id:
            qs = qs.filter(entidad_id=entidad_id)
        return qs


class FallaViewSet(viewsets.ModelViewSet):
    modulo = 'flota'
    queryset = Falla.objects.select_related('vehiculo').all()
    serializer_class = FallaSerializer
