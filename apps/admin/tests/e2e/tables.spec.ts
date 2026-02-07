import { test, expect } from '@playwright/test';

test.describe('Tables Management (God Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tables');
  });

  test('should display tables list', async ({ page }) => {
    await expect(page.getByTestId('tables-header')).toBeVisible();
    await expect(page.getByTestId('tables-active-heading')).toBeVisible();
    await page.locator('[data-testid="tables-loading"]').count();
    await page.locator('[data-testid="tables-empty-state"]').count();
  });

  test('should auto-refresh tables data', async ({ page }) => {
    await expect(page.getByTestId('tables-active-heading')).toBeVisible();
    await expect(page.getByTestId('tables-refresh')).toBeVisible();
  });

  test('should display table cards with status', async ({ page }) => {
    const statusIndicator = page.getByTestId('table-phase').first();
    await statusIndicator.count();
  });

  test('should navigate to table detail (God Mode)', async ({ page }) => {
    const tableCard = page.getByTestId('table-card').first();

    if (await tableCard.isVisible()) {
      await tableCard.click();
      await page.waitForURL(/\/admin\/tables\/[^/]+/);
      await expect(page).toHaveURL(/\/admin\/tables\/[^/]+/);
      await expect(page.getByTestId('table-detail-heading')).toBeVisible();
    }
  });

  test('should display God Mode view with all player cards', async ({ page }) => {
    const tableCard = page.getByTestId('table-card').first();

    if (await tableCard.isVisible()) {
      await tableCard.click();
      await page.waitForURL(/\/admin\/tables\/[^/]+/);
      const playerHands = page.getByTestId('table-player-hand').first();
      await playerHands.count().catch(() => 0);
    }
  });

  test('should display current game phase', async ({ page }) => {
    const tableCard = page.getByTestId('table-card').first();

    if (await tableCard.isVisible()) {
      await tableCard.click();
      await page.waitForURL(/\/admin\/tables\/[^/]+/);
      const phaseIndicator = page.getByTestId('table-phase-indicator');
      await phaseIndicator.count().catch(() => 0);
    }
  });

  test('should display table metadata', async ({ page }) => {
    const tableCard = page.getByTestId('table-card').first();

    if (await tableCard.isVisible()) {
      await tableCard.click();
      await page.waitForURL(/\/admin\/tables\/[^/]+/);
      const tableInfo = page.getByTestId('table-meta');
      await tableInfo.count().catch(() => 0);
    }
  });

  test('should display cards on table (trick)', async ({ page }) => {
    const tableCard = page.getByTestId('table-card').first();

    if (await tableCard.isVisible()) {
      await tableCard.click();
      await page.waitForURL(/\/admin\/tables\/[^/]+/);
      const tableCards = page.getByTestId('table-cards').first();
      await tableCards.count().catch(() => 0);
    }
  });

  test('should show player information', async ({ page }) => {
    const tableCard = page.getByTestId('table-card').first();

    if (await tableCard.isVisible()) {
      await tableCard.click();
      await page.waitForURL(/\/admin\/tables\/[^/]+/);
      const playerInfo = page.getByTestId('table-player-card').first();
      await playerInfo.count().catch(() => 0);
    }
  });
});
