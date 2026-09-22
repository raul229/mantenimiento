from django.db import models, transaction
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

    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES, default='privado')
    estado = models.CharField(max_length=12, choices=ESTADO_CHOICES, default='activo')

    @property
    def naturaleza(self):
        if getattr(self, 'empresa', None) is not None:
            return 'empresa'
        if getattr(self, 'persona', None) is not None:
            return 'persona'
        return None

    @property
    def numero_documento(self):
        empresa = getattr(self, 'empresa', None)
        if empresa is not None:
            return empresa.ruc
        persona = getattr(self, 'persona', None)
        if persona is not None:
            return persona.ruc or persona.dni
        return ''

    @property
    def razon_social(self):
        empresa = getattr(self, 'empresa', None)
        if empresa is not None:
            return empresa.razon_social
        persona = getattr(self, 'persona', None)
        if persona is not None:
            return str(persona)
        return ''

    def __str__(self):
        doc = self.numero_documento
        nombre = self.razon_social
        if doc or nombre:
            return f'{doc} {nombre}'.strip()
        return f'Cliente #{self.pk}'


class Empresa(models.Model):
    cliente = models.OneToOneField(Cliente, on_delete=models.CASCADE, related_name='empresa')
    ruc = models.CharField(max_length=11, unique=True)
    razon_social = models.CharField(max_length=80)

    def __str__(self):
        return f'{self.ruc} {self.razon_social}'


class Persona(models.Model):
    nombre = models.CharField(max_length=50)
    apellido_paterno = models.CharField(max_length=50)
    apellido_materno = models.CharField(max_length=50, blank=True, default='')
    cargo = models.CharField(max_length=50, blank=True, default='')
    dni = models.CharField(max_length=8, blank=True, default='')
    ruc = models.CharField(max_length=11, blank=True, default='')
    cliente_propio = models.OneToOneField(
        Cliente, on_delete=models.CASCADE, null=True, blank=True, related_name='persona'
    )
    cliente = models.ForeignKey(
        Cliente, on_delete=models.SET_NULL, null=True, blank=True, related_name='personas'
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['dni'],
                condition=~models.Q(dni=''),
                name='unique_persona_dni',
            ),
            models.UniqueConstraint(
                fields=['ruc'],
                condition=~models.Q(ruc=''),
                name='unique_persona_ruc',
            ),
        ]

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
    sedes = models.ManyToManyField(Sede, related_name='viajes', blank=True)
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

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['viaje', 'sede'], name='unique_recojo_viaje_sede'),
        ]


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


class ConfiguracionEmisor(models.Model):
    """Datos de la empresa transportista y correlativo de sus guías. Registro único."""

    ruc = models.CharField(max_length=11, blank=True, default='')
    razon_social = models.CharField(max_length=120, blank=True, default='')
    nombre_comercial = models.CharField(max_length=120, blank=True, default='')
    direccion = models.CharField(max_length=160, blank=True, default='')
    registro_mtc = models.CharField(max_length=40, blank=True, default='')
    telefono = models.CharField(max_length=40, blank=True, default='')
    serie_guia = models.CharField(max_length=8, default='T001')
    correlativo = models.PositiveIntegerField(default=0)
    destinatario_documento = models.CharField(max_length=11, blank=True, default='')
    destinatario_razon_social = models.CharField(max_length=120, blank=True, default='')
    punto_llegada = models.CharField(max_length=160, blank=True, default='')
    motivo_traslado = models.CharField(max_length=80, default='Traslado de residuos sólidos')

    @classmethod
    def vigente(cls):
        config = cls.objects.first()
        if config is None:
            config = cls.objects.create()
        return config

    def reservar_numero(self):
        """Avanza el correlativo bajo bloqueo y devuelve (serie, numero)."""
        with transaction.atomic():
            actual = ConfiguracionEmisor.objects.select_for_update().get(pk=self.pk)
            actual.correlativo += 1
            actual.save(update_fields=['correlativo'])
            self.correlativo = actual.correlativo
            return actual.serie_guia, actual.correlativo

    def __str__(self):
        return self.razon_social or 'Configuración del emisor'


class GuiaRemision(models.Model):
    """Guía de remisión transportista. Guarda copia de los datos al momento de emitir."""

    ESTADO_CHOICES = (
        ('emitida', 'Emitida'),
        ('anulada', 'Anulada'),
    )

    recojo = models.OneToOneField(Recojo, on_delete=models.CASCADE, related_name='guia')
    serie = models.CharField(max_length=8)
    numero = models.PositiveIntegerField()
    fecha_emision = models.DateField()
    fecha_traslado = models.DateField()
    motivo_traslado = models.CharField(max_length=80, default='Traslado de residuos sólidos')
    estado = models.CharField(max_length=10, choices=ESTADO_CHOICES, default='emitida')

    emisor_ruc = models.CharField(max_length=11, blank=True, default='')
    emisor_razon_social = models.CharField(max_length=120, blank=True, default='')
    emisor_direccion = models.CharField(max_length=160, blank=True, default='')
    emisor_registro_mtc = models.CharField(max_length=40, blank=True, default='')

    remitente_documento = models.CharField(max_length=11, blank=True, default='')
    remitente_razon_social = models.CharField(max_length=120, blank=True, default='')
    destinatario_documento = models.CharField(max_length=11, blank=True, default='')
    destinatario_razon_social = models.CharField(max_length=120, blank=True, default='')

    punto_partida = models.CharField(max_length=160, blank=True, default='')
    punto_llegada = models.CharField(max_length=160, blank=True, default='')

    vehiculo_placa = models.CharField(max_length=50, blank=True, default='')
    vehiculo_marca = models.CharField(max_length=100, blank=True, default='')
    conductor_nombre = models.CharField(max_length=120, blank=True, default='')
    conductor_documento = models.CharField(max_length=15, blank=True, default='')
    conductor_licencia = models.CharField(max_length=20, blank=True, default='')

    peso_total_kg = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    observaciones = models.TextField(blank=True, default='')
    creado_en = models.DateTimeField(auto_now_add=True)
    creado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='guias_emitidas'
    )

    class Meta:
        ordering = ['-fecha_emision', '-numero']
        constraints = [
            models.UniqueConstraint(fields=['serie', 'numero'], name='unique_guia_serie_numero'),
        ]

    @property
    def numero_formateado(self):
        return f'{self.serie}-{self.numero:08d}'

    def __str__(self):
        return self.numero_formateado


class GuiaRemisionItem(models.Model):
    guia = models.ForeignKey(GuiaRemision, on_delete=models.CASCADE, related_name='items')
    descripcion = models.CharField(max_length=120)
    unidad = models.CharField(max_length=10, default='KG')
    cantidad = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f'{self.cantidad} {self.unidad} · {self.descripcion}'
