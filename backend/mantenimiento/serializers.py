from rest_framework import serializers
from rest_framework.fields import DateField, DecimalField
from django.contrib.auth.models import User
from .models import (
    Documento, Falla, HistorialServicio, Mantenimiento, MantenimientoGasto,
    Notificacion, ServicioVehiculo, TipoFalla, TipoServicio, Vehiculo,
)
from . import services


class OptionalDateField(DateField):
    def to_internal_value(self, value):
        if value == "" or value is None:
            return None
        return super().to_internal_value(value)


class OptionalDecimalField(DecimalField):
    def to_internal_value(self, data):
        if data == "" or data is None:
            return None
        return super().to_internal_value(data)


class UserMiniSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'nombre')

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class VehiculoSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ('id', 'marca', 'modelo', 'placa')


class TipoFallaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoFalla
        fields = ('id', 'nombre', 'orden')

    def validate_nombre(self, value):
        nombre = (value or '').strip()
        if not nombre:
            raise serializers.ValidationError('Indica el nombre.')
        qs = TipoFalla.objects.filter(nombre__iexact=nombre)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe ese tipo.')
        return nombre


class TipoServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = ('id', 'nombre', 'intervalo_km', 'alerta_antes_km', 'orden')

    def validate_nombre(self, value):
        nombre = (value or '').strip()
        if not nombre:
            raise serializers.ValidationError('Indica el nombre.')
        return nombre

    def validate_intervalo_km(self, value):
        if not value or value <= 0:
            raise serializers.ValidationError('Indica cada cuántos km se hace.')
        return value


class VehiculoSerializer(serializers.ModelSerializer):
    conductor_asignado_data = UserMiniSerializer(source='conductor_asignado', read_only=True)
    estado_operativo = serializers.SerializerMethodField()
    foto_url = serializers.SerializerMethodField()
    fallas_abiertas = serializers.IntegerField(read_only=True, default=0)
    preventivos = serializers.SerializerMethodField()

    class Meta:
        model = Vehiculo
        fields = '__all__'

    def get_estado_operativo(self, obj):
        return obj.estado_operativo()

    def get_foto_url(self, obj):
        if not obj.foto:
            return None
        request = self.context.get('request')
        url = obj.foto.url
        return request.build_absolute_uri(url) if request else url

    def get_preventivos(self, obj):
        if hasattr(obj, '_preventivos'):
            return obj._preventivos
        return services.alertas_de(obj)


class FallaSerializer(serializers.ModelSerializer):
    fecha_solucionado = OptionalDateField(allow_null=True, required=False)
    vehiculo = VehiculoSimpleSerializer(read_only=True)
    vehiculo_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehiculo.objects.all(),
        source='vehiculo',
        write_only=True,
    )
    tipo_id = serializers.PrimaryKeyRelatedField(
        queryset=TipoFalla.objects.all(),
        source='tipo',
        required=False,
        allow_null=True,
    )
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True, default=None)
    prioridad_label = serializers.CharField(source='get_prioridad_display', read_only=True)
    estado_label = serializers.CharField(source='get_estado_display', read_only=True)
    reportado_por = serializers.SerializerMethodField()

    class Meta:
        model = Falla
        fields = (
            'id', 'vehiculo', 'vehiculo_id', 'tipo', 'tipo_id', 'tipo_nombre',
            'estado', 'estado_label', 'prioridad', 'prioridad_label', 'descripcion',
            'kilometraje_reportado', 'fecha_reportado', 'fecha_solucionado',
            'nota_cierre', 'usuario_reporta', 'reportado_por',
        )
        read_only_fields = ('usuario_reporta', 'kilometraje_reportado', 'estado')

    def get_reportado_por(self, obj):
        if not obj.usuario_reporta:
            return None
        return obj.usuario_reporta.get_full_name() or obj.usuario_reporta.username


class FallaSimpleSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True, default=None)
    estado_label = serializers.CharField(source='get_estado_display', read_only=True)
    prioridad_label = serializers.CharField(source='get_prioridad_display', read_only=True)

    class Meta:
        model = Falla
        fields = (
            'id', 'descripcion', 'prioridad', 'prioridad_label', 'estado', 'estado_label',
            'tipo_nombre', 'nota_cierre',
        )


class DocumentoSerializer(serializers.ModelSerializer):
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = Documento
        fields = '__all__'

    def get_archivo_url(self, obj):
        if not obj.archivo:
            return None
        request = self.context.get('request')
        url = obj.archivo.url
        return request.build_absolute_uri(url) if request else url


class MantenimientoGastoSerializer(serializers.ModelSerializer):
    categoria_label = serializers.CharField(source='get_categoria_display', read_only=True)

    class Meta:
        model = MantenimientoGasto
        fields = ('id', 'concepto', 'categoria', 'categoria_label', 'monto', 'creado_en')


class HistorialServicioSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True)

    class Meta:
        model = HistorialServicio
        fields = ('id', 'tipo', 'tipo_nombre', 'kilometraje', 'fecha', 'nota', 'mantenimiento')


class ServicioVehiculoSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True)
    intervalo_km = serializers.IntegerField(source='tipo.intervalo_km', read_only=True)
    alerta_antes_km = serializers.IntegerField(source='tipo.alerta_antes_km', read_only=True)
    vehiculo = VehiculoSimpleSerializer(read_only=True)
    estado = serializers.SerializerMethodField()
    faltan_km = serializers.SerializerMethodField()

    class Meta:
        model = ServicioVehiculo
        fields = (
            'id', 'vehiculo', 'tipo', 'tipo_nombre', 'intervalo_km', 'alerta_antes_km',
            'ultimo_km', 'ultima_fecha', 'proximo_km', 'faltan_km', 'estado',
        )

    def get_estado(self, obj):
        return services._estado_servicio(obj, obj.vehiculo.kilometraje_actual or 0)

    def get_faltan_km(self, obj):
        if obj.proximo_km is None:
            return None
        return obj.proximo_km - (obj.vehiculo.kilometraje_actual or 0)


class MantenimientoSerializer(serializers.ModelSerializer):
    fecha_fin = OptionalDateField(allow_null=True, required=False)
    costo = OptionalDecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    vehiculo = VehiculoSimpleSerializer(read_only=True)
    vehiculo_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehiculo.objects.all(),
        source='vehiculo',
        write_only=True,
    )
    fallas = FallaSimpleSerializer(many=True, read_only=True)
    fallas_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Falla.objects.all(),
        write_only=True,
        source='fallas',
        required=False,
    )
    gastos = MantenimientoGastoSerializer(many=True, read_only=True)
    tipo_label = serializers.CharField(source='get_tipo_mantenimiento_display', read_only=True)
    estado_label = serializers.CharField(source='get_estado_display', read_only=True)

    class Meta:
        model = Mantenimiento
        fields = (
            'id', 'vehiculo', 'vehiculo_id', 'fallas', 'fallas_ids',
            'tipo_mantenimiento', 'tipo_label', 'estado', 'estado_label',
            'descripcion', 'costo', 'kilometraje', 'fecha_inicio', 'fecha_fin',
            'proveedor', 'gastos', 'creado_por',
        )
        read_only_fields = ('estado', 'costo', 'creado_por')


class NotificacionSerializer(serializers.ModelSerializer):
    vehiculo = VehiculoSimpleSerializer(read_only=True)

    class Meta:
        model = Notificacion
        fields = ('id', 'tipo', 'titulo', 'mensaje', 'leida', 'vehiculo', 'creado_en')
