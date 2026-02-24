# Developer Makefile for trancendance

start-server:
	@echo "Starting stack in background..."
	@docker compose up --build -d

start-server-fg:
	@echo "Starting stack in foreground (attach)..."
	@docker compose up --build

build:
	@docker compose build

down:
	@docker compose down

fclean:
	@docker compose down --rmi all --volumes --remove-orphans

logs:
	@docker compose logs --follow

migrate-up:
	@docker build -f backend/migrations/Dockerfile -t trancendance-migrate .
	@docker run --rm -e DATABASE_URL=$(shell grep SUPABASE_DB_URL .env | cut -d= -f2-) trancendance-migrate

migrate-down:
	@docker build -f backend/migrations/Dockerfile -t trancendance-migrate .
	@docker run --rm -e DATABASE_URL=$(shell grep SUPABASE_DB_URL .env | cut -d= -f2-) trancendance-migrate alembic -c backend/migrations/alembic.ini downgrade -1

.PHONY: start-server start-server-fg auth-local chat-local org-local build down logs migrate-up migrate-down