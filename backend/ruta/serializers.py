from decimal import Decimal

from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from .models import (
    Ciudad, Cliente, Empresa, Sede, Ruta, Viaje, Recojo, Celular, Persona,
    TipoResiduo, RecojoDetalle, ViajeGasto, CajaViaje, CajaMovimiento, CategoriaGasto,
    ConfiguracionEmisor, GuiaRemision, GuiaRemisionItem,
)
from .documentos import clasificar_documento


def _attach_celular(persona, numero):
    numero = (numero or '').strip()
    if not numero:
        return
    celular, creado = Celular.objects.get_or_create(
        numero=numero, defaults={'persona': persona},
    )
    if not creado and celular.persona != persona:
        celular.persona = persona
        celular.save()


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

    def validate_nombre(self, value):
        nombre = (value or '').strip()
        if not nombre:
            raise serializers.ValidationError('El nombre es requerido.')
        qs = Ciudad.objects.filter(nombre__iexact=nombre)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe una ciudad con ese nombre.')
        return nombre


class ContactoInputSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=50)
    apellido_paterno = serializers.CharField(max_length=50)
    apellido_materno = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    cargo = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    celular = serializers.CharField(max_length=9, required=False, allow_blank=True, default='')


class SedeClienteInputSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    direccion = serializers.CharField(max_length=100)
    ciudad = serializers.PrimaryKeyRelatedField(queryset=Ciudad.objects.all())
    coordenadas = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    contacto = serializers.IntegerField(min_value=0)


class PersonaSedeInputSerializer(serializers.Serializer):
    nombre = serializers.CharField(max_length=50)
    apellido_paterno = serializers.CharField(max_length=50)
    apellido_materno = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    cargo = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    celular = serializers.CharField(max_length=9, required=False, allow_blank=True, default='')


class ClienteSerializer(serializers.ModelSerializer):
    ciudad_principal = serializers.SerializerMethodField()
    ultimo_recojo = serializers.SerializerMethodField()
    kg_mes = serializers.SerializerMethodField()
    contacto = serializers.SerializerMethodField()
    personas_data = PersonaSerializer(source='personas', many=True, read_only=True)
    sedes_data = serializers.SerializerMethodField()
    empresa_data = serializers.SerializerMethodField()
    persona_data = serializers.SerializerMethodField()
    numero_documento = serializers.CharField(required=False, allow_blank=True)
    razon_social = serializers.CharField(required=False, allow_blank=True, default='')
    naturaleza = serializers.SerializerMethodField()
    persona_input = PersonaSedeInputSerializer(write_only=True, required=False)
    contactos_input = ContactoInputSerializer(many=True, write_only=True, required=False)
    sedes_input = SedeClienteInputSerializer(many=True, write_only=True, required=False)

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

    def get_naturaleza(self, obj):
        return obj.naturaleza

    def get_empresa_data(self, obj):
        empresa = getattr(obj, 'empresa', None)
        if empresa is None:
            return None
        return {'id': empresa.id, 'ruc': empresa.ruc, 'razon_social': empresa.razon_social}

    def get_persona_data(self, obj):
        persona = getattr(obj, 'persona', None)
        if persona is None:
            return None
        return PersonaSerializer(persona).data

    def get_contacto(self, obj):
        persona = getattr(obj, 'persona', None) or obj.personas.first()
        if not persona:
            return None
        celular = persona.celulares.first()
        return {
            'id': persona.id,
            'nombre': str(persona),
            'cargo': persona.cargo,
            'celular': celular.numero if celular else None,
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['numero_documento'] = instance.numero_documento
        data['razon_social'] = instance.razon_social
        data['naturaleza'] = instance.naturaleza
        return data

    def get_sedes_data(self, obj):
        result = []
        for sede in obj.sedes.select_related('ciudad', 'persona').prefetch_related('persona__celulares').all():
            persona = sede.persona
            celular = persona.celulares.first() if persona else None
            result.append({
                'id': sede.id,
                'nombre': sede.nombre,
                'direccion': sede.direccion,
                'ciudad': sede.ciudad.nombre if sede.ciudad else None,
                'ciudad_id': sede.ciudad_id,
                'persona': {
                    'id': persona.id,
                    'nombre': str(persona),
                    'cargo': persona.cargo,
                    'celular': celular.numero if celular else None,
                } if persona else None,
            })
        return result

    def validate(self, data):
        creating = self.instance is None
        contactos = data.get('contactos_input')
        sedes = data.get('sedes_input')
        documento = data.get('numero_documento')

        if creating:
            if not documento:
                raise serializers.ValidationError({
                    'numero_documento': 'RUC o DNI es requerido.',
                })
            try:
                naturaleza, doc = clasificar_documento(documento)
            except ValueError as exc:
                raise serializers.ValidationError({'numero_documento': str(exc)}) from exc
            data['numero_documento'] = doc
            data['_naturaleza'] = naturaleza

            if naturaleza == 'empresa' and not (data.get('razon_social') or '').strip():
                raise serializers.ValidationError({
                    'razon_social': 'La razón social es requerida.',
                })
            if naturaleza == 'empresa' and not contactos:
                raise serializers.ValidationError({
                    'contactos_input': 'Agregue al menos un contacto.',
                })
            if naturaleza == 'persona' and not data.get('persona_input'):
                raise serializers.ValidationError({
                    'persona_input': 'Ingrese los datos de la persona.',
                })
            if not sedes:
                raise serializers.ValidationError({
                    'sedes_input': 'Agregue al menos una sede con su encargado.',
                })

        if sedes:
            naturaleza = data.get('_naturaleza')
            n = len(contactos or [])
            if naturaleza == 'persona':
                n += 1
            for i, sede in enumerate(sedes):
                if sede['contacto'] >= n:
                    raise serializers.ValidationError({
                        'sedes_input': f'La sede {i + 1} no tiene un encargado válido.',
                    })
        return data

    @transaction.atomic
    def create(self, validated_data):
        contactos = validated_data.pop('contactos_input', [])
        sedes = validated_data.pop('sedes_input', [])
        persona_input = validated_data.pop('persona_input', None)
        documento = validated_data.pop('numero_documento')
        razon_social = (validated_data.pop('razon_social', None) or '').strip()
        naturaleza = validated_data.pop('_naturaleza')
        cliente = Cliente.objects.create(**validated_data)
        personas = []

        if naturaleza == 'empresa':
            Empresa.objects.create(cliente=cliente, ruc=documento, razon_social=razon_social)
        else:
            celular = persona_input.pop('celular', '')
            titular = Persona.objects.create(
                cliente_propio=cliente,
                cliente=cliente,
                ruc=documento if len(documento) == 11 else '',
                dni=documento if len(documento) == 8 else '',
                **persona_input,
            )
            _attach_celular(titular, celular)
            personas.append(titular)

        for contacto in contactos:
            celular = contacto.pop('celular', '')
            persona = Persona.objects.create(cliente=cliente, **contacto)
            _attach_celular(persona, celular)
            personas.append(persona)

        for sede in sedes:
            idx = sede.pop('contacto')
            if not (sede.get('nombre') or '').strip():
                ciudad = sede['ciudad']
                sede['nombre'] = f"{cliente.razon_social} - {ciudad.nombre}".strip()
            Sede.objects.create(cliente=cliente, persona=personas[idx], **sede)
        return cliente


class SedeSerializer(serializers.ModelSerializer):
    ciudad_nombre = serializers.CharField(source='ciudad.nombre', read_only=True)
    cliente_nombre = serializers.CharField(source='cliente.razon_social', read_only=True)
    persona_nombre = serializers.SerializerMethodField()
    persona_celular = serializers.SerializerMethodField()
    persona_input = PersonaSedeInputSerializer(write_only=True, required=False)
    nombre = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Sede
        fields = '__all__'

    def get_persona_nombre(self, obj):
        return str(obj.persona) if obj.persona else None

    def get_persona_celular(self, obj):
        if not obj.persona:
            return None
        celular = obj.persona.celulares.first()
        return celular.numero if celular else None

    def validate(self, data):
        errors = {}
        cliente = data.get('cliente') if 'cliente' in data else getattr(self.instance, 'cliente', None)
        ciudad = data.get('ciudad') if 'ciudad' in data else getattr(self.instance, 'ciudad', None)
        direccion = data.get('direccion') if 'direccion' in data else getattr(self.instance, 'direccion', None)
        persona = data.get('persona') if 'persona' in data else getattr(self.instance, 'persona', None)
        persona_input = data.get('persona_input')

        if not cliente:
            errors['cliente'] = 'Cliente es requerido.'
        if not ciudad:
            errors['ciudad'] = 'Ciudad es requerida.'
        if not direccion or str(direccion).strip() == '':
            errors['direccion'] = 'Dirección es requerida.'
        if not persona and not persona_input:
            errors['persona'] = 'Cada sede debe tener una persona encargada.'
        if persona and cliente:
            mismo_cliente = (
                persona.cliente_id == cliente.id
                or persona.cliente_propio_id == cliente.id
            )
            if (persona.cliente_id or persona.cliente_propio_id) and not mismo_cliente:
                errors['persona'] = 'El encargado debe pertenecer al mismo cliente.'

        if errors:
            raise serializers.ValidationError(errors)

        if not data.get('nombre'):
            nombre_auto = f"{getattr(cliente, 'razon_social', '')} - {getattr(ciudad, 'nombre', '')}".strip()
            data['nombre'] = nombre_auto

        return data

    @transaction.atomic
    def create(self, validated_data):
        persona_input = validated_data.pop('persona_input', None)
        cliente = validated_data.get('cliente')
        if persona_input:
            celular = persona_input.pop('celular', '')
            persona = Persona.objects.create(cliente=cliente, **persona_input)
            _attach_celular(persona, celular)
            validated_data['persona'] = persona
        elif validated_data.get('persona') and cliente and validated_data['persona'].cliente_id is None:
            persona = validated_data['persona']
            persona.cliente = cliente
            persona.save(update_fields=['cliente'])
        return super().create(validated_data)


class SedeMiniSerializer(serializers.ModelSerializer):
    ciudad_nombre = serializers.CharField(source='ciudad.nombre', read_only=True, default=None, allow_null=True)
    cliente_nombre = serializers.CharField(source='cliente.razon_social', read_only=True, default=None, allow_null=True)

    class Meta:
        model = Sede
        fields = ('id', 'nombre', 'direccion', 'cliente', 'cliente_nombre', 'ciudad_nombre')


class RutaSerializer(serializers.ModelSerializer):
    sedes_data = SedeMiniSerializer(source='sedes', many=True, read_only=True)
    sedes_count = serializers.IntegerField(source='sedes.count', read_only=True)

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


class CategoriaGastoSerializer(serializers.ModelSerializer):
    gastos_count = serializers.SerializerMethodField()

    class Meta:
        model = CategoriaGasto
        fields = ('id', 'nombre', 'orden', 'gastos_count')

    def get_gastos_count(self, obj):
        return getattr(obj, 'gastos_count', 0)

    def validate_nombre(self, value):
        nombre = (value or '').strip()
        if not nombre:
            raise serializers.ValidationError('Indica el nombre.')
        qs = CategoriaGasto.objects.filter(nombre__iexact=nombre)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe esa categoría.')
        return nombre


class CajaMovimientoSerializer(serializers.ModelSerializer):
    tipo_label = serializers.CharField(source='get_tipo_display', read_only=True)
    categoria_label = serializers.SerializerMethodField()
    creado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = CajaMovimiento
        fields = (
            'id', 'tipo', 'tipo_label', 'categoria', 'categoria_label',
            'monto', 'descripcion', 'creado_por', 'creado_por_nombre', 'creado_en',
        )

    def get_categoria_label(self, obj):
        return obj.categoria.nombre if obj.categoria_id else None

    def get_creado_por_nombre(self, obj):
        if not obj.creado_por:
            return None
        return obj.creado_por.get_full_name() or obj.creado_por.username


class CajaViajeSerializer(serializers.ModelSerializer):
    movimientos = CajaMovimientoSerializer(many=True, read_only=True)
    asignado = serializers.SerializerMethodField()
    aumentos = serializers.SerializerMethodField()
    fondo = serializers.SerializerMethodField()
    gastado = serializers.SerializerMethodField()
    saldo = serializers.SerializerMethodField()
    cerrado_por_nombre = serializers.SerializerMethodField()
    viaje = serializers.PrimaryKeyRelatedField(read_only=True)
    viaje_ruta = serializers.CharField(source='viaje.ruta.nombre', read_only=True, default=None, allow_null=True)
    vehiculo_placa = serializers.CharField(source='viaje.vehiculo.placa', read_only=True, default=None, allow_null=True)
    conductor_nombre = serializers.SerializerMethodField()
    fecha_viaje = serializers.DateField(source='viaje.fecha_inicio', read_only=True)
    estado_viaje = serializers.CharField(source='viaje.estado', read_only=True)

    class Meta:
        model = CajaViaje
        fields = (
            'id', 'viaje', 'estado', 'asignado', 'aumentos', 'fondo', 'gastado', 'saldo',
            'saldo_devuelto', 'observacion_cierre', 'cerrado_en', 'cerrado_por',
            'cerrado_por_nombre', 'movimientos', 'viaje_ruta', 'vehiculo_placa',
            'conductor_nombre', 'fecha_viaje', 'estado_viaje',
        )

    def _nums(self, obj):
        asignado, aumentos, gastado = obj._totales()
        return float(asignado), float(aumentos), float(gastado)

    def get_asignado(self, obj):
        return self._nums(obj)[0]

    def get_aumentos(self, obj):
        return self._nums(obj)[1]

    def get_fondo(self, obj):
        a, u, _ = self._nums(obj)
        return a + u

    def get_gastado(self, obj):
        return self._nums(obj)[2]

    def get_saldo(self, obj):
        a, u, g = self._nums(obj)
        return a + u - g

    def get_cerrado_por_nombre(self, obj):
        if not obj.cerrado_por:
            return None
        return obj.cerrado_por.get_full_name() or obj.cerrado_por.username

    def get_conductor_nombre(self, obj):
        user = obj.viaje.conductor
        if not user:
            return None
        return user.get_full_name() or user.username


def _sync_estado_viaje(viaje):
    """Programado sin recojos, en curso con sedes pendientes, completado al cerrar todas."""
    if not viaje or viaje.estado == 'cancelado':
        return
    sede_ids = set(viaje.sedes.values_list('pk', flat=True))
    if not sede_ids:
        return
    hechas = Recojo.objects.filter(
        viaje=viaje, sede_id__in=sede_ids,
    ).values('sede_id').distinct().count()

    campos = []
    if hechas >= len(sede_ids):
        if viaje.estado != 'completado':
            viaje.estado = 'completado'
            campos.append('estado')
        cierre = timezone.localdate()
        if viaje.fecha_inicio and cierre < viaje.fecha_inicio:
            cierre = viaje.fecha_inicio
        if not viaje.fecha_fin or viaje.fecha_fin < viaje.fecha_inicio:
            viaje.fecha_fin = cierre
            campos.append('fecha_fin')
    elif hechas > 0 and viaje.estado != 'en curso':
        viaje.estado = 'en curso'
        campos.append('estado')
    elif hechas == 0 and viaje.estado != 'programado':
        viaje.estado = 'programado'
        campos.append('estado')

    if campos:
        viaje.save(update_fields=campos)


class RecojoSerializer(serializers.ModelSerializer):
    sede_nombre = serializers.CharField(source='sede.nombre', read_only=True, default=None, allow_null=True)
    sede_direccion = serializers.CharField(source='sede.direccion', read_only=True, default=None, allow_null=True)
    cliente_nombre = serializers.CharField(source='sede.cliente.razon_social', read_only=True, default=None, allow_null=True)
    ciudad_nombre = serializers.CharField(source='sede.ciudad.nombre', read_only=True, default=None, allow_null=True)
    detalles = RecojoDetalleSerializer(many=True, read_only=True)
    viaje_ruta = serializers.CharField(source='viaje.ruta.nombre', read_only=True, default=None, allow_null=True)
    vehiculo_placa = serializers.CharField(source='viaje.vehiculo.placa', read_only=True, default=None, allow_null=True)
    guia_id = serializers.IntegerField(source='guia.id', read_only=True, default=None, allow_null=True)
    guia_numero = serializers.CharField(
        source='guia.numero_formateado', read_only=True, default=None, allow_null=True,
    )

    class Meta:
        model = Recojo
        fields = '__all__'
        read_only_fields = ('fecha', 'hora')

    def validate(self, data):
        viaje = data.get('viaje') if 'viaje' in data else getattr(self.instance, 'viaje', None)
        sede = data.get('sede') if 'sede' in data else getattr(self.instance, 'sede', None)

        if not viaje:
            raise serializers.ValidationError({'viaje': 'Selecciona un viaje en proceso.'})
        if viaje.estado in ('completado', 'cancelado'):
            raise serializers.ValidationError({'viaje': 'El viaje no está en proceso.'})
        if not sede:
            raise serializers.ValidationError({'sede': 'Selecciona una sede.'})
        if not viaje.sedes.filter(pk=sede.pk).exists():
            raise serializers.ValidationError({'sede': 'La sede no está relacionada a este viaje.'})

        qs = Recojo.objects.filter(viaje=viaje, sede=sede)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({'sede': 'Esta sede ya tiene un recojo en este viaje.'})

        peso = data.get('peso_kg') if 'peso_kg' in data else getattr(self.instance, 'peso_kg', None)
        if self.instance is None and (peso is None or Decimal(peso) <= 0):
            raise serializers.ValidationError({'peso_kg': 'Indica los kilogramos recolectados.'})
        return data

    def create(self, validated_data):
        now = timezone.localtime()
        validated_data['fecha'] = now.date()
        validated_data['hora'] = now.time().replace(microsecond=0)
        validated_data['estado'] = 'completado'
        recojo = Recojo.objects.create(**validated_data)
        _sync_estado_viaje(recojo.viaje)
        return recojo


class ViajeSerializer(serializers.ModelSerializer):
    vehiculo_data = serializers.SerializerMethodField()
    conductor_data = UserMiniSerializer(source='conductor', read_only=True)
    ruta_data = serializers.SerializerMethodField()
    sedes_data = SedeMiniSerializer(source='sedes', many=True, read_only=True)
    recojos = RecojoSerializer(many=True, read_only=True)
    gastos = ViajeGastoSerializer(many=True, read_only=True)
    caja = serializers.SerializerMethodField()
    kg_total = serializers.SerializerMethodField()
    ciudad = serializers.SerializerMethodField()
    paradas_total = serializers.SerializerMethodField()
    paradas_hechas = serializers.SerializerMethodField()
    costo_total = serializers.SerializerMethodField()
    km_recorridos = serializers.IntegerField(read_only=True)

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
            'kilometraje_actual': v.kilometraje_actual or 0,
            'estado_operativo': v.estado_operativo(),
        }

    def get_ruta_data(self, obj):
        if not obj.ruta:
            return None
        return {
            'id': obj.ruta.id,
            'nombre': obj.ruta.nombre,
            'sedes_count': obj.ruta.sedes.count(),
        }

    def get_kg_total(self, obj):
        total = obj.recojos.aggregate(s=Sum('peso_kg'))['s']
        return float(total or 0)

    def get_ciudad(self, obj):
        sede = obj.sedes.select_related('ciudad').first()
        if sede and sede.ciudad:
            return sede.ciudad.nombre
        recojo = obj.recojos.select_related('sede__ciudad').first()
        if recojo and recojo.sede and recojo.sede.ciudad:
            return recojo.sede.ciudad.nombre
        return None

    def get_paradas_total(self, obj):
        return obj.sedes.count()

    def get_paradas_hechas(self, obj):
        sede_ids = set(obj.sedes.values_list('pk', flat=True))
        if not sede_ids:
            return 0
        return obj.recojos.filter(sede_id__in=sede_ids).values('sede_id').distinct().count()

    def get_caja(self, obj):
        caja = getattr(obj, 'caja', None)
        if caja is None:
            return None
        return CajaViajeSerializer(caja).data

    def get_costo_total(self, obj):
        caja = getattr(obj, 'caja', None)
        if caja is not None:
            return float(caja.gastado)
        total = obj.gastos.aggregate(s=Sum('monto'))['s']
        return float(total or 0)

    def validate(self, data):
        errors = {}
        vehiculo = data.get('vehiculo') if 'vehiculo' in data else getattr(self.instance, 'vehiculo', None)
        conductor = data.get('conductor') if 'conductor' in data else getattr(self.instance, 'conductor', None)
        if self.instance is None:
            if not vehiculo:
                errors['vehiculo'] = 'Selecciona un vehículo.'
            if not conductor:
                errors['conductor'] = 'Asigna un conductor responsable de este viaje.'

        # El inicio lo pone el último odómetro del vehículo. El usuario solo carga el de cierre.
        if self.instance is None and vehiculo and data.get('kilometraje_inicio') is None:
            data['kilometraje_inicio'] = vehiculo.kilometraje_actual or 0

        km_inicio = data.get('kilometraje_inicio') if 'kilometraje_inicio' in data else getattr(self.instance, 'kilometraje_inicio', None)
        if km_inicio is None and vehiculo:
            km_inicio = vehiculo.kilometraje_actual or 0
        km_final = data.get('kilometraje_final') if 'kilometraje_final' in data else getattr(self.instance, 'kilometraje_final', None)
        estado = data.get('estado') if 'estado' in data else getattr(self.instance, 'estado', 'programado')
        if vehiculo and estado != 'cancelado' and km_final is None:
            otro = Viaje.abierto_de(vehiculo, exclude_pk=getattr(self.instance, 'pk', None))
            if otro:
                errors['vehiculo'] = (
                    f'El vehículo {vehiculo.placa} ya está en el viaje #{otro.pk}. '
                    f'Cierra su odómetro o cancélalo antes de usarlo en otro viaje.'
                )

        if (
            self.instance
            and 'kilometraje_final' in data
            and (self.instance.estado == 'cancelado' or estado == 'cancelado')
        ):
            errors['kilometraje_final'] = 'No se puede registrar el odómetro de un viaje cancelado.'

        if km_final is not None and km_final < 0:
            errors['kilometraje_final'] = 'El odómetro no puede ser negativo.'
        if km_final is not None and km_inicio is not None and km_final < km_inicio:
            errors['kilometraje_final'] = (
                f'El odómetro al finalizar no puede ser menor a {km_inicio} km '
                f'(salida de este viaje).'
            )

        if 'fecha_fin' in data or 'fecha_inicio' in data:
            fecha_inicio = data.get('fecha_inicio') if 'fecha_inicio' in data else getattr(self.instance, 'fecha_inicio', None)
            fecha_fin = data.get('fecha_fin') if 'fecha_fin' in data else getattr(self.instance, 'fecha_fin', None)
            if fecha_fin and fecha_inicio and fecha_fin < fecha_inicio:
                errors['fecha_fin'] = 'La fecha final no puede ser menor a la inicial'

        if errors:
            raise serializers.ValidationError(errors)
        return data

    def create(self, validated_data):
        sedes = validated_data.pop('sedes', None)
        try:
            viaje = Viaje.objects.create(**validated_data)
        except IntegrityError:
            raise serializers.ValidationError({
                'vehiculo': 'Este vehículo ya tiene un viaje abierto.',
            })
        if sedes:
            viaje.sedes.set(sedes)
        elif viaje.ruta:
            viaje.sedes.set(viaje.ruta.sedes.all())
        return viaje

    def update(self, instance, validated_data):
        sedes = validated_data.pop('sedes', None)
        viaje = super().update(instance, validated_data)
        if sedes is not None:
            viaje.sedes.set(sedes)
        return viaje


class ConfiguracionEmisorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionEmisor
        fields = '__all__'
        read_only_fields = ('correlativo',)


class GuiaRemisionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuiaRemisionItem
        fields = ('id', 'descripcion', 'unidad', 'cantidad')


class GuiaRemisionSerializer(serializers.ModelSerializer):
    items = GuiaRemisionItemSerializer(many=True, read_only=True)
    numero_formateado = serializers.CharField(read_only=True)
    viaje = serializers.IntegerField(source='recojo.viaje_id', read_only=True, default=None, allow_null=True)
    sede_nombre = serializers.CharField(
        source='recojo.sede.nombre', read_only=True, default=None, allow_null=True,
    )

    class Meta:
        model = GuiaRemision
        fields = '__all__'
        read_only_fields = ('recojo', 'serie', 'numero', 'fecha_emision', 'creado_en', 'creado_por')
