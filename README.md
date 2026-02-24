# Loosely-Coupled Backend Services + Frontend + Prometheus + Grafana

This setup runs isolated backend services behind the frontend proxy:
- `auth-service` (token verification with Supabase Auth)
- `chat-service` (chat messages with SQLAlchemy ORM)
- `org-service` (organization data with SQLAlchemy ORM)
- Static frontend served by nginx
- Prometheus scraping all backend service metrics
- Grafana with provisioned datasource/dashboards

## Technology stack and roles

- Frontend:
	- UI is a static web page (`index.html`).
	- Built in Docker with Node.js (`node:20-alpine`) stage.
	- Served at runtime by Nginx (`nginx:stable-alpine`).
- Backend:
	- 3 independent Flask microservices (`auth-service`, `chat-service`, `org-service`).
	- Each service runs with Gunicorn in Python 3.11 Docker images.
	- Services expose REST endpoints and `/metrics` for monitoring.
- Database and auth:
	- Supabase is used for authentication token validation (Auth API).
	- Supabase Postgres is accessed directly with SQLAlchemy ORM via `DATABASE_URL`.
	- Shared models are managed in one place and migrations are unified under one Alembic tree.
- Monitoring:
	- Prometheus collects metrics from backend services and node-exporter.
	- Grafana reads Prometheus data to display dashboards and send alerts.

## Supabase auth and data flow

1. User sends request from frontend to `/api/...` on the frontend container.
2. Nginx forwards the request to the matching backend service.
3. For protected endpoints, backend verifies the user token with Supabase Auth.
4. If token is valid, backend reads/writes data in Supabase tables.
5. Backend returns response to frontend.

## Program structure

```text
trancendance/
├── DBdesign.md
├── docker-compose.yml
├── Makefile
├── README.md
├── backend/
│   ├── README.md
│   ├── common/
│   │   ├── db.py
│   │   └── models/
│   ├── migrations/
│   └── services/
│       ├── auth_service/
│       │   ├── app.py
│       │   ├── Dockerfile
│       │   └── requirements.txt
│       ├── chat_service/
│       │   ├── app.py
│       │   ├── Dockerfile
│       │   └── requirements.txt
│       └── org_service/
│           ├── app.py
│           ├── Dockerfile
│           └── requirements.txt
├── frontend/
│   ├── default.conf
│   ├── Dockerfile
│   ├── index.html
│   └── package.json
├── grafana/
│   ├── dashboards/
│   │   └── Node Exporter-1771620042641.json
│   └── provisioning/
│       ├── alerting/
│       │   ├── alert-rules-1771776420679.yaml
│       │   └── contact-points-1771620370160.yaml
│       ├── dashboards/
│       │   └── dashboards.yml
│       ├── datasources/
│       │   └── prometheus.yml
│       └── plugins/
└── prometheus/
	└── prometheus.yml
```

## Quick start

```bash
cd /path/to/trancendance
cp .env.example .env
docker compose up --build
```

This setup runs fully in Docker containers:
- Flask services run in `python:3.11-slim` images.
- Frontend build uses `node:20-alpine` in Docker, then serves with nginx.
- You do not need local Node.js or Flask installed on your machine.

## Service endpoints

- Frontend: http://localhost:3000
- Auth service (direct): http://localhost:5001
- Chat service (direct): http://localhost:5002
- Org service (direct): http://localhost:5003
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001

Frontend proxy routes:
- `POST /api/auth/verify` -> `auth-service /verify`
- `GET|POST /api/chat/messages` -> `chat-service /messages`
- `GET|POST /api/org/orgs` -> `org-service /orgs`

## Environment configuration

All runtime values are read from `.env`.

Supabase variables:
- `AUTH_SUPABASE_URL`
- `AUTH_SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL` (injected as `DATABASE_URL` to all backend services)

Grafana variables (for SMTP + admin):
- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `GF_SMTP_HOST`
- `GF_SMTP_USER`
- `GF_SMTP_PASSWORD`
- `GF_SMTP_FROM_ADDRESS`

## Notes

- Each backend service has an isolated image, runtime, port, and environment.
- All DB schema changes are managed centrally via `backend/migrations/`.
- Prometheus scrapes `/metrics` on each service.
- Default Grafana login is from `.env`.