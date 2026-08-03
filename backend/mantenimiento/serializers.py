from rest_framework import  serializers
from rest_framework.fields import DateField
from rest_framework.fields import DecimalField


class OptionalDateField(DateField):
    """DateField that treats empty string as None to avoid format errors when '' is sent."""
    def to_internal_value(self, value):
        if value == "" or value is None:
            return None
        return super().to_internal_value(value)
from .models import Vehiculo, Falla, Documento, Mantenimiento

class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = '__all__'

class FallaSerializer(serializers.ModelSerializer):
    # fecha_solucionado: opcional, permitir null/blank en input
    fecha_solucionado = OptionalDateField(allow_null=True, required=False)

    class Meta:
        model= Falla
        fields = '__all__'

    def validate(self, data):
        # Normalizar strings vacíos a None para fechas
        if 'fecha_solucionado' in data and data.get('fecha_solucionado') == '':
            data['fecha_solucionado'] = None

        estado = data.get('estado', None)
        fecha_sol = data.get('fecha_solucionado', None)

        # Si la falla está pendiente, fecha_solucionado puede ser None
        if estado == 'pendiente' and fecha_sol is not None:
            # permitir, pero es extraño: no bloquear
            pass

        # Si la falla está solucionada, fecha_solucionado es requerida
        if estado == 'solucionado' and not fecha_sol:
            raise serializers.ValidationError({
                'fecha_solucionado': 'Fecha de solucionado es requerida cuando el estado es solucionado.'
            })

        return data

class DocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Documento
        fields = '__all__'
        
class VehiculoSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = ( "id", "marca", "placa")
        
class FallaSimpleSerializer(serializers.ModelSerializer):

    class Meta:
        model= Falla
        fields = ("descripcion",)


class MantenimientoSerializer(serializers.ModelSerializer):
    # Campos opcionales que aceptan cadena vacía
    fecha_fin = OptionalDateField(allow_null=True, required=False)

    class OptionalDecimalField(DecimalField):
        def to_internal_value(self, data):
            if data == "" or data is None:
                return None
            return super().to_internal_value(data)

    costo = OptionalDecimalField(max_digits=10, decimal_places=2, required=False,allow_null=True)
    
    vehiculo = VehiculoSimpleSerializer(read_only=True)
    vehiculo_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehiculo.objects.all(),
        source='vehiculo',  # Esto indica que se asignará a la relación 'vehiculo' del modelo
        write_only=True
    )
    fallas = FallaSimpleSerializer(many=True, read_only=True)
    fallas_ids= serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Falla.objects.all(),
        write_only=True,
        #source='fallas' # Esto indica que se asignará a la relación 'fallas' del modelo
    )

    class Meta:
        model = Mantenimiento
        fields = '__all__'
