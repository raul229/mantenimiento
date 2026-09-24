from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import PermisoRol, nivel_de, solo_asignados

CATALOGO_MODULOS = [
    {'id': 'dashboard', 'label': 'Dashboard', 'escribe': False},
    {'id': 'clientes', 'label': 'Clientes', 'escribe': True},
    {'id': 'viajes', 'label': 'Rutas y viajes', 'escribe': True},
    {'id': 'recojos', 'label': 'Recojos', 'escribe': True},
    {'id': 'gastos', 'label': 'Caja y gastos', 'escribe': True},
    {'id': 'flota', 'label': 'Vehículos', 'escribe': True},
    {'id': 'emisor', 'label': 'Datos de emisión', 'escribe': True},
    {'id': 'guias', 'label': 'Guías de remisión', 'escribe': True},
    {'id': 'usuarios', 'label': 'Usuarios y roles', 'escribe': True},
]

IDS_MODULOS = {item['id'] for item in CATALOGO_MODULOS}
ESCRIBE_MODULOS = {item['id'] for item in CATALOGO_MODULOS if item['escribe']}


def puede(user, modulo):
    return nivel_de(user, modulo) in PermisoRol.NIVELES_LECTURA


def puede_escribir(user, modulo):
    return nivel_de(user, modulo) in PermisoRol.NIVELES_ESCRITURA


def puede_eliminar(user, modulo):
    return nivel_de(user, modulo) == PermisoRol.ELIMINAR


class HasModulo(BasePermission):
    """Si la vista define `modulo`, exige ver, editar o eliminar según el método."""

    def has_permission(self, request, view):
        modulo = getattr(view, 'modulo', None)
        if not modulo:
            return True
        nivel = nivel_de(request.user, modulo)
        if not nivel:
            return False
        if request.method in SAFE_METHODS:
            return True
        if request.method == 'DELETE':
            if getattr(view, 'escribir_incluye_borrar', False):
                return nivel in PermisoRol.NIVELES_ESCRITURA
            return nivel == PermisoRol.ELIMINAR
        if nivel in PermisoRol.NIVELES_ESCRITURA:
            return True
        if (
            modulo == 'viajes'
            and request.method == 'PATCH'
            and solo_asignados(request.user)
        ):
            return True
        return False
