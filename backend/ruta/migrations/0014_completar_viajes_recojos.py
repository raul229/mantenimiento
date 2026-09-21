from django.db import migrations
from django.utils import timezone


def completar_viajes_y_recojos(apps, schema_editor):
    Viaje = apps.get_model('ruta', 'Viaje')
    Recojo = apps.get_model('ruta', 'Recojo')
    Recojo.objects.filter(peso_kg__gt=0).exclude(estado='completado').update(estado='completado')
    hoy = timezone.localdate()
    for viaje in Viaje.objects.exclude(estado='cancelado'):
        sede_ids = set(viaje.sedes.values_list('pk', flat=True))
        if not sede_ids:
            continue
        hechas = Recojo.objects.filter(
            viaje=viaje, sede_id__in=sede_ids,
        ).values('sede_id').distinct().count()
        if hechas >= len(sede_ids):
            viaje.estado = 'completado'
            if not viaje.fecha_fin:
                viaje.fecha_fin = hoy
            viaje.save(update_fields=['estado', 'fecha_fin'])
        elif hechas > 0 and viaje.estado == 'programado':
            viaje.estado = 'en curso'
            viaje.save(update_fields=['estado'])


class Migration(migrations.Migration):

    dependencies = [
        ('ruta', '0013_empresa_persona_cliente_titular'),
    ]

    operations = [
        migrations.RunPython(completar_viajes_y_recojos, migrations.RunPython.noop),
    ]
