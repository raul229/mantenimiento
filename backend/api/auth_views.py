from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from cuentas.serializers import datos_usuario


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def health(request):
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(datos_usuario(request.user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuarios_mini(request):
    """Lista corta para combos (conductor de un viaje). Visible a quien crea viajes."""
    from django.contrib.auth.models import User
    from cuentas.models import rol_obj_de

    qs = User.objects.filter(is_active=True).select_related('perfil__rol').order_by('username')
    rol = request.query_params.get('rol')
    if rol:
        qs = qs.filter(perfil__rol__codigo=rol)
    items = []
    for u in qs:
        asignado = rol_obj_de(u)
        items.append({
            'id': u.id,
            'username': u.username,
            'nombre': u.get_full_name() or u.username,
            'rol': asignado.codigo if asignado else None,
            'rol_label': asignado.nombre if asignado else '',
        })
    return Response(items)
