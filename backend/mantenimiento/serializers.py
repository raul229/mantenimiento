from rest_framework import  serializers
from .models import Vehiculo, Falla, Documento, Mantenimiento

class VehiculoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehiculo
        fields = '__all__'

class FallaSerializer(serializers.ModelSerializer):
    class Meta:
        model= Falla
        fields = '__all__'

class DocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Documento
        fields = '__all__'

class MantenimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mantenimiento
        fields = '__all__'