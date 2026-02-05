.PHONY: install dev up down test lint clean build help \
        backend frontend admin db-migrate db-generate db-studio \
        type-check phase2-check logs

help:
	@echo "=== Development ==="
	@echo "  make install      - Install dependencies"
	@echo "  make dev          - Start infra + frontend + backend"
	@echo "  make up           - Start infrastructure only (Docker)"
	@echo "  make down         - Stop infrastructure"
	@echo ""
	@echo "=== Individual Apps ==="
	@echo "  make backend      - Start backend only (needs Docker)"
	@echo "  make frontend     - Start frontend only"
	@echo "  make admin        - Start admin panel only"
	@echo ""
	@echo "=== Database ==="
	@echo "  make db-migrate   - Run Prisma migrations"
	@echo "  make db-generate  - Generate Prisma client"
	@echo "  make db-studio    - Open Prisma Studio (DB GUI)"
	@echo ""
	@echo "=== Testing & Quality ==="
	@echo "  make test         - Run all tests"
	@echo "  make test-e2e     - Run E2E tests"
	@echo "  make lint         - Lint code"
	@echo "  make type-check   - TypeScript type check"
	@echo "  make phase2-check - Full Phase 2 validation (lint + types + e2e)"
	@echo ""
	@echo "=== Build & Deploy ==="
	@echo "  make build        - Build production bundles"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make logs         - Show Docker logs"

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

# === Individual Apps ===

# Backend only
backend: up
	pnpm --filter @joker/backend start:dev

# Frontend only
frontend:
	pnpm --filter @joker/frontend dev

# Admin panel only
admin:
	pnpm --filter @joker/admin dev

# === Database ===

# Run migrations
db-migrate: up
	cd apps/backend && pnpm prisma migrate dev

# Generate Prisma client
db-generate:
	cd apps/backend && pnpm prisma generate

# Open Prisma Studio
db-studio: up
	cd apps/backend && pnpm prisma studio

# === Quality Checks ===

# TypeScript type check
type-check:
	pnpm type-check

# Phase 2 validation (MUST pass before commit)
phase2-check: lint type-check test-e2e
	@echo "✅ Phase 2 checks passed!"

# === Logs ===

# Docker logs
logs:
	docker compose logs -f
