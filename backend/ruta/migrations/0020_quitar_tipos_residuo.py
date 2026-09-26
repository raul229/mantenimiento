from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('ruta', '0019_categoria_gasto'),
    ]

    operations = [
        migrations.DeleteModel(name='RecojoDetalle'),
        migrations.DeleteModel(name='TipoResiduo'),
    ]
