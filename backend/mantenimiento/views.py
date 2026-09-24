from django.core.exceptions import ValidationError
from django.db.models import Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Documento, Falla, HistorialServicio, Mantenimiento, MantenimientoGasto,
    Notificacion, ServicioVehiculo, TipoFalla, TipoServicio, Vehiculo,
)
from .serializers import (
    DocumentoSerializer, FallaSerializer, HistorialServicioSerializer,
    MantenimientoGastoSerializer, MantenimientoSerializer, NotificacionSerializer,
    ServicioVehiculoSerializer, TipoFallaSerializer, TipoServicioSerializer,
    VehiculoSerializer,
)
from . import services


def _error(exc):
    if getattr(exc, 'message_dict', None):
        return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
    mensajes = getattr(exc, 'messages', None) or [str(exc)]
    return Response({'detail': mensajes[0]}, status=status.HTTP_400_BAD_REQUEST)


def _oficina_o_403(request):
    if services.puede_gestionar_taller(request.user):
        return None
    return Response({'detail': 'Solo un encargado puede gestionar el taller.'}, status=status.HTTP_403_FORBIDDEN)


class VehiculoViewSet(viewsets.ModelViewSet):
    modulo = 'flota'
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer

    def get_queryset(self):
        qs = services.vehiculos_visibles(self.request.user).select_related('conductor_asignado').annotate(
            fallas_abiertas=Count('fallas', filter=Q(fallas__estado__in=[Falla.ABIERTA, Falla.EN_ORDEN, Falla.NO_REPARADA])),
        )
        return qs

    def perform_create(self, serializer):
        if not services.puede_gestionar_taller(self.request.user):
            raise ValidationError('No puedes crear vehículos.')
        vehiculo = serializer.save()
        services.sincronizar_preventivos(vehiculo)

    def create(self, request, *args, **kwargs):
        if error := _oficina_o_403(request):
            return error
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if error := _oficina_o_403(request):
            return error
        return super().destroy(request, *args, **kwargs)


class MantenimientoViewSet(viewsets.ModelViewSet):
    modulo = 'flota'
    queryset = Mantenimiento.objects.all()
    serializer_class = MantenimientoSerializer

    def get_queryset(self):
        qs = Mantenimiento.objects.select_related('vehiculo').prefetch_related(
            'fallas__tipo', 'gastos',
        )
        visibles = services.vehiculos_visibles(self.request.user)
        qs = qs.filter(vehiculo__in=visibles)
        estado = self.request.query_params.get('estado')
        vehiculo = self.request.query_params.get('vehiculo')
        if estado:
            qs = qs.filter(estado=estado)
        if vehiculo:
            qs = qs.filter(vehiculo_id=vehiculo)
        return qs

    def create(self, request, *args, **kwargs):
        if error := _oficina_o_403(request):
            return error
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        if error := _oficina_o_403(request):
            return error
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if error := _oficina_o_403(request):
            return error
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        data = serializer.validated_data.copy()
        vehiculo = data.pop('vehiculo')
        fallas = data.pop('fallas', [])
        serializer.instance = services.crear_mantenimiento(
            vehiculo=vehiculo,
            fallas=fallas,
            usuario=self.request.user,
            **data,
        )

    def perform_update(self, serializer):
        data = serializer.validated_data.copy()
        vehiculo = data.pop('vehiculo', None)
        fallas = data.pop('fallas', None)
        serializer.instance = services.actualizar_mantenimiento(
            mantenimiento=serializer.instance,
            vehiculo=vehiculo,
            fallas=fallas,
            **data,
        )

    def _fresca(self, mantenimiento):
        return self.get_queryset().get(pk=mantenimiento.pk)

    @action(detail=True, methods=['post'], url_path='enviar-taller')
    def enviar_taller(self, request, pk=None):
        if error := _oficina_o_403(request):
            return error
        try:
            services.enviar_taller(self.get_object())
        except ValidationError as exc:
            return _error(exc)
        return Response(self.get_serializer(self._fresca(self.get_object())).data)

    @action(detail=True, methods=['post'])
    def gastos(self, request, pk=None):
        if error := _oficina_o_403(request):
            return error
        try:
            services.agregar_gasto(
                self.get_object(),
                request.data.get('concepto'),
                request.data.get('monto'),
                request.user,
                request.data.get('categoria') or 'otro',
            )
        except ValidationError as exc:
            return _error(exc)
        return Response(self.get_serializer(self._fresca(self.get_object())).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path=r'gastos/(?P<gasto_id>[^/.]+)/borrar')
    def borrar_gasto(self, request, pk=None, gasto_id=None):
        if error := _oficina_o_403(request):
            return error
        mantenimiento = self.get_object()
        try:
            gasto = mantenimiento.gastos.get(pk=gasto_id)
            services.borrar_gasto(mantenimiento, gasto)
        except MantenimientoGasto.DoesNotExist:
            return Response({'detail': 'Gasto no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        except ValidationError as exc:
            return _error(exc)
        return Response(self.get_serializer(self._fresca(mantenimiento)).data)

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        if error := _oficina_o_403(request):
            return error
        try:
            services.cerrar_mantenimiento(
                self.get_object(),
                request.user,
                resultados=request.data.get('resultados') or [],
                servicios=request.data.get('servicios') or [],
                kilometraje=request.data.get('kilometraje'),
                observacion=request.data.get('observacion') or '',
            )
        except ValidationError as exc:
            return _error(exc)
        return Response(self.get_serializer(self._fresca(self.get_object())).data)


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
    queryset = Falla.objects.all()
    serializer_class = FallaSerializer
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        qs = Falla.objects.select_related('vehiculo', 'tipo', 'usuario_reporta').filter(
            vehiculo__in=services.vehiculos_visibles(self.request.user),
        )
        estado = self.request.query_params.get('estado')
        vehiculo = self.request.query_params.get('vehiculo')
        if estado == 'pendientes':
            qs = qs.filter(estado__in=[Falla.ABIERTA, Falla.EN_ORDEN, Falla.NO_REPARADA])
        elif estado:
            qs = qs.filter(estado=estado)
        if vehiculo:
            qs = qs.filter(vehiculo_id=vehiculo)
        return qs

    def create(self, request, *args, **kwargs):
        if not services.puede_escribir_falla(request.user):
            return Response({'detail': 'No puedes reportar fallas.'}, status=status.HTTP_403_FORBIDDEN)
        vehiculo_id = request.data.get('vehiculo_id') or request.data.get('vehiculo')
        try:
            vehiculo = services.vehiculos_visibles(request.user).get(pk=vehiculo_id)
        except (Vehiculo.DoesNotExist, ValueError, TypeError):
            return Response({'vehiculo_id': 'Elige un vehículo.'}, status=status.HTTP_400_BAD_REQUEST)
        tipo = None
        tipo_id = request.data.get('tipo_id') or request.data.get('tipo')
        if tipo_id:
            try:
                tipo = TipoFalla.objects.get(pk=tipo_id)
            except (TipoFalla.DoesNotExist, ValueError, TypeError):
                return Response({'tipo_id': 'Ese tipo no existe.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            falla = services.reportar_falla(
                vehiculo,
                request.user,
                request.data.get('descripcion'),
                request.data.get('prioridad') or Falla.MEDIA,
                tipo,
            )
        except ValidationError as exc:
            return _error(exc)
        return Response(self.get_serializer(falla).data, status=status.HTTP_201_CREATED)


class TipoFallaViewSet(viewsets.ModelViewSet):
    modulo = 'flota'
    escribir_incluye_borrar = True
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    queryset = TipoFalla.objects.all()
    serializer_class = TipoFallaSerializer

    def create(self, request, *args, **kwargs):
        if error := _oficina_o_403(request):
            return error
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if error := _oficina_o_403(request):
            return error
        return super().destroy(request, *args, **kwargs)


class TipoServicioViewSet(viewsets.ModelViewSet):
    modulo = 'flota'
    escribir_incluye_borrar = True
    queryset = TipoServicio.objects.all()
    serializer_class = TipoServicioSerializer

    def create(self, request, *args, **kwargs):
        if error := _oficina_o_403(request):
            return error
        resp = super().create(request, *args, **kwargs)
        for vehiculo in Vehiculo.objects.all():
            services.asegurar_servicios(vehiculo)
        return resp

    def update(self, request, *args, **kwargs):
        if error := _oficina_o_403(request):
            return error
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if error := _oficina_o_403(request):
            return error
        return super().destroy(request, *args, **kwargs)


class ServicioVehiculoViewSet(viewsets.ReadOnlyModelViewSet):
    modulo = 'flota'
    queryset = ServicioVehiculo.objects.all()
    serializer_class = ServicioVehiculoSerializer

    def get_queryset(self):
        qs = ServicioVehiculo.objects.select_related('vehiculo', 'tipo').filter(
            vehiculo__in=services.vehiculos_visibles(self.request.user),
        )
        vehiculo = self.request.query_params.get('vehiculo')
        if vehiculo:
            qs = qs.filter(vehiculo_id=vehiculo)
        return qs

    @action(detail=False, methods=['post'])
    def registrar(self, request):
        if error := _oficina_o_403(request):
            return error
        try:
            vehiculo = services.vehiculos_visibles(request.user).get(pk=request.data.get('vehiculo'))
            tipo = TipoServicio.objects.get(pk=request.data.get('tipo'))
        except (Vehiculo.DoesNotExist, TipoServicio.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Elige vehículo y tipo de servicio.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            sv = services.registrar_servicio(
                vehiculo,
                tipo,
                request.data.get('kilometraje') if request.data.get('kilometraje') not in (None, '') else vehiculo.kilometraje_actual,
                request.data.get('fecha') or None,
                nota=request.data.get('nota') or '',
            )
        except ValidationError as exc:
            return _error(exc)
        return Response(ServicioVehiculoSerializer(sv).data, status=status.HTTP_201_CREATED)


class HistorialServicioViewSet(viewsets.ReadOnlyModelViewSet):
    modulo = 'flota'
    queryset = HistorialServicio.objects.all()
    serializer_class = HistorialServicioSerializer

    def get_queryset(self):
        qs = HistorialServicio.objects.select_related('tipo', 'vehiculo').filter(
            vehiculo__in=services.vehiculos_visibles(self.request.user),
        )
        vehiculo = self.request.query_params.get('vehiculo')
        tipo = self.request.query_params.get('tipo')
        if vehiculo:
            qs = qs.filter(vehiculo_id=vehiculo)
        if tipo:
            qs = qs.filter(tipo_id=tipo)
        return qs


class NotificacionViewSet(viewsets.ReadOnlyModelViewSet):
    modulo = 'flota'
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer

    def get_queryset(self):
        return Notificacion.objects.select_related('vehiculo').filter(usuario=self.request.user)

    def list(self, request, *args, **kwargs):
        for vehiculo in services.vehiculos_visibles(request.user):
            services.sincronizar_preventivos(vehiculo)
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def leer(self, request, pk=None):
        notif = self.get_object()
        notif.leida = True
        notif.save(update_fields=['leida'])
        return Response(self.get_serializer(notif).data)

    @action(detail=False, methods=['post'], url_path='leer-todas')
    def leer_todas(self, request):
        self.get_queryset().filter(leida=False).update(leida=True)
        return Response({'ok': True})


class AlertasTallerView(APIView):
    modulo = 'flota'

    def get(self, request):
        items = []
        for vehiculo in services.vehiculos_visibles(request.user).select_related('conductor_asignado'):
            services.asegurar_servicios(vehiculo)
            for alerta in services.alertas_de(vehiculo):
                if alerta['estado'] in ('por_vencer', 'vencido'):
                    items.append({
                        **alerta,
                        'vehiculo_id': vehiculo.id,
                        'placa': vehiculo.placa,
                        'kilometraje_actual': vehiculo.kilometraje_actual,
                    })
        items.sort(key=lambda a: (0 if a['estado'] == 'vencido' else 1 if a['estado'] == 'por_vencer' else 2, a['faltan_km'] or 0))
        return Response(items)
