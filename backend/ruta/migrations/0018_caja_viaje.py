from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


CATEGORIA_LEGADA = {
    'combustible': 'combustible',
    'peaje': 'peaje',
    'caja_chica': 'otros',
}


def copiar_gastos(apps, schema_editor):
    ViajeGasto = apps.get_model('ruta', 'ViajeGasto')
    CajaViaje = apps.get_model('ruta', 'CajaViaje')
    CajaMovimiento = apps.get_model('ruta', 'CajaMovimiento')
    por_viaje = {}
    for gasto in ViajeGasto.objects.all().order_by('id'):
        caja = por_viaje.get(gasto.viaje_id)
        if caja is None:
            caja, _ = CajaViaje.objects.get_or_create(viaje_id=gasto.viaje_id)
            por_viaje[gasto.viaje_id] = caja
        CajaMovimiento.objects.create(
            caja=caja,
            tipo='gasto',
            categoria=CATEGORIA_LEGADA.get(gasto.tipo, 'otros'),
            monto=gasto.monto,
            descripcion=gasto.descripcion or gasto.tipo,
        )


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('ruta', '0017_un_viaje_abierto_por_vehiculo'),
    ]

    operations = [
        migrations.CreateModel(
            name='CajaViaje',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('estado', models.CharField(choices=[('abierta', 'Abierta'), ('cerrada', 'Cerrada')], default='abierta', max_length=10)),
                ('cerrado_en', models.DateTimeField(blank=True, null=True)),
                ('observacion_cierre', models.TextField(blank=True, default='')),
                ('saldo_devuelto', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('cerrado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cajas_cerradas', to=settings.AUTH_USER_MODEL)),
                ('viaje', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='caja', to='ruta.viaje')),
            ],
        ),
        migrations.CreateModel(
            name='CajaMovimiento',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(choices=[('asignacion', 'Asignación'), ('aumento', 'Aumento'), ('gasto', 'Gasto')], max_length=12)),
                ('categoria', models.CharField(blank=True, choices=[('combustible', 'Combustible'), ('peaje', 'Peaje'), ('alimentacion', 'Alimentación'), ('hospedaje', 'Hospedaje'), ('mantenimiento', 'Mantenimiento'), ('otros', 'Otros')], default='', max_length=20)),
                ('monto', models.DecimalField(decimal_places=2, max_digits=10)),
                ('descripcion', models.CharField(blank=True, default='', max_length=160)),
                ('creado_en', models.DateTimeField(auto_now_add=True)),
                ('caja', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='movimientos', to='ruta.cajaviaje')),
                ('creado_por', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='movimientos_caja', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['creado_en', 'id']},
        ),
        migrations.RunPython(copiar_gastos, migrations.RunPython.noop),
    ]
