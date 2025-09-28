# Start from slim Python base
FROM python:3.10-slim

# Prevent Python from writing .pyc files / buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
# Default port environment variable (Azure provides WEBSITES_PORT)
ENV PORT=80

# Set working directory
WORKDIR /app

# Install system deps (needed for pdfminer, spacy, docx etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Download spacy model if you want it baked in
RUN python -m spacy download en_core_web_sm || true

# Copy app source
COPY . .

# Expose port 80 (Azure requirement)
EXPOSE ${PORT}

# Use gunicorn binding to the runtime PORT
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT} --workers 2 --threads 4 --timeout 300 app:app"]
