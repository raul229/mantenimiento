from django.db import migrations, models


def cancelar_viajes_abiertos_duplicados(apps, schema_editor):
    Viaje = apps.get_model('ruta', 'Viaje')
    vistos = set()
    extras = Viaje.objects.exclude(estado='cancelado').filter(
        vehiculo__isnull=False, kilometraje_final__isnull=True,
    ).order_by('vehiculo_id', 'id')
    for viaje in extras:
        if viaje.vehiculo_id in vistos:
            viaje.estado = 'cancelado'
            viaje.save(update_fields=['estado'])
        else:
            vistos.add(viaje.vehiculo_id)


class Migration(migrations.Migration):

    dependencies = [
        ('ruta', '0016_borrar_sedes_huerfanas'),
    ]

    operations = [
        migrations.RunPython(cancelar_viajes_abiertos_duplicados, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='viaje',
            constraint=models.UniqueConstraint(
                condition=models.Q(('vehiculo__isnull', False), ('kilometraje_final__isnull', True))
                & ~models.Q(('estado', 'cancelado')),
                fields=('vehiculo',),
                name='unique_vehiculo_viaje_abierto',
            ),
        ),
    ]
