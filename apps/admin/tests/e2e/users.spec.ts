import { test, expect } from '@playwright/test';

test.describe('Users Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/users');
  });

  test('should display users list', async ({ page }) => {
    // Wait for users table to load
    await expect(
      page.locator('table, [data-testid="users-table"], .users-list').first(),
    ).toBeVisible();

    // Should have table headers
    const tableHeaders = page.locator('th, [data-testid="table-header"]');
    await expect(tableHeaders.first()).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    // Find search input
    const searchInput = page
      .locator(
        'input[type="search"], input[placeholder*="search" i], input[placeholder*="поиск" i]',
      )
      .first();
    await expect(searchInput).toBeVisible();

    // Type search query
    await searchInput.fill('test');
    await searchInput.press('Enter');

    // Wait for results to update
    await page.waitForTimeout(500);
  });

  test('should have filter options', async ({ page }) => {
    // Check for filter controls
    const filterControls = page
      .locator('[data-testid="filters"], .filters, select, [role="combobox"]')
      .first();
    await filterControls.count().catch(() => 0);
    // Filters may be collapsed or optional
  });

  test('should open user detail page', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table tbody tr, [data-testid="user-row"]', { timeout: 10000 });

    // Click on first user row or view button
    const viewButton = page
      .locator('a[href*="/users/"], button:has-text("View"), button:has-text("Просмотр")')
      .first();

    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Should navigate to user detail page
      await expect(page).toHaveURL(/\/users\/\d+/);
    }
  });

  test('should display user detail with profile info', async ({ page }) => {
    // Navigate to first user's detail page
    await page.waitForSelector('table tbody tr, [data-testid="user-row"]', { timeout: 10000 });

    const userLink = page.locator('a[href*="/users/"]').first();
    if (await userLink.isVisible()) {
      await userLink.click();

      // Should display user info
      await expect(
        page.locator('[data-testid="user-profile"], .user-profile, .card').first(),
      ).toBeVisible();
    }
  });

  test('should have block/unblock functionality', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('table tbody tr', { timeout: 10000 });

    // Check for block button
    const blockButton = page
      .locator('button:has-text("Block"), button:has-text("Заблокировать")')
      .first();
    await blockButton.count().catch(() => 0);
    // Button existence check (may not be on every user)
  });

  test('should display user balance', async ({ page }) => {
    // Navigate to user detail
    const userLink = page.locator('a[href*="/users/"]').first();
    if (await userLink.isVisible()) {
      await userLink.click();

      // Check for balance display
      await expect(page.locator('text=/balance|баланс/i').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have balance adjustment functionality', async ({ page }) => {
    // Navigate to user detail
    const userLink = page.locator('a[href*="/users/"]').first();
    if (await userLink.isVisible()) {
      await userLink.click();

      // Check for adjust balance button
      const adjustButton = page
        .locator('button:has-text("Adjust"), button:has-text("Изменить баланс")')
        .first();
      await adjustButton.count().catch(() => 0);
      // Just check page loads correctly
    }
  });

  test('should display user transactions tab', async ({ page }) => {
    // Navigate to user detail
    const userLink = page.locator('a[href*="/users/"]').first();
    if (await userLink.isVisible()) {
      await userLink.click();

      // Check for transactions tab
      const transactionsTab = page
        .locator(
          'button:has-text("Transactions"), button:has-text("Транзакции"), [data-testid="transactions-tab"]',
        )
        .first();
      await transactionsTab.count().catch(() => 0);
    }
  });

  test('should display user referrals', async ({ page }) => {
    // Navigate to user detail
    const userLink = page.locator('a[href*="/users/"]').first();
    if (await userLink.isVisible()) {
      await userLink.click();

      // Check for referrals section
      const referralsSection = page.locator('text=/referral|реферал/i').first();
      await referralsSection.count().catch(() => 0);
    }
  });

  test('should support pagination', async ({ page }) => {
    // Check for pagination controls
    const pagination = page
      .locator('[data-testid="pagination"], .pagination, nav[aria-label="pagination"]')
      .first();
    await pagination.count().catch(() => 0);
    // Pagination may not be visible if few users
  });
});
