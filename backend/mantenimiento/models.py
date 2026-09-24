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
        if self.viajes.exclude(estado='cancelado').filter(kilometraje_final__isnull=True).exists():
            return 'en_ruta'
        return 'disponible'

    def __str__(self):
        return f'{self.marca} - {self.placa}'


class TipoFalla(models.Model):
    nombre = models.CharField(max_length=60, unique=True)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class Falla(models.Model):
    CRITICA = 'critica'
    ALTA = 'alta'
    MEDIA = 'media'
    BAJA = 'baja'
    PRIORIDAD_CHOICES = (
        (CRITICA, 'Crítica'),
        (ALTA, 'Alta'),
        (MEDIA, 'Media'),
        (BAJA, 'Baja'),
    )
    ABIERTA = 'abierta'
    EN_ORDEN = 'en_orden'
    REPARADA = 'reparada'
    NO_REPARADA = 'no_reparada'
    ESTADOS_CHOICES = (
        (ABIERTA, 'Abierta'),
        (EN_ORDEN, 'En orden'),
        (REPARADA, 'Reparada'),
        (NO_REPARADA, 'No reparada'),
    )

    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='fallas')
    usuario_reporta = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='fallas_reportadas',
    )
    tipo = models.ForeignKey(
        TipoFalla, on_delete=models.SET_NULL, null=True, blank=True, related_name='fallas',
    )
    estado = models.CharField(max_length=20, choices=ESTADOS_CHOICES, default=ABIERTA)
    prioridad = models.CharField(max_length=20, choices=PRIORIDAD_CHOICES, default=MEDIA)
    descripcion = models.TextField()
    kilometraje_reportado = models.IntegerField(null=True, blank=True)
    fecha_reportado = models.DateField(default=timezone.now)
    fecha_solucionado = models.DateField(null=True, blank=True)
    nota_cierre = models.CharField(max_length=160, blank=True, default='')

    class Meta:
        ordering = ['-fecha_reportado', '-id']

    def __str__(self):
        return self.descripcion


class Mantenimiento(models.Model):
    PREVENTIVO = 'preventivo'
    CORRECTIVO = 'correctivo'
    TIPO_MANTENIMIENTO = (
        (PREVENTIVO, 'Preventivo'),
        (CORRECTIVO, 'Correctivo'),
    )
    ABIERTA = 'abierta'
    EN_TALLER = 'en_taller'
    CERRADA = 'cerrada'
    ESTADO_CHOICES = (
        (ABIERTA, 'Abierta'),
        (EN_TALLER, 'En taller'),
        (CERRADA, 'Cerrada'),
    )

    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='mantenimientos')
    fallas = models.ManyToManyField(Falla, related_name='mantenimientos', blank=True)
    tipo_mantenimiento = models.CharField(max_length=20, choices=TIPO_MANTENIMIENTO, default=CORRECTIVO)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=ABIERTA)
    descripcion = models.TextField(blank=True, default='')
    costo = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    kilometraje = models.IntegerField(null=True, blank=True)
    fecha_inicio = models.DateField(default=timezone.now)
    fecha_fin = models.DateField(null=True, blank=True)
    proveedor = models.CharField(max_length=50, blank=True, default='')
    creado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='ordenes_taller',
    )

    class Meta:
        ordering = ['-fecha_inicio', '-id']

    def __str__(self):
        return f'{self.get_tipo_mantenimiento_display()} {self.vehiculo.placa}'


class MantenimientoGasto(models.Model):
    REPUESTO = 'repuesto'
    MANO_OBRA = 'mano_obra'
    TERCERO = 'tercero'
    OTRO = 'otro'
    CATEGORIA_CHOICES = (
        (REPUESTO, 'Repuesto'),
        (MANO_OBRA, 'Mano de obra'),
        (TERCERO, 'Tercero'),
        (OTRO, 'Otro'),
    )

    mantenimiento = models.ForeignKey(Mantenimiento, on_delete=models.CASCADE, related_name='gastos')
    concepto = models.CharField(max_length=120)
    categoria = models.CharField(max_length=20, choices=CATEGORIA_CHOICES, default=OTRO)
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    creado_por = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name='gastos_taller',
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']


class TipoServicio(models.Model):
    nombre = models.CharField(max_length=80, unique=True)
    intervalo_km = models.PositiveIntegerField()
    alerta_antes_km = models.PositiveIntegerField(default=500)
    orden = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class ServicioVehiculo(models.Model):
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='servicios')
    tipo = models.ForeignKey(TipoServicio, on_delete=models.CASCADE, related_name='servicios')
    ultimo_km = models.IntegerField(null=True, blank=True)
    ultima_fecha = models.DateField(null=True, blank=True)
    proximo_km = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('vehiculo', 'tipo')
        ordering = ['tipo__orden', 'tipo__nombre']


class HistorialServicio(models.Model):
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='historial_servicios')
    tipo = models.ForeignKey(TipoServicio, on_delete=models.CASCADE, related_name='historial')
    mantenimiento = models.ForeignKey(
        Mantenimiento, on_delete=models.SET_NULL, null=True, blank=True, related_name='servicios_hechos',
    )
    kilometraje = models.IntegerField()
    fecha = models.DateField(default=timezone.now)
    nota = models.CharField(max_length=160, blank=True, default='')

    class Meta:
        ordering = ['-fecha', '-id']


class Notificacion(models.Model):
    FALLA = 'falla'
    PREVENTIVO = 'preventivo'
    TALLER = 'taller'
    TIPO_CHOICES = (
        (FALLA, 'Falla'),
        (PREVENTIVO, 'Preventivo'),
        (TALLER, 'Taller'),
    )

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    titulo = models.CharField(max_length=120)
    mensaje = models.CharField(max_length=240)
    clave = models.CharField(max_length=80, blank=True, default='')
    leida = models.BooleanField(default=False)
    vehiculo = models.ForeignKey(
        Vehiculo, on_delete=models.CASCADE, null=True, blank=True, related_name='notificaciones',
    )
    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-creado_en', '-id']
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'clave'],
                condition=~models.Q(clave=''),
                name='notif_unica_por_clave',
            ),
        ]


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
