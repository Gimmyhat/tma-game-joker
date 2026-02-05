# Phase 2 Development Guide

**Version**: 1.0  
**Date**: 2026-02-04  
**Status**: MANDATORY

> ⚠️ **КРИТИЧНО**: MVP уже сдан заказчику и работает в production. Любые изменения должны проходить строгий контроль. Нарушение этих правил может привести к регрессии и потере доверия заказчика.

---

## 1. Принципы разработки Phase 2

### 1.1 Главный принцип: "Не навреди"

```
┌─────────────────────────────────────────────────────────────┐
│                    GOLDEN RULE                              │
│                                                             │
│   Новый функционал НЕ ДОЛЖЕН ломать существующий MVP.      │
│   Если есть сомнения — остановись и спроси.                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Что защищено (MVP Baseline)

| Компонент | Статус | Можно менять? |
|-----------|--------|---------------|
| Game Loop (24 раздачи) | ✅ Production | ❌ Только баги |
| Card/Joker mechanics | ✅ Production | ❌ Только баги |
| Scoring system | ✅ Production | ❌ Только баги |
| WebSocket events | ✅ Production | ⚠️ Только добавление |
| Player UI (GameScreen) | ✅ Production | ⚠️ Осторожно |
| Frontend components | ✅ Production | ⚠️ Осторожно |

### 1.3 Что разрабатывается (Phase 2 Scope)

| Компонент | Статус | Риск для MVP |
|-----------|--------|--------------|
| Economy/Ledger | 🆕 New | 🟢 Low |
| Admin Panel (Backend) | 🆕 New | 🟢 Low |
| Admin Panel (Frontend) | 🆕 New | 🟢 Low |
| Tournaments | 🆕 New | 🟡 Medium |
| Tasks/Notifications | 🆕 New | 🟢 Low |
| Meta-features | 🆕 New | 🟢 Low |

---

## 2. Git Strategy

### 2.1 Branch Model

```
main (production) ────────────────────────────────────────────►
      │                                                        
      └── develop (phase2) ───────────────────────────────────►
              │         │         │         │
              └── feature/db-migrations
                        └── feature/admin-panel
                                  └── feature/economy
                                            └── feature/tournaments
```

### 2.2 Branch Rules

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production | PR only, 1+ review, all tests pass |
| `develop` | Phase 2 integration | PR only, all tests pass |
| `feature/*` | Individual modules | Free push |
| `hotfix/*` | MVP bugfixes | → main → cherry-pick develop |

### 2.3 Commit Message Format

```
<type>(<scope>): <subject>

Types: feat, fix, refactor, docs, test, chore
Scope: admin, economy, tournament, game, frontend, backend, shared

Examples:
feat(admin): add user management API
fix(game): correct joker validation edge case
docs(tor): update REQ-9 acceptance criteria
```

---

## 3. Database Migration Rules

### 3.1 Safe Operations (можно применять сразу)

```sql
-- ✅ Новая таблица
CREATE TABLE tasks (...);

-- ✅ Новая колонка (nullable или с default)
ALTER TABLE users ADD COLUMN wallet_address VARCHAR(128);
ALTER TABLE users ADD COLUMN avatar_id SMALLINT DEFAULT 1;

-- ✅ Новый enum value
ALTER TYPE tx_type ADD VALUE 'TASK_REWARD';

-- ✅ Новый index
CREATE INDEX idx_users_referrer ON users(referrer_id);
```

### 3.2 Dangerous Operations (требуют migration window)

```sql
-- ⚠️ Изменение типа колонки
ALTER TABLE users ALTER COLUMN balance TYPE DECIMAL(16,2);

-- ⚠️ Переименование
ALTER TABLE old_name RENAME TO new_name;

-- ❌ Удаление
DROP TABLE old_table;
ALTER TABLE users DROP COLUMN deprecated_field;
```

### 3.3 Migration Checklist

- [ ] Миграция написана
- [ ] Rollback скрипт написан
- [ ] Протестировано на копии production DB
- [ ] Backup production DB создан
- [ ] Применение в низкозагруженное время (UTC 00:00-06:00)

---

## 4. API Safety Rules

### 4.1 WebSocket Events

**Существующие события (НЕ МЕНЯТЬ сигнатуру):**
```typescript
// ❌ НЕЛЬЗЯ менять структуру
game_state, player_joined, betting_started, bet_made, 
turn_update, trick_taken, round_result, game_finished,
player_disconnected, player_replaced, timer_update, error
```

**Добавление новых событий:**
```typescript
// ✅ МОЖНО добавлять новые
economy:balance_updated
tournament:stage_changed
admin:god_mode_action
```

### 4.2 REST API

**MVP endpoints (если есть):** Не менять.

**Phase 2 endpoints:** Новый namespace `/api/admin/*`, `/api/economy/*`

---

## 5. Testing Requirements

### 5.1 Обязательные тесты перед merge

| Test Suite | Command | Required |
|------------|---------|----------|
| Lint | `pnpm lint` | ✅ Pass |
| Type Check | `pnpm type-check` | ✅ Pass |
| Backend Unit | `pnpm test:backend` | ✅ Pass |
| **E2E Game Flow** | `pnpm test:e2e` | ✅ Pass |

### 5.2 E2E Tests — священная корова

```bash
# Эти тесты НИКОГДА не должны падать из-за Phase 2 изменений
tests/e2e/game-flow.spec.ts     # Полный игровой цикл
tests/e2e/betting.spec.ts       # Механика ставок
tests/e2e/reconnect.spec.ts     # Переподключение
```

### 5.3 Coverage Requirements

| Module | Minimum Coverage |
|--------|-----------------|
| Existing (MVP) | Maintain existing |
| New (Phase 2) | ≥ 80% |
| Economy/Ledger | ≥ 90% (critical) |

---

## 6. PR Checklist (обязательный)

```markdown
## PR Checklist

### Code Quality
- [ ] `pnpm lint` passes
- [ ] `pnpm type-check` passes
- [ ] No new `any` types without justification
- [ ] No TODO/FIXME without issue reference

### Testing
- [ ] Unit tests for new code
- [ ] E2E game-flow tests still pass
- [ ] Manual testing completed

### MVP Protection
- [ ] Game flow unchanged OR explicitly tested
- [ ] No breaking changes to existing WebSocket events
- [ ] No breaking changes to existing API
- [ ] Database migrations are additive only

### Documentation
- [ ] TECH_SPEC.md updated if API changed
- [ ] PROGRESS.md updated

### Security (if applicable)
- [ ] No secrets in code
- [ ] Input validation added
- [ ] RBAC enforced for admin endpoints
```

---

## 7. Feature Flags

### 7.1 Configuration

```typescript
// apps/backend/src/config/features.ts
export const FEATURES = {
  ECONOMY_ENABLED: process.env.FEATURE_ECONOMY === 'true',
  ADMIN_PANEL_ENABLED: process.env.FEATURE_ADMIN === 'true',
  TOURNAMENTS_ENABLED: process.env.FEATURE_TOURNAMENTS === 'true',
  TASKS_ENABLED: process.env.FEATURE_TASKS === 'true',
};
```

### 7.2 Usage Pattern

```typescript
// В роутах
if (FEATURES.TOURNAMENTS_ENABLED) {
  app.useGlobalPipes(new ValidationPipe());
  app.use('/api/tournaments', tournamentRoutes);
}

// В модулях
@Module({
  imports: FEATURES.ECONOMY_ENABLED ? [EconomyModule] : [],
})
export class AppModule {}
```

### 7.3 Rollout Strategy

| Phase | Features Enabled | Duration |
|-------|-----------------|----------|
| 1 | None (MVP only) | Baseline |
| 2 | ADMIN_PANEL | 1 week |
| 3 | ECONOMY | 1 week |
| 4 | TOURNAMENTS | 1 week |
| 5 | All | Production |

---

## 8. Monitoring & Rollback

### 8.1 Key Metrics to Watch

| Metric | Normal | Alert |
|--------|--------|-------|
| Game completion rate | > 95% | < 90% |
| WebSocket errors/min | < 1 | > 5 |
| API latency p99 | < 200ms | > 500ms |
| Active games | Stable | -50% sudden drop |

### 8.2 Rollback Procedures

**Code Rollback:**
```bash
# Immediate rollback to previous version
git revert HEAD~N
# or
git reset --hard <last-good-commit>
git push --force-with-lease
```

**Database Rollback:**
```bash
# Each migration MUST have a down script
npx prisma migrate resolve --rolled-back <migration-name>
# or run manual rollback SQL
psql $DATABASE_URL < migrations/rollback/<migration-name>.sql
```

**Feature Flag Rollback:**
```bash
# Instant disable without deploy
FEATURE_TOURNAMENTS=false pm2 restart backend
```

---

## 9. Module Development Order

### Recommended Sequence

```
Week 1-2: Foundation
├── Database migrations (new tables)
├── Economy module (backend)
└── Basic Admin auth

Week 3-4: Admin Panel
├── Admin API (users, transactions)
├── Admin Frontend (TailAdmin)
└── God Mode (backend only)

Week 5-6: Tournaments
├── Tournament engine
├── Bracket logic
└── Integration with tables

Week 7-8: Meta & Polish
├── Tasks system
├── Notifications
├── Affiliate tracking
└── Integration testing

Week 9-10: QA & Launch
├── Full regression testing
├── Performance testing
├── Staged rollout
└── Production launch
```

---

## 10. Emergency Contacts

| Role | Responsibility |
|------|---------------|
| Tech Lead | Architecture decisions, PR approval |
| Backend Lead | API design, database migrations |
| Frontend Lead | UI/UX, Admin Panel |
| DevOps | Deployment, monitoring |

---

## Appendix A: Quick Reference Commands

```bash
# Development
pnpm dev                    # Start all
pnpm dev:backend           # Backend only
pnpm dev:frontend          # Frontend only

# Testing
pnpm test                  # All tests
pnpm test:backend          # Backend unit
pnpm test:e2e              # E2E (Playwright)

# Build
pnpm build                 # Build all
pnpm lint                  # Lint check
pnpm type-check           # TypeScript check

# Database
pnpm prisma migrate dev    # Apply migrations (dev)
pnpm prisma migrate deploy # Apply migrations (prod)
pnpm prisma studio         # DB GUI

# Docker
docker compose up -d       # Start infra
docker compose logs -f     # View logs
```

---

> **Remember**: Когда сомневаешься — спроси. Лучше потратить 5 минут на уточнение, чем 5 часов на откат.
