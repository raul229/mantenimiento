#!/usr/bin/env bash
set -o errexit
cd "$(dirname "$0")/backend"
if ! command -v uv >/dev/null 2>&1; then
  pip install uv
fi
uv sync --frozen --no-dev
uv run python manage.py collectstatic --no-input
uv run python manage.py migrate
