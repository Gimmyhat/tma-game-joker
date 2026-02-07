# CURRENT SPRINT

**Last Updated:** 2026-02-07 20:35  
**Sprint:** Phase 3 - Tournaments & Meta

---

## 🎯 NEXT TASK (START HERE)

> **Агент, читающий это: выбери первую незавершённую задачу из списка ниже и начни с неё.**

### Priority 1: Economy API (REQ-8) — ✅ DONE

> Все Economy задачи реализованы. Backend API готов.

| ID  | Задача                                  | Статус  | Файлы                       | Acceptance Criteria                    |
| --- | --------------------------------------- | ------- | --------------------------- | -------------------------------------- |
| E-1 | EconomyModule + EconomyService scaffold | ✅ DONE | `apps/backend/src/economy/` | Модуль создан, инжектится в app        |
| E-2 | Ledger model + migrations               | ✅ DONE | `prisma/schema.prisma`      | Transaction table с idempotency_key    |
| E-3 | POST /economy/deposit (mock)            | ✅ DONE | `transaction.service.ts`    | createDeposit()                        |
| E-4 | POST /economy/withdraw                  | ✅ DONE | `transaction.service.ts`    | createWithdrawal() → PENDING           |
| E-5 | GET /economy/balance                    | ✅ DONE | `economy.controller.ts`     | GET /economy/balance/:userId           |
| E-6 | GET /economy/history                    | ✅ DONE | `economy.controller.ts`     | GET /economy/transactions/user/:userId |
| E-7 | Race condition protection               | ✅ DONE | `economy.service.ts`        | Prisma $transaction, atomic updates    |
| E-8 | Idempotency                             | ✅ DONE | `transaction.service.ts`    | idempotencyKey check in all methods    |

### Priority 2: Admin Panel Completion (REQ-9)

| ID  | Задача                    | Статус  | Файлы                   | Acceptance Criteria                       |
| --- | ------------------------- | ------- | ----------------------- | ----------------------------------------- |
| A-1 | Tasks CRUD (AC9)          | ✅ DONE | `admin/tasks/`          | Создание/редактирование заданий           |
| A-2 | Notifications CRUD (AC10) | ✅ DONE | `admin/notifications/`  | Создание уведомлений, отправка через бота |
| A-3 | Withdrawal moderation UI  | ✅ DONE | `apps/admin/`           | Approve/Reject кнопки в Transactions      |
| A-4 | Audit Log (AC5)           | ✅ DONE | `audit.service.ts`      | Логирование всех admin-действий           |
| A-5 | Multi-sort filters (AC12) | ✅ DONE | `admin.controller.ts`   | Сложные фильтры AND/OR                    |
| A-6 | Admin Docker deploy       | ✅ DONE | `apps/admin/Dockerfile` | React SPA на nginx, /admin/ subpath       |

### Priority 3: Frontend Economy UI

| ID  | Задача                   | Статус  | Файлы                  | Acceptance Criteria        |
| --- | ------------------------ | ------- | ---------------------- | -------------------------- |
| F-1 | User balance display     | ✅ DONE | `frontend/src/App.tsx` | Баланс в хедере лобби      |
| F-2 | Wallet mock UI           | ✅ DONE | `frontend/src/App.tsx` | Привязка кошелька (mock)   |
| F-3 | Transaction history page | ✅ DONE | `frontend/src/App.tsx` | Таблица с фильтрами        |
| F-4 | Deposit/Withdraw modals  | ✅ DONE | `frontend/src/App.tsx` | Выбор суммы, подтверждение |

### Priority 4: Preparation for Tournaments (Этап 3)

| ID  | Задача                      | Статус  | Файлы                  | Acceptance Criteria               |
| --- | --------------------------- | ------- | ---------------------- | --------------------------------- |
| T-1 | Tournament schema in Prisma | ✅ DONE | `prisma/schema.prisma` | Tournament, TournamentParticipant |
| T-2 | Tournament admin CRUD       | ✅ DONE | `admin/tournaments/`   | Создание/редактирование турниров  |

### Priority 5: Tournament Engine & Lobby (REQ-10)

| ID  | Задача                                            | Статус  | Файлы                                   | Acceptance Criteria                                         |
| --- | ------------------------------------------------- | ------- | --------------------------------------- | ----------------------------------------------------------- |
| T-3 | TournamentModule + public API (list/detail)       | ✅ DONE | `apps/backend/src/tournament/`          | `GET /tournaments`, `GET /tournaments/:id`                  |
| T-4 | Tournament registration (join/leave)              | ✅ DONE | `apps/backend/src/tournament/`          | `POST /tournaments/:id/join`, `POST /tournaments/:id/leave` |
| T-5 | Tournament lifecycle transitions by schedule      | ✅ DONE | `apps/backend/src/tournament/`          | `ANNOUNCED -> REGISTRATION -> STARTED`                      |
| T-6 | Tournament bracket generation + stage progression | ✅ DONE | `apps/backend/src/tournament/`          | Bracket 16/32/64, переход победителей между стадиями        |
| T-7 | Frontend Tournament Lobby pages                   | ✅ DONE | `apps/frontend/src/`                    | Список турниров + детали + регистрация                      |
| T-8 | Tournament table/bracket UI                       | ✅ DONE | `apps/frontend/src/`                    | Просмотр стадии, столов, слотов, результатов                |
| T-9 | Telegram reminders before start                   | ✅ DONE | `apps/backend/src/telegram-bot/`        | Напоминания зарегистрированным участникам                   |
| M-1 | Meta: global leaderboard API + page               | ✅ DONE | `apps/backend/src`, `apps/frontend/src` | Рейтинг игроков по REQ-11                                   |
| M-2 | Meta: referral program backend + UI               | ✅ DONE | `apps/backend/src`, `apps/frontend/src` | Реферальная ссылка, начисления, история                     |
| M-3 | Meta: Task system backend (CRUD + verification)   | ✅ DONE | `apps/backend/src/tasks/`               | Создание задач, проверка выполнения (mock)                  |
| M-4 | Meta: Frontend tasks UI (list, status, claim)     | ✅ DONE | `apps/frontend/src/`                    | Экран заданий, клейм награды                                |

---

## ✅ Completed This Sprint

| ID       | Задача                                              | Дата       | Commit           |
| -------- | --------------------------------------------------- | ---------- | ---------------- |
| S4-1     | Prisma schema Phase 2                               | 2026-02-04 | -                |
| S4-2     | Database migrations                                 | 2026-02-04 | -                |
| S4-3     | AdminModule + Controller + Service                  | 2026-02-04 | 021732e          |
| S4-4     | JWT Authentication                                  | 2026-02-04 | 021732e          |
| S4-5     | RBAC roles                                          | 2026-02-04 | 021732e          |
| S4-6     | Dashboard page                                      | 2026-02-04 | 021732e          |
| S4-7     | Users list + detail                                 | 2026-02-04 | 021732e          |
| S4-8     | Transactions page                                   | 2026-02-04 | 021732e          |
| S4-9     | EventLog page                                       | 2026-02-04 | 021732e          |
| S4-10    | Settings page                                       | 2026-02-04 | 021732e          |
| S4-15    | Stabilize admin settings/transactions e2e selectors | 2026-02-06 | -                |
| S4-14    | Stabilize admin notifications/tables e2e selectors  | 2026-02-06 | -                |
| S4-16    | Stabilize admin users/event-log e2e and map guards  | 2026-02-06 | -                |
| S4-17    | Add /admin/profile alias to settings route          | 2026-02-06 | -                |
| S4-18    | Split profile dropdown links by settings anchors    | 2026-02-06 | -                |
| S4-19    | Distinguish settings anchors via dynamic page title | 2026-02-06 | -                |
| S4-20    | Distinct settings anchor views + TS compat fix      | 2026-02-07 | 0375983          |
| S4-21    | Ignore and clean admin e2e local artifacts          | 2026-02-07 | (pending commit) |
| S4-11    | Tables (God Mode)                                   | 2026-02-04 | 021732e          |
| S4-12    | BigInt serialization fixes                          | 2026-02-05 | 3eda812, 8f66a9f |
| S4-13    | Session handoff mechanism                           | 2026-02-05 | bf1d7ed          |
| E-1..E-8 | Economy API (full)                                  | 2026-02-04 | (previous)       |
| T-1      | Tournament schema                                   | 2026-02-04 | -                |
| A-1      | Tasks CRUD (backend + frontend)                     | 2026-02-05 | a599c60          |
| A-2      | Notifications CRUD (Telegram)                       | 2026-02-05 | c4c08d0          |
| A-3      | Withdrawal moderation UI                            | 2026-02-04 | 021732e          |
| A-4      | Audit Log integration                               | 2026-02-05 | (pending commit) |
| A-5      | Multi-sort filters (AC12)                           | 2026-02-05 | 73e786b          |
| A-6      | Admin Docker deploy                                 | 2026-02-05 | 3b82e79, PR #1   |
| OPS-1    | Admin redirect + Telegram-only UI                   | 2026-02-06 | 8cb3e4b, fb0f6ff |
| OPS-2    | CI: add tsx for prisma seed                         | 2026-02-06 | d17e4f2          |
| OPS-3    | PTY guardrails (opencode-pty)                       | 2026-02-06 | -                |
| F-1      | User balance display                                | 2026-02-06 | (pending commit) |
| F-2      | Wallet mock UI                                      | 2026-02-06 | (pending commit) |
| F-3      | Transaction history page                            | 2026-02-06 | (pending commit) |
| FIX-1    | Economy userId UUID/TGID resolving                  | 2026-02-06 | (pending commit) |
| F-4      | Deposit/Withdraw modals                             | 2026-02-06 | (pending commit) |
| T-2      | Tournament admin CRUD                               | 2026-02-06 | (pending commit) |
| FIX-2    | Admin event-log crash + avatar fallback             | 2026-02-06 | (pending commit) |
| T-3      | Tournament public API (list/detail)                 | 2026-02-07 | (pending commit) |
| T-4      | Tournament registration (join/leave)                | 2026-02-07 | (pending commit) |
| T-5      | Tournament lifecycle scheduler                      | 2026-02-07 | (pending commit) |
| T-6      | Tournament bracket + stage progression              | 2026-02-07 | (pending commit) |
| T-7      | Frontend Tournament Lobby (list/detail/join/leave)  | 2026-02-07 | (pending commit) |
| FIX-3    | Гарантированный user sync при socket connect        | 2026-02-07 | (pending commit) |
| FIX-4    | Regression e2e: user sync on connect + Playwright   | 2026-02-07 | (pending commit) |
| T-8      | Tournament table/bracket UI                         | 2026-02-07 | (pending commit) |
| T-9      | Telegram reminders before start                     | 2026-02-07 | (pending commit) |
| M-1      | Meta: global leaderboard API + page                 | 2026-02-07 | (pending commit) |
| M-2      | Meta: referral program backend + UI                 | 2026-02-07 | a3d45e8          |
| M-3      | Meta: task system backend (CRUD + verification)     | 2026-02-07 | 3207dc8          |
| M-4      | Meta: frontend tasks UI (list/status/claim)         | 2026-02-07 | (pending commit) |
| FIX-5    | Admin sign-out invalidation + websocket e2e restore | 2026-02-07 | 7f4764f          |
| FIX-6    | Admin lint ENOENT guard for generated dirs          | 2026-02-07 | (pending commit) |
| FIX-7    | Fix bets for Telegram IDs in Economy hold/release   | 2026-02-07 | (pending commit) |
| FIX-8    | Frontend smoke e2e stabilized with testids          | 2026-02-07 | (pending commit) |
| FIX-9    | Disable per-bid wallet hold in live joker bets      | 2026-02-07 | (pending commit) |

---

## 📋 Task Workflow

### Когда берёшь задачу:

1. **Обнови статус** в этом файле: `⬜ TODO` → `🔄 IN_PROGRESS`
2. **Создай feature branch** (опционально): `git checkout -b feature/A-1-tasks-crud`
3. **Работай** согласно Acceptance Criteria
4. **После завершения**: `🔄 IN_PROGRESS` → `✅ DONE`
5. **Добавь в Completed** с датой и commit hash

### Статусы:

- ⬜ TODO — не начато
- 🔄 IN_PROGRESS — в работе (укажи кто взял)
- ⚠️ BLOCKED — заблокировано (укажи причину)
- ✅ DONE — завершено

---

## 🔗 Reference Documents

- **TOR.md** — полные требования (REQ-1 ... REQ-11)
- **TECH_SPEC.md** — схемы БД, API, state machines
- **AGENTS.md** — правила разработки, protected components
- **PROGRESS.md** — Session Log, история

---

## 🚨 Blockers & Notes

> Добавляй сюда блокеры и заметки

- Frontend e2e снова проходит после фикса резолва userId (TG ID -> UUID) в economy endpoints
- Frontend/Admin Playwright e2e подтверждены green после фикса user sync (`@joker/frontend`: 6 passed, 1 skipped; `@joker/admin`: 92 passed, 1 skipped)
- Исправлен runtime crash на `/admin/event-log` (нормализация API payload + безопасный рендер), добавлен fallback аватаров в header dropdowns
- Phase 3 meta flow завершен: M-4 tasks UI добавлен (list/status/claim + frontend e2e)
- Критический разрыв регистрации закрыт: при websocket connect backend теперь гарантирует `getOrCreateUser` для Telegram ID; frontend поддерживает `VITE_API_URL` и нормализацию `ws(s) -> http(s)` для economy fetch
- Hotfix: Sign out в admin dropdown теперь очищает auth store перед redirect; добавлен e2e smoke `should require re-authentication after sign out`
- Backend e2e снова green после восстановления регистрации websocket gateway через `GatewayModule` в `AppModule` и стабилизации `app.e2e` (Prisma mock + bet flow)
- Admin lint стабилизирован: в `apps/admin/eslint.config.js` добавлены ignore для `test-results`, `playwright-report`, `coverage` (устранен риск ENOENT)
- Hotfix: в `EconomyService` исправлен резолв `userId` для ставок живых игроков (numeric Telegram ID -> UUID), устранена ошибка Prisma UUID при `INVALID_BET`; backend e2e green
- Frontend smoke e2e стабилизирован: удалена хрупкая проверка emoji `🃏`, добавлены стабильные `data-testid` для лобби и статуса соединения
- Hotfix live-game: `processUserBet` больше не списывает CJ по значению заявки (0/1/...), hold вынесен в отдельную конфигурацию `GAME_BET_HOLD_COST_CJ` (по умолчанию 0)

---

## 📊 Sprint Progress

```
Economy API:     ████████████████████ 100% (8/8)
Admin Panel:     ████████████████████ 100% (20/20 est.)
Frontend Econ:   ████████████████████ 100% (4/4)
Tournaments:     ████████████████████ 100% (16/16 est.)
─────────────────────────────────────────────
Overall Phase 3: ████████████████████ 100%
```
