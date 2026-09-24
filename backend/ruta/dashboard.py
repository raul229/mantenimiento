from calendar import monthrange
from datetime import date

from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from cuentas.models import solo_asignados
from .models import Recojo, RecojoDetalle, Viaje, ViajeGasto, Cliente, Ciudad
from mantenimiento.models import Vehiculo


def _month_range(year, month):
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    return start, end


def _prev_month(year, month):
    if month == 1:
        return year - 1, 12
    return year, month - 1


class DashboardView(APIView):
    modulo = 'dashboard'

    def get(self, request):
        today = timezone.now().date()
        mes_param = request.query_params.get('mes')
        ciudad_id = request.query_params.get('ciudad')

        if mes_param:
            year, month = map(int, mes_param.split('-'))
        else:
            year, month = today.year, today.month

        start, end = _month_range(year, month)
        prev_y, prev_m = _prev_month(year, month)
        prev_start, prev_end = _month_range(prev_y, prev_m)

        recojos = Recojo.objects.filter(fecha__gte=start, fecha__lte=end)
        if solo_asignados(request.user):
            recojos = recojos.filter(viaje__conductor=request.user)
        if ciudad_id:
            recojos = recojos.filter(sede__ciudad_id=ciudad_id)

        kg_mes = float(recojos.aggregate(s=Sum('peso_kg'))['s'] or 0)
        prev_recojos = Recojo.objects.filter(fecha__gte=prev_start, fecha__lte=prev_end)
        if solo_asignados(request.user):
            prev_recojos = prev_recojos.filter(viaje__conductor=request.user)
        if ciudad_id:
            prev_recojos = prev_recojos.filter(sede__ciudad_id=ciudad_id)
        kg_prev = float(prev_recojos.aggregate(s=Sum('peso_kg'))['s'] or 0)
        delta_pct = None
        if kg_prev:
            delta_pct = round(((kg_mes - kg_prev) / kg_prev) * 100, 1)

        viajes_hoy_qs = Viaje.objects.filter(fecha_inicio=today)
        if solo_asignados(request.user):
            viajes_hoy_qs = viajes_hoy_qs.filter(conductor=request.user)
        if ciudad_id:
            viajes_hoy_qs = viajes_hoy_qs.filter(
                Q(recojos__sede__ciudad_id=ciudad_id) | Q(ruta__sedes__ciudad_id=ciudad_id)
            ).distinct()

        viajes_hoy = viajes_hoy_qs.count()
        en_curso = viajes_hoy_qs.filter(estado='en curso').count()

        clientes = Cliente.objects.all()
        activos = clientes.filter(estado='activo')
        clientes_activos = activos.count()
        publicos = activos.filter(tipo='publico').count()
        privados = activos.filter(tipo='privado').count()

        caja = ViajeGasto.objects.filter(
            viaje__fecha_inicio__gte=start,
            viaje__fecha_inicio__lte=end,
        )
        if solo_asignados(request.user):
            caja = caja.filter(viaje__conductor=request.user)
        if ciudad_id:
            caja = caja.filter(
                Q(viaje__recojos__sede__ciudad_id=ciudad_id) | Q(viaje__ruta__sedes__ciudad_id=ciudad_id)
            ).distinct()
        caja_chica = float(caja.aggregate(s=Sum('monto'))['s'] or 0)

        residuos_qs = RecojoDetalle.objects.filter(recojo__in=recojos).values(
            'tipo__nombre', 'tipo__color', 'tipo__codigo'
        ).annotate(peso=Sum('peso_kg')).order_by('-peso')
        residuos = [
            {
                'nombre': r['tipo__nombre'],
                'color': r['tipo__color'],
                'codigo': r['tipo__codigo'],
                'peso': float(r['peso'] or 0),
            }
            for r in residuos_qs
        ]
        if not residuos and kg_mes:
            residuos = [{'nombre': 'Sin clasificar', 'color': '#94a3b8', 'codigo': 'otros', 'peso': kg_mes}]

        por_ciudad_qs = recojos.values('sede__ciudad__nombre').annotate(peso=Sum('peso_kg')).order_by('-peso')
        recojo_por_ciudad = [
            {'ciudad': r['sede__ciudad__nombre'] or 'Sin ciudad', 'peso': float(r['peso'] or 0)}
            for r in por_ciudad_qs
        ]

        viajes_hoy_list = []
        for v in viajes_hoy_qs.select_related('vehiculo', 'ruta').prefetch_related('recojos__sede__cliente', 'recojos__sede__ciudad')[:8]:
            recojo = v.recojos.select_related('sede__cliente', 'sede__ciudad').first()
            kg = float(v.recojos.aggregate(s=Sum('peso_kg'))['s'] or 0)
            ciudad = None
            cliente = None
            if recojo and recojo.sede:
                ciudad = recojo.sede.ciudad.nombre if recojo.sede.ciudad else None
                cliente = recojo.sede.cliente.razon_social if recojo.sede.cliente else None
            viajes_hoy_list.append({
                'id': v.id,
                'ruta': v.ruta.nombre if v.ruta else f'Viaje #{v.id}',
                'ciudad': ciudad,
                'vehiculo': v.vehiculo.placa if v.vehiculo else None,
                'cliente': cliente,
                'kg': kg,
                'estado': v.estado,
            })

        vehiculos = list(Vehiculo.objects.all())
        flota = {
            'total': len(vehiculos),
            'operativos': 0,
            'en_taller': 0,
            'detenido': 0,
            'unidades': [],
        }
        for veh in vehiculos:
            op = veh.estado_operativo()
            if op == 'en_taller':
                flota['en_taller'] += 1
            elif op == 'detenido':
                flota['detenido'] += 1
            else:
                flota['operativos'] += 1
        for veh in vehiculos[:3]:
            flota['unidades'].append({
                'id': veh.id,
                'placa': veh.placa,
                'marca': veh.marca,
                'modelo': veh.modelo,
                'estado_operativo': veh.estado_operativo(),
                'conductor': (
                    veh.conductor_asignado.get_full_name() or veh.conductor_asignado.username
                    if veh.conductor_asignado else None
                ),
            })

        ciudades = [{'id': c.id, 'nombre': c.nombre} for c in Ciudad.objects.all()]

        return Response({
            'mes': f'{year:04d}-{month:02d}',
            'kg_mes': kg_mes,
            'kg_mes_delta_pct': delta_pct,
            'viajes_hoy': viajes_hoy,
            'viajes_en_curso': en_curso,
            'clientes_activos': clientes_activos,
            'clientes_publicos': publicos,
            'clientes_privados': privados,
            'caja_chica': caja_chica,
            'residuos': residuos,
            'recojo_por_ciudad': recojo_por_ciudad,
            'viajes_hoy_list': viajes_hoy_list,
            'flota': flota,
            'ciudades': ciudades,
        })
