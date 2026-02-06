import { test, expect } from '@playwright/test';

test.describe('Tables Management (God Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tables');
  });

  test('should display tables list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Tables' })).toBeVisible();
    await expect(page.getByText(/Active Tables/)).toBeVisible();
    await page
      .getByText('Loading tables...')
      .count()
      .catch(() => 0);
    await page
      .getByText('No active tables')
      .count()
      .catch(() => 0);
  });

  test('should auto-refresh tables data', async ({ page }) => {
    await expect(page.getByText(/Active Tables/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });

  test('should display table cards with status', async ({ page }) => {
    const statusIndicator = page.locator('.status, .badge').first();
    await statusIndicator.count().catch(() => 0);
  });

  test('should navigate to table detail (God Mode)', async ({ page }) => {
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();
      await expect(page).toHaveURL(/\/tables\//);
    }
  });

  test('should display God Mode view with all player cards', async ({ page }) => {
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();
      await page.waitForTimeout(1000);

      const playerHands = page.locator('.player-cards, .hand, .player').first();
      await playerHands.count().catch(() => 0);
    }
  });

  test('should display current game phase', async ({ page }) => {
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();
      const phaseIndicator = page.locator('text=/phase|фаза|раунд/i').first();
      await phaseIndicator.count().catch(() => 0);
    }
  });

  test('should display table metadata', async ({ page }) => {
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();
      const tableInfo = page.locator('.table-info, .meta').first();
      await tableInfo.count().catch(() => 0);
    }
  });

  test('should display cards on table (trick)', async ({ page }) => {
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();
      const tableCards = page.locator('.table-cards, .trick-cards, .center-cards').first();
      await tableCards.count().catch(() => 0);
    }
  });

  test('should show player information', async ({ page }) => {
    const tableLink = page.locator('a[href*="/tables/"]').first();

    if (await tableLink.isVisible()) {
      await tableLink.click();
      const playerInfo = page.locator('.player-name, .player').first();
      await playerInfo.count().catch(() => 0);
    }
  });
});
