#!/usr/bin/env bash
set -e
chmod +x start.sh  # ensure executable before zipping
python startup_probe.py || echo "Probe failed"
echo "[start.sh] Launching gunicorn..."
exec gunicorn --workers 1 --timeout 300 --bind 0.0.0.0:${PORT:-8000} app:app
