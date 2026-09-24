from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from .models import Perfil, rol_de


class UsuarioSerializer(serializers.ModelSerializer):
    nombre = serializers.SerializerMethodField()
    rol = serializers.ChoiceField(choices=Perfil.ROL_CHOICES)
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
        return {
            'id': instance.id,
            'username': instance.username,
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'email': instance.email,
            'nombre': self.get_nombre(instance),
            'rol': rol_de(instance),
            'is_active': instance.is_active,
        }

    def validate_username(self, value):
        qs = User.objects.filter(username=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ese usuario ya existe.')
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

    def _asignar_rol(self, user, rol):
        user.is_staff = rol == Perfil.ADMINISTRADOR
        try:
            perfil = user.perfil
        except ObjectDoesNotExist:
            perfil = Perfil.objects.create(user=user, rol=rol)
        else:
            if perfil.rol != rol:
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
