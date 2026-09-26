from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .api_urls import router
from .auth_views import health, me, usuarios_mini
from ruta.dashboard import DashboardView
from ruta.views import ConfiguracionEmisorView
from mantenimiento.views import AlertasTallerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health),
    path('api/auth/token/', TokenObtainPairView.as_view()),
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    path('api/auth/me/', me),
    path('api/usuarios/', usuarios_mini),
    path('api/dashboard/', DashboardView.as_view()),
    path('api/configuracion-emisor/', ConfiguracionEmisorView.as_view()),
    path('api/alertas-taller/', AlertasTallerView.as_view()),
    path('api/', include(router.urls)),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
