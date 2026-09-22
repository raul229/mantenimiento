from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.http import HttpResponse
from .models import (
    Ciudad, Cliente, Sede, Ruta, Viaje, Recojo, Celular, Persona,
    TipoResiduo, RecojoDetalle, ViajeGasto,
    ConfiguracionEmisor, GuiaRemision,
)
from .serializers import (
    CiudadSerializer, ClienteSerializer, SedeSerializer, RutaSerializer,
    ViajeSerializer, RecojoSerializer, CelularSerializer, PersonaSerializer,
    TipoResiduoSerializer, RecojoDetalleSerializer, ViajeGastoSerializer,
    ConfiguracionEmisorSerializer, GuiaRemisionSerializer,
)
from . import guias as guias_service


class CelularViewSet(viewsets.ModelViewSet):
    queryset = Celular.objects.all()
    serializer_class = CelularSerializer


class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.prefetch_related('celulares').all()
    serializer_class = PersonaSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        cliente = self.request.query_params.get('cliente')
        if cliente:
            qs = qs.filter(Q(cliente_id=cliente) | Q(cliente_propio_id=cliente))
        return qs


class CiudadViewSet(viewsets.ModelViewSet):
    queryset = Ciudad.objects.all().order_by('nombre')
    serializer_class = CiudadSerializer


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.select_related('empresa', 'persona').prefetch_related(
        'personas__celulares',
        'persona__celulares',
        'sedes__ciudad',
        'sedes__persona__celulares',
    ).all()
    serializer_class = ClienteSerializer


class SedeViewSet(viewsets.ModelViewSet):
    queryset = Sede.objects.select_related(
        'cliente', 'cliente__empresa', 'cliente__persona', 'ciudad', 'persona',
    ).all()
    serializer_class = SedeSerializer


class RutaViewSet(viewsets.ModelViewSet):
    queryset = Ruta.objects.prefetch_related('sedes').all()
    serializer_class = RutaSerializer


class ViajeViewSet(viewsets.ModelViewSet):
    queryset = Viaje.objects.select_related('vehiculo', 'conductor', 'ruta').prefetch_related(
        'sedes__cliente__empresa',
        'sedes__cliente__persona',
        'sedes__ciudad',
        'recojos__sede__cliente__empresa',
        'recojos__sede__cliente__persona',
        'recojos__sede__ciudad',
        'recojos__guia',
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
        'sede__cliente__empresa',
        'sede__cliente__persona',
        'sede__ciudad',
        'guia',
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


class ConfiguracionEmisorView(APIView):
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
