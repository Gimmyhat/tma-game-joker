# 🚀 Project Progress

**Последнее обновление:** 2026-02-05
**Текущий статус:** 🚧 Phase 2: Admin Panel & Economy (In Progress)

---

## 🏗️ Инфраструктура (Infrastructure)

1. ✅ **Server**: SSH access configured for `203.31.40.28` (alias `hosting-vds`)
2. ✅ **Security**: Password authentication disabled (key-only access)
3. ✅ **Docker Desktop**: PostgreSQL + Redis работают локально
   - `joker-postgres:5432` — PostgreSQL
   - `joker-redis:6379` — Redis

---

## 🎯 Текущий фокус (Current Focus)

Мы находимся на **Phase 2 (Admin Panel & Economy)**.
MVP сдан заказчику и работает в production. Разрабатываем дополнительный функционал.

**Ближайшие задачи:**

1. ✅ ~~**Admin Panel**: Backend (AdminController, AdminService, JWT auth)~~
2. ✅ ~~**Admin Panel**: Frontend (все страницы реализованы)~~
3. 🛠 **Admin Panel**: Тестирование и фиксы
4. [ ] **Economy**: API endpoints
5. [ ] **Telegram Bot**: Интеграция с экономикой

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

### 🚧 Sprint 4: Phase 2 - Admin Panel & Economy (In Progress)

- [x] S4-1: Prisma schema Phase 2 (Admin, EventLog, GlobalSettings, etc.)
- [x] S4-2: Database migrations applied
- [x] S4-3: AdminModule + AdminController + AdminService
- [x] S4-4: JWT Authentication for Admin
- [x] S4-5: RBAC (OPERATOR/MODERATOR/ADMIN/SUPERADMIN)
- [x] S4-6: Admin Frontend - Dashboard
- [x] S4-7: Admin Frontend - Users list + UserDetail
- [x] S4-8: Admin Frontend - Transactions
- [x] S4-9: Admin Frontend - EventLog
- [x] S4-10: Admin Frontend - Settings
- [x] S4-11: Admin Frontend - Tables (God Mode)
- [x] S4-12: BigInt serialization fixes
- [ ] S4-13: Economy API endpoints
- [ ] S4-14: Telegram Bot economy integration
- [ ] S4-15: E2E tests for Admin Panel

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

---

## 📝 Session Log

> Все агенты обязаны добавлять записи сюда при завершении сессии.
> Формат: `## [YYYY-MM-DD HH:MM] - [Agent Name]`

---

## [2026-02-04 14:10] - Antigravity

### Выполнено
- ✅ Экспертный аудит TOR v1.2 и TECH_SPEC v0.1 на готовность к Phase 2
- ✅ TOR.md обновлен до v1.3:
  - Добавлен раздел 1.1 "Термины и определения"
  - Добавлены REQ-9 AC11 (House Edge, Referral Bonus), AC12 (Мульти-сортировка, AND/OR фильтры)
  - Добавлена роль Super-Admin
- ✅ TECH_SPEC.md обновлен до v0.5:
  - Добавлены схемы БД: `tasks`, `notifications`, `event_log`, `global_settings`, `global_settings_history`
  - Добавлен полный Admin REST API (20+ endpoints)
  - Добавлены JSONB schemas для settings, stats, configs
  - Добавлен алгоритм Killer Bot
- ✅ Создан ADMIN_PANEL_MATRIX.md с 16 экранами и детализацией полей/фильтров
- ✅ OPEN_QUESTIONS.md обновлен: добавлены Q17 (RBAC), Q18 (Audit Trail)
- ✅ TOR_CHANGELOG.md обновлен: добавлена запись v1.3
- ✅ Создан `docs/PHASE_2_DEVELOPMENT_GUIDE.md` — полный гайд по безопасной разработке
- ✅ Обновлен `AGENTS.md` — добавлены критические правила Phase 2
- ✅ Создан workflow `/phase2-check` — автоматическая проверка перед коммитом

### В процессе
- 🔄 Нет активных задач

### Следующие шаги
- [ ] Получить ответы на Q12 (House Edge %), Q17 (RBAC), Q18 (Audit Trail) от заказчика
- [x] Создать ветку `develop` от текущего `main`

### [2026-02-04 15:00] - Antigravity (Phase 2 Kickoff)

### Выполнено
- ✅ Документация (TOR v1.3.1, TECH_SPEC v0.5) закоммичена в `main`
- ✅ Ветка `develop` создана и запушена
- ✅ `apps/backend/prisma/schema.prisma` обновлен (добавлены все модели Phase 2)
- ✅ `AGENTS.md` обновлен (добавлен /dev workflow)

### Заблокировано
- ❌ **Database Migration**: `P1001: Can't reach database server at localhost:5432`.
  - Docker контейнеры (postgres/redis) падают при старте или порт недоступен с хоста.
  - Требуется вмешательство пользователя для починки локального Docker окружения.

### Следующие шаги
- [ ] Исправить Docker окружение (dev machine issue)
- [ ] Запустить `pnpm exec prisma migrate dev --name phase2_init`
- [ ] Начать реализацию Economy API
- [ ] Начать Phase 2 разработку после утверждения документации

---

## [2026-02-05 09:35] - Sisyphus

### Выполнено
- ✅ Admin Panel полностью реализован (commit 021732e):
  - Backend: AdminController, AdminAuthController, AdminService
  - Frontend: Dashboard, Users, UserDetail, Transactions, EventLog, Settings, Tables
  - RBAC: OPERATOR/MODERATOR/ADMIN/SUPERADMIN roles
  - JWT authentication
- ✅ Docker Desktop установлен (заменил нестабильный WSL Docker)
- ✅ PostgreSQL + Redis работают стабильно
- ✅ BigInt serialization fixes (tgId → string для JSON):
  - `3eda812` fix(admin): BigInt serialization and API params
  - `8f66a9f` fix(admin): correct UserDetailResponse type
- ✅ Session Protocol добавлен в AGENTS.md

### Следующие шаги
- [ ] Протестировать Admin Panel (http://localhost:3001, admin/admin123)
- [ ] Economy API endpoints
- [ ] Telegram Bot economy integration
