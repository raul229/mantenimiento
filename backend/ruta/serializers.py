from rest_framework import serializers
from .models import Ciudad, Cliente, Sede, Ruta, Viaje, Recojo, Celular,Persona

class CelularSerializer(serializers.ModelSerializer):
    class Meta:
        model = Celular
        fields = '__all__'
class PersonaSerializer(serializers.ModelSerializer):
    class Meta:
        model= Persona
        fields = '__all__'

class CiudadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ciudad
        fields = '__all__'
class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = '__all__'

class SedeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sede
        fields = '__all__'

class RutaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ruta
        fields = '__all__'

class ViajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Viaje
        fields = '__all__'
        read_only_fields = ['kilometraje_inicio']

    def validate(self, data):
        km_inicio=data.get('kilometraje_inicio')
        km_final=data.get('kilometraje_final')

        # Si km_inicio es None (nuevo viaje), tomarlo del vehículo
        if km_inicio is None and 'vehiculo' in data and data['vehiculo']:
            km_inicio = data['vehiculo'].kilometraje_actual or 0

        if km_final is not None and km_inicio is not None:
            if km_final < km_inicio:
                raise serializers.ValidationError({
                    'kilometraje_final': 'El kilometraje final no puede ser menor al inicial'
                })

        fecha_inicio=data.get('fecha_inicio')
        fecha_fin=data.get('fecha_fin')
        if fecha_fin and fecha_fin:
            if fecha_fin < fecha_inicio:
                raise serializers.ValidationError(
                    {
                        'fecha_fin': 'La fecha final no puede ser menos a la inical'

                    }
                )


        return data

class RecojoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recojo
        fields = '__all__'

