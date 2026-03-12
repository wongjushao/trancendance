# Developer Makefile for trancendance

start-server:
	@echo "Starting stack in background..."
	@docker compose up --build -d

start-server-wsl2:
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

.PHONY: start-server start-server-wsl2 start-server-fg auth-local chat-local org-local build down logs migrate-up migrate-down