FROM python:3.11-slim

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir alembic SQLAlchemy psycopg2-binary

COPY backend /app/backend

CMD ["alembic", "-c", "backend/migrations/alembic.ini", "upgrade", "head"]
