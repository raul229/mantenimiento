from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


TIPOS_FALLA = [
    ('Motor', 1),
    ('Frenos', 2),
    ('Llantas', 3),
    ('Eléctrico', 4),
    ('Suspensión', 5),
    ('Carrocería', 6),
    ('Transmisión', 7),
    ('Otros', 8),
]

TIPOS_SERVICIO = [
    ('Cambio de aceite', 5000, 500, 1),
    ('Filtro de aire', 15000, 1000, 2),
    ('Rotación de llantas', 10000, 800, 3),
    ('Cambio de llantas', 50000, 3000, 4),
    ('Pastillas de freno', 30000, 2000, 5),
    ('Revisión general', 10000, 800, 6),
]


def sembrar(apps, schema_editor):
    TipoFalla = apps.get_model('mantenimiento', 'TipoFalla')
    TipoServicio = apps.get_model('mantenimiento', 'TipoServicio')
    Falla = apps.get_model('mantenimiento', 'Falla')
    Mantenimiento = apps.get_model('mantenimiento', 'Mantenimiento')
    MantenimientoGasto = apps.get_model('mantenimiento', 'MantenimientoGasto')
    Vehiculo = apps.get_model('mantenimiento', 'Vehiculo')
    ServicioVehiculo = apps.get_model('mantenimiento', 'ServicioVehiculo')

    for nombre, orden in TIPOS_FALLA:
        TipoFalla.objects.get_or_create(nombre=nombre, defaults={'orden': orden})
    for nombre, intervalo, alerta, orden in TIPOS_SERVICIO:
        TipoServicio.objects.get_or_create(
            nombre=nombre,
            defaults={'intervalo_km': intervalo, 'alerta_antes_km': alerta, 'orden': orden},
        )

    Falla.objects.filter(estado='pendiente').update(estado='abierta')
    Falla.objects.filter(estado='solucionado').update(estado='reparada')
    Mantenimiento.objects.filter(tipo_mantenimiento='costo_cero').update(tipo_mantenimiento='preventivo')
    Mantenimiento.objects.filter(estado='abierta').update(estado='cerrada')
    for mant in Mantenimiento.objects.exclude(costo__isnull=True).exclude(costo=0):
        if not mant.gastos.exists():
            MantenimientoGasto.objects.create(
                mantenimiento=mant,
                concepto=mant.descripcion or 'Costo de orden',
                categoria='otro',
                monto=mant.costo,
            )
    tipos = list(TipoServicio.objects.all())
    for vehiculo in Vehiculo.objects.all():
        for tipo in tipos:
            ServicioVehiculo.objects.get_or_create(vehiculo=vehiculo, tipo=tipo)


class Migration(migrations.Migration):

    dependencies = [
        ('mantenimiento', '0012_documento_archivo_vehiculo_anio_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='TipoFalla',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=60, unique=True)),
                ('orden', models.PositiveIntegerField(default=0)),
            ],
            options={'ordering': ['orden', 'nombre']},
        ),
        migrations.CreateModel(
            name='TipoServicio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=80, unique=True)),
                ('intervalo_km', models.PositiveIntegerField()),
                ('alerta_antes_km', models.PositiveIntegerField(default=500)),
                ('orden', models.PositiveIntegerField(default=0)),
            ],
            options={'ordering': ['orden', 'nombre']},
        ),
        migrations.AddField(
            model_name='falla',
            name='tipo',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fallas', to='mantenimiento.tipofalla'),
        ),
        migrations.AddField(
            model_name='falla',
            name='kilometraje_reportado',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='falla',
            name='nota_cierre',
            field=models.CharField(blank=True, default='', max_length=160),
        ),
        migrations.AlterField(
            model_name='falla',
            name='vehiculo',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='fallas', to='mantenimiento.vehiculo'),
        ),
        migrations.AlterField(
            model_name='falla',
            name='usuario_reporta',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='fallas_reportadas', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='falla',
            name='estado',
            field=models.CharField(
                choices=[
                    ('abierta', 'Abierta'),
                    ('en_orden', 'En orden'),
                    ('reparada', 'Reparada'),
                    ('no_reparada', 'No reparada'),
                    ('pendiente', 'pendiente'),
                    ('solucionado', 'solucionado'),
                ],
                default='abierta',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='falla',
            name='prioridad',
            field=models.CharField(
                choices=[('critica', 'Crítica'), ('alta', 'Alta'), ('media', 'Media'), ('baja', 'Baja')],
                default='media',
                max_length=20,
            ),
        ),
        migrations.AlterModelOptions(
            name='falla',
            options={'ordering': ['-fecha_reportado', '-id']},
        ),
        migrations.AddField(
            model_name='mantenimiento',
            name='estado',
            field=models.CharField(
                choices=[('abierta', 'Abierta'), ('en_taller', 'En taller'), ('cerrada', 'Cerrada')],
                default='abierta',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='mantenimiento',
            name='kilometraje',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='mantenimiento',
            name='creado_por',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ordenes_taller', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterField(
            model_name='mantenimiento',
            name='tipo_mantenimiento',
            field=models.CharField(
                choices=[('preventivo', 'Preventivo'), ('correctivo', 'Correctivo'), ('costo_cero', 'costo_cero')],
                default='correctivo',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='mantenimiento',
            name='descripcion',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AlterField(
            model_name='mantenimiento',
            name='costo',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AlterModelOptions(
            name='mantenimiento',
            options={'ordering': ['-fecha_inicio', '-id']},
        ),
        migrations.CreateModel(
            name='MantenimientoGasto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('concepto', models.CharField(max_length=120)),
                ('categoria', models.CharField(choices=[('repuesto', 'Repuesto'), ('mano_obra', 'Mano de obra'), ('tercero', 'Tercero'), ('otro', 'Otro')], default='otro', max_length=20)),
                ('monto', models.DecimalField(decimal_places=2, max_digits=10)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('creado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='gastos_taller', to=settings.AUTH_USER_MODEL)),
                ('mantenimiento', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gastos', to='mantenimiento.mantenimiento')),
            ],
            options={'ordering': ['id']},
        ),
        migrations.CreateModel(
            name='ServicioVehiculo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ultimo_km', models.IntegerField(blank=True, null=True)),
                ('ultima_fecha', models.DateField(blank=True, null=True)),
                ('proximo_km', models.IntegerField(blank=True, null=True)),
                ('tipo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='servicios', to='mantenimiento.tiposervicio')),
                ('vehiculo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='servicios', to='mantenimiento.vehiculo')),
            ],
            options={'ordering': ['tipo__orden', 'tipo__nombre'], 'unique_together': {('vehiculo', 'tipo')}},
        ),
        migrations.CreateModel(
            name='HistorialServicio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kilometraje', models.IntegerField()),
                ('fecha', models.DateField(default=django.utils.timezone.now)),
                ('nota', models.CharField(blank=True, default='', max_length=160)),
                ('mantenimiento', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='servicios_hechos', to='mantenimiento.mantenimiento')),
                ('tipo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='historial', to='mantenimiento.tiposervicio')),
                ('vehiculo', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='historial_servicios', to='mantenimiento.vehiculo')),
            ],
            options={'ordering': ['-fecha', '-id']},
        ),
        migrations.CreateModel(
            name='Notificacion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('falla', 'Falla'), ('preventivo', 'Preventivo'), ('taller', 'Taller')], max_length=20)),
                ('titulo', models.CharField(max_length=120)),
                ('mensaje', models.CharField(max_length=240)),
                ('clave', models.CharField(blank=True, default='', max_length=80)),
                ('leida', models.BooleanField(default=False)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notificaciones', to=settings.AUTH_USER_MODEL)),
                ('vehiculo', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='notificaciones', to='mantenimiento.vehiculo')),
            ],
            options={'ordering': ['-creado_en', '-id']},
        ),
        migrations.AddConstraint(
            model_name='notificacion',
            constraint=models.UniqueConstraint(condition=~models.Q(clave=''), fields=('usuario', 'clave'), name='notif_unica_por_clave'),
        ),
        migrations.RunPython(sembrar, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='falla',
            name='estado',
            field=models.CharField(
                choices=[('abierta', 'Abierta'), ('en_orden', 'En orden'), ('reparada', 'Reparada'), ('no_reparada', 'No reparada')],
                default='abierta',
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='mantenimiento',
            name='tipo_mantenimiento',
            field=models.CharField(choices=[('preventivo', 'Preventivo'), ('correctivo', 'Correctivo')], default='correctivo', max_length=20),
        ),
    ]
