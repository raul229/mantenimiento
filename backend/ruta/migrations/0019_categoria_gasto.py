from django.db import migrations, models
import django.db.models.deletion


SEMILLA = [
    ('combustible', 'Combustible', 1),
    ('peaje', 'Peaje', 2),
    ('alimentacion', 'Alimentación', 3),
    ('hospedaje', 'Hospedaje', 4),
    ('mantenimiento', 'Mantenimiento', 5),
    ('otros', 'Otros', 6),
]


def sembrar_y_mapear(apps, schema_editor):
    CategoriaGasto = apps.get_model('ruta', 'CategoriaGasto')
    CajaMovimiento = apps.get_model('ruta', 'CajaMovimiento')
    por_codigo = {}
    for codigo, nombre, orden in SEMILLA:
        cat, _ = CategoriaGasto.objects.get_or_create(
            nombre=nombre, defaults={'orden': orden},
        )
        por_codigo[codigo] = cat
    for mov in CajaMovimiento.objects.exclude(categoria_codigo=''):
        mov.categoria = por_codigo.get(mov.categoria_codigo)
        mov.save(update_fields=['categoria'])


class Migration(migrations.Migration):

    dependencies = [
        ('ruta', '0018_caja_viaje'),
    ]

    operations = [
        migrations.CreateModel(
            name='CategoriaGasto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=60, unique=True)),
                ('orden', models.PositiveIntegerField(default=0)),
            ],
            options={'ordering': ['orden', 'nombre']},
        ),
        migrations.RenameField(
            model_name='cajamovimiento',
            old_name='categoria',
            new_name='categoria_codigo',
        ),
        migrations.AddField(
            model_name='cajamovimiento',
            name='categoria',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='movimientos',
                to='ruta.categoriagasto',
            ),
        ),
        migrations.RunPython(sembrar_y_mapear, migrations.RunPython.noop),
        migrations.RemoveField(model_name='cajamovimiento', name='categoria_codigo'),
    ]
