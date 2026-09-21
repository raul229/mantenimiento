from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    u = request.user
    return Response({
        'id': u.id,
        'username': u.username,
        'first_name': u.first_name,
        'last_name': u.last_name,
        'email': u.email,
        'nombre': u.get_full_name() or u.username,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usuarios(request):
    data = []
    for u in User.objects.filter(is_active=True).order_by('username'):
        data.append({
            'id': u.id,
            'username': u.username,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'nombre': u.get_full_name() or u.username,
        })
    return Response(data)
