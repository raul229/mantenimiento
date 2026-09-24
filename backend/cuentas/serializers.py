from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.utils.text import slugify
from rest_framework import serializers

from .models import Perfil, PermisoRol, Rol, permisos_de, rol_de, rol_obj_de
from .permissions import CATALOGO_MODULOS, ESCRIBE_MODULOS, IDS_MODULOS


def _codigo_unico(nombre, exclude_pk=None):
    base = slugify(nombre)[:36] or 'rol'
    codigo = base
    n = 2
    qs = Rol.objects.filter(codigo=codigo)
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    while qs.exists():
        codigo = f'{base[:34]}-{n}'
        n += 1
        qs = Rol.objects.filter(codigo=codigo)
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
    return codigo


def _normalizar_permisos(permisos, forzar_todo=False):
    if forzar_todo:
        mapa = {}
        for item in CATALOGO_MODULOS:
            mapa[item['id']] = PermisoRol.ELIMINAR if item['escribe'] else PermisoRol.VER
        return mapa
    if permisos is None:
        return None
    if not isinstance(permisos, dict):
        raise serializers.ValidationError({'permisos': 'Indica un mapa de módulo → ver/escribir/eliminar.'})
    limpio = {}
    for modulo, nivel in permisos.items():
        if modulo not in IDS_MODULOS:
            raise serializers.ValidationError({'permisos': f'Módulo desconocido: {modulo}.'})
        if nivel not in PermisoRol.NIVELES_LECTURA:
            raise serializers.ValidationError({'permisos': f'Nivel inválido en {modulo}.'})
        if nivel in PermisoRol.NIVELES_ESCRITURA and modulo not in ESCRIBE_MODULOS:
            nivel = PermisoRol.VER
        limpio[modulo] = nivel
    return limpio


def _guardar_permisos(rol, permisos):
    rol.permisos.all().delete()
    PermisoRol.objects.bulk_create([
        PermisoRol(rol=rol, modulo=modulo, nivel=nivel)
        for modulo, nivel in permisos.items()
    ])


class RolSerializer(serializers.ModelSerializer):
    permisos = serializers.DictField(child=serializers.CharField(), required=False)
    usuarios_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Rol
        fields = (
            'id', 'codigo', 'nombre', 'descripcion',
            'es_sistema', 'solo_asignados', 'permisos', 'usuarios_count',
        )
        read_only_fields = ('codigo', 'es_sistema')

    def to_representation(self, instance):
        return {
            'id': instance.id,
            'codigo': instance.codigo,
            'nombre': instance.nombre,
            'descripcion': instance.descripcion,
            'es_sistema': instance.es_sistema,
            'solo_asignados': instance.solo_asignados,
            'permisos': {p.modulo: p.nivel for p in instance.permisos.all()},
            'usuarios_count': getattr(instance, 'usuarios_count', instance.perfiles.count()),
        }

    def validate_nombre(self, value):
        nombre = (value or '').strip()
        if not nombre:
            raise serializers.ValidationError('Indica un nombre.')
        qs = Rol.objects.filter(nombre__iexact=nombre)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ya existe un rol con ese nombre.')
        return nombre

    def validate(self, data):
        request = self.context.get('request')
        permisos = data.get('permisos')
        if permisos is not None or self.instance is None:
            forzar = (self.instance and self.instance.codigo == Perfil.ADMINISTRADOR) or False
            data['permisos'] = _normalizar_permisos(
                permisos if permisos is not None else {},
                forzar_todo=forzar,
            )
        if self.instance and self.instance.codigo == Perfil.ADMINISTRADOR:
            data['solo_asignados'] = False
            data['permisos'] = _normalizar_permisos({}, forzar_todo=True)
        if (
            request
            and self.instance
            and rol_de(request.user) == self.instance.codigo
            and data.get('permisos') is not None
            and data['permisos'].get('usuarios') not in PermisoRol.NIVELES_ESCRITURA
        ):
            raise serializers.ValidationError({
                'permisos': 'No puedes quitarte el permiso de usuarios.',
            })
        return data

    def create(self, validated_data):
        permisos = validated_data.pop('permisos', {})
        validated_data['codigo'] = _codigo_unico(validated_data['nombre'])
        validated_data['es_sistema'] = False
        rol = Rol.objects.create(**validated_data)
        _guardar_permisos(rol, permisos)
        return rol

    def update(self, instance, validated_data):
        permisos = validated_data.pop('permisos', None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        instance.save()
        if permisos is not None:
            _guardar_permisos(instance, permisos)
        return instance


class UsuarioSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()
    rol = serializers.CharField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'id', 'username', 'first_name', 'last_name', 'email',
            'nombre', 'rol', 'is_active', 'password',
        )

    def get_nombre(self, obj):
        return obj.get_full_name() or obj.username

    def to_representation(self, instance):
        rol = rol_obj_de(instance)
        return {
            'id': instance.id,
            'username': instance.username,
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'email': instance.email,
            'nombre': self.get_nombre(instance),
            'rol': rol.codigo if rol else None,
            'rol_label': rol.nombre if rol else '',
            'is_active': instance.is_active,
        }

    def validate_username(self, value):
        qs = User.objects.filter(username=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ese usuario ya existe.')
        return value

    def validate_rol(self, value):
        if not Rol.objects.filter(codigo=value).exists():
            raise serializers.ValidationError('Ese rol no existe.')
        return value

    def validate(self, data):
        password = data.get('password')
        if self.instance is None and not password:
            raise serializers.ValidationError({'password': 'Indica una contraseña.'})
        rol = data.get('rol')
        request = self.context.get('request')
        if request and self.instance and self.instance.pk == request.user.pk:
            if 'is_active' in data and not data['is_active']:
                raise serializers.ValidationError({'is_active': 'No puedes desactivar tu propio usuario.'})
            if rol and rol != rol_de(self.instance):
                raise serializers.ValidationError({'rol': 'No puedes cambiar tu propio rol.'})
        return data

    def _asignar_rol(self, user, codigo):
        rol = Rol.objects.get(codigo=codigo)
        user.is_staff = (
            rol.codigo == Perfil.ADMINISTRADOR
            or rol.permisos.filter(modulo='usuarios', nivel__in=PermisoRol.NIVELES_ESCRITURA).exists()
        )
        try:
            perfil = user.perfil
        except ObjectDoesNotExist:
            perfil = Perfil.objects.create(user=user, rol=rol)
        else:
            if perfil.rol_id != rol.id:
                perfil.rol = rol
                perfil.save(update_fields=['rol'])
        user.perfil = perfil

    def create(self, validated_data):
        password = validated_data.pop('password')
        rol = validated_data.pop('rol')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        self._asignar_rol(user, rol)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        rol = validated_data.pop('rol', None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        if password:
            instance.set_password(password)
        if rol:
            self._asignar_rol(instance, rol)
        instance.save()
        return instance


def datos_usuario(user):
    rol = rol_obj_de(user)
    return {
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'nombre': user.get_full_name() or user.username,
        'rol': rol.codigo if rol else None,
        'rol_id': rol.id if rol else None,
        'rol_label': rol.nombre if rol else '',
        'solo_asignados': bool(rol and rol.solo_asignados),
        'permisos': permisos_de(user),
        'is_active': user.is_active,
    }
