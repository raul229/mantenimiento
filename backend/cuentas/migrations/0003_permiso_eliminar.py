from django.db import migrations, models


def promover_eliminar(apps, schema_editor):
    PermisoRol = apps.get_model('cuentas', 'PermisoRol')
    Rol = apps.get_model('cuentas', 'Rol')
    for codigo in ('administrador', 'operaciones'):
        rol = Rol.objects.filter(codigo=codigo).first()
        if not rol:
            continue
        PermisoRol.objects.filter(rol=rol, nivel='escribir').update(nivel='eliminar')


class Migration(migrations.Migration):

    dependencies = [
        ('cuentas', '0002_roles_personalizados'),
    ]

    operations = [
        migrations.AlterField(
            model_name='permisorol',
            name='nivel',
            field=models.CharField(
                choices=[('ver', 'Ver'), ('escribir', 'Editar'), ('eliminar', 'Eliminar')],
                max_length=10,
            ),
        ),
        migrations.RunPython(promover_eliminar, migrations.RunPython.noop),
    ]
