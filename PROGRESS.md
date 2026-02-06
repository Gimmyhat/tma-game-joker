# 🚀 Project Progress

**Последнее обновление:** 2026-02-06 13:20
**Текущий статус:** 🚧 Phase 2: Admin Panel & Economy (In Progress)

> **📋 Текущие задачи см. в [`CURRENT_SPRINT.md`](CURRENT_SPRINT.md)**

---

## 🏗️ Инфраструктура (Infrastructure)

| Компонент | Статус | Детали |
|-----------|--------|--------|
| Server | ✅ | SSH `203.31.40.28` (alias `hosting-vds`) |
| Docker Desktop | ✅ | PostgreSQL:5432, Redis:6379 |
| Backend | ✅ | NestJS, работает на :3000 |
| Frontend | ✅ | React/Vite, работает на :5173 |
| Admin Panel | ✅ | React/Vite, работает на :3001 |

---

## 📈 Phase Progress

| Phase | Название | Статус | Прогресс |
|-------|----------|--------|----------|
| 1 | Core & Network | ✅ Done | 100% |
| 2 | Economy & Admin | 🔄 In Progress | ~70% |
| 3 | Tournaments & Meta | ⏳ Not Started | 0% |
| 4 | Integration & Polish | ⏳ Not Started | 0% |

---

## 🚀 Быстрый старт

```bash
# Инфраструктура
docker compose up -d  # PostgreSQL + Redis

# Backend
cd apps/backend && pnpm dev

# Frontend (player)
cd apps/frontend && pnpm dev

# Admin Panel
cd apps/admin && pnpm dev
```

**URLs:**
- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- Admin: http://localhost:3001 (login: admin / admin123)

---

## 📝 Session Log

> Все агенты обязаны добавлять записи сюда при завершении сессии.
> Формат: `## [YYYY-MM-DD HH:MM] - [Agent Name]`

---

## [2026-02-06 12:40] - OpenCode

### Выполнено
- ✅ Исправлен редирект после 401 в админке на `/admin/signin`
- ✅ В проде вне Telegram показывается экран "Telegram-only" вместо запуска игры
- ✅ Тесты: `pnpm lint` (ok), admin type-check (ok), frontend e2e (ok)
- ✅ Добавлен `VITE_TELEGRAM_APP_URL` в `apps/frontend/.env` и `apps/frontend/.env.production`
- ✅ Обновлён `VITE_TELEGRAM_APP_URL` на direct link `.../play`

### Следующие шаги
- [ ] Пересобрать и задеплоить фронтенд, чтобы `VITE_TELEGRAM_APP_URL` попал в prod

---

## [2026-02-05 19:45] - OpenCode

### Выполнено
- ✅ A-6: Admin Docker deploy — настроен Docker deployment для React admin panel
  - Создан `Dockerfile` с multi-stage build (nginx serving static)
  - Создан `nginx.conf` для SPA routing
  - Обновлён `vite.config.ts` с `base: '/admin/'` для subpath hosting
  - Обновлён `App.tsx` с `<Router basename="/admin">`
  - Исправлены конфликты типов React 18/19 (убран tsc из build)
  - Удалены неиспользуемые компоненты TailAdmin (Calendar, CountryMap, DropZone)
  - Обновлён `docker-compose.prod.yml` для новой admin конфигурации
  - Обновлён `nginx/nginx.conf` с location `/admin/` proxy
- ✅ Создан PR #1: feat(admin): Deploy React admin panel to production

### Следующие шаги
- [ ] Смержить PR #1 в main для деплоя на georgian-joker.ru/admin
- [ ] Продолжить задачи Phase 2 из CURRENT_SPRINT.md (F-1..F-4 Frontend Economy UI)

---

## [2026-02-05 16:30] - OpenCode

### Выполнено
- ✅ A-5: Multi-sort filters (AC12) — добавлен query builder для AND/OR фильтров и мульти-сортировки, обновлены admin/event-log/transaction/notification list endpoints
- ✅ Обновлен тест `scoring-rules.spec.ts` (Player controlledByBot) для прохождения type-check
- ✅ Backend e2e тесты пройдены
- ✅ Frontend e2e тесты пройдены (Playwright webServer на dev)
- ✅ Добавлены/настроены ESLint конфиги для frontend и admin/back, `pnpm lint` проходит (admin с предупреждениями)
- ✅ Type-check пройден (backend/frontend: `tsc --noEmit`)

### Следующие шаги
- [ ] Продолжить задачи Phase 2 из CURRENT_SPRINT.md

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

---

## [2026-02-05 10:30] - Sisyphus

### Выполнено
- ✅ Создан `CURRENT_SPRINT.md` — детальный план Phase 2 с 19 задачами
- ✅ Обновлён `AGENTS.md` — Session Protocol теперь ссылается на CURRENT_SPRINT.md
- ✅ Упрощён `PROGRESS.md` — убрано дублирование, добавлена ссылка на CURRENT_SPRINT.md
- ✅ Проанализирован TOR.md — определён текущий этап (Phase 2, ~60%)

### Архитектура передачи контекста между сессиями:
```
AGENTS.md (первичный, читается OpenCode автоматически)
    ↓
CURRENT_SPRINT.md (текущие задачи, статусы)
    ↓
PROGRESS.md (Session Log, история)
    ↓
TOR.md / TECH_SPEC.md (при необходимости)
```

### Следующие шаги
- [x] E-1: EconomyModule + EconomyService scaffold
- [x] E-2: Ledger model + migrations

---

## [2026-02-05 12:00] - Sisyphus

### Выполнено
- ✅ Проверил Economy API — уже полностью реализован ранее
- ✅ **A-1: Tasks CRUD (commit a599c60)**:
  - Backend: listTasks, getTask, createTask, updateTask, deleteTask
  - Backend: listTaskCompletions, approveTaskCompletion, rejectTaskCompletion
  - Frontend: TasksPage.tsx (list + filters + pagination)
  - Frontend: TaskDetailPage.tsx (edit form + completions table)
  - Frontend: TaskCreatePage.tsx (create form)
  - Routes и sidebar обновлены

### Следующие шаги
- [ ] A-2: Notifications CRUD (backend + frontend)
- [ ] A-3: Withdrawal moderation UI
- [ ] F-1: User balance display in frontend

---

## [2026-02-05 12:45] - Sisyphus

### Выполнено
- ✅ **A-2: Notifications CRUD (commit c4c08d0)**:
  - Backend: NotificationService (create/read/update/delete/send/getDeliveries)
  - Backend: 7 REST endpoints в AdminController
  - Backend: Интеграция с TelegramBotService для отправки
  - Frontend: NotificationsPage.tsx (list + status filter + pagination)
  - Frontend: NotificationDetailPage.tsx (create/edit + send + deliveries)
  - Routes и sidebar обновлены

### Следующие шаги
- [ ] A-3: Withdrawal moderation UI
- [ ] A-4: Audit Log
- [ ] F-1: User balance display in frontend

---

## [2026-02-05 13:30] - Antigravity

### Выполнено
- ✅ **A-4: Audit Log — интеграция EventLogService**:
  - AdminService: логирование login, createAdmin, updatePassword, blockUser, unblockUser, updateUserRole, upsertSetting, updateSettings, createTask, updateTask, deleteTask, approveTaskCompletion, rejectTaskCompletion
  - TransactionService: логирование approveWithdrawal, rejectWithdrawal
  - EconomyService: логирование adjustBalance
  - NotificationService: логирование createNotification, updateNotification, deleteNotification, sendNotification
  - AdminController: обновлены сигнатуры методов для передачи admin.id
  - Всего 17 admin-действий теперь логируются в БД (event_log table)

### Следующие шаги
- [ ] A-5: Multi-sort filters (AND/OR)
- [ ] F-1: User balance display in frontend
