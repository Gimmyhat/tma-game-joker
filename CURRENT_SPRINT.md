# CURRENT SPRINT

**Last Updated:** 2026-02-06 18:13  
**Sprint:** Phase 2 - Economy & Admin  
**Deadline:** TBD (estimated 3 weeks)

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
- `apps/admin` e2e нестабилен из-за текущего конфликта webServer port/script (`vite --port 3001` vs Playwright `adminPort=3002`)
- Исправлен runtime crash на `/admin/event-log` (нормализация API payload + безопасный рендер), добавлен fallback аватаров в header dropdowns

---

## 📊 Sprint Progress

```
Economy API:     ████████████████████ 100% (8/8)
Admin Panel:     ███████████████████░  95% (19/20 est.)
Frontend Econ:   ████████████████████ 100% (4/4)
Tournaments:     ████░░░░░░░░░░░░░░░░  20% (2/10 est.)
─────────────────────────────────────────────
Overall Phase 2: ████████████████░░░░  75%
```
