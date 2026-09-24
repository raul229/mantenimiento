from django.contrib.auth.models import User
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Perfil, rol_de
from .permissions import HasModulo
from .serializers import UsuarioSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    modulo = 'usuarios'
    permission_classes = [IsAuthenticated, HasModulo]
    serializer_class = UsuarioSerializer
    queryset = User.objects.select_related('perfil').order_by('username')

    def get_queryset(self):
        qs = super().get_queryset()
        rol = self.request.query_params.get('rol')
        if rol:
            qs = qs.filter(perfil__rol=rol)
        activos = self.request.query_params.get('activos')
        if activos == '1':
            qs = qs.filter(is_active=True)
        return qs


def datos_usuario(user):
    return {
        'id': user.id,
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'nombre': user.get_full_name() or user.username,
        'rol': rol_de(user),
        'rol_label': dict(Perfil.ROL_CHOICES).get(rol_de(user), ''),
        'is_active': user.is_active,
    }
