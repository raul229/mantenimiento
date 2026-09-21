from django.db import migrations, models


def copiar_sedes_y_limpiar_pendientes(apps, schema_editor):
    Viaje = apps.get_model('ruta', 'Viaje')
    Recojo = apps.get_model('ruta', 'Recojo')
    Through = Viaje.sedes.through

    for viaje in Viaje.objects.all():
        sede_ids = set()
        if viaje.ruta_id:
            sede_ids.update(viaje.ruta.sedes.values_list('pk', flat=True))
        sede_ids.update(
            Recojo.objects.filter(viaje=viaje, sede_id__isnull=False).values_list('sede_id', flat=True)
        )
        Through.objects.bulk_create(
            [Through(viaje_id=viaje.pk, sede_id=sid) for sid in sede_ids],
            ignore_conflicts=True,
        )

    Recojo.objects.filter(peso_kg=0).delete()

    seen = set()
    for recojo in Recojo.objects.filter(viaje_id__isnull=False, sede_id__isnull=False).order_by('-peso_kg', '-id'):
        key = (recojo.viaje_id, recojo.sede_id)
        if key in seen:
            recojo.delete()
        else:
            seen.add(key)


class Migration(migrations.Migration):

    dependencies = [
        ('ruta', '0011_seed_tipos_residuo'),
    ]

    operations = [
        migrations.AddField(
            model_name='viaje',
            name='sedes',
            field=models.ManyToManyField(blank=True, related_name='viajes', to='ruta.sede'),
        ),
        migrations.RunPython(copiar_sedes_y_limpiar_pendientes, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='recojo',
            constraint=models.UniqueConstraint(fields=('viaje', 'sede'), name='unique_recojo_viaje_sede'),
        ),
    ]
