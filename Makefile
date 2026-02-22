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

.PHONY: start-server start-server-fg auth-local chat-local org-local build down logs