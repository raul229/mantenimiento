from django.db import migrations


TIPOS = [
    ('agujas', 'Agujas', '#0f766e', 1),
    ('sangre', 'Sangre/fluidos', '#e11d48', 2),
    ('cortopunzantes', 'Cortopunzantes', '#f59e0b', 3),
    ('farmacologicos', 'Farmacológicos', '#6366f1', 4),
    ('otros', 'Otros clínicos', '#14b8a6', 5),
]


def seed(apps, schema_editor):
    TipoResiduo = apps.get_model('ruta', 'TipoResiduo')
    Recojo = apps.get_model('ruta', 'Recojo')
    RecojoDetalle = apps.get_model('ruta', 'RecojoDetalle')
    ViajeGasto = apps.get_model('ruta', 'ViajeGasto')
    Viaje = apps.get_model('ruta', 'Viaje')

    tipos = {}
    for codigo, nombre, color, orden in TIPOS:
        obj, _ = TipoResiduo.objects.get_or_create(
            codigo=codigo,
            defaults={'nombre': nombre, 'color': color, 'orden': orden},
        )
        tipos[codigo] = obj

    otros = tipos['otros']
    for recojo in Recojo.objects.all():
        if RecojoDetalle.objects.filter(recojo=recojo).exists():
            continue
        if recojo.peso_kg:
            RecojoDetalle.objects.create(recojo=recojo, tipo=otros, peso_kg=recojo.peso_kg)

    if not ViajeGasto.objects.exists():
        viaje = Viaje.objects.order_by('-id').first()
        if viaje:
            ViajeGasto.objects.create(viaje=viaje, tipo='combustible', monto=86)
            ViajeGasto.objects.create(viaje=viaje, tipo='peaje', monto=14)
            ViajeGasto.objects.create(viaje=viaje, tipo='caja_chica', monto=40)


def unseed(apps, schema_editor):
    TipoResiduo = apps.get_model('ruta', 'TipoResiduo')
    TipoResiduo.objects.filter(codigo__in=[t[0] for t in TIPOS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('ruta', '0010_tiporesiduo_cliente_estado_cliente_tipo_and_more'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
