from django.db import migrations


PERMISOS = {
    'administrador': 'eliminar',
    'operaciones': 'eliminar',
    'conductor': 'escribir',
}


def agregar_gastos(apps, schema_editor):
    Rol = apps.get_model('cuentas', 'Rol')
    PermisoRol = apps.get_model('cuentas', 'PermisoRol')
    for codigo, nivel in PERMISOS.items():
        rol = Rol.objects.filter(codigo=codigo).first()
        if not rol:
            continue
        PermisoRol.objects.get_or_create(
            rol=rol, modulo='gastos', defaults={'nivel': nivel},
        )


def quitar_gastos(apps, schema_editor):
    PermisoRol = apps.get_model('cuentas', 'PermisoRol')
    PermisoRol.objects.filter(modulo='gastos').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('cuentas', '0003_permiso_eliminar'),
    ]

    operations = [
        migrations.RunPython(agregar_gastos, quitar_gastos),
    ]
