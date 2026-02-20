# Flask + React + Prometheus + Grafana (Docker Compose)

This minimal setup runs:
- Flask backend exposing Prometheus metrics at /metrics
- Static React-like frontend served by nginx (proxy /api to backend)
- Prometheus scraping the Flask metrics
- Grafana provisioned with Prometheus datasource and preloaded dashboards

Quick start:

```bash
cd /path/to/trancendance
cp .env.example .env
docker compose up --build
```

Environment configuration:
- All environment values are stored in `.env`.
- Update SMTP values in `.env` before testing Grafana notifications:
	- `GF_SMTP_HOST`
	- `GF_SMTP_USER`
	- `GF_SMTP_PASSWORD`
	- `GF_SMTP_FROM_ADDRESS`

Services:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (login from `.env`: `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD`)

Notes:
- The Flask app uses a simple Counter metric; adjust as needed.
- Grafana provisioning points to the Prometheus container name.
- Custom dashboard: **Backend Observability** (CPU, RAM, backend status, request rate)

Grafana

username : admin
password : admin