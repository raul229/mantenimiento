from django.contrib.auth.models import User
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Rol
from .permissions import CATALOGO_MODULOS, HasModulo
from .serializers import RolSerializer, UsuarioSerializer, datos_usuario


class UsuarioViewSet(viewsets.ModelViewSet):
    modulo = 'usuarios'
    permission_classes = [IsAuthenticated, HasModulo]
    serializer_class = UsuarioSerializer
    queryset = User.objects.select_related('perfil__rol').order_by('username')

    def get_queryset(self):
        qs = super().get_queryset()
        rol = self.request.query_params.get('rol')
        if rol:
            qs = qs.filter(perfil__rol__codigo=rol)
        activos = self.request.query_params.get('activos')
        if activos == '1':
            qs = qs.filter(is_active=True)
        return qs


class RolViewSet(viewsets.ModelViewSet):
    modulo = 'usuarios'
    permission_classes = [IsAuthenticated, HasModulo]
    serializer_class = RolSerializer
    queryset = Rol.objects.annotate(usuarios_count=Count('perfiles')).prefetch_related('permisos')

    @action(detail=False, methods=['get'])
    def catalogo(self, request):
        return Response(CATALOGO_MODULOS)

    def destroy(self, request, *args, **kwargs):
        rol = self.get_object()
        if rol.es_sistema:
            return Response(
                {'detail': 'No se puede borrar un rol del sistema.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if rol.perfiles.exists():
            return Response(
                {'detail': 'Hay usuarios con este rol. Asígneles otro antes de borrarlo.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
