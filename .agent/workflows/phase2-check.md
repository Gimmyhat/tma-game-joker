---
description: Verify Phase 2 changes don't break MVP before committing
---

# Phase 2 Safety Check Workflow

This workflow ensures that Phase 2 development doesn't break the existing MVP.

## When to Use

Run this workflow **BEFORE** any commit that touches:
- Backend services
- Frontend components
- Shared package
- Database schemas

## Steps

### Step 1 — Check Protected Files

First, verify you're not modifying protected MVP components:

**Protected files (require explicit approval):**
- `packages/shared/src/logic/TrickLogic.ts`
- `packages/shared/src/logic/SharedMoveValidator.ts`
- `apps/backend/src/game/services/GameEngineService.ts`
- `apps/backend/src/game/services/ScoringService.ts`
- `apps/backend/src/gateway/game.gateway.ts` (event signatures)

If you modified any of these, **STOP** and get explicit approval.

### Step 2 — Run Lint and Type Check

// turbo
```bash
pnpm lint && pnpm type-check
```

Both must pass. Fix any errors before proceeding.

### Step 3 — Run Backend Unit Tests

// turbo
```bash
pnpm test:backend
```

All tests must pass. If any test fails:
1. Check if it's a pre-existing failure
2. If your change caused it, fix before proceeding

### Step 4 — Run E2E Tests (CRITICAL)

// turbo
```bash
pnpm test:e2e
```

**This is the SACRED test.** E2E tests verify the complete game flow.

If E2E tests fail after your changes:
1. **DO NOT COMMIT**
2. Revert your changes
3. Identify which change broke the tests
4. Fix without breaking other tests

### Step 5 — Database Migration Check (if applicable)

If you added database migrations:

1. Verify migrations are **additive only**:
   - New tables: ✅
   - New columns (nullable or with default): ✅
   - Dropping/altering existing: ❌

2. Verify rollback script exists:
   ```bash
   ls migrations/rollback/
   ```

### Step 6 — Update Documentation

If your changes affect:
- API: Update `docs/TECH_SPEC.md`
- Admin Panel: Update `docs/ADMIN_PANEL_MATRIX.md`
- Requirements: Update `TOR.md` via `/tor-iterate`

Always update `PROGRESS.md` with your session summary.

## Output

After completing all steps:

1. ✅ All lint/type checks pass
2. ✅ All backend tests pass
3. ✅ All E2E tests pass
4. ✅ No protected files modified (or approval obtained)
5. ✅ Database migrations are safe
6. ✅ Documentation updated

**You are now safe to commit.**

## Emergency Rollback

If something breaks in production:

```bash
# Immediate code rollback
git revert HEAD
git push

# Or reset to last known good state
git reset --hard <last-good-commit>
git push --force-with-lease

# Feature flag disable (fastest)
FEATURE_<NAME>=false pm2 restart backend
```
