from django.db import migrations, models
import django.db.models.deletion


def pasar_documentos_a_empresa_o_persona(apps, schema_editor):
    Cliente = apps.get_model('ruta', 'Cliente')
    Empresa = apps.get_model('ruta', 'Empresa')
    Persona = apps.get_model('ruta', 'Persona')

    for cliente in Cliente.objects.all():
        doc = ''.join(ch for ch in str(cliente.numero_documento or '') if ch.isdigit())
        nombre = (cliente.razon_social or '').strip() or f'Cliente {cliente.pk}'
        if len(doc) == 11 and doc.startswith('20'):
            Empresa.objects.create(cliente=cliente, ruc=doc, razon_social=nombre[:80])
            continue
        partes = nombre.split()
        Persona.objects.create(
            cliente_propio=cliente,
            cliente=cliente,
            nombre=partes[0] if partes else 'Cliente',
            apellido_paterno=partes[1] if len(partes) > 1 else '-',
            apellido_materno=' '.join(partes[2:]) if len(partes) > 2 else '',
            ruc=doc if len(doc) == 11 else '',
            dni=doc if len(doc) == 8 else '',
        )


class Migration(migrations.Migration):

    dependencies = [
        ('ruta', '0012_viaje_sedes_recojo_unico'),
    ]

    operations = [
        migrations.CreateModel(
            name='Empresa',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ruc', models.CharField(max_length=11, unique=True)),
                ('razon_social', models.CharField(max_length=80)),
                ('cliente', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='empresa',
                    to='ruta.cliente',
                )),
            ],
        ),
        migrations.AddField(
            model_name='persona',
            name='dni',
            field=models.CharField(blank=True, default='', max_length=8),
        ),
        migrations.AddField(
            model_name='persona',
            name='ruc',
            field=models.CharField(blank=True, default='', max_length=11),
        ),
        migrations.AddField(
            model_name='persona',
            name='cliente_propio',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='persona',
                to='ruta.cliente',
            ),
        ),
        migrations.AddConstraint(
            model_name='persona',
            constraint=models.UniqueConstraint(
                condition=~models.Q(dni=''),
                fields=('dni',),
                name='unique_persona_dni',
            ),
        ),
        migrations.AddConstraint(
            model_name='persona',
            constraint=models.UniqueConstraint(
                condition=~models.Q(ruc=''),
                fields=('ruc',),
                name='unique_persona_ruc',
            ),
        ),
        migrations.RunPython(pasar_documentos_a_empresa_o_persona, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='cliente',
            name='numero_documento',
        ),
        migrations.RemoveField(
            model_name='cliente',
            name='razon_social',
        ),
    ]
