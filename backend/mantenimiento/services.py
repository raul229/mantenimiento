from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db.models import Q, Sum
from django.utils import timezone

from cuentas.models import solo_asignados
from cuentas.permissions import puede_escribir
from .models import (
    Falla, HistorialServicio, Mantenimiento, MantenimientoGasto, Notificacion,
    ServicioVehiculo, TipoServicio, Vehiculo,
)


def puede_gestionar_taller(user):
    return puede_escribir(user, 'flota') and not solo_asignados(user)


def puede_escribir_falla(user):
    return puede_escribir(user, 'flota')


def vehiculos_visibles(user):
    qs = Vehiculo.objects.all()
    if not solo_asignados(user):
        return qs
    return qs.filter(
        Q(conductor_asignado=user)
        | Q(viajes__conductor=user) & ~Q(viajes__estado='cancelado')
    ).distinct()


def _monto(valor):
    try:
        monto = Decimal(str(valor))
    except Exception as exc:
        raise ValidationError({'monto': 'Indica un monto válido.'}) from exc
    if monto <= 0:
        raise ValidationError({'monto': 'El monto debe ser mayor a cero.'})
    return monto


def _recomputar_costo(mantenimiento):
    total = mantenimiento.gastos.aggregate(s=Sum('monto'))['s'] or Decimal('0')
    mantenimiento.costo = total
    mantenimiento.save(update_fields=['costo'])
    return total


def usuarios_taller():
    from django.contrib.auth.models import User
    from cuentas.models import PermisoRol

    return User.objects.filter(
        perfil__rol__permisos__modulo='flota',
        perfil__rol__permisos__nivel__in=PermisoRol.NIVELES_ESCRITURA,
        perfil__rol__solo_asignados=False,
        is_active=True,
    ).distinct()


def notificar(usuarios, tipo, titulo, mensaje, vehiculo=None, clave=''):
    for usuario in usuarios:
        if not usuario:
            continue
        if clave:
            Notificacion.objects.update_or_create(
                usuario=usuario,
                clave=clave,
                defaults={
                    'tipo': tipo,
                    'titulo': titulo,
                    'mensaje': mensaje,
                    'vehiculo': vehiculo,
                    'leida': False,
                },
            )
        else:
            Notificacion.objects.create(
                usuario=usuario,
                tipo=tipo,
                titulo=titulo,
                mensaje=mensaje,
                vehiculo=vehiculo,
            )


def reportar_falla(vehiculo, usuario, descripcion, prioridad='media', tipo=None):
    if not descripcion or not str(descripcion).strip():
        raise ValidationError({'descripcion': 'Describe la falla.'})
    if prioridad not in {c for c, _ in Falla.PRIORIDAD_CHOICES}:
        prioridad = Falla.MEDIA
    falla = Falla.objects.create(
        vehiculo=vehiculo,
        usuario_reporta=usuario,
        tipo=tipo,
        prioridad=prioridad,
        descripcion=str(descripcion).strip(),
        kilometraje_reportado=vehiculo.kilometraje_actual or 0,
        estado=Falla.ABIERTA,
        fecha_reportado=timezone.now().date(),
    )
    notificar(
        usuarios_taller(),
        Notificacion.FALLA,
        f'Falla en {vehiculo.placa}',
        f'{falla.get_prioridad_display()}: {falla.descripcion[:140]}',
        vehiculo=vehiculo,
    )
    return falla


def crear_mantenimiento(vehiculo, fallas, usuario=None, **data):
    tipo = data.get('tipo_mantenimiento') or (
        Mantenimiento.CORRECTIVO if fallas else Mantenimiento.PREVENTIVO
    )
    if tipo == 'costo_cero':
        tipo = Mantenimiento.PREVENTIVO
    for falla in fallas:
        if falla.vehiculo_id != vehiculo.id:
            raise ValidationError({'fallas': 'Todas las fallas deben ser del mismo vehículo.'})
        if falla.estado == Falla.REPARADA:
            raise ValidationError({'fallas': 'Esa falla ya está reparada.'})
    mantenimiento = Mantenimiento.objects.create(
        vehiculo=vehiculo,
        tipo_mantenimiento=tipo,
        estado=data.get('estado') or Mantenimiento.ABIERTA,
        descripcion=data.get('descripcion') or '',
        kilometraje=data.get('kilometraje') if data.get('kilometraje') not in (None, '') else vehiculo.kilometraje_actual,
        fecha_inicio=data.get('fecha_inicio') or timezone.now().date(),
        proveedor=data.get('proveedor') or '',
        creado_por=usuario,
        costo=data.get('costo') or 0,
    )
    mantenimiento.fallas.set(fallas)
    if fallas:
        Falla.objects.filter(pk__in=[f.pk for f in fallas]).update(estado=Falla.EN_ORDEN)
    if mantenimiento.estado == Mantenimiento.EN_TALLER:
        _poner_en_taller(vehiculo)
    return mantenimiento


def actualizar_mantenimiento(mantenimiento, vehiculo=None, fallas=None, **data):
    if mantenimiento.estado == Mantenimiento.CERRADA:
        raise ValidationError('La orden ya está cerrada.')
    if vehiculo is not None:
        mantenimiento.vehiculo = vehiculo
    for campo in ('tipo_mantenimiento', 'descripcion', 'proveedor', 'fecha_inicio', 'kilometraje'):
        if campo in data and data[campo] is not None:
            setattr(mantenimiento, campo, data[campo])
    mantenimiento.save()
    if fallas is not None:
        anteriores = set(mantenimiento.fallas.values_list('pk', flat=True))
        nuevas = {f.pk for f in fallas}
        Falla.objects.filter(pk__in=anteriores - nuevas, estado=Falla.EN_ORDEN).update(estado=Falla.ABIERTA)
        mantenimiento.fallas.set(fallas)
        Falla.objects.filter(pk__in=nuevas).exclude(estado=Falla.REPARADA).update(estado=Falla.EN_ORDEN)
    return mantenimiento


def enviar_taller(mantenimiento):
    if mantenimiento.estado == Mantenimiento.CERRADA:
        raise ValidationError('La orden ya está cerrada.')
    mantenimiento.estado = Mantenimiento.EN_TALLER
    mantenimiento.save(update_fields=['estado'])
    _poner_en_taller(mantenimiento.vehiculo)
    return mantenimiento


def _poner_en_taller(vehiculo):
    if vehiculo.estado != 'mantenimiento':
        vehiculo.estado = 'mantenimiento'
        vehiculo.save(update_fields=['estado'])


def _liberar_si_sin_taller(vehiculo):
    if vehiculo.mantenimientos.filter(estado=Mantenimiento.EN_TALLER).exists():
        return
    if vehiculo.estado == 'mantenimiento':
        vehiculo.estado = 'activo'
        vehiculo.save(update_fields=['estado'])


def agregar_gasto(mantenimiento, concepto, monto, usuario=None, categoria='otro'):
    if mantenimiento.estado == Mantenimiento.CERRADA:
        raise ValidationError('La orden ya está cerrada.')
    categorias = {c for c, _ in MantenimientoGasto.CATEGORIA_CHOICES}
    if categoria not in categorias:
        categoria = MantenimientoGasto.OTRO
    if not concepto or not str(concepto).strip():
        raise ValidationError({'concepto': 'Indica el concepto.'})
    gasto = MantenimientoGasto.objects.create(
        mantenimiento=mantenimiento,
        concepto=str(concepto).strip(),
        categoria=categoria,
        monto=_monto(monto),
        creado_por=usuario,
    )
    _recomputar_costo(mantenimiento)
    return gasto


def borrar_gasto(mantenimiento, gasto):
    if mantenimiento.estado == Mantenimiento.CERRADA:
        raise ValidationError('La orden ya está cerrada.')
    if gasto.mantenimiento_id != mantenimiento.id:
        raise ValidationError('El gasto no pertenece a esta orden.')
    gasto.delete()
    _recomputar_costo(mantenimiento)


def registrar_servicio(vehiculo, tipo, kilometraje, fecha=None, mantenimiento=None, nota=''):
    km = int(kilometraje)
    if km < 0:
        raise ValidationError({'kilometraje': 'El kilometraje no puede ser negativo.'})
    fecha = fecha or timezone.now().date()
    sv, _ = ServicioVehiculo.objects.get_or_create(vehiculo=vehiculo, tipo=tipo)
    sv.ultimo_km = km
    sv.ultima_fecha = fecha
    sv.proximo_km = km + tipo.intervalo_km
    sv.save()
    HistorialServicio.objects.create(
        vehiculo=vehiculo,
        tipo=tipo,
        mantenimiento=mantenimiento,
        kilometraje=km,
        fecha=fecha,
        nota=nota or '',
    )
    sincronizar_preventivos(vehiculo)
    return sv


def _estado_servicio(sv, km_actual):
    if sv.ultimo_km is None and sv.proximo_km is None:
        return 'sin_registro'
    proximo = sv.proximo_km
    if proximo is None:
        return 'sin_registro'
    if km_actual >= proximo:
        return 'vencido'
    if km_actual >= proximo - (sv.tipo.alerta_antes_km or 0):
        return 'por_vencer'
    return 'al_dia'


def asegurar_servicios(vehiculo):
    existentes = set(vehiculo.servicios.values_list('tipo_id', flat=True))
    for tipo in TipoServicio.objects.all():
        if tipo.id not in existentes:
            ServicioVehiculo.objects.get_or_create(vehiculo=vehiculo, tipo=tipo)


def sincronizar_preventivos(vehiculo):
    if not vehiculo:
        return []
    asegurar_servicios(vehiculo)
    km = vehiculo.kilometraje_actual or 0
    alertas = []
    proximos = []
    for sv in vehiculo.servicios.select_related('tipo'):
        estado = _estado_servicio(sv, km)
        if sv.proximo_km is not None:
            proximos.append(sv.proximo_km)
        item = {
            'tipo_id': sv.tipo_id,
            'tipo': sv.tipo.nombre,
            'intervalo_km': sv.tipo.intervalo_km,
            'ultimo_km': sv.ultimo_km,
            'ultima_fecha': sv.ultima_fecha,
            'proximo_km': sv.proximo_km,
            'faltan_km': None if sv.proximo_km is None else sv.proximo_km - km,
            'estado': estado,
        }
        if estado in ('por_vencer', 'vencido'):
            alertas.append(item)
            titulo = f'{sv.tipo.nombre} en {vehiculo.placa}'
            if estado == 'vencido':
                mensaje = f'Venció a los {sv.proximo_km:,} km. Odómetro: {km:,} km.'.replace(',', ' ')
            else:
                mensaje = f'Toca a los {sv.proximo_km:,} km. Faltan {sv.proximo_km - km:,} km.'.replace(',', ' ')
            destinatarios = list(usuarios_taller())
            if vehiculo.conductor_asignado_id:
                destinatarios.append(vehiculo.conductor_asignado)
            notificar(
                destinatarios,
                Notificacion.PREVENTIVO,
                titulo,
                mensaje,
                vehiculo=vehiculo,
                clave=f'prev:{vehiculo.id}:{sv.tipo_id}:{estado}',
            )
        else:
            Notificacion.objects.filter(
                clave__startswith=f'prev:{vehiculo.id}:{sv.tipo_id}:',
                leida=False,
            ).update(leida=True)
    proximo = min(proximos) if proximos else None
    if vehiculo.proximo_mantenimiento_km != proximo:
        vehiculo.proximo_mantenimiento_km = proximo
        vehiculo.save(update_fields=['proximo_mantenimiento_km'])
    return alertas


def alertas_de(vehiculo):
    asegurar_servicios(vehiculo)
    km = vehiculo.kilometraje_actual or 0
    items = []
    for sv in vehiculo.servicios.select_related('tipo'):
        items.append({
            'id': sv.id,
            'tipo_id': sv.tipo_id,
            'tipo': sv.tipo.nombre,
            'intervalo_km': sv.tipo.intervalo_km,
            'alerta_antes_km': sv.tipo.alerta_antes_km,
            'ultimo_km': sv.ultimo_km,
            'ultima_fecha': sv.ultima_fecha.isoformat() if sv.ultima_fecha else None,
            'proximo_km': sv.proximo_km,
            'faltan_km': None if sv.proximo_km is None else sv.proximo_km - km,
            'estado': _estado_servicio(sv, km),
        })
    return items


def cerrar_mantenimiento(mantenimiento, usuario, resultados=None, servicios=None, kilometraje=None, observacion=''):
    if mantenimiento.estado == Mantenimiento.CERRADA:
        raise ValidationError('La orden ya está cerrada.')
    hoy = timezone.now().date()
    km = kilometraje if kilometraje not in (None, '') else (
        mantenimiento.kilometraje if mantenimiento.kilometraje is not None else mantenimiento.vehiculo.kilometraje_actual
    )
    try:
        km = int(km)
    except (TypeError, ValueError) as exc:
        raise ValidationError({'kilometraje': 'Indica el kilometraje del servicio.'}) from exc

    por_falla = {int(item['falla']): item for item in (resultados or []) if item.get('falla')}
    for falla in mantenimiento.fallas.all():
        item = por_falla.get(falla.id) or {}
        resultado = item.get('resultado') or Falla.REPARADA
        if resultado == Falla.NO_REPARADA:
            falla.estado = Falla.ABIERTA
            falla.nota_cierre = item.get('nota') or 'Quedó pendiente en esta orden'
            falla.fecha_solucionado = None
        else:
            falla.estado = Falla.REPARADA
            falla.fecha_solucionado = hoy
            falla.nota_cierre = item.get('nota') or ''
        falla.save(update_fields=['estado', 'nota_cierre', 'fecha_solucionado'])

    for tipo_id in servicios or []:
        try:
            tipo = TipoServicio.objects.get(pk=tipo_id)
        except (TipoServicio.DoesNotExist, ValueError, TypeError):
            continue
        registrar_servicio(mantenimiento.vehiculo, tipo, km, hoy, mantenimiento)

    mantenimiento.estado = Mantenimiento.CERRADA
    mantenimiento.fecha_fin = hoy
    mantenimiento.kilometraje = km
    if observacion:
        mantenimiento.descripcion = (
            f'{mantenimiento.descripcion}\n{observacion}'.strip() if mantenimiento.descripcion else observacion
        )
    mantenimiento.save()
    _liberar_si_sin_taller(mantenimiento.vehiculo)
    sincronizar_preventivos(mantenimiento.vehiculo)
    return mantenimiento
