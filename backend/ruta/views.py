from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.exceptions import ValidationError
from django.db.models import Count, Q
from django.http import HttpResponse
from cuentas.models import solo_asignados
from . import caja as caja_service
from .models import (
    Ciudad, Cliente, Sede, Ruta, Viaje, Recojo, Celular, Persona,
    TipoResiduo, RecojoDetalle, ViajeGasto, CajaViaje, CajaMovimiento, CategoriaGasto,
    ConfiguracionEmisor, GuiaRemision,
)
from .serializers import (
    CiudadSerializer, ClienteSerializer, SedeSerializer, RutaSerializer,
    ViajeSerializer, RecojoSerializer, CelularSerializer, PersonaSerializer,
    TipoResiduoSerializer, RecojoDetalleSerializer, ViajeGastoSerializer,
    CajaViajeSerializer, CategoriaGastoSerializer, ConfiguracionEmisorSerializer, GuiaRemisionSerializer,
)
from . import guias as guias_service


class CelularViewSet(viewsets.ModelViewSet):
    modulo = 'clientes'
    queryset = Celular.objects.all()
    serializer_class = CelularSerializer


class PersonaViewSet(viewsets.ModelViewSet):
    modulo = 'clientes'
    queryset = Persona.objects.prefetch_related('celulares').all()
    serializer_class = PersonaSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        cliente = self.request.query_params.get('cliente')
        if cliente:
            qs = qs.filter(Q(cliente_id=cliente) | Q(cliente_propio_id=cliente))
        return qs


class CiudadViewSet(viewsets.ModelViewSet):
    modulo = 'viajes'
    queryset = Ciudad.objects.all().order_by('nombre')
    serializer_class = CiudadSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    modulo = 'clientes'
    queryset = Cliente.objects.select_related('empresa', 'persona').prefetch_related(
        'personas__celulares',
        'persona__celulares',
        'sedes__ciudad',
        'sedes__persona__celulares',
    ).all()
    serializer_class = ClienteSerializer


class SedeViewSet(viewsets.ModelViewSet):
    modulo = 'viajes'
    queryset = Sede.objects.select_related(
        'cliente', 'cliente__empresa', 'cliente__persona', 'ciudad', 'persona',
    ).all()
    serializer_class = SedeSerializer


class RutaViewSet(viewsets.ModelViewSet):
    modulo = 'viajes'
    queryset = Ruta.objects.prefetch_related('sedes').all()
    serializer_class = RutaSerializer


class ViajeViewSet(viewsets.ModelViewSet):
    modulo = 'viajes'
    queryset = Viaje.objects.select_related('vehiculo', 'conductor', 'ruta').prefetch_related(
        'sedes__cliente__empresa',
        'sedes__cliente__persona',
        'sedes__ciudad',
        'recojos__sede__cliente__empresa',
        'recojos__sede__cliente__persona',
        'recojos__sede__ciudad',
        'recojos__guia',
        'gastos',
        'caja__movimientos__creado_por',
        'caja__movimientos__categoria',
        'caja__cerrado_por',
        'ruta__sedes',
    ).all()
    serializer_class = ViajeSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if solo_asignados(self.request.user):
            qs = qs.filter(conductor=self.request.user)
        return qs

    def _conductor_solo_odometro(self, request):
        if not solo_asignados(request.user):
            return None
        if set(request.data.keys()) - {'kilometraje_final'}:
            return Response(
                {'detail': 'Solo puedes registrar el odómetro de tus viajes.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None

    def update(self, request, *args, **kwargs):
        bloqueo = self._conductor_solo_odometro(request)
        return bloqueo or super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        bloqueo = self._conductor_solo_odometro(request)
        return bloqueo or super().partial_update(request, *args, **kwargs)


class RecojoViewSet(viewsets.ModelViewSet):
    modulo = 'recojos'
    queryset = Recojo.objects.select_related(
        'viaje',
        'viaje__vehiculo',
        'viaje__ruta',
        'sede',
        'sede__cliente__empresa',
        'sede__cliente__persona',
        'sede__ciudad',
        'guia',
    ).prefetch_related('detalles__tipo').order_by('-fecha', '-id')
    serializer_class = RecojoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if solo_asignados(self.request.user):
            qs = qs.filter(viaje__conductor=self.request.user)
        return qs


class TipoResiduoViewSet(viewsets.ModelViewSet):
    modulo = 'recojos'
    queryset = TipoResiduo.objects.all()
    serializer_class = TipoResiduoSerializer


class RecojoDetalleViewSet(viewsets.ModelViewSet):
    modulo = 'recojos'
    queryset = RecojoDetalle.objects.select_related('tipo', 'recojo').all()
    serializer_class = RecojoDetalleSerializer


class ViajeGastoViewSet(viewsets.ModelViewSet):
    modulo = 'gastos'
    queryset = ViajeGasto.objects.all()
    serializer_class = ViajeGastoSerializer


class CategoriaGastoViewSet(viewsets.ModelViewSet):
    modulo = 'gastos'
    escribir_incluye_borrar = True
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    queryset = CategoriaGasto.objects.all()
    serializer_class = CategoriaGastoSerializer

    def get_queryset(self):
        return CategoriaGasto.objects.annotate(
            gastos_count=Count('movimientos', filter=Q(movimientos__tipo=CajaMovimiento.GASTO)),
        )

    def create(self, request, *args, **kwargs):
        if not caja_service.puede_asignar_caja(request.user):
            return Response({'detail': 'No puedes administrar categorías.'}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not caja_service.puede_asignar_caja(request.user):
            return Response({'detail': 'No puedes administrar categorías.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


def _caja_fresca(caja):
    return CajaViaje.objects.select_related(
        'viaje', 'viaje__ruta', 'viaje__vehiculo', 'viaje__conductor', 'cerrado_por',
    ).prefetch_related('movimientos__creado_por', 'movimientos__categoria').get(pk=caja.pk)


def _error_caja(exc):
    if getattr(exc, 'message_dict', None):
        return Response(exc.message_dict, status=status.HTTP_400_BAD_REQUEST)
    mensajes = getattr(exc, 'messages', None) or [str(exc)]
    return Response({'detail': mensajes[0]}, status=status.HTTP_400_BAD_REQUEST)


class CajaViajeViewSet(viewsets.ReadOnlyModelViewSet):
    modulo = 'gastos'
    serializer_class = CajaViajeSerializer
    queryset = CajaViaje.objects.select_related(
        'viaje', 'viaje__ruta', 'viaje__vehiculo', 'viaje__conductor', 'cerrado_por',
    ).prefetch_related('movimientos__creado_por', 'movimientos__categoria').order_by('-viaje__fecha_inicio', '-id')

    def get_queryset(self):
        qs = super().get_queryset()
        if solo_asignados(self.request.user):
            qs = qs.filter(viaje__conductor=self.request.user)
        viaje = self.request.query_params.get('viaje')
        estado = self.request.query_params.get('estado')
        if viaje:
            qs = qs.filter(viaje_id=viaje)
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    @action(detail=False, methods=['post'])
    def asignar(self, request):
        if not caja_service.puede_asignar_caja(request.user):
            return Response(
                {'detail': 'Solo un encargado puede asignar fondo a un viaje.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        viaje_id = request.data.get('viaje')
        try:
            viaje = Viaje.objects.get(pk=viaje_id)
        except (Viaje.DoesNotExist, ValueError, TypeError):
            return Response({'viaje': 'Selecciona un viaje.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            caja_service.asignar(
                viaje,
                request.data.get('monto'),
                request.user,
                request.data.get('descripcion') or '',
            )
        except ValidationError as exc:
            return _error_caja(exc)
        return Response(self.get_serializer(_caja_fresca(caja_service.caja_de(viaje))).data, status=status.HTTP_201_CREATED)

    def _caja_rendicion(self, request):
        caja = self.get_object()
        if not caja_service.puede_rendir_caja(request.user, caja.viaje):
            return None, Response(
                {'detail': 'Solo el encargado de este viaje puede registrar o cerrar la caja.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return caja, None

    @action(detail=True, methods=['post'])
    def aumentar(self, request, pk=None):
        if not caja_service.puede_asignar_caja(request.user):
            return Response(
                {'detail': 'Solo un encargado puede aumentar la caja.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        caja = self.get_object()
        try:
            caja_service.aumentar(
                caja, request.data.get('monto'), request.user, request.data.get('descripcion') or '',
            )
        except ValidationError as exc:
            return _error_caja(exc)
        return Response(self.get_serializer(_caja_fresca(caja)).data)

    @action(detail=True, methods=['post'])
    def gastos(self, request, pk=None):
        caja, error = self._caja_rendicion(request)
        if error:
            return error
        try:
            caja_service.registrar_gasto(
                caja,
                request.data.get('monto'),
                request.user,
                request.data.get('categoria'),
                request.data.get('descripcion') or '',
            )
        except ValidationError as exc:
            return _error_caja(exc)
        return Response(self.get_serializer(_caja_fresca(caja)).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path=r'movimientos/(?P<mov_id>[^/.]+)/borrar')
    def borrar_movimiento(self, request, pk=None, mov_id=None):
        caja, error = self._caja_rendicion(request)
        if error:
            return error
        try:
            movimiento = caja.movimientos.get(pk=mov_id)
        except CajaMovimiento.DoesNotExist:
            return Response({'detail': 'Movimiento no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            caja_service.borrar_movimiento(caja, movimiento, request.user)
        except ValidationError as exc:
            return _error_caja(exc)
        return Response(self.get_serializer(_caja_fresca(caja)).data)

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        caja, error = self._caja_rendicion(request)
        if error:
            return error
        try:
            caja_service.cerrar(
                caja,
                request.user,
                request.data.get('observacion') or '',
                request.data.get('saldo_devuelto'),
            )
        except ValidationError as exc:
            return _error_caja(exc)
        return Response(self.get_serializer(_caja_fresca(caja)).data)

    @action(detail=True, methods=['post'])
    def reabrir(self, request, pk=None):
        if not caja_service.puede_asignar_caja(request.user):
            return Response(
                {'detail': 'Solo un encargado puede reabrir la caja.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        caja = self.get_object()
        try:
            caja_service.reabrir(caja)
        except ValidationError as exc:
            return _error_caja(exc)
        return Response(self.get_serializer(_caja_fresca(caja)).data)


class ConfiguracionEmisorView(APIView):
    modulo = 'emisor'
    """Datos del transportista emisor. Siempre opera sobre el registro único."""

    def get(self, request):
        return Response(ConfiguracionEmisorSerializer(ConfiguracionEmisor.vigente()).data)

    def put(self, request):
        serializer = ConfiguracionEmisorSerializer(
            ConfiguracionEmisor.vigente(), data=request.data, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class GuiaRemisionViewSet(viewsets.ModelViewSet):
    modulo = 'guias'
    queryset = GuiaRemision.objects.select_related(
        'recojo', 'recojo__sede', 'recojo__viaje',
    ).prefetch_related('items').all()
    serializer_class = GuiaRemisionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        recojo = self.request.query_params.get('recojo')
        viaje = self.request.query_params.get('viaje')
        estado = self.request.query_params.get('estado')
        if recojo:
            qs = qs.filter(recojo_id=recojo)
        if viaje:
            qs = qs.filter(recojo__viaje_id=viaje)
        if estado:
            qs = qs.filter(estado=estado)
        return qs

    def _recojos_solicitados(self, datos):
        """Acepta una lista de recojos o un viaje completo."""
        ids = datos.get('recojos') or []
        viaje_id = datos.get('viaje')
        qs = Recojo.objects.select_related(
            'sede__cliente__empresa', 'sede__cliente__persona', 'sede__ciudad',
            'viaje__vehiculo', 'viaje__conductor',
        ).prefetch_related('detalles__tipo')
        if viaje_id:
            return list(qs.filter(viaje_id=viaje_id).order_by('id'))
        return list(qs.filter(pk__in=ids).order_by('id'))

    def _guias_solicitadas(self, params):
        """Resuelve las guías a imprimir desde ?ids=1,2 o ?viaje=3."""
        qs = self.get_queryset()
        ids = params.get('ids')
        viaje_id = params.get('viaje')
        if ids:
            pks = [int(x) for x in ids.split(',') if x.strip().isdigit()]
            return list(qs.filter(pk__in=pks).order_by('numero'))
        if viaje_id:
            return list(qs.filter(recojo__viaje_id=viaje_id).order_by('numero'))
        return []

    @action(detail=False, methods=['post'], url_path='emitir')
    def emitir(self, request):
        recojos = self._recojos_solicitados(request.data)
        if not recojos:
            return Response(
                {'detail': 'Indica los recojos o el viaje para emitir las guías.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        falta = guias_service.emisor_incompleto(ConfiguracionEmisor.vigente())
        if falta:
            return Response({'detail': falta}, status=status.HTTP_400_BAD_REQUEST)

        emitidas, nuevas, omitidos = guias_service.emitir_guias(
            recojos,
            usuario=request.user if request.user.is_authenticated else None,
            fecha_traslado=request.data.get('fecha_traslado') or None,
        )
        if not emitidas:
            return Response(
                {'detail': _detalle_omitidos(omitidos), 'omitidos': omitidos},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({
            'nuevas': nuevas,
            'reutilizadas': len(emitidas) - nuevas,
            'omitidos': omitidos,
            'guias': GuiaRemisionSerializer(emitidas, many=True).data,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='anular')
    def anular(self, request, pk=None):
        guia = self.get_object()
        guia.estado = 'anulada'
        guia.save(update_fields=['estado'])
        return Response(self.get_serializer(guia).data)

    @action(detail=True, methods=['get'], url_path='pdf')
    def pdf(self, request, pk=None):
        return _respuesta_pdf([self.get_object()])

    @action(detail=True, methods=['get'], url_path='preview')
    def preview(self, request, pk=None):
        return HttpResponse(guias_service.render_html([self.get_object()]))

    @action(detail=False, methods=['get'], url_path='pdf')
    def pdf_lote(self, request):
        guias = self._guias_solicitadas(request.query_params)
        if not guias:
            return Response(
                {'detail': 'No hay guías para imprimir.'}, status=status.HTTP_404_NOT_FOUND,
            )
        return _respuesta_pdf(guias)

    @action(detail=False, methods=['get'], url_path='preview')
    def preview_lote(self, request):
        guias = self._guias_solicitadas(request.query_params)
        if not guias:
            return Response(
                {'detail': 'No hay guías para mostrar.'}, status=status.HTTP_404_NOT_FOUND,
            )
        return HttpResponse(guias_service.render_html(guias))


def _detalle_omitidos(omitidos):
    if len(omitidos) == 1:
        return (
            f'No se pudo emitir la guía del recojo #{omitidos[0]["recojo"]}: '
            f'{omitidos[0]["motivo"]}.'
        )
    partes = '; '.join(f'recojo #{o["recojo"]}, {o["motivo"]}' for o in omitidos)
    return f'No se pudo emitir ninguna guía. {partes.capitalize()}.'


def _respuesta_pdf(guias):
    contenido = guias_service.render_pdf(guias)
    respuesta = HttpResponse(contenido, content_type='application/pdf')
    nombre = guias_service.nombre_archivo(guias)
    respuesta['Content-Disposition'] = f'inline; filename="{nombre}"'
    return respuesta
