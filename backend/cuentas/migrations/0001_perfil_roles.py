from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def crear_perfiles(apps, schema_editor):
    User = apps.get_model(settings.AUTH_USER_MODEL)
    Perfil = apps.get_model('cuentas', 'Perfil')
    for user in User.objects.all():
        rol = 'administrador' if user.is_superuser else 'operaciones'
        Perfil.objects.get_or_create(user=user, defaults={'rol': rol})


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Perfil',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rol', models.CharField(choices=[('administrador', 'Administrador'), ('operaciones', 'Operaciones'), ('conductor', 'Conductor')], default='operaciones', max_length=20)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='perfil', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.RunPython(crear_perfiles, migrations.RunPython.noop),
    ]
