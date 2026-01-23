# 🚀 Project Progress

**Последнее обновление:** 2026-01-23
**Текущий статус:** 🚧 Sprint 3: Frontend (In Progress)

---

## 🏗️ Инфраструктура (Infrastructure)

1. ✅ **Server**: SSH access configured for `203.31.40.28` (alias `hosting-vds`)
2. ✅ **Security**: Password authentication disabled (key-only access)


---

## 🎯 Текущий фокус (Current Focus)

Мы находимся на **Этапе 3 (Frontend)**.
Backend готов и протестирован. Frontend активно разрабатывается.

**Ближайшие задачи:**

1.  ✅ ~~**Frontend**: Telegram WebApp SDK integration~~
2.  ✅ ~~**Frontend**: Socket.io client + auth~~
3.  ✅ ~~**Frontend**: Zustand store~~
4.  ✅ ~~**Frontend**: UI компоненты (Card, Hand, Table, PlayerInfo)~~
5.  ✅ ~~**Frontend**: Модальные окна (BetModal, TrumpSelector, JokerOptionModal)~~
6.  🛠 **Frontend**: Интеграция компонентов в GameScreen
7.  🛠 **Frontend**: E2E тестирование с backend

---

## 📊 Статус по Спринтам

### ✅ Sprint 0: Инициализация (Completed)

- [x] S0-1: Monorepo structure (`apps/backend`, `apps/frontend`, `packages/shared`)
- [x] S0-2: NestJS init
- [x] S0-3: Vite + React init
- [x] S0-4: Shared package (Types, Enums in `@joker/shared`)
- [x] S0-5: Docker Compose (Basic)

### ✅ Sprint 1: Game Core (Completed)

- [x] S1-1..S1-4: Models & Enums (moved to `packages/shared`)
- [x] S1-5: `DeckService` (shuffling, dealing)
- [x] S1-6: `MoveValidator` (joker rules, suit following)
- [x] S1-7: `BetValidator` (forced bet rule)
- [x] S1-9: `StateMachine` (phases)
- [x] S1-10: `ScoringService` (scores, shtanga)
- [x] S1-12: `GameEngineService` (orchestrator)

### ✅ Sprint 2: Network Layer (Completed)

- [x] S2-1: `GameGateway` setup (Socket.io)
- [x] S2-2: `TelegramAuthGuard` (HMAC validation)
- [x] S2-3: `RoomManager` (queue, rooms, Redis-backed)
- [x] S2-11: `BotService` (Random Valid Move Strategy)
- [x] S2-13: `RedisService` + `DatabaseModule` (hot state persistence, TTL 2h)
- [x] S2-4..S2-7: Event handlers (implemented in Gateway)
- [x] S2-8: Turn Timer (30 sec)
- [x] S2-9: Reconnect logic (via Redis)
- [x] S2-10: Disconnect handling (30 sec grace period)

### 🚧 Sprint 3: Frontend (In Progress)

- [x] S3-0: Init (Vite + React + TailwindCSS)
- [x] S3-1: Telegram WebApp SDK integration
  - `TelegramProvider` с SDKProvider
  - `useTelegram` hook
  - Development fallback с mock user
- [x] S3-2: Socket.io client + auth
  - `socket.ts` с typed events
  - Auth через initData
- [x] S3-3: Zustand store
  - `gameStore.ts` с полным state management
  - Socket event handlers
  - Selectors
- [x] S3-4: Card component
- [x] S3-5: Hand component
- [x] S3-6: Table component
- [x] S3-7: PlayerInfo component
- [x] S3-8: Lobby screen (в App.tsx)
- [x] S3-9: BetModal
- [x] S3-10: TrumpSelector
- [x] S3-11: JokerOptionModal
- [ ] S3-12: GameScreen (интеграция всех компонентов)
- [ ] S3-13: Animations & polish

---

## 📝 Контекст для разработчика (Context)

- **Архитектура**: Monorepo. Shared types in `packages/shared`.
- **Backend**: NestJS. Game logic separated from Gateway.
- **Frontend**: React + Vite + TailwindCSS + Zustand
- **Redis**: Используется для персистентности игрового состояния (TTL 2 часа).
  - `docker-compose up redis` для запуска
  - Fallback на in-memory если Redis недоступен

### Frontend Structure

```
apps/frontend/src/
├── components/          # UI компоненты
│   ├── Card.tsx
│   ├── Hand.tsx
│   ├── Table.tsx
│   ├── PlayerInfo.tsx
│   ├── BetModal.tsx
│   ├── TrumpSelector.tsx
│   ├── JokerOptionModal.tsx
│   └── index.ts
├── lib/                 # Утилиты
│   ├── telegram.ts      # TG SDK helpers
│   ├── socket.ts        # Socket.io client
│   └── index.ts
├── providers/           # React providers
│   ├── TelegramProvider.tsx
│   └── index.ts
├── store/               # Zustand stores
│   ├── gameStore.ts
│   └── index.ts
└── App.tsx              # Root component
```

## 🛠 Технические заметки

- Типы вынесены в `@joker/shared` и используются и бэком и фронтом.
- `GameEngineService` — точка входа в логику.
- `RoomManager` использует Redis как primary storage с in-memory cache.
- `RedisService` gracefully деградирует до memory-only если Redis недоступен.
- Frontend использует `SKIP_AUTH=true` в dev mode для тестирования без Telegram.

## 🚀 Быстрый старт

```bash
# Запуск Redis (опционально)
docker-compose up -d redis

# Запуск backend (dev)
cd apps/backend && pnpm dev

# Запуск frontend (dev)
cd apps/frontend && pnpm dev
```

## 🔧 Environment Variables

### Backend (`apps/backend/.env`)

```
PORT=3000
TELEGRAM_BOT_TOKEN=your_bot_token
SKIP_AUTH=true  # для dev режима
# REDIS_URL=redis://localhost:6379  # раскомментировать для Redis
```

### Frontend (`apps/frontend/.env`)

```
VITE_SOCKET_URL=http://localhost:3000
```
