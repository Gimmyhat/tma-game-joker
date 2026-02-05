# CURRENT SPRINT

**Last Updated:** 2026-02-05 12:00  
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

| ID  | Задача                    | Статус  | Файлы                  | Acceptance Criteria                       |
| --- | ------------------------- | ------- | ---------------------- | ----------------------------------------- |
| A-1 | Tasks CRUD (AC9)          | ✅ DONE | `admin/tasks/`         | Создание/редактирование заданий           |
| A-2 | Notifications CRUD (AC10) | ✅ DONE | `admin/notifications/` | Создание уведомлений, отправка через бота |
| A-3 | Withdrawal moderation UI  | ⬜ TODO | `apps/admin/`          | Approve/Reject кнопки в Transactions      |
| A-4 | Audit Log (AC5)           | ⬜ TODO | `audit.service.ts`     | Логирование всех admin-действий           |
| A-5 | Multi-sort filters (AC12) | ⬜ TODO | `admin.controller.ts`  | Сложные фильтры AND/OR                    |

### Priority 3: Frontend Economy UI

| ID  | Задача                   | Статус  | Файлы                      | Acceptance Criteria        |
| --- | ------------------------ | ------- | -------------------------- | -------------------------- |
| F-1 | User balance display     | ⬜ TODO | `frontend/src/components/` | Баланс в хедере лобби      |
| F-2 | Wallet mock UI           | ⬜ TODO | `frontend/src/pages/`      | Привязка кошелька (mock)   |
| F-3 | Transaction history page | ⬜ TODO | `frontend/src/pages/`      | Таблица с фильтрами        |
| F-4 | Deposit/Withdraw modals  | ⬜ TODO | `frontend/src/components/` | Выбор суммы, подтверждение |

### Priority 4: Preparation for Tournaments (Этап 3)

| ID  | Задача                      | Статус  | Файлы                  | Acceptance Criteria               |
| --- | --------------------------- | ------- | ---------------------- | --------------------------------- |
| T-1 | Tournament schema in Prisma | ✅ DONE | `prisma/schema.prisma` | Tournament, TournamentParticipant |
| T-2 | Tournament admin CRUD       | ⬜ TODO | `admin/tournaments/`   | Создание/редактирование турниров  |

---

## ✅ Completed This Sprint

| ID       | Задача                             | Дата       | Commit           |
| -------- | ---------------------------------- | ---------- | ---------------- |
| S4-1     | Prisma schema Phase 2              | 2026-02-04 | -                |
| S4-2     | Database migrations                | 2026-02-04 | -                |
| S4-3     | AdminModule + Controller + Service | 2026-02-04 | 021732e          |
| S4-4     | JWT Authentication                 | 2026-02-04 | 021732e          |
| S4-5     | RBAC roles                         | 2026-02-04 | 021732e          |
| S4-6     | Dashboard page                     | 2026-02-04 | 021732e          |
| S4-7     | Users list + detail                | 2026-02-04 | 021732e          |
| S4-8     | Transactions page                  | 2026-02-04 | 021732e          |
| S4-9     | EventLog page                      | 2026-02-04 | 021732e          |
| S4-10    | Settings page                      | 2026-02-04 | 021732e          |
| S4-11    | Tables (God Mode)                  | 2026-02-04 | 021732e          |
| S4-12    | BigInt serialization fixes         | 2026-02-05 | 3eda812, 8f66a9f |
| S4-13    | Session handoff mechanism          | 2026-02-05 | bf1d7ed          |
| E-1..E-8 | Economy API (full)                 | 2026-02-04 | (previous)       |
| T-1      | Tournament schema                  | 2026-02-04 | -                |
| A-1      | Tasks CRUD (backend + frontend)    | 2026-02-05 | a599c60          |
| A-2      | Notifications CRUD (Telegram)      | 2026-02-05 | c4c08d0          |

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

- _Пока блокеров нет_

---

## 📊 Sprint Progress

```
Economy API:     ████████████████████ 100% (8/8)
Admin Panel:     ██████████████░░░░░░  70% (14/20 est.)
Frontend Econ:   ░░░░░░░░░░░░░░░░░░░░   0% (0/4)
Tournaments:     ██░░░░░░░░░░░░░░░░░░  10% (1/10 est.)
─────────────────────────────────────────────
Overall Phase 2: ██████████░░░░░░░░░░  45%
```
