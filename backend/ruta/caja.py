from decimal import Decimal

from django.core.exceptions import ValidationError
from django.utils import timezone

from cuentas.models import solo_asignados
from cuentas.permissions import puede_escribir
from .models import CajaMovimiento, CajaViaje, CategoriaGasto


def caja_de(viaje):
    caja, _ = CajaViaje.objects.get_or_create(viaje=viaje)
    return caja


def puede_asignar_caja(user):
    return puede_escribir(user, 'gastos') and not solo_asignados(user)


def puede_rendir_caja(user, viaje):
    if not puede_escribir(user, 'gastos'):
        return False
    if solo_asignados(user):
        return viaje.conductor_id == user.id
    return True


def _monto(valor):
    try:
        monto = Decimal(str(valor))
    except Exception as exc:
        raise ValidationError({'monto': 'Indica un monto válido.'}) from exc
    if monto <= 0:
        raise ValidationError({'monto': 'El monto debe ser mayor a cero.'})
    return monto


def _caja_abierta(caja):
    if caja.viaje.estado == 'cancelado':
        raise ValidationError('No se puede operar la caja de un viaje cancelado.')
    if caja.estado == CajaViaje.CERRADA:
        raise ValidationError('La caja de este viaje ya está cerrada.')


def asignar(viaje, monto, usuario, descripcion=''):
    if viaje.estado == 'cancelado':
        raise ValidationError({'viaje': 'No se puede asignar caja a un viaje cancelado.'})
    caja = caja_de(viaje)
    _caja_abierta(caja)
    if caja.movimientos.filter(tipo=CajaMovimiento.ASIGNACION).exists():
        raise ValidationError('Este viaje ya tiene un fondo asignado. Usa un aumento.')
    return CajaMovimiento.objects.create(
        caja=caja,
        tipo=CajaMovimiento.ASIGNACION,
        monto=_monto(monto),
        descripcion=descripcion or 'Fondo inicial',
        creado_por=usuario,
    )


def aumentar(caja, monto, usuario, descripcion=''):
    _caja_abierta(caja)
    if not caja.movimientos.filter(tipo=CajaMovimiento.ASIGNACION).exists():
        raise ValidationError('Primero asigna un fondo inicial.')
    return CajaMovimiento.objects.create(
        caja=caja,
        tipo=CajaMovimiento.AUMENTO,
        monto=_monto(monto),
        descripcion=descripcion or 'Aumento de caja',
        creado_por=usuario,
    )


def _categoria(valor):
    if valor in (None, ''):
        raise ValidationError({'categoria': 'Elige una categoría.'})
    try:
        return CategoriaGasto.objects.get(pk=valor)
    except (CategoriaGasto.DoesNotExist, ValueError, TypeError) as exc:
        raise ValidationError({'categoria': 'Esa categoría no existe.'}) from exc


def registrar_gasto(caja, monto, usuario, categoria=None, descripcion=''):
    _caja_abierta(caja)
    if not caja.movimientos.filter(tipo=CajaMovimiento.ASIGNACION).exists():
        raise ValidationError('Aún no hay fondo asignado para este viaje.')
    return CajaMovimiento.objects.create(
        caja=caja,
        tipo=CajaMovimiento.GASTO,
        categoria=_categoria(categoria),
        monto=_monto(monto),
        descripcion=descripcion,
        creado_por=usuario,
    )


def borrar_movimiento(caja, movimiento, usuario):
    _caja_abierta(caja)
    if movimiento.caja_id != caja.id:
        raise ValidationError('El movimiento no pertenece a esta caja.')
    if movimiento.tipo == CajaMovimiento.ASIGNACION and caja.movimientos.exclude(pk=movimiento.pk).exists():
        raise ValidationError('No puedes quitar la asignación si ya hay aumentos o gastos.')
    movimiento.delete()


def cerrar(caja, usuario, observacion='', saldo_devuelto=None):
    _caja_abierta(caja)
    if not caja.movimientos.filter(tipo=CajaMovimiento.ASIGNACION).exists():
        raise ValidationError('No hay fondo para cerrar.')
    caja.estado = CajaViaje.CERRADA
    caja.cerrado_en = timezone.now()
    caja.cerrado_por = usuario
    caja.observacion_cierre = observacion or ''
    if saldo_devuelto is None or saldo_devuelto == '':
        caja.saldo_devuelto = caja.saldo
    else:
        caja.saldo_devuelto = Decimal(str(saldo_devuelto))
    caja.save()
    return caja


def reabrir(caja):
    if caja.estado != CajaViaje.CERRADA:
        raise ValidationError('La caja no está cerrada.')
    caja.estado = CajaViaje.ABIERTA
    caja.cerrado_en = None
    caja.cerrado_por = None
    caja.observacion_cierre = ''
    caja.saldo_devuelto = None
    caja.save()
    return caja
