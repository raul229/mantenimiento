from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Perfil, rol_de

MODULOS = {
    'dashboard': {Perfil.ADMINISTRADOR, Perfil.OPERACIONES, Perfil.CONDUCTOR},
    'clientes': {Perfil.ADMINISTRADOR, Perfil.OPERACIONES},
    'viajes': {Perfil.ADMINISTRADOR, Perfil.OPERACIONES, Perfil.CONDUCTOR},
    'recojos': {Perfil.ADMINISTRADOR, Perfil.OPERACIONES, Perfil.CONDUCTOR},
    'flota': {Perfil.ADMINISTRADOR, Perfil.OPERACIONES},
    'emisor': {Perfil.ADMINISTRADOR, Perfil.OPERACIONES},
    'guias': {Perfil.ADMINISTRADOR, Perfil.OPERACIONES},
    'usuarios': {Perfil.ADMINISTRADOR},
}

def puede(rol, modulo):
    if not rol or not modulo:
        return False
    return rol in MODULOS.get(modulo, set())


class HasModulo(BasePermission):
    """Si la vista define `modulo`, exige ese permiso. El conductor no crea viajes."""

    def has_permission(self, request, view):
        modulo = getattr(view, 'modulo', None)
        if not modulo:
            return True
        rol = rol_de(request.user)
        if not puede(rol, modulo):
            return False
        if rol == Perfil.CONDUCTOR and request.method not in SAFE_METHODS:
            if modulo == 'viajes' and request.method == 'PATCH':
                return True
            if modulo == 'recojos' and request.method in ('POST', 'PATCH'):
                return True
            return False
        return True
