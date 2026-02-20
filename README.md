# Flask + React + Prometheus + Grafana (Docker Compose)

This minimal setup runs:
- Flask backend exposing Prometheus metrics at /metrics
- Static React-like frontend served by nginx (proxy /api to backend)
- Prometheus scraping the Flask metrics
- Grafana provisioned with Prometheus datasource and preloaded dashboards

Quick start (Windows PowerShell):

```powershell
cd c:\Users\wongj\OneDrive\Desktop\trancendance
docker compose up --build
```

Services:
- Backend: http://localhost:5000
- Frontend: http://localhost:3000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (login: admin/admin)

Notes:
- The Flask app uses a simple Counter metric; adjust as needed.
- Grafana provisioning points to the Prometheus container name.
- Custom dashboard: **Backend Observability** (CPU, RAM, backend status, request rate)

Grafana

username : admin
password : admin