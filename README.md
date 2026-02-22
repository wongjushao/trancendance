# Loosely-Coupled Backend Services + Frontend + Prometheus + Grafana

This setup runs isolated backend services behind the frontend proxy:
- `auth-service` (token verification with Supabase Auth)
- `chat-service` (chat messages with Supabase table)
- `org-service` (organization data with Supabase table)
- Static frontend served by nginx
- Prometheus scraping all backend service metrics
- Grafana with provisioned datasource/dashboards

## Quick start

```bash
cd /path/to/trancendance
cp .env.example .env
docker compose up --build
```

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
- `CHAT_SUPABASE_URL`
- `CHAT_SUPABASE_SERVICE_ROLE_KEY`
- `CHAT_TABLE` (default: `chat_messages`)
- `ORG_SUPABASE_URL`
- `ORG_SUPABASE_SERVICE_ROLE_KEY`
- `ORG_TABLE` (default: `organizations`)

Grafana variables (for SMTP + admin):
- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `GF_SMTP_HOST`
- `GF_SMTP_USER`
- `GF_SMTP_PASSWORD`
- `GF_SMTP_FROM_ADDRESS`

## Notes

- Each backend service has an isolated image, runtime, port, and environment.
- Prometheus scrapes `/metrics` on each service.
- Default Grafana login is from `.env`.