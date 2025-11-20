from rest_framework import serializers
from .models import Ciudad, Cliente, Sede, Ruta, Viaje, Recojo

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

class RecojoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recojo
        fields = '__all__'
