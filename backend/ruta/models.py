from django.db import models
from mantenimiento.models import Vehiculo
from  django.contrib.auth.models import User


class Ciudad(models.Model):
    nombre = models.CharField(max_length=50)
    departamento = models.CharField(max_length=50)

class Cliente (models.Model):
    numero_documento= models.CharField(max_length=11)
    nombres  = models.CharField(max_length=50)
    apellidos = models.CharField(max_length=50, null=True, blank=True)
    contacto = models.CharField(max_length=9)

class Sede(models.Model):
    nombre = models.CharField(max_length=50)
    cliente = models.ForeignKey(Cliente, on_delete=models.CASCADE)
    direccion = models.CharField(max_length=100)
    coordenadas = models.CharField(max_length=100) # por el moento hasta que  implementemos la cootdenada
    ciudad = models.ForeignKey(Ciudad, on_delete=models.CASCADE)
    contacto = models.CharField(max_length=9)

class Ruta(models.Model):
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField()
    sedes =models.ManyToManyField(Sede, related_name='rutas')

class Viaje(models.Model):
    ESTADO_VIAJE_CHOICES =(
        ('programado','programado'),
        ('en curso','en curso'),
        ('completado','completado'),
        ('cancelado','cancelado'),
    )
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE)
    conductor = models.ForeignKey(User, on_delete=models.CASCADE)
    ruta=models.ForeignKey(Ruta, on_delete=models.CASCADE)
    kilometraje_inicio = models.IntegerField()
    kilometraje_final = models.IntegerField()
    estado = models.CharField(max_length=15, choices=ESTADO_VIAJE_CHOICES)
    fecha_inicio= models.DateField()
    fecha_fin= models.DateField()
    observaciones= models.TextField()

class Recojo(models.Model):
    viaje = models.ForeignKey(Viaje, on_delete=models.CASCADE)
    sede = models.ForeignKey(Sede, on_delete=models.CASCADE)
    peso_kg = models.DecimalField(max_digits=10, decimal_places=2)
    fecha = models.DateField()
    observaciones= models.TextField()

