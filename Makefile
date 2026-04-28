# Developer Makefile for trancendance

WAF_CERTS = \
	waf/certs/localhost.crt \
	waf/certs/localhost.key \
	waf/certs/internal-ca.crt \
	waf/certs/internal-ca.key \
	waf/certs/internal-services.crt \
	waf/certs/internal-services.key

ensure-waf-certs:
	@if [ -z "$$(for cert in $(WAF_CERTS); do [ -s "$$cert" ] || echo "$$cert"; done)" ]; then \
		echo "WAF certs already exist."; \
	else \
		echo "Missing WAF certs. Generating local TLS certs..."; \
		./scripts/generate-local-certs.sh; \
	fi

start-server: ensure-waf-certs
	@echo "Starting stack in background..."
	@docker compose up --build -d

start-server-wsl2: down ensure-waf-certs
	@echo "Starting stack in background for WSL2..."
	@docker compose up --build -d --scale node-exporter=0

start-server-fg:
	@echo "Starting stack in foreground (attach)..."
	@docker compose up --build

build:
	@docker compose build

down:
	@docker compose down

fclean:
	@echo "Stopping all containers..."
	@docker stop $$(docker ps -aq) || true
	@docker rm $$(docker ps -aq) || true
	@docker compose down --rmi all --volumes --remove-orphans
	@docker network prune -f
	@docker system prune -a -f --volumes

logs:
	@docker compose logs --follow

migrate-up:
	@docker build -f backend/migrations/Dockerfile -t trancendance-migrate .
	@docker run --rm -e DATABASE_URL=$(shell grep SUPABASE_DB_URL .env | cut -d= -f2-) trancendance-migrate

migrate-down:
	@docker build -f backend/migrations/Dockerfile -t trancendance-migrate .
	@docker run --rm -e DATABASE_URL=$(shell grep SUPABASE_DB_URL .env | cut -d= -f2-) trancendance-migrate alembic -c backend/migrations/alembic.ini downgrade -1

.PHONY: ensure-waf-certs start-server start-server-wsl2 start-server-fg auth-local chat-local org-local build down logs migrate-up migrate-down