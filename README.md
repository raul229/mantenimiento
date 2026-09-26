# Sermin

Gestión de flota, clientes y rutas. Backend Django y frontend React en el mismo repo.

**Desarrollo:** API `8000` o `8001`, Vite `5174`, SQLite.

**Producción:** frontend en Vercel, API en Render, Postgres en Supabase.

## Backend (desarrollo)

```bash
cd backend
cp .env.example .env          # DATABASE_URL vacío = SQLite
uv sync
uv run python manage.py migrate
uv run python manage.py createsuperuser
uv run python manage.py runserver 8000
```

## Frontend (desarrollo)

```bash
cd frontend
cp .env.example .env          # VITE_API_URL=http://localhost:8000/api
npm install
npm run dev
```

App: http://localhost:5174/

## Despliegue

### 1. Supabase (Postgres)

1. Crea un proyecto en [Supabase](https://supabase.com).
2. **Project Settings → Database → Connection string → URI**.
3. Usa el **pooler** (puerto `6543`, modo *Transaction*) para Render.
4. Sustituye `[YOUR-PASSWORD]` por la contraseña de la base.
5. La URI queda así: `postgresql://postgres.xxxx:CLAVE@aws-0-....pooler.supabase.com:6543/postgres`

### 2. Render (API)

1. New → Web Service → este repo.
2. **Root Directory:** `backend`
3. **Build:** `pip install uv && uv sync --frozen --no-dev && uv run python manage.py collectstatic --no-input && uv run python manage.py migrate`
4. **Start:** `uv run gunicorn api.wsgi:application --bind 0.0.0.0:$PORT --timeout 120`
5. Variables:

| Variable | Valor |
|---|---|
| `SECRET_KEY` | una clave larga aleatoria |
| `DEBUG` | `False` |
| `DATABASE_URL` | URI de Supabase |
| `FRONTEND_ORIGIN` | `https://tu-app.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | `https://tu-app.vercel.app` |
| `ALLOWED_HOSTS` | `tu-servicio.onrender.com` |
| `DB_SSL_REQUIRE` | `True` |
| `DB_CONN_MAX_AGE` | `0` (pooler de Supabase) |

6. Tras el primer deploy: **Shell** en Render y `python manage.py createsuperuser`.

También puedes aplicar el blueprint `render.yaml` (las URLs de Supabase y Vercel hay que pegarlas a mano).

### 3. Vercel (frontend)

1. New Project → este repo.
2. **Root Directory:** `frontend`
3. Framework: Vite. Build `npm run build`, salida `dist`.
4. Variable de entorno (en el build):

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://tu-servicio.onrender.com/api` |

5. Redeploy si cambias `VITE_API_URL` (Vite la incrusta al compilar).

`FRONTEND_ORIGIN` en Render debe coincidir con la URL de Vercel (sin barra final).

## Notas

- Sin `DATABASE_URL` Django usa `backend/db.sqlite3`. Con `DATABASE_URL` usa Postgres.
- Las fotos y PDFs se guardan en disco de Render (se pierden si el servicio se recrea). Un disco persistente o storage de Supabase es el siguiente paso.
- `GET /api/health/` no pide login; Render lo usa para saber si el servicio está vivo.
