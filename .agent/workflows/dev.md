---
description: Standard development workflow for Phase 2 with mandatory safety checks
---

# Development Workflow (Phase 2)

> ⚠️ **MANDATORY**: This workflow MUST be used for ALL code changes in Phase 2.
> Skipping any step may break the production MVP.

## Pre-Flight Check

Before starting ANY development task:

// turbo
```bash
# Verify you're on correct branch
git branch --show-current
```

Expected: `develop` or `feature/*` branch. **NEVER work directly on `main`**.

---

## Step 1 — Read Protected Components

Read AGENTS.md to understand what's protected:

```
Protected Components (НЕ МЕНЯТЬ без явного разрешения):
- packages/shared/src/logic/* — 🔒 LOCKED
- SharedMoveValidator, TrickLogic — 🔒 LOCKED
- ScoringService — 🔒 LOCKED
- game.gateway.ts event signatures — 🔒 LOCKED
- apps/frontend/src/components/Game* — ⚠️ CAREFUL
```

If your task requires modifying ANY of these, **STOP and ask for explicit approval**.

---

## Step 2 — Implement Changes

Proceed with implementation following these rules:

1. **Additive only**: Add new code, don't modify existing MVP logic
2. **New namespaces**: Use `/api/admin/*`, `/api/economy/*` for new endpoints
3. **Feature flags**: Wrap new features in feature flags when possible
4. **Tests first**: Write tests for new functionality

---

## Step 3 — Run Safety Checks

// turbo
```bash
pnpm lint
```

// turbo
```bash
pnpm type-check
```

// turbo
```bash
pnpm test:backend
```

All must pass before proceeding.

---

## Step 4 — Run E2E Tests (CRITICAL)

// turbo
```bash
pnpm test:e2e
```

**This is SACRED.** If E2E tests fail:
1. DO NOT COMMIT
2. Revert changes
3. Fix without breaking tests
4. Run again

---

## Step 5 — Database Migration Check

If you added migrations:

1. Verify they are **additive only**:
   - ✅ CREATE TABLE
   - ✅ ADD COLUMN (nullable or with default)
   - ❌ ALTER COLUMN type
   - ❌ DROP anything

2. Verify rollback script exists

---

## Step 6 — Update Documentation

- [ ] `PROGRESS.md` — add session log entry
- [ ] `docs/TECH_SPEC.md` — if API changed
- [ ] `docs/ADMIN_PANEL_MATRIX.md` — if admin screens changed

---

## Step 7 — Commit

Only after ALL checks pass:

```bash
git add .
git commit -m "<type>(<scope>): <description>"
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
Scopes: `admin`, `economy`, `tournament`, `game`, `frontend`, `backend`, `shared`

---

## Output

Report to user:
1. ✅/❌ Lint status
2. ✅/❌ Type check status
3. ✅/❌ Backend tests status
4. ✅/❌ E2E tests status
5. ✅/❌ Protected components untouched
6. Summary of changes made
