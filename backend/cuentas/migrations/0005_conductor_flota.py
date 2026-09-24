from django.db import migrations


def agregar_flota_conductor(apps, schema_editor):
    Rol = apps.get_model('cuentas', 'Rol')
    PermisoRol = apps.get_model('cuentas', 'PermisoRol')
    rol = Rol.objects.filter(codigo='conductor').first()
    if not rol:
        return
    PermisoRol.objects.get_or_create(
        rol=rol, modulo='flota', defaults={'nivel': 'escribir'},
    )


def quitar_flota_conductor(apps, schema_editor):
    PermisoRol = apps.get_model('cuentas', 'PermisoRol')
    PermisoRol.objects.filter(rol__codigo='conductor', modulo='flota').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('cuentas', '0004_modulo_gastos'),
    ]

    operations = [
        migrations.RunPython(agregar_flota_conductor, quitar_flota_conductor),
    ]
