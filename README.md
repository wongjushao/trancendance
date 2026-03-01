# Trancendance Stack (Flask Microservices + Next.js + Prometheus + Grafana)

This repository runs a loosely-coupled service architecture in Docker Compose:
- `auth-service`: Supabase token verification + profile sync endpoints
- `chat-service`: chat message read/write endpoints
- `org-service`: organization read/write endpoints
- `frontend`: Next.js app with `/api/*` rewrites to backend services
- `prometheus`: metrics collection
- `grafana`: dashboards and alerting
- `node-exporter`: host metrics exporter

## Technology stack

- Frontend:
	- Next.js 14 + React 18
	- Built and served from `node:20.19-alpine`
	- Uses Next.js rewrites for backend proxying
- Backend:
	- 3 independent Flask services (`auth`, `chat`, `org`)
	- Run with Gunicorn in `python:3.11-slim`
	- Expose REST endpoints + `/metrics`
- Database and auth:
	- Supabase Auth validates bearer tokens (`auth-service`)
	- Supabase Postgres accessed via SQLAlchemy (`DATABASE_URL`)
	- Shared models in `backend/common/models`, migrations in one Alembic tree
- Monitoring:
	- Prometheus scrapes service and node-exporter metrics
	- Grafana is provisioned with datasource, dashboards, and alerting config

## Request/data flow

1. Client calls the frontend on port `3000`.
2. Frontend routes `/api/auth/*`, `/api/chat/*`, `/api/org/*` to backend services via Next.js rewrites.
3. Protected auth operations validate bearer tokens against Supabase Auth.
4. Services read/write Supabase Postgres through SQLAlchemy.
5. Prometheus scrapes `/metrics`; Grafana visualizes and alerts.

## Program structure

```text
trancendance/
├── DBdesign.md
├── docker-compose.yml
├── Makefile
├── README.md
├── backend/
│   ├── common/
│   │   ├── db.py
│   │   └── models/
│   ├── migrations/
│   │   ├── initial_schema.sql
│   │   └── versions/
│   └── services/
│       ├── auth_service/
│       ├── chat_service/
│       └── org_service/
├── frontend/
│   ├── Dockerfile
│   ├── next.config.mjs
│   ├── package.json
│   ├── pages/
│   └── src/
├── grafana/
│   ├── dashboards/
│   └── provisioning/
└── prometheus/
    └── prometheus.yml
```

## Quick start

```bash
cd /path/to/trancendance
docker compose up --build
```

Useful Make targets:
- `make start-server` (detached)
- `make start-server-fg` (foreground)
- `make down`
- `make logs`

Run frontend dev server profile (hot reload):

```bash
docker compose --profile dev up frontend-dev auth-service chat-service org-service
```

## Endpoints

- Frontend (Next.js): `http://localhost:3000`
- Frontend dev profile: `http://localhost:5173`
- Auth service (direct): `http://localhost:5001`
- Chat service (direct): `http://localhost:5002`
- Org service (direct): `http://localhost:5003`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

Frontend proxy routes (`frontend/next.config.mjs`):
- `/api/auth/:path*` -> `http://auth-service:5001/:path*`
- `/api/chat/:path*` -> `http://chat-service:5002/:path*`
- `/api/org/:path*` -> `http://org-service:5003/:path*`

Common service endpoints:
- Auth: `POST /verify`, `POST /profiles/sync`, `GET /health`, `GET /metrics`
- Chat: `GET|POST /messages`, `GET /health`, `GET /metrics`
- Org: `GET|POST /orgs`, `GET /health`, `GET /metrics`

## Environment configuration

Runtime values are read from `.env`.

Core variables:
- `AUTH_SUPABASE_URL`
- `AUTH_SUPABASE_ANON_KEY`
- `SUPABASE_DB_URL` (injected as `DATABASE_URL` to backend services)

Grafana variables:
- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `GF_SMTP_ENABLED`
- `GF_SMTP_HOST`
- `GF_SMTP_USER`
- `GF_SMTP_PASSWORD`
- `GF_SMTP_FROM_ADDRESS`
- `GF_SMTP_FROM_NAME`
- `GF_SMTP_SKIP_VERIFY`
- `GF_SMTP_STARTTLS_POLICY`
- `GF_SMTP_EHLO_IDENTITY`

## Migrations

Use Makefile helpers:
- `make migrate-up`
- `make migrate-down`

Migrations are centralized under `backend/migrations/`.

## Notes

- Services are isolated by image/runtime/port and connected by Docker network.
- Monitoring uses Prometheus scrape targets for all backend `/metrics` endpoints.
- Grafana datasource/dashboards/alerting are provisioned from `grafana/provisioning/`.