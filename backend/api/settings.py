from datetime import timedelta
from pathlib import Path
import os

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')


def _env_bool(name, default=False):
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ('1', 'true', 'yes', 'on')


def _env_list(name, default=()):
    raw = os.environ.get(name, '')
    if not raw.strip():
        return list(default)
    return [item.strip() for item in raw.split(',') if item.strip()]


SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-dev-only-cambiar-en-produccion')
DATABASE_URL = os.environ.get('DATABASE_URL', '').strip()
DEBUG = _env_bool('DEBUG', default=not bool(DATABASE_URL))

if not DEBUG and SECRET_KEY.startswith('django-insecure-'):
    raise ImproperlyConfigured('Define SECRET_KEY en producción.')

ALLOWED_HOSTS = _env_list('ALLOWED_HOSTS', ('localhost', '127.0.0.1'))
render_host = os.environ.get('RENDER_EXTERNAL_HOSTNAME', '').strip()
if render_host and render_host not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_host)

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'mantenimiento',
    'ruta',
    'cuentas.apps.CuentasConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

_default_origins = (
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
)
CORS_ALLOWED_ORIGINS = _env_list('CORS_ALLOWED_ORIGINS', _default_origins)
frontend_origin = os.environ.get('FRONTEND_ORIGIN', '').strip().rstrip('/')
if frontend_origin and frontend_origin not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(frontend_origin)

CORS_ALLOWED_ORIGIN_REGEXES = [
    r'^https://.*\.vercel\.app$',
]

CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)
if render_host:
    CSRF_TRUSTED_ORIGINS.append(f'https://{render_host}')
CSRF_TRUSTED_ORIGINS.extend(_env_list('CSRF_TRUSTED_ORIGINS'))

ROOT_URLCONF = 'api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'api.wsgi.application'

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=int(os.environ.get('DB_CONN_MAX_AGE', '0')),
            conn_health_checks=True,
            ssl_require=_env_bool('DB_SSL_REQUIRE', default=True),
        )
    }
    if 'pooler.supabase.com' in DATABASE_URL:
        DATABASES['default']['DISABLE_SERVER_SIDE_CURSORS'] = True
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-pe'
TIME_ZONE = 'America/Lima'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
        'cuentas.permissions.HasModulo',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
}

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_SSL_REDIRECT = _env_bool('SECURE_SSL_REDIRECT', default=True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
