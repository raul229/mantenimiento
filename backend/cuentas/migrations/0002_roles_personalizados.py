from django.db import migrations, models
import django.db.models.deletion


PERMISOS_INICIALES = {
    'administrador': {
        'nombre': 'Administrador',
        'descripcion': 'Acceso completo a la operación y a los usuarios.',
        'es_sistema': True,
        'solo_asignados': False,
        'permisos': {
            'dashboard': 'ver',
            'clientes': 'escribir',
            'viajes': 'escribir',
            'recojos': 'escribir',
            'flota': 'escribir',
            'emisor': 'escribir',
            'guias': 'escribir',
            'usuarios': 'escribir',
        },
    },
    'operaciones': {
        'nombre': 'Operaciones',
        'descripcion': 'Clientes, rutas, recojos, flota y guías.',
        'es_sistema': True,
        'solo_asignados': False,
        'permisos': {
            'dashboard': 'ver',
            'clientes': 'escribir',
            'viajes': 'escribir',
            'recojos': 'escribir',
            'flota': 'escribir',
            'emisor': 'escribir',
            'guias': 'escribir',
        },
    },
    'conductor': {
        'nombre': 'Conductor',
        'descripcion': 'Sus viajes, odómetro y recojos asignados.',
        'es_sistema': True,
        'solo_asignados': True,
        'permisos': {
            'dashboard': 'ver',
            'viajes': 'ver',
            'recojos': 'escribir',
        },
    },
}


def crear_roles(apps, schema_editor):
    Rol = apps.get_model('cuentas', 'Rol')
    PermisoRol = apps.get_model('cuentas', 'PermisoRol')
    for codigo, datos in PERMISOS_INICIALES.items():
        rol, _ = Rol.objects.get_or_create(
            codigo=codigo,
            defaults={
                'nombre': datos['nombre'],
                'descripcion': datos['descripcion'],
                'es_sistema': datos['es_sistema'],
                'solo_asignados': datos['solo_asignados'],
            },
        )
        for modulo, nivel in datos['permisos'].items():
            PermisoRol.objects.get_or_create(
                rol=rol, modulo=modulo, defaults={'nivel': nivel},
            )


def asignar_roles(apps, schema_editor):
    Perfil = apps.get_model('cuentas', 'Perfil')
    Rol = apps.get_model('cuentas', 'Rol')
    por_codigo = {rol.codigo: rol for rol in Rol.objects.all()}
    fallback = por_codigo.get('operaciones')
    for perfil in Perfil.objects.all():
        perfil.rol_ref = por_codigo.get(perfil.rol) or fallback
        perfil.save(update_fields=['rol_ref'])


class Migration(migrations.Migration):

    dependencies = [
        ('cuentas', '0001_perfil_roles'),
    ]

    operations = [
        migrations.CreateModel(
            name='Rol',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('codigo', models.SlugField(max_length=40, unique=True)),
                ('nombre', models.CharField(max_length=80)),
                ('descripcion', models.CharField(blank=True, max_length=200)),
                ('es_sistema', models.BooleanField(default=False)),
                ('solo_asignados', models.BooleanField(default=False)),
            ],
            options={'ordering': ['nombre']},
        ),
        migrations.CreateModel(
            name='PermisoRol',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('modulo', models.CharField(max_length=20)),
                ('nivel', models.CharField(choices=[('ver', 'Ver'), ('escribir', 'Editar')], max_length=10)),
                ('rol', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='permisos', to='cuentas.rol')),
            ],
            options={'unique_together': {('rol', 'modulo')}},
        ),
        migrations.RunPython(crear_roles, migrations.RunPython.noop),
        migrations.AddField(
            model_name='perfil',
            name='rol_ref',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='perfiles',
                to='cuentas.rol',
            ),
        ),
        migrations.RunPython(asignar_roles, migrations.RunPython.noop),
        migrations.RemoveField(model_name='perfil', name='rol'),
        migrations.RenameField(model_name='perfil', old_name='rol_ref', new_name='rol'),
        migrations.AlterField(
            model_name='perfil',
            name='rol',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='perfiles',
                to='cuentas.rol',
            ),
        ),
    ]
