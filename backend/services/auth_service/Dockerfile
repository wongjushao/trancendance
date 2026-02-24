FROM python:3.11-slim

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/services/auth_service/requirements.txt .
RUN /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend

CMD ["/opt/venv/bin/gunicorn", "-b", "0.0.0.0:5001", "backend.services.auth_service.app:app"]
