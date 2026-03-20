FROM python:3.11-slim

# Install openssl for cert generation
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Add the script
COPY scripts/generate-certs.sh /generate-certs.sh
RUN chmod +x /generate-certs.sh

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/services/org_service/requirements.txt .
RUN /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend

# Before starting the app, generate certs
CMD ["/bin/sh", "-c", "/generate-certs.sh org-service && cd /app && /opt/venv/bin/gunicorn -w 4 backend.services.org_service.wsgi:app --bind 0.0.0.0:5003 --certfile /certs/org-service/cert.crt --keyfile /certs/org-service/cert.key"]
