from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Perfil


@receiver(post_save, sender=User)
def asegurar_perfil(sender, instance, created, **kwargs):
    if created:
        rol = Perfil.ADMINISTRADOR if instance.is_superuser else Perfil.OPERACIONES
        Perfil.objects.get_or_create(user=instance, defaults={'rol': rol})
    elif not hasattr(instance, 'perfil'):
        Perfil.objects.get_or_create(
            user=instance,
            defaults={'rol': Perfil.ADMINISTRADOR if instance.is_superuser else Perfil.OPERACIONES},
        )
