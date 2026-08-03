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

    def validate(self, data):
        errors = {}
        # En creación/actualización exigir cliente, ciudad y direccion
        cliente = data.get('cliente') if 'cliente' in data else getattr(self.instance, 'cliente', None)
        ciudad = data.get('ciudad') if 'ciudad' in data else getattr(self.instance, 'ciudad', None)
        direccion = data.get('direccion') if 'direccion' in data else getattr(self.instance, 'direccion', None)
        persona = data.get('persona') if 'persona' in data else getattr(self.instance, 'persona', None)

        if not cliente:
            errors['cliente'] = 'Cliente es requerido.'
        if not ciudad:
            errors['ciudad'] = 'Ciudad es requerida.'
        if not direccion or str(direccion).strip() == '':
            errors['direccion'] = 'Dirección es requerida.'

        # persona y coordenadas pueden ser opcionales, no validar como requeridos

        if errors:
            raise serializers.ValidationError(errors)

        # Si nombre no viene, autogenerarlo para devolverlo en la representación
        if not data.get('nombre'):
            cliente_obj = None
            ciudad_obj = None
            # Si tenemos instacia y no vienen objetos completos, tratamos de resolver
            if isinstance(cliente, int):
                from .models import Cliente as ClienteModel
                try:
                    cliente_obj = ClienteModel.objects.get(pk=cliente)
                except ClienteModel.DoesNotExist:
                    cliente_obj = None
            else:
                cliente_obj = cliente

            if isinstance(ciudad, int):
                from .models import Ciudad as CiudadModel
                try:
                    ciudad_obj = CiudadModel.objects.get(pk=ciudad)
                except CiudadModel.DoesNotExist:
                    ciudad_obj = None
            else:
                ciudad_obj = ciudad

            nombre_auto = f"{getattr(cliente_obj, 'razon_social', '')} - {getattr(ciudad_obj, 'nombre', '')}".strip()
            data['nombre'] = nombre_auto

        return data

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
