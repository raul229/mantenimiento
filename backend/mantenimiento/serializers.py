from rest_framework import serializers
from rest_framework.fields import DateField, DecimalField
from django.contrib.auth.models import User
from .models import Vehiculo, Falla, Documento, Mantenimiento


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


class VehiculoSerializer(serializers.ModelSerializer):
    conductor_asignado_data = UserMiniSerializer(source='conductor_asignado', read_only=True)
    estado_operativo = serializers.SerializerMethodField()
    foto_url = serializers.SerializerMethodField()

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


class FallaSerializer(serializers.ModelSerializer):
    fecha_solucionado = OptionalDateField(allow_null=True, required=False)
    vehiculo = VehiculoSimpleSerializer(read_only=True)
    vehiculo_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehiculo.objects.all(),
        source='vehiculo',
        write_only=True,
    )

    class Meta:
        model = Falla
        fields = '__all__'

    def validate(self, data):
        if data.get('fecha_solucionado') == '':
            data['fecha_solucionado'] = None
        estado = data.get('estado')
        fecha_sol = data.get('fecha_solucionado')
        if estado == 'solucionado' and not fecha_sol:
            raise serializers.ValidationError({
                'fecha_solucionado': 'Fecha de solucionado es requerida cuando el estado es solucionado.',
            })
        return data


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


class FallaSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Falla
        fields = ('id', 'descripcion')


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

    class Meta:
        model = Mantenimiento
        fields = '__all__'
