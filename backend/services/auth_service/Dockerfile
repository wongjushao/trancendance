FROM python:3.11-slim

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install requirements
COPY backend/services/auth_service/requirements.txt requirements.txt
RUN /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
RUN /opt/venv/bin/pip install --no-cache-dir uvicorn

COPY backend /app/backend

# Install openssl for cert generation
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Add the script
COPY scripts/generate-certs.sh /generate-certs.sh
RUN chmod +x /generate-certs.sh

# Before starting the app, generate certs
CMD ["/bin/sh", "-c", "/generate-certs.sh auth-service && cd /app && /opt/venv/bin/gunicorn -w 4 backend.services.auth_service.wsgi:app --bind 0.0.0.0:5001 --certfile /certs/auth-service/cert.crt --keyfile /certs/auth-service/cert.key"]
