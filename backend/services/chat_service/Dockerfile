FROM python:3.11-slim

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/services/chat_service/requirements.txt .
RUN /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

RUN apt-get update \
    && apt-get install -y curl ca-certificates \
    && curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | bash \
    && apt-get install -y infisical \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY backend /app/backend

CMD ["infisical", "run", "--projectId=648fdbd7-c908-43c5-97a2-ae62d60e3422", "--env=dev", "--", "/opt/venv/bin/gunicorn", "-k", "eventlet", "-w", "1", "-b", "0.0.0.0:5002", "--certfile", "/etc/trancendance-certs/internal-services.crt", "--keyfile", "/etc/trancendance-certs/internal-services.key", "backend.services.chat_service.app:app"]
