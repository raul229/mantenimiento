# Sermin

Gestión de flota, clientes y rutas. Backend Django y frontend React en el mismo repo.

**Puertos de desarrollo** (para no chocar con otros proyectos): API `8001`, Vite `5174`.

## Backend

```bash
cd backend
./venv/bin/pip install -r requeriments.txt
./venv/bin/python manage.py migrate
./venv/bin/python manage.py createsuperuser   # si aún no hay usuario
./venv/bin/python manage.py runserver 8001
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5174/

Credenciales: el usuario de Django (`createsuperuser` o uno existente).
