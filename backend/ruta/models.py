from django.db import models
from mantenimiento.models import Vehiculo
from  django.contrib.auth.models import User


class Ciudad(models.Model):
    nombre = models.CharField(max_length=50)
    distrito = models.CharField(max_length=50, null=True, blank=True)
    departamento = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return self.nombre


class Celular(models.Model):
    numero= models.CharField(max_length=9)

class Persona(models.Model):
    nombre = models.CharField(max_length=50)
    apellido_paterno = models.CharField(max_length=50)
    apellido_materno = models.CharField(max_length=50)
    cargo=models.CharField(max_length=50)
    celular= models.ForeignKey(Celular, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f'{self.nombre} {self.apellido_paterno}'

class Cliente (models.Model):
    numero_documento= models.CharField(max_length=11,)
    razon_social  = models.CharField(max_length=50)
    persona = models.ForeignKey(Persona, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f'{self.numero_documento} {self.razon_social}'

class Sede(models.Model):
    nombre = models.CharField(max_length=50)
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True)
    direccion = models.CharField(max_length=100)
    coordenadas = models.CharField(max_length=100) # por el moento hasta que  implementemos la cootdenada
    ciudad = models.ForeignKey(Ciudad, on_delete=models.SET_NULL, null=True)
    persona = models.ForeignKey(Persona, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f'{self.nombre} - {self.direccion} - {self.ciudad.departamento}'



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
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.SET_NULL, null=True)
    conductor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    ruta=models.ForeignKey(Ruta, on_delete=models.SET_NULL, null=True)
    kilometraje_inicio = models.IntegerField()
    kilometraje_final = models.IntegerField()
    estado = models.CharField(max_length=15, choices=ESTADO_VIAJE_CHOICES)
    fecha_inicio= models.DateField()
    fecha_fin= models.DateField()
    observaciones= models.TextField()

class Recojo(models.Model):
    viaje = models.ForeignKey(Viaje, on_delete=models.SET_NULL, null=True)
    sede = models.ForeignKey(Sede, on_delete=models.SET_NULL, null=True)
    peso_kg = models.DecimalField(max_digits=10, decimal_places=2)
    fecha = models.DateField()
    observaciones= models.TextField()

