# CURRENT SPRINT

**Last Updated:** 2026-02-07 23:15  
**Sprint:** Phase 4 - Integration & Polish

---

## 🎯 NEXT TASK (START HERE)

> **Агент, читающий это: выбери первую незавершённую задачу из списка ниже и начни с неё.**

### Priority 1: Release Consolidation

| ID   | Задача                                 | Статус         | Зоны/Файлы                       | Acceptance Criteria (DoD)                                                           |
| ---- | -------------------------------------- | -------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| P4-1 | Подготовить PR по hotfix + прогнать CI | ✅ DONE        | GitHub PR/Actions, `PROGRESS.md` | PR создан, CI green, чеклист релиза заполнен                                        |
| P4-2 | Production smoke в Telegram Mini App   | 🔄 IN_PROGRESS | Production TMA                   | Проверены Tournament/Referral модалки на прод-домене, результат зафиксирован в логе |

### Priority 2: Reliability & Quality Gates

| ID   | Задача                                    | Статус  | Зоны/Файлы                                        | Acceptance Criteria (DoD)                                                 |
| ---- | ----------------------------------------- | ------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| P4-3 | Расширить e2e critical path + nightly run | ⬜ TODO | `apps/*/tests/e2e`, `.github/workflows/`          | Критический путь покрыт, nightly запуск есть, flaky-кейсы стабилизированы |
| P4-4 | Reconnect/rejoin edge-cases + idempotency | ⬜ TODO | `apps/backend/src/game`, `apps/frontend/src/lib/` | Повторные подключения и дублирующиеся action не ломают игровой процесс    |

### Priority 3: UX Polish (Player + Admin)

| ID   | Задача                                      | Статус  | Зоны/Файлы                                           | Acceptance Criteria (DoD)                                                           |
| ---- | ------------------------------------------- | ------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| P4-5 | Унифицировать loading/error/empty состояния | ⬜ TODO | `apps/frontend/src/components`, `apps/frontend/src/` | Tournament/Referral/Economy имеют единые состояния и понятный recovery flow         |
| P4-6 | Admin tables/filters/retry polish           | ⬜ TODO | `apps/admin/src/pages`, `apps/admin/src/lib/`        | Таблицы устойчивы на больших данных, retry и ошибки API обрабатываются предсказуемо |

### Priority 4: Operations & Security

| ID   | Задача                                      | Статус  | Зоны/Файлы                                                | Acceptance Criteria (DoD)                                                        |
| ---- | ------------------------------------------- | ------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P4-7 | Базовая observability (logs/correlation id) | ⬜ TODO | `apps/backend/src`, `apps/admin/src`, `apps/frontend/src` | Structured logs унифицированы, correlation/request id есть в ключевых потоках    |
| P4-8 | Security review + runbooks                  | ⬜ TODO | `apps/backend/src`, `docs/`                               | Проверены guards/validation/rate-limit, добавлены runbook'и incident/rollback/ws |

---

## ✅ Completed in Previous Phase

- Phase 3 (`Tournaments & Meta`) закрыт на 100%.
- Подробная история задач и коммитов сохранена в `PROGRESS.md` (Session Log за 2026-02-07).

---

## 📋 Task Workflow

### Когда берёшь задачу:

1. **Обнови статус** в этом файле: `⬜ TODO` → `🔄 IN_PROGRESS`
2. **Работай** согласно Acceptance Criteria
3. **После завершения**: `🔄 IN_PROGRESS` → `✅ DONE`
4. **Добавь запись** в `PROGRESS.md` (Session Log)

### Статусы:

- ⬜ TODO — не начато
- 🔄 IN_PROGRESS — в работе
- ⚠️ BLOCKED — заблокировано (укажи причину)
- ✅ DONE — завершено

---

## 🔗 Reference Documents

- **TOR.md** — полные требования
- **TECH_SPEC.md** — БД, API, state machines
- **AGENTS.md** — правила разработки, protected components
- **PROGRESS.md** — Session Log, история

---

## 🚨 Blockers & Notes

- Для `P4-2` применен backend hotfix (`ListTournamentsDto`: numeric transform для query).
- Следующий шаг: после деплоя повторить prod-smoke и закрыть `P4-2`.
- Protected components остаются без изменений: `packages/shared/src/logic/*`, `ScoringService`, event signatures в `game.gateway.ts`.

---

## 📊 Sprint Progress

```
P4-1 Release:      ✅ 100%
P4-2 Prod Smoke:   🔄 in progress (hotfix ready)
P4-3 E2E/Nightly:  ⬜ 0%
P4-4 Reconnect:    ⬜ 0%
P4-5 UX Polish:    ⬜ 0%
P4-6 Admin Polish: ⬜ 0%
P4-7 Observability ⬜ 0%
P4-8 Security/Docs ⬜ 0%
────────────────────────
Overall Phase 4:   🔄 18%
```
