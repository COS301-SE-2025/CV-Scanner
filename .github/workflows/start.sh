#!/bin/bash
echo "[start.sh] Starting gunicorn on port ${PORT}"
exec gunicorn --workers 1 --timeout 300 --bind 0.0.0.0:${PORT} app:app
