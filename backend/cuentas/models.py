from django.contrib.auth.models import User
from django.db import models


class Perfil(models.Model):
    ADMINISTRADOR = 'administrador'
    OPERACIONES = 'operaciones'
    CONDUCTOR = 'conductor'
    ROL_CHOICES = (
        (ADMINISTRADOR, 'Administrador'),
        (OPERACIONES, 'Operaciones'),
        (CONDUCTOR, 'Conductor'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default=OPERACIONES)

    def __str__(self):
        return f'{self.user.username} · {self.get_rol_display()}'


def rol_de(user):
    if not user or not user.is_authenticated:
        return None
    perfil = getattr(user, 'perfil', None)
    if perfil:
        return perfil.rol
    if user.is_superuser:
        return Perfil.ADMINISTRADOR
    return Perfil.OPERACIONES
