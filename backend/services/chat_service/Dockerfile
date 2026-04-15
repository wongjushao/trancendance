FROM python:3.11-slim

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY backend/services/chat_service/requirements.txt .
RUN /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

COPY backend /app/backend

CMD ["/opt/venv/bin/gunicorn", "--worker-class", "gthread", "--threads", "8", "--bind", "0.0.0.0:5002", "backend.services.chat_service.wsgi:app"]
