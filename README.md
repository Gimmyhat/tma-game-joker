# TMA Joker Game

Telegram Mini App - Multiplayer Joker Card Game.
Monorepo using React/Vite (Frontend), NestJS/Socket.io (Backend), and shared logic.

## Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 8.15.0
- **Docker**: For Redis and PostgreSQL

## Quick Start (Recommended)

We use a `Makefile` to simplify development workflows.

```bash
# 1. Install dependencies
make install

# 2. Start Infrastructure (Redis/DB) AND Application
make dev
```

The application will be available at:

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

## Available Commands

| Command      | Description                                       |
| ------------ | ------------------------------------------------- |
| `make dev`   | **Start everything** (Infra + Backend + Frontend) |
| `make up`    | Start only infrastructure (Docker)                |
| `make down`  | Stop infrastructure                               |
| `make test`  | Run all tests                                     |
| `make build` | Build for production                              |
| `make lint`  | Run linter                                        |
| `make clean` | Clean build artifacts                             |

## Manual Start

If you don't have `make` installed:

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Start Infrastructure**:

   ```bash
   docker compose up -d
   ```

3. **Start Application**:
   ```bash
   pnpm dev
   ```

## Project Structure

- `apps/frontend`: React 18 + Vite + Zustand
- `apps/backend`: NestJS + Socket.io + Redis
- `packages/shared`: Shared game logic and types
