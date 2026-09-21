from django.db import models
from django.contrib.auth.models import User
from mantenimiento.models import Vehiculo


class Ciudad(models.Model):
    nombre = models.CharField(max_length=50)
    distrito = models.CharField(max_length=50, null=True, blank=True)
    departamento = models.CharField(max_length=50, null=True, blank=True)

    def __str__(self):
        return self.nombre


class Cliente(models.Model):
    TIPO_CHOICES = (
        ('publico', 'Público'),
        ('privado', 'Privado'),
    )
    ESTADO_CHOICES = (
        ('activo', 'Activo'),
        ('suspendido', 'Suspendido'),
    )

    numero_documento = models.CharField(max_length=11, unique=True)
    razon_social = models.CharField(max_length=50)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='privado')
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default='activo')

    def __str__(self):
        return f'{self.numero_documento} {self.razon_social}'


class Persona(models.Model):
    nombre = models.CharField(max_length=50)
    apellido_paterno = models.CharField(max_length=50)
    apellido_materno = models.CharField(max_length=50, blank=True, default='')
    cargo = models.CharField(max_length=50, blank=True, default='')
    cliente = models.ForeignKey(
        Cliente, on_delete=models.SET_NULL, null=True, blank=True, related_name='personas'
    )

    def __str__(self):
        return f'{self.nombre} {self.apellido_paterno}'


class Celular(models.Model):
    numero = models.CharField(max_length=9, unique=True)
    persona = models.ForeignKey(
        Persona, on_delete=models.SET_NULL, null=True, blank=True, related_name='celulares'
    )


class Sede(models.Model):
    nombre = models.CharField(max_length=50)
    cliente = models.ForeignKey(Cliente, on_delete=models.SET_NULL, null=True, related_name='sedes')
    direccion = models.CharField(max_length=100)
    coordenadas = models.CharField(max_length=100, blank=True, default='')
    ciudad = models.ForeignKey(Ciudad, on_delete=models.SET_NULL, null=True)
    persona = models.ForeignKey(Persona, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        ciudad = self.ciudad.nombre if self.ciudad else ''
        return f'{self.nombre} - {self.direccion} - {ciudad}'


class Ruta(models.Model):
    nombre = models.CharField(max_length=50)
    descripcion = models.TextField(blank=True, default='')
    sedes = models.ManyToManyField(Sede, related_name='rutas', blank=True)


class Viaje(models.Model):
    ESTADO_VIAJE_CHOICES = (
        ('programado', 'programado'),
        ('en curso', 'en curso'),
        ('completado', 'completado'),
        ('cancelado', 'cancelado'),
    )
    vehiculo = models.ForeignKey(
        Vehiculo, on_delete=models.SET_NULL, null=True, related_name='viajes'
    )
    conductor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='viajes'
    )
    ruta = models.ForeignKey(Ruta, on_delete=models.SET_NULL, null=True, related_name='viajes')
    kilometraje_inicio = models.IntegerField(null=True, blank=True)
    kilometraje_final = models.IntegerField(null=True, blank=True)
    estado = models.CharField(max_length=15, choices=ESTADO_VIAJE_CHOICES, default='programado')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(null=True, blank=True)
    hora_salida = models.TimeField(null=True, blank=True)
    hora_retorno_est = models.TimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True, default='')

    def save(self, *args, **kwargs):
        if self._state.adding and self.vehiculo and self.kilometraje_inicio is None:
            self.kilometraje_inicio = self.vehiculo.kilometraje_actual or 0
        super().save(*args, **kwargs)

        if self.kilometraje_final and self.vehiculo:
            if self.kilometraje_final > (self.vehiculo.kilometraje_actual or 0):
                self.vehiculo.kilometraje_actual = self.kilometraje_final
                self.vehiculo.save()


class Recojo(models.Model):
    ESTADO_CHOICES = (
        ('pendiente', 'pendiente'),
        ('en_sitio', 'en_sitio'),
        ('completado', 'completado'),
    )
    viaje = models.ForeignKey(Viaje, on_delete=models.SET_NULL, null=True, related_name='recojos')
    sede = models.ForeignKey(Sede, on_delete=models.SET_NULL, null=True, related_name='recojos')
    peso_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fecha = models.DateField()
    hora = models.TimeField(null=True, blank=True)
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default='pendiente')
    observaciones = models.TextField(blank=True, default='')


class TipoResiduo(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=80)
    color = models.CharField(max_length=16, default='#14b8a6')
    orden = models.IntegerField(default=0)

    class Meta:
        ordering = ['orden', 'id']

    def __str__(self):
        return self.nombre


class RecojoDetalle(models.Model):
    recojo = models.ForeignKey(Recojo, on_delete=models.CASCADE, related_name='detalles')
    tipo = models.ForeignKey(TipoResiduo, on_delete=models.CASCADE, related_name='detalles')
    peso_kg = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('recojo', 'tipo')


class ViajeGasto(models.Model):
    TIPO_CHOICES = (
        ('combustible', 'Combustible'),
        ('peaje', 'Peaje'),
        ('caja_chica', 'Caja chica'),
    )
    viaje = models.ForeignKey(Viaje, on_delete=models.CASCADE, related_name='gastos')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    descripcion = models.CharField(max_length=120, blank=True, default='')
