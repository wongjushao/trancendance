# Trancendance Stack (Flask Microservices + Next.js + Prometheus + Grafana)

This repository runs a loosely-coupled service architecture in Docker Compose:
- `waf-proxy`: Nginx/ModSecurity edge proxy for HTTPS traffic
- `auth-service`: Supabase token verification + profile sync endpoints
- `chat-service`: chat message read/write endpoints
- `org-service`: organization read/write endpoints
- `notification-service`: notification endpoints
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
	- 4 independent Flask services (`auth`, `chat`, `org`, `notification`)
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

1. Client calls `https://localhost` through the WAF proxy.
2. WAF terminates local TLS and routes frontend, backend API, Prometheus, and Grafana traffic.
3. Frontend routes `/api/auth/*`, `/api/chat/*`, `/api/org/*`, and `/api/notification-service/*` to backend services.
4. Protected auth operations validate bearer tokens against Supabase Auth.
5. Services read/write Supabase Postgres through SQLAlchemy.
6. Prometheus scrapes `/metrics`; Grafana visualizes and alerts.

## Program structure

```text
trancendance/
├── api-docs.md
├── DBdesign.md
├── docker-compose.yml
├── Makefile
├── README.md
├── wjun-note
├── backend/
│   ├── README.md
│   ├── common/
│   │   ├── db.py
│   │   └── models/
│   │       ├── base.py
│   │       └── entities.py
│   ├── migrations/
│   │   ├── alembic.ini
│   │   ├── Dockerfile
│   │   ├── env.py
│   │   ├── initial_schema.sql
│   │   └── versions/
│   └── services/
│       ├── auth_service/
│       │   ├── app.py
│       │   ├── Dockerfile
│       │   └── wsgi.py
│       ├── chat_service/
│       │   ├── app.py
│       │   ├── Dockerfile
│       │   └── wsgi.py
│       └── org_service/
│           ├── app.py
│           ├── Dockerfile
│           └── wsgi.py
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (main)/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── lms/
│   │   └── ui/
│   ├── lib/
│   ├── public/
│   ├── types/
│   ├── Dockerfile
│   ├── next.config.ts
│   ├── package.json
│   └── README.md
├── grafana/
│   ├── dashboards/
│   └── provisioning/
└── prometheus/
    └── prometheus.yml
```

## Quick start

```bash
cd /path/to/trancendance
make start-server
```

`make start-server` checks for local WAF TLS certs in `waf/certs` before starting Docker. If any required cert/key is missing or empty, it runs `./scripts/generate-local-certs.sh` automatically.

Useful Make targets:
- `make start-server` (detached)
- `make start-server-wsl2` (detached, disables `node-exporter`)
- `make start-server-fg` (foreground)
- `make down`
- `make logs`

To generate the local WAF certs manually:

```bash
./scripts/generate-local-certs.sh
```

Run frontend dev server profile (hot reload):

```bash
docker compose --profile dev up frontend-dev auth-service chat-service org-service
```

## Endpoints

- Frontend (Next.js): `https://localhost`
- Frontend dev profile: `http://localhost:5173`
- Auth service (internal): `https://auth-service:5001`
- Chat service (internal): `https://chat-service:5002`
- Org service (internal): `https://org-service:5003`
- Notification service (internal): `https://notification-service:5004`
- Prometheus: `https://localhost/prometheus/`
- Grafana: `https://localhost/grafana/`

Frontend proxy routes (`frontend/next.config.ts`):
- `/api/auth/*` -> `https://auth-service:5001/*`
- `/api/chat/*` -> `https://chat-service:5002/*`
- `/api/org/*` -> `https://org-service:5003/*`
- `/api/auth-service/*` -> `https://auth-service:5001/api/auth-service/*`
- `/api/notification-service/*` -> `https://notification-service:5004/*`

Common service endpoints:
- Auth: `POST /api/auth-service/register` (requires `Authorization: Bearer <api-key>`), `GET /api/auth-service/health`, `GET /api/auth-service/metrics`, `GET /api/auth-service/docs`
- Chat: `GET|POST /messages`, `GET /health`, `GET /metrics`
- Org: `GET|POST /orgs`, `GET /health`, `GET /metrics`

## Environment configuration

Runtime values are read from `.env`.

Core variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
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
