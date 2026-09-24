from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cuentas.models import Perfil
from cuentas.views import datos_usuario


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(datos_usuario(request.user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuarios_mini(request):
    """Lista corta para combos (conductor de un viaje). Visible a quien crea viajes."""
    from django.contrib.auth.models import User
    from cuentas.models import rol_de

    qs = User.objects.filter(is_active=True).select_related('perfil').order_by('username')
    rol = request.query_params.get('rol')
    if rol:
        qs = qs.filter(perfil__rol=rol)
    else:
        qs = qs.filter(perfil__rol__in=[Perfil.CONDUCTOR, Perfil.OPERACIONES, Perfil.ADMINISTRADOR])
    return Response([
        {
            'id': u.id,
            'username': u.username,
            'nombre': u.get_full_name() or u.username,
            'rol': rol_de(u),
        }
        for u in qs
    ])
