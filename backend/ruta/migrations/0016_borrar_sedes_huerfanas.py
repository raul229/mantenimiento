from django.db import migrations


def borrar_sedes_huerfanas(apps, schema_editor):
    Sede = apps.get_model('ruta', 'Sede')
    Recojo = apps.get_model('ruta', 'Recojo')
    huerfanas = Sede.objects.filter(cliente__isnull=True)
    Recojo.objects.filter(sede__in=huerfanas).delete()
    huerfanas.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('ruta', '0015_configuracionemisor_guiaremision_guiaremisionitem_and_more'),
    ]

    operations = [
        migrations.RunPython(borrar_sedes_huerfanas, migrations.RunPython.noop),
    ]
