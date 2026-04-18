from rest_framework import serializers
from .models import Ciudad, Cliente, Sede, Ruta, Viaje, Recojo, Celular,Persona

class CelularSerializer(serializers.ModelSerializer):
    class Meta:
        model = Celular
        fields = '__all__'
class PersonaSerializer(serializers.ModelSerializer):
    celulares = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
    )

    class Meta:
        model= Persona
        fields = '__all__'

    def create(self, validated_data):
        celulares = validated_data.pop('celulares')
        persona = Persona.objects.create(**validated_data)
        #creamos o asociamos si ya existen
        for numero in celulares:
            celular, creado = Celular.objects.get_or_create(numero=numero, defaults={'persona': persona})
            #
            if not  creado and celular.persona != persona:
                celular.persona = persona
                celular.save()
        return persona
    def update(self, instance, validated_data):

        celulares = validated_data.pop('celulares')
        for atributo, valor in validated_data.items():
            setattr(instance, atributo, valor)
        instance.save()
        numeros_nuevos= set(celulares)
        #optenemos los celualres de esta persona, y lo convertimos en una lista
        numeros_actules = set(instance.celulares.values_list('numero', flat=True))

        for numero in numeros_nuevos:
            celular, creado = Celular.objects.get_or_create(
                numero=numero,
                defaults={ 'persona': instance,}
            )
            if not creado and celular.persona != instance:
                celular.persona = instance
                celular.save()

        #desbilculas numeros que ya no vienen, no los borramos
        for numero in numeros_actules- numeros_nuevos:
            Celular.objects.filter(numero= numero, persona= instance).update(persona=None)

        return  instance

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

