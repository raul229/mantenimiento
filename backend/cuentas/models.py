from django.contrib.auth.models import User
from django.db import models


class Rol(models.Model):
    codigo = models.SlugField(max_length=40, unique=True)
    nombre = models.CharField(max_length=80)
    descripcion = models.CharField(max_length=200, blank=True)
    es_sistema = models.BooleanField(default=False)
    solo_asignados = models.BooleanField(
        default=False,
        help_text='Si está activo, solo ve los viajes y recojos donde es conductor.',
    )

    class Meta:
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class PermisoRol(models.Model):
    VER = 'ver'
    ESCRIBIR = 'escribir'
    ELIMINAR = 'eliminar'
    NIVEL_CHOICES = (
        (VER, 'Ver'),
        (ESCRIBIR, 'Editar'),
        (ELIMINAR, 'Eliminar'),
    )
    NIVELES_LECTURA = (VER, ESCRIBIR, ELIMINAR)
    NIVELES_ESCRITURA = (ESCRIBIR, ELIMINAR)

    rol = models.ForeignKey(Rol, on_delete=models.CASCADE, related_name='permisos')
    modulo = models.CharField(max_length=20)
    nivel = models.CharField(max_length=10, choices=NIVEL_CHOICES)

    class Meta:
        unique_together = ('rol', 'modulo')

    def __str__(self):
        return f'{self.rol.codigo} · {self.modulo} · {self.nivel}'


class Perfil(models.Model):
    ADMINISTRADOR = 'administrador'
    OPERACIONES = 'operaciones'
    CONDUCTOR = 'conductor'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    rol = models.ForeignKey(Rol, on_delete=models.PROTECT, related_name='perfiles')

    def __str__(self):
        return f'{self.user.username} · {self.rol.nombre}'


def rol_obj_de(user):
    if not user or not getattr(user, 'is_authenticated', False):
        return None
    perfil = getattr(user, 'perfil', None)
    if perfil is not None:
        rol = getattr(perfil, 'rol', None)
        if rol is not None:
            return rol
    codigo = Perfil.ADMINISTRADOR if getattr(user, 'is_superuser', False) else Perfil.OPERACIONES
    return Rol.objects.filter(codigo=codigo).first()


def rol_de(user):
    rol = rol_obj_de(user)
    return rol.codigo if rol else None


def rol_por_defecto(superuser=False):
    codigo = Perfil.ADMINISTRADOR if superuser else Perfil.OPERACIONES
    rol = Rol.objects.filter(codigo=codigo).first()
    return rol or Rol.objects.order_by('id').first()


def permisos_de(user):
    rol = rol_obj_de(user)
    if not rol:
        return {}
    return {p.modulo: p.nivel for p in rol.permisos.all()}


def nivel_de(user, modulo):
    return permisos_de(user).get(modulo)


def solo_asignados(user):
    rol = rol_obj_de(user)
    return bool(rol and rol.solo_asignados)
