.PHONY: install dev up down test lint clean build help

help:
	@echo "Available commands:"
	@echo "  make install  - Install dependencies"
	@echo "  make dev      - Start infrastructure (Redis/DB) and run app in dev mode"
	@echo "  make up       - Start infrastructure only (Docker)"
	@echo "  make down     - Stop infrastructure"
	@echo "  make test     - Run all tests"
	@echo "  make lint     - Lint code"
	@echo "  make clean    - Clean build artifacts"
	@echo "  make build    - Build production bundles"

install:
	pnpm install

# Запуск инфраструктуры (БД + Redis)
up:
	docker compose up -d redis postgres

# Остановка инфраструктуры
down:
	docker compose down

# Полный запуск для разработки (Инфраструктура + Приложение)
dev: up
	pnpm dev

# Тесты
test:
	pnpm test

# E2E тесты
test-e2e:
	pnpm --filter @joker/frontend test:e2e

# Линтинг
lint:
	pnpm lint

# Сборка
build:
	pnpm build

# Очистка
clean:
	pnpm clean
