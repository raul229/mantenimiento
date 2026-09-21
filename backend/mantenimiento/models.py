from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Vehiculo(models.Model):
    ESTADOS_CHOICES = (
        ('activo', 'activo'),
        ('mantenimiento', 'mantenimiento'),
        ('inactivo', 'inactivo'),
    )
    TIPO_CHOICES = (
        ('furgon', 'Furgón'),
        ('camion', 'Camión'),
        ('van', 'Van'),
        ('otro', 'Otro'),
    )

    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    placa = models.CharField(max_length=50)
    carga_neta_kg = models.IntegerField(null=True, blank=True)
    estado = models.CharField(max_length=50, choices=ESTADOS_CHOICES, default='activo')
    kilometraje_actual = models.IntegerField(default=0)
    anio = models.IntegerField(null=True, blank=True)
    vin = models.CharField(max_length=32, blank=True, default='')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='furgon')
    foto = models.ImageField(upload_to='vehiculos/', null=True, blank=True)
    nivel_combustible = models.IntegerField(default=0)
    conductor_asignado = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehiculos_asignados'
    )
    proximo_mantenimiento_km = models.IntegerField(null=True, blank=True)

    def estado_operativo(self):
        if self.estado == 'mantenimiento':
            return 'en_taller'
        if self.estado == 'inactivo':
            return 'detenido'
        if self.viajes.filter(estado='en curso').exists():
            return 'en_ruta'
        return 'disponible'

    def __str__(self):
        return f'{self.marca} - {self.placa}'


class Falla(models.Model):
    PRIORIDAD_CHOICES = (
        ('critica', 'critica'),
        ('alta', 'alta'),
        ('media', 'media'),
        ('baja', 'baja'),
    )
    ESTADOS_CHOICES = (
        ('pendiente', 'pendiente'),
        ('solucionado', 'solucionado'),
    )

    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE)
    usuario_reporta = models.ForeignKey(User, on_delete=models.CASCADE)
    estado = models.CharField(max_length=20, choices=ESTADOS_CHOICES, default='pendiente')
    prioridad = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='baja')
    descripcion = models.TextField()
    fecha_reportado = models.DateField(default=timezone.now)
    fecha_solucionado = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.descripcion


class Mantenimiento(models.Model):
    TIPO_MANTENIMIENTO = (
        ('preventivo', 'preventivo'),
        ('correctivo', 'correctivo'),
        ('costo_cero', 'costo_cero'),
    )
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='mantenimientos')
    fallas = models.ManyToManyField(Falla, related_name='mantenimientos', blank=True)
    tipo_mantenimiento = models.CharField(max_length=20, choices=TIPO_MANTENIMIENTO, default='preventivo')
    descripcion = models.TextField()
    costo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fecha_inicio = models.DateField(default=timezone.now)
    fecha_fin = models.DateField(null=True, blank=True)
    proveedor = models.CharField(max_length=50, blank=True, default='')


class Documento(models.Model):
    ENTIDADES_CHOICES = (
        ('user', 'user'),
        ('vehiculo', 'vehiculo'),
        ('cliente', 'cliente'),
    )
    TIPO_DOCUMENTOS_CHOICES = (
        ('certificacion', 'certificacion'),
        ('soat', 'soat'),
        ('licencia', 'licencia'),
        ('seguro', 'seguro'),
        ('contrato', 'contrato'),
        ('manifiesto', 'manifiesto'),
        ('revision_tecnica', 'revision_tecnica'),
    )
    ESTADO_DOCUMENTO_CHOICES = (
        ('activo', 'activo'),
        ('vencido', 'vencido'),
        ('inactivo', 'inactivo'),
    )

    tipo_entidad = models.CharField(max_length=20, choices=ENTIDADES_CHOICES, default='user')
    entidad_id = models.IntegerField()
    tipo_documento = models.CharField(max_length=20, choices=TIPO_DOCUMENTOS_CHOICES, default='certificacion')
    numero_documento = models.CharField(max_length=20, blank=True, default='')
    fecha_emision = models.DateField(null=True, blank=True)
    fecha_vencimiento = models.DateField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_DOCUMENTO_CHOICES, default='activo')
    archivo = models.FileField(upload_to='documentos/', null=True, blank=True)
