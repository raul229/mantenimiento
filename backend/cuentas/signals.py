from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Perfil, rol_por_defecto


@receiver(post_save, sender=User)
def asegurar_perfil(sender, instance, created, **kwargs):
    rol = rol_por_defecto(instance.is_superuser)
    if not rol:
        return
    if created:
        Perfil.objects.get_or_create(user=instance, defaults={'rol': rol})
    elif not hasattr(instance, 'perfil'):
        Perfil.objects.get_or_create(user=instance, defaults={'rol': rol})
