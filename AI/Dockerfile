# Start from slim Python base
FROM python:3.10-slim

# keep Python output unbuffered and avoid pycache
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# default port (can be overridden by WEBSITES_PORT)
ENV PORT=5000

WORKDIR /app

# system deps (poppler for PDF parsing if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Optional: pre-download spaCy model if listed in requirements or handled in app
# RUN python -m spacy download en_core_web_sm || true

COPY . .

EXPOSE ${PORT}

# Use gunicorn with uvicorn workers; fallback port 5000 when PORT not set
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-5000} -k uvicorn.workers.UvicornWorker --workers 2 --threads 4 --timeout 300 app:app"]
