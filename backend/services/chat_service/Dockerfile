FROM python:3.11-slim

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/services/chat_service/requirements.txt .
RUN /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend

# Single eventlet worker. Do NOT scale this to >1 unless REDIS_URL is set
# AND the in-memory sid/rate-limit maps in handlers.py have been moved to Redis.
CMD ["/opt/venv/bin/gunicorn", \
     "--worker-class", "eventlet", \
     "--workers", "1", \
     "--worker-connections", "1000", \
     "--bind", "0.0.0.0:5002", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "backend.services.chat_service.wsgi:app"]