# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-25T11:14:00Z  
**Refactored:** 2026-01-26 (Architecture V2)  
**Phase:** 2 (MVP delivered, new features in development)

---

## 🚨 CRITICAL: PHASE 2 ACTIVE

**MVP уже сдан заказчику и работает в production.**

### Для агентов С поддержкой workflows:
```
/dev                    # Полный цикл разработки
/phase2-check           # Быстрая проверка перед коммитом
```

### Для агентов БЕЗ поддержки workflows:

**ПЕРЕД любым изменением кода выполни:**

1. **Проверь protected components** (см. таблицу ниже)
2. **Запусти тесты после изменений:**
   ```bash
   pnpm lint && pnpm type-check && pnpm test:e2e
   ```
3. **Если тесты упали — ОТКАТИ изменения**

### Protected Components (🔒 НЕ МЕНЯТЬ)

| Component | Files | Status |
|-----------|-------|--------|
| Game Loop | `packages/shared/src/logic/*` | 🔒 LOCKED |
| Move Validation | `SharedMoveValidator`, `TrickLogic` | 🔒 LOCKED |
| Scoring | `ScoringService` | 🔒 LOCKED |
| WebSocket Events | `game.gateway.ts` (event signatures) | 🔒 LOCKED |
| Player UI | `apps/frontend/src/components/Game*` | ⚠️ CAREFUL |

### Golden Rule
```
Новый функционал НЕ ДОЛЖЕН ломать существующий MVP.
Если сомневаешься — ОСТАНОВИСЬ и спроси.
```

Полные правила: [docs/PHASE_2_DEVELOPMENT_GUIDE.md](docs/PHASE_2_DEVELOPMENT_GUIDE.md)

---

## OVERVIEW

Telegram Mini App - multiplayer Joker card game. pnpm monorepo: React/Vite frontend + NestJS/Socket.io backend + shared types package.

## STRUCTURE

```
tma_game_joker/
├── apps/
│   ├── frontend/          # React 18 + Vite + Zustand + TailwindCSS
│   └── backend/           # NestJS + Socket.io + Redis
├── packages/
│   └── shared/            # @joker/shared - types, constants, game logic (SINGLE SOURCE OF TRUTH)
├── docs/                  # Technical specs (Russian)
├── scripts/               # Build/deploy automation
└── docker-compose*.yml    # Dev and prod orchestration
```

## WHERE TO LOOK

| Task                  | Location                                           | Notes                             |
| --------------------- | -------------------------------------------------- | --------------------------------- |
| Game types/constants  | `packages/shared/src/index.ts`                     | Enums, interfaces, GAME_CONSTANTS |
| Game logic (shared)   | `packages/shared/src/logic/`                       | TrickLogic, SharedMoveValidator   |
| Backend Orchestration | `apps/backend/src/game/services/`                  | GameProcessService, RoomManager   |
| Frontend state        | `apps/frontend/src/store/`                         | gameStore (root), slices/         |
| Socket events         | `apps/frontend/src/lib/socket.ts`                  | Typed client events               |
| Telegram integration  | `apps/frontend/src/providers/TelegramProvider.tsx` | SDK init, dev fallback            |
| WebSocket gateway     | `apps/backend/src/gateway/game.gateway.ts`         | Transport layer (thin wrapper)    |
| Bot AI                | `apps/backend/src/bot/`                            | Strategy pattern                  |

## CODE MAP

| Symbol                | Type      | Location              | Role                                       |
| --------------------- | --------- | --------------------- | ------------------------------------------ |
| `GameState`           | interface | shared/index.ts       | Core game state shape                      |
| `TrickLogic`          | class     | shared/logic          | Trick winner determination (Client+Server) |
| `SharedMoveValidator` | class     | shared/logic          | Move validation rules (Client+Server)      |
| `GameEngineService`   | class     | backend/game/services | Functional state transitions (Pure logic)  |
| `GameProcessService`  | class     | backend/game/services | Orchestrator (Timers, Bots, Events)        |
| `RoomManager`         | class     | backend/game/services | Matchmaking, Room persistence (Redis)      |
| `GameGateway`         | class     | backend/gateway       | Socket routing only                        |
| `useGameStore`        | hook      | frontend/store        | Root store (combines slices)               |

## CONVENTIONS

### Monorepo

- Package manager: **pnpm 8.15+** (workspace protocol)
- Shared imports: `import { GameState } from '@joker/shared'`
- **Logic Sharing**: Use `@joker/shared` for ALL core game rules. Never duplicate logic.

### Code Style

- Prettier: single quotes, semicolons, 100 char lines, trailing commas
- TypeScript: `strict: true` everywhere, no `any`
- Path aliases: `@/*` → `src/*` in apps

### Frontend

- **State Slices**: `gameSlice`, `lobbySlice`, `uiSlice` pattern.
- Components: "dumb" - props or selectors only.
- Validation: Use `SharedMoveValidator` for UI hints.

### Backend

- **Architecture V2**:
  - `GameGateway`: Transport only.
  - `GameProcessService`: Active logic (timers, bots).
  - `GameEngineService`: Pure functional core.
  - `RoomManager`: State & Persistence.
- Redis for state persistence, in-memory for active rooms.

### Testing

- Backend unit: Jest, `src/**/tests/*.spec.ts`
- Backend e2e: Jest + socket.io-client, `test/*.e2e-spec.ts`
- Frontend e2e: Playwright, `tests/e2e/*.spec.ts`
- Run all: `pnpm test`

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** put business logic in Gateway (use GameProcessService).
- **NEVER** duplicate game rules (use @joker/shared).
- **NEVER** access Telegram SDK directly - use `useTelegram()` hook.
- **NEVER** mutate gameStore state outside socket event handlers (except UI state).
- **NEVER** hardcode timeouts - use `GAME_CONSTANTS` or env vars.

---

## PHASE 2 DETAILED RULES

> Расширенные правила для сложных случаев. Базовые правила см. в начале файла.

### Golden Rule
```
┌─────────────────────────────────────────────────────────────┐
│   Новый функционал НЕ ДОЛЖЕН ломать существующий MVP.      │
│   Если есть сомнения — ОСТАНОВИСЬ и спроси.                │
└─────────────────────────────────────────────────────────────┘
```

### Protected Components (НЕ МЕНЯТЬ без явного разрешения)

| Component | Files | Status |
|-----------|-------|--------|
| Game Loop | `packages/shared/src/logic/*` | 🔒 LOCKED |
| Move Validation | `SharedMoveValidator`, `TrickLogic` | 🔒 LOCKED |
| Scoring | `ScoringService` | 🔒 LOCKED |
| WebSocket Events | `game.gateway.ts` event signatures | 🔒 LOCKED |
| Player UI | `apps/frontend/src/components/Game*` | ⚠️ CAREFUL |

### Before ANY Code Change

1. **Check**: Does this touch protected components?
2. **Verify**: Do all E2E tests still pass? (`pnpm test:e2e`)
3. **Confirm**: Is the change additive (not modifying existing)?

### Database Rules

```sql
-- ✅ ALLOWED: Additive changes
CREATE TABLE new_table (...);
ALTER TABLE users ADD COLUMN new_field VARCHAR(128);

-- ❌ FORBIDDEN without migration window
ALTER TABLE existing ALTER COLUMN type;
DROP TABLE anything;
ALTER TABLE existing DROP COLUMN anything;
```

### API Rules

```typescript
// ✅ ALLOWED: New events/endpoints
@SubscribeMessage('economy:balance_updated')
@Post('/api/admin/users')

// ❌ FORBIDDEN: Changing existing event signatures
@SubscribeMessage('game_state') // DO NOT MODIFY PAYLOAD
```

### Mandatory Pre-Commit Checks

```bash
pnpm lint          # Must pass
pnpm type-check    # Must pass
pnpm test:e2e      # Must pass - THIS IS SACRED
```

### If Tests Fail After Your Changes

1. **STOP** - Do not push
2. **REVERT** - Undo your changes
3. **ANALYZE** - Find root cause
4. **FIX** - Without breaking other tests
5. **RE-RUN** - All tests must pass

---

## UNIQUE STYLES

- Bot replacement on timeout: players become bots mid-game
- Pulka structure: 4 pulkas with varying card counts per round
- Joker cards: special handling with `JokerOption` (high/low/top/bottom)

## COMMANDS

```bash
# Development
pnpm install              # Install all dependencies
pnpm dev                  # Start frontend + backend parallel
pnpm dev:backend          # Backend only (needs Redis)
pnpm dev:frontend         # Frontend only

# Docker (dev infra)
docker compose up -d      # Redis + (optional) backend

# Build
pnpm build                # Build all packages
pnpm build:frontend       # Frontend dist
pnpm build:backend        # Backend dist

# Test
pnpm test                 # All tests parallel
pnpm test:backend         # Backend unit tests
pnpm --filter @joker/frontend test:e2e  # Playwright

# Deploy
docker compose -f docker-compose.prod.yml up -d
```
