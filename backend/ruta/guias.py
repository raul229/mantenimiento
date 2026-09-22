from decimal import Decimal
from io import BytesIO

from django.db import transaction
from django.template.loader import render_to_string
from django.utils import timezone

from mantenimiento.models import Documento

from .models import ConfiguracionEmisor, GuiaRemision, GuiaRemisionItem


def _licencia_conductor(conductor):
    if not conductor:
        return ''
    doc = Documento.objects.filter(
        tipo_entidad='user',
        entidad_id=conductor.pk,
        tipo_documento='licencia',
    ).exclude(estado='inactivo').order_by('-fecha_vencimiento').first()
    return doc.numero_documento if doc else ''


def _nombre_conductor(conductor):
    if not conductor:
        return ''
    completo = f'{conductor.first_name} {conductor.last_name}'.strip()
    return completo or conductor.username


def motivo_no_emitible(recojo):
    """Devuelve por qué el recojo no puede tener guía, o None si sí puede."""
    if not recojo.peso_kg:
        return 'no tiene kilogramos registrados'
    sede = recojo.sede
    if sede is None:
        return 'no tiene sede asignada'
    if sede.cliente is None:
        return f'la sede «{sede.nombre}» no está asociada a ningún cliente'
    if not sede.cliente.numero_documento:
        return f'el cliente de «{sede.nombre}» no tiene RUC ni DNI registrado'
    if not recojo.viaje or not recojo.viaje.vehiculo:
        return 'el viaje no tiene vehículo asignado'
    return None


def emisor_incompleto(config):
    if not config.ruc or not config.razon_social:
        return 'Completa el RUC y la razón social en Datos de emisión antes de emitir guías.'
    return None


@transaction.atomic
def emitir_guia(recojo, usuario=None, config=None, fecha_traslado=None):
    """Emite la guía del recojo. Si ya existe la devuelve sin consumir correlativo."""
    existente = GuiaRemision.objects.filter(recojo=recojo).first()
    if existente:
        return existente, False

    config = config or ConfiguracionEmisor.vigente()
    serie, numero = config.reservar_numero()

    sede = recojo.sede
    cliente = sede.cliente if sede else None
    viaje = recojo.viaje
    vehiculo = viaje.vehiculo if viaje else None
    conductor = viaje.conductor if viaje else None

    ciudad = sede.ciudad.nombre if sede and sede.ciudad else ''
    partida = ' - '.join(p for p in [sede.direccion if sede else '', ciudad] if p)

    guia = GuiaRemision.objects.create(
        recojo=recojo,
        serie=serie,
        numero=numero,
        fecha_emision=timezone.localdate(),
        fecha_traslado=fecha_traslado or recojo.fecha or timezone.localdate(),
        motivo_traslado=config.motivo_traslado,
        emisor_ruc=config.ruc,
        emisor_razon_social=config.razon_social,
        emisor_direccion=config.direccion,
        emisor_registro_mtc=config.registro_mtc,
        remitente_documento=cliente.numero_documento if cliente else '',
        remitente_razon_social=cliente.razon_social if cliente else '',
        destinatario_documento=config.destinatario_documento,
        destinatario_razon_social=config.destinatario_razon_social,
        punto_partida=partida,
        punto_llegada=config.punto_llegada,
        vehiculo_placa=vehiculo.placa if vehiculo else '',
        vehiculo_marca=f'{vehiculo.marca} {vehiculo.modelo}'.strip() if vehiculo else '',
        conductor_nombre=_nombre_conductor(conductor),
        conductor_licencia=_licencia_conductor(conductor),
        peso_total_kg=recojo.peso_kg or 0,
        observaciones=recojo.observaciones,
        creado_por=usuario,
    )

    _crear_items(guia, recojo)
    return guia, True


def _crear_items(guia, recojo):
    """Detalla los residuos por tipo y cuadra el resto contra el peso del recojo."""
    total = recojo.peso_kg or Decimal('0')
    items = [
        GuiaRemisionItem(guia=guia, descripcion=d.tipo.nombre, cantidad=d.peso_kg)
        for d in recojo.detalles.select_related('tipo').all()
    ]
    resto = total - sum((i.cantidad for i in items), Decimal('0'))
    if resto > 0 or not items:
        items.append(GuiaRemisionItem(
            guia=guia,
            descripcion='Residuos sólidos sin clasificar' if items else 'Residuos sólidos',
            cantidad=resto if items else total,
        ))
    GuiaRemisionItem.objects.bulk_create(items)


def emitir_guias(recojos, usuario=None, fecha_traslado=None):
    """Emite las guías posibles y devuelve aparte los recojos que quedaron fuera."""
    config = ConfiguracionEmisor.vigente()
    guias, nuevas, omitidos = [], 0, []
    for recojo in recojos:
        # Una guía ya emitida se devuelve siempre, aunque hoy los datos fallen la validación.
        emitida = GuiaRemision.objects.filter(recojo=recojo).first()
        if emitida:
            guias.append(emitida)
            continue
        motivo = motivo_no_emitible(recojo)
        if motivo:
            omitidos.append({'recojo': recojo.pk, 'motivo': motivo})
            continue
        guia, creada = emitir_guia(recojo, usuario=usuario, config=config, fecha_traslado=fecha_traslado)
        guias.append(guia)
        nuevas += 1 if creada else 0
    return guias, nuevas, omitidos


def render_html(guias):
    return render_to_string('ruta/guia_remision.html', {'guias': guias})


def render_pdf(guias):
    from xhtml2pdf import pisa

    buffer = BytesIO()
    resultado = pisa.CreatePDF(render_html(guias), dest=buffer, encoding='utf-8')
    if resultado.err:
        raise RuntimeError('No se pudo generar el PDF de la guía de remisión.')
    return buffer.getvalue()


def nombre_archivo(guias):
    if len(guias) == 1:
        return f'guia-{guias[0].numero_formateado}.pdf'
    return f'guias-remision-{timezone.localdate():%Y%m%d}-{len(guias)}.pdf'
