# Developer Makefile for trancendance

start-server:
	@echo "Starting stack in background..."
	@docker compose up --build -d

start-server-fg:
	@echo "Starting stack in foreground (attach)..."
	@docker compose up --build

backend-local:
	@echo "Run backend locally (ensure virtualenv activated if needed)"
	@python -m src.app

build:
	@docker compose build

down:
	@docker compose down

logs:
	@docker compose logs --follow

.PHONY: start-server start-server-fg backend-local build down logs