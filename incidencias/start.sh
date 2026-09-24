#!/usr/bin/env bash
set -e
DATA_DIR="${DATA_DIR:-/data}"
mkdir -p "$DATA_DIR"
if [ ! -f "$DATA_DIR/incidencias.db" ]; then
  cp /app/data/incidencias.db "$DATA_DIR/incidencias.db"
fi
export INCIDENCIAS_DB="$DATA_DIR/incidencias.db"
exec uvicorn app:app --host 0.0.0.0 --port "${PORT:-8080}"
