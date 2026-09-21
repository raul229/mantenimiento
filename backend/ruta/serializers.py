from decimal import Decimal

from rest_framework import serializers
from django.contrib.auth.models import User
from django.db.models import Sum
from django.utils import timezone

from .models import (
    Ciudad, Cliente, Sede, Ruta, Viaje, Recojo, Celular, Persona,
    TipoResiduo, RecojoDetalle, ViajeGasto,
)


class UserMiniSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'nombre')

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username


class CelularSerializer(serializers.ModelSerializer):
    class Meta:
        model = Celular
        fields = '__all__'


class PersonaSerializer(serializers.ModelSerializer):
    celulares = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False,
    )
    celulares_lista = serializers.SerializerMethodField()

    class Meta:
        model = Persona
        fields = '__all__'

    def get_celulares_lista(self, obj):
        return list(obj.celulares.values_list('numero', flat=True))

    def create(self, validated_data):
        celulares = validated_data.pop('celulares', [])
        persona = Persona.objects.create(**validated_data)
        for numero in celulares:
            if not numero:
                continue
            celular, creado = Celular.objects.get_or_create(numero=numero, defaults={'persona': persona})
            if not creado and celular.persona != persona:
                celular.persona = persona
                celular.save()
        return persona

    def update(self, instance, validated_data):
        celulares = validated_data.pop('celulares', None)
        for atributo, valor in validated_data.items():
            setattr(instance, atributo, valor)
        instance.save()
        if celulares is None:
            return instance
        numeros_nuevos = set(n for n in celulares if n)
        numeros_actuales = set(instance.celulares.values_list('numero', flat=True))
        for numero in numeros_nuevos:
            celular, creado = Celular.objects.get_or_create(
                numero=numero,
                defaults={'persona': instance},
            )
            if not creado and celular.persona != instance:
                celular.persona = instance
                celular.save()
        for numero in numeros_actuales - numeros_nuevos:
            Celular.objects.filter(numero=numero, persona=instance).update(persona=None)
        return instance


class CiudadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ciudad
        fields = '__all__'


class ClienteSerializer(serializers.ModelSerializer):
    ciudad_principal = serializers.SerializerMethodField()
    ultimo_recojo = serializers.SerializerMethodField()
    kg_mes = serializers.SerializerMethodField()
    contacto = serializers.SerializerMethodField()
    personas_data = PersonaSerializer(source='personas', many=True, read_only=True)
    sedes_data = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = '__all__'

    def get_ciudad_principal(self, obj):
        sede = obj.sedes.select_related('ciudad').first()
        if sede and sede.ciudad:
            return {'id': sede.ciudad.id, 'nombre': sede.ciudad.nombre}
        return None

    def get_ultimo_recojo(self, obj):
        recojo = Recojo.objects.filter(sede__cliente=obj).order_by('-fecha', '-id').first()
        return recojo.fecha if recojo else None

    def get_kg_mes(self, obj):
        today = timezone.now().date()
        total = Recojo.objects.filter(
            sede__cliente=obj,
            fecha__year=today.year,
            fecha__month=today.month,
        ).aggregate(s=Sum('peso_kg'))['s']
        return float(total or 0)

    def get_contacto(self, obj):
        persona = obj.personas.first()
        if not persona:
            return None
        celular = persona.celulares.first()
        return {
            'id': persona.id,
            'nombre': str(persona),
            'cargo': persona.cargo,
            'celular': celular.numero if celular else None,
        }

    def get_sedes_data(self, obj):
        result = []
        for sede in obj.sedes.select_related('ciudad', 'persona').all():
            result.append({
                'id': sede.id,
                'nombre': sede.nombre,
                'direccion': sede.direccion,
                'ciudad': sede.ciudad.nombre if sede.ciudad else None,
            })
        return result


class SedeSerializer(serializers.ModelSerializer):
    ciudad_nombre = serializers.CharField(source='ciudad.nombre', read_only=True)
    cliente_nombre = serializers.CharField(source='cliente.razon_social', read_only=True)

    class Meta:
        model = Sede
        fields = '__all__'

    def validate(self, data):
        errors = {}
        cliente = data.get('cliente') if 'cliente' in data else getattr(self.instance, 'cliente', None)
        ciudad = data.get('ciudad') if 'ciudad' in data else getattr(self.instance, 'ciudad', None)
        direccion = data.get('direccion') if 'direccion' in data else getattr(self.instance, 'direccion', None)

        if not cliente:
            errors['cliente'] = 'Cliente es requerido.'
        if not ciudad:
            errors['ciudad'] = 'Ciudad es requerida.'
        if not direccion or str(direccion).strip() == '':
            errors['direccion'] = 'Dirección es requerida.'

        if errors:
            raise serializers.ValidationError(errors)

        if not data.get('nombre'):
            cliente_obj = cliente
            ciudad_obj = ciudad
            nombre_auto = f"{getattr(cliente_obj, 'razon_social', '')} - {getattr(ciudad_obj, 'nombre', '')}".strip()
            data['nombre'] = nombre_auto

        return data


class RutaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ruta
        fields = '__all__'


class TipoResiduoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoResiduo
        fields = '__all__'


class RecojoDetalleSerializer(serializers.ModelSerializer):
    tipo_data = TipoResiduoSerializer(source='tipo', read_only=True)

    class Meta:
        model = RecojoDetalle
        fields = '__all__'


class RecojoDetalleInputSerializer(serializers.Serializer):
    tipo = serializers.PrimaryKeyRelatedField(queryset=TipoResiduo.objects.all())
    peso_kg = serializers.DecimalField(max_digits=10, decimal_places=2)


class ViajeGastoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ViajeGasto
        fields = '__all__'


class RecojoSerializer(serializers.ModelSerializer):
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True, default=None, allow_null=True)
    sede_direccion = serializers.CharField(source='sede.direccion', read_only=True, default=None, allow_null=True)
    cliente_nombre = serializers.CharField(source='sede.cliente.razon_social', read_only=True, default=None, allow_null=True)
    ciudad_nombre = serializers.CharField(source='sede.ciudad.nombre', read_only=True, default=None, allow_null=True)
    detalles = RecojoDetalleSerializer(many=True, read_only=True)
    detalles_input = RecojoDetalleInputSerializer(many=True, write_only=True, required=False)
    viaje_ruta = serializers.CharField(source='viaje.ruta.nombre', read_only=True, default=None, allow_null=True)
    vehiculo_placa = serializers.CharField(source='viaje.vehiculo.placa', read_only=True, default=None, allow_null=True)

    class Meta:
        model = Recojo
        fields = '__all__'

    def _sync_detalles(self, recojo, detalles):
        RecojoDetalle.objects.filter(recojo=recojo).delete()
        total = Decimal('0')
        for item in detalles:
            peso = item.get('peso_kg') or Decimal('0')
            if peso <= 0:
                continue
            RecojoDetalle.objects.create(recojo=recojo, tipo=item['tipo'], peso_kg=peso)
            total += peso
        recojo.peso_kg = total
        recojo.save(update_fields=['peso_kg'])

    def create(self, validated_data):
        detalles = validated_data.pop('detalles_input', [])
        recojo = Recojo.objects.create(**validated_data)
        if detalles:
            self._sync_detalles(recojo, detalles)
        return recojo

    def update(self, instance, validated_data):
        detalles = validated_data.pop('detalles_input', None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if detalles is not None:
            self._sync_detalles(instance, detalles)
        return instance


class ViajeSerializer(serializers.ModelSerializer):
    vehiculo_data = serializers.SerializerMethodField()
    conductor_data = UserMiniSerializer(source='conductor', read_only=True)
    ruta_data = serializers.SerializerMethodField()
    recojos = RecojoSerializer(many=True, read_only=True)
    gastos = ViajeGastoSerializer(many=True, read_only=True)
    kg_total = serializers.SerializerMethodField()
    ciudad = serializers.SerializerMethodField()
    paradas_total = serializers.SerializerMethodField()
    paradas_hechas = serializers.SerializerMethodField()
    costo_total = serializers.SerializerMethodField()
    residuos = serializers.SerializerMethodField()

    class Meta:
        model = Viaje
        fields = '__all__'
        read_only_fields = ['kilometraje_inicio']

    def get_vehiculo_data(self, obj):
        if not obj.vehiculo:
            return None
        v = obj.vehiculo
        return {
            'id': v.id,
            'marca': v.marca,
            'modelo': v.modelo,
            'placa': v.placa,
            'estado_operativo': v.estado_operativo(),
        }

    def get_ruta_data(self, obj):
        if not obj.ruta:
            return None
        return {'id': obj.ruta.id, 'nombre': obj.ruta.nombre}

    def get_kg_total(self, obj):
        total = obj.recojos.aggregate(s=Sum('peso_kg'))['s']
        return float(total or 0)

    def get_ciudad(self, obj):
        recojo = obj.recojos.select_related('sede__ciudad').first()
        if recojo and recojo.sede and recojo.sede.ciudad:
            return recojo.sede.ciudad.nombre
        if obj.ruta:
            sede = obj.ruta.sedes.select_related('ciudad').first()
            if sede and sede.ciudad:
                return sede.ciudad.nombre
        return None

    def get_paradas_total(self, obj):
        count = obj.recojos.count()
        if count:
            return count
        if obj.ruta:
            return obj.ruta.sedes.count()
        return 0

    def get_paradas_hechas(self, obj):
        return obj.recojos.filter(estado='completado').count()

    def get_costo_total(self, obj):
        total = obj.gastos.aggregate(s=Sum('monto'))['s']
        return float(total or 0)

    def get_residuos(self, obj):
        qs = RecojoDetalle.objects.filter(recojo__viaje=obj).values(
            'tipo__nombre', 'tipo__color', 'tipo__codigo'
        ).annotate(peso=Sum('peso_kg'))
        return [
            {
                'nombre': row['tipo__nombre'],
                'color': row['tipo__color'],
                'codigo': row['tipo__codigo'],
                'peso': float(row['peso'] or 0),
            }
            for row in qs
        ]

    def validate(self, data):
        km_inicio = data.get('kilometraje_inicio')
        km_final = data.get('kilometraje_final')

        if km_inicio is None and data.get('vehiculo'):
            km_inicio = data['vehiculo'].kilometraje_actual or 0

        if km_final is not None and km_inicio is not None:
            if km_final < km_inicio:
                raise serializers.ValidationError({
                    'kilometraje_final': 'El kilometraje final no puede ser menor al inicial',
                })

        fecha_inicio = data.get('fecha_inicio')
        fecha_fin = data.get('fecha_fin')
        if fecha_fin and fecha_inicio and fecha_fin < fecha_inicio:
            raise serializers.ValidationError({
                'fecha_fin': 'La fecha final no puede ser menor a la inicial',
            })
        return data

    def create(self, validated_data):
        viaje = super().create(validated_data)
        if viaje.ruta and not viaje.recojos.exists():
            for sede in viaje.ruta.sedes.all():
                Recojo.objects.create(
                    viaje=viaje,
                    sede=sede,
                    peso_kg=Decimal('0'),
                    fecha=viaje.fecha_inicio,
                    estado='pendiente',
                )
        return viaje
