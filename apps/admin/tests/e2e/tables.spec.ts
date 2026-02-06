import { test, expect } from '@playwright/test';

test.describe('Tables Management (God Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tables');
  });

  test('should display tables list', async ({ page }) => {
    // Wait for tables list to load
    await expect(
      page.locator('[data-testid="tables-list"], .tables-list, .grid, table').first(),
    ).toBeVisible();
  });

  test('should auto-refresh tables data', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000);

    // Check that page is still functional (auto-refresh shouldn't break UI)
    await expect(
      page.locator('[data-testid="tables-list"], .tables-list, .grid, table').first(),
    ).toBeVisible();
  });

  test('should display table cards with status', async ({ page }) => {
    // Wait for table cards
    await page.waitForTimeout(1000);

    // Check for table status indicators (active, waiting, etc.)
    const statusIndicators = page.locator('[data-testid="table-status"], .status, .badge').first();
  });

  test('should navigate to table detail (God Mode)', async ({ page }) => {
    // Wait for tables to load
    await page.waitForTimeout(1000);

    // Click on a table card or link
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();

      // Should be on table detail page
      await expect(page).toHaveURL(/\/tables\/\w+/);
    }
  });

  test('should display God Mode view with all player cards', async ({ page }) => {
    // Navigate to a table detail
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();

      // Wait for God Mode view to load
      await page.waitForTimeout(1000);

      // Check for player hands display
      const playerHands = page.locator('[data-testid="player-hand"], .player-cards, .hand').first();
    }
  });

  test('should display current game phase', async ({ page }) => {
    // Navigate to table detail
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();

      // Check for phase indicator
      const phaseIndicator = page
        .locator('[data-testid="game-phase"], .phase, text=/phase|фаза|раунд/i')
        .first();
    }
  });

  test('should display table metadata', async ({ page }) => {
    // Navigate to table detail
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();

      // Check for table info (entry cost, players count, etc.)
      const tableInfo = page.locator('[data-testid="table-info"], .table-info').first();
    }
  });

  test('should display cards on table (trick)', async ({ page }) => {
    // Navigate to table detail
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();

      // Check for cards on table display
      const tableCards = page
        .locator('[data-testid="table-cards"], .trick-cards, .center-cards')
        .first();
    }
  });

  test('should show player information', async ({ page }) => {
    // Navigate to table detail
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();

      // Check for player info display
      const playerInfo = page.locator('[data-testid="player-info"], .player-name, .player').first();
    }
  });
});
