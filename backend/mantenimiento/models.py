from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Vehiculo(models.Model):
    ESTADOS_CHOICES = (
        ('activo', 'activo'),
        ('mantenimiento', 'mantenimiento'),
        ('inactivo', 'inactivo'),
    )

    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    placa = models.CharField(max_length=50)
    carga_neta_kg = models.IntegerField(null=True, blank=True)
    estado =models.CharField(max_length=50, choices=ESTADOS_CHOICES, default='activo')
    kilometraje_actual=models.IntegerField(default=0)

    def __str__(self):
        return f'{self.marca} - {self.placa}'

class Falla(models.Model):#registro de fallas reportadas por los usuarios

    PRIORIDAD_CHOICES = (
       ( 'critica', 'critica'),
       ( 'alta', 'alta'),
       ( 'media', 'media'),
       ('baja', 'baja')
    )
    ESTADOS_CHOICES = (
        ('pendiente', 'pendiente'),
        ('solucionado', 'solucionado')
    )

    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE)
    usuario_reporta = models.ForeignKey(User, on_delete=models.CASCADE )
    estado = models.CharField(max_length=20, choices=ESTADOS_CHOICES, default='pendiente')
    # Por defecto en nuevas fallas la prioridad debe ser 'baja'
    prioridad = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default='baja')
    descripcion = models.TextField()#tipode falla  catalo de fallas / 
    # Por defecto tomar la fecha actual cuando se crea la falla
    fecha_reportado = models.DateField(default=timezone.now)
    fecha_solucionado = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.descripcion
    
class Mantenimiento(models.Model):
    TIPO_MANTENIMIENTO = (
        ('preventivo', 'preventivo'),
        ('correctivo', 'correctivo'),
        ('costo_cero', 'costo_cero')
    )
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name="mantenimientos")
    fallas=models.ManyToManyField(Falla, related_name='mantenimientos')
    tipo_mantenimiento = models.CharField(max_length=20, choices=TIPO_MANTENIMIENTO, default='preventivo')
    descripcion = models.TextField()
    # Permitimos crear mantenimientos sin costo ni fecha_fin
    costo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fecha_inicio = models.DateField(default=timezone.now)
    fecha_fin = models.DateField(null=True, blank=True)
    proveedor = models.CharField(max_length=50)#posible tabla en el futuro
    #id uusuario que realizo el mantenimiento
    #tipo de mantenimientos 
    
    

class Documento(models.Model):
    ENTIDADES_CHOICES = (
        ('user', 'user'),
        ('vehiculo', 'vehiculo')
    )
    TIPO_DOCUMENTOS_CHOICES = (
        ('certificacion', 'certificacion'),
        ('soat', 'soat'),
        ('licencia', 'licencia'),
        ('seguro', 'seguro')
    )
    ESTADO_DOCUMENTO_CHOICES = (
       ( 'activo', 'activo'),
       ( 'vencido', 'vencido'),
       ( 'inactivo', 'inactivo')
    )

    tipo_entidad = models.CharField(max_length=20, choices=ENTIDADES_CHOICES, default='user')
    entidad_id = models.IntegerField(blank=False, null=False)
    tipo_documento = models.CharField(max_length=20, choices=TIPO_DOCUMENTOS_CHOICES, default='certificacion')
    numero_documento = models.CharField(max_length=20)
    fecha_emision = models.DateField()
    fecha_vencimiento = models.DateField()
    estado=models.CharField(max_length=20, choices=ESTADO_DOCUMENTO_CHOICES, default='activo')
