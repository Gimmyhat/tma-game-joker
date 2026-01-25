# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-25T11:14:00Z
**Commit:** 5726916
**Branch:** main

## OVERVIEW

Telegram Mini App - multiplayer Joker card game. pnpm monorepo: React/Vite frontend + NestJS/Socket.io backend + shared types package.

## STRUCTURE

```
tma_game_joker/
├── apps/
│   ├── frontend/          # React 18 + Vite + Zustand + TailwindCSS
│   └── backend/           # NestJS + Socket.io + Redis
├── packages/
│   └── shared/            # @joker/shared - types, constants, game rules (SINGLE SOURCE OF TRUTH)
├── docs/                  # Technical specs (Russian)
├── scripts/               # Build/deploy automation
└── docker-compose*.yml    # Dev and prod orchestration
```

## WHERE TO LOOK

| Task                       | Location                                           | Notes                               |
| -------------------------- | -------------------------------------------------- | ----------------------------------- |
| Game types/constants       | `packages/shared/src/index.ts`                     | Enums, interfaces, GAME_CONSTANTS   |
| Game logic (authoritative) | `apps/backend/src/game/`                           | Services, validators, state machine |
| Frontend state             | `apps/frontend/src/store/gameStore.ts`             | Zustand + socket listeners          |
| Socket events              | `apps/frontend/src/lib/socket.ts`                  | Typed client events                 |
| Telegram integration       | `apps/frontend/src/providers/TelegramProvider.tsx` | SDK init, dev fallback              |
| WebSocket gateway          | `apps/backend/src/gateway/game.gateway.ts`         | All real-time events                |
| Bot AI                     | `apps/backend/src/bot/`                            | Strategy pattern                    |

## CODE MAP

| Symbol                | Type      | Location              | Role                                       |
| --------------------- | --------- | --------------------- | ------------------------------------------ |
| `GameState`           | interface | shared/index.ts       | Core game state shape                      |
| `GamePhase`           | enum      | shared/index.ts       | Waiting→TrumpSelection→Betting→Playing→... |
| `GameEngineService`   | class     | backend/game/services | State transition orchestrator              |
| `StateMachineService` | class     | backend/game/services | Phase transition logic                     |
| `useGameStore`        | hook      | frontend/store        | Centralized frontend state                 |
| `GameGateway`         | class     | backend/gateway       | WebSocket event hub                        |
| `RoomManager`         | class     | backend/gateway       | Matchmaking + room lifecycle               |

## CONVENTIONS

### Monorepo

- Package manager: **pnpm 8.15+** (workspace protocol)
- Shared imports: `import { GameState } from '@joker/shared'`
- Never duplicate types between apps - extend shared

### Code Style

- Prettier: single quotes, semicolons, 100 char lines, trailing commas
- TypeScript: `strict: true` everywhere, no `any`
- Path aliases: `@/*` → `src/*` in apps

### Frontend

- `screens/` not `pages/` (TMA is single-page)
- Components: "dumb" - props or selectors only
- State changes: via socket events → gameStore, never direct mutations
- Dev mode: `?dev=true` URL param enables mock Telegram

### Backend

- NestJS modules per domain (Game, Gateway, Bot, Auth, Database)
- Functional state: `(state, action) => newState`
- Validators isolate card game rules from engine
- Redis for state persistence, in-memory for active rooms

### Testing

- Backend unit: Jest, `src/**/tests/*.spec.ts`
- Backend e2e: Jest + socket.io-client, `test/*.e2e-spec.ts`
- Frontend e2e: Playwright, `tests/e2e/*.spec.ts`
- Run all: `pnpm test`

## ANTI-PATTERNS (THIS PROJECT)

- **NEVER** duplicate game logic between frontend/backend (shared is the source)
- **NEVER** access Telegram SDK directly - use `useTelegram()` hook
- **NEVER** emit socket events directly in components - use `lib/socket.ts` helpers
- **NEVER** mutate gameStore state outside socket event handlers
- **NEVER** hardcode timeouts - use `GAME_CONSTANTS` or env vars

## UNIQUE STYLES

- Bot replacement on timeout: players become bots mid-game
- Pulka structure: 4 pulkas with varying card counts per round
- Joker cards: special handling with `JokerOption` (high/low/top/bottom)
- Trick winner: complex rules involving trump, lead suit, jokers
- Frontend has local `gameLogic.ts` for immediate UI feedback (backend authoritative)

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

## NOTES

- **Lockfile artifact**: `apps/frontend/package-lock.json` exists but pnpm is used - ignore it
- **Cyrillic docs**: `docs/*.md` in Russian, technical specs and roadmap
- **Root artifacts**: `id_rsa.pub`, `nul`, `-p/` are dev leftovers - safe to remove
- **CI secrets required**: `SERVER_HOST`, `SERVER_SSH_KEY` for deploy workflow
- **Redis required**: Backend needs Redis for room state (even in dev)
