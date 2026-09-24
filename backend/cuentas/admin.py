from django.contrib import admin

from .models import Perfil, PermisoRol, Rol


class PermisoRolInline(admin.TabularInline):
    model = PermisoRol
    extra = 0


@admin.register(Rol)
class RolAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'codigo', 'es_sistema', 'solo_asignados')
    list_filter = ('es_sistema', 'solo_asignados')
    search_fields = ('nombre', 'codigo')
    inlines = [PermisoRolInline]


@admin.register(Perfil)
class PerfilAdmin(admin.ModelAdmin):
    list_display = ('user', 'rol')
    list_filter = ('rol',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name')
