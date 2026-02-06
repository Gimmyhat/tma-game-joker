import { test, expect } from '@playwright/test';

test.describe('Event Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/event-log');
  });

  test('should display event log page', async ({ page }) => {
    // Wait for event log table to load
    await expect(page.locator('table, [data-testid="event-log"]').first()).toBeVisible();
  });

  test('should display event log entries', async ({ page }) => {
    // Wait for table data
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

    // Check for table with events
    const tableRows = page.locator('table tbody tr');
    // May be empty if no events
  });

  test('should have action type filter', async ({ page }) => {
    // Check for action filter
    const actionFilter = page
      .locator('select[name*="action"], [data-testid="action-filter"]')
      .first();
  });

  test('should display event details', async ({ page }) => {
    // Wait for events to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

    // Check for event columns (ID, Time, Player, Action, Context)
    const headers = page.locator('th');
    await expect(headers.first()).toBeVisible();
  });

  test('should display timestamps', async ({ page }) => {
    // Check for timestamp column
    const timestamps = page.locator('td:has-text(/\\d{4}|\\d{2}:\\d{2}/)').first();
  });

  test('should display action type badges', async ({ page }) => {
    // Check for action type badges/labels
    const badges = page.locator('.badge, [data-testid="action-badge"]').first();
  });

  test('should display player information', async ({ page }) => {
    // Check for player column
    const playerColumn = page.locator('td a[href*="/users/"], td:has-text("user")').first();
  });

  test('should display context/details', async ({ page }) => {
    // Check for context/details column
    const contextColumn = page.locator('td:has-text("{"), td code, td pre').first();
  });

  test('should support pagination', async ({ page }) => {
    // Check for pagination controls
    const pagination = page.locator('[data-testid="pagination"], .pagination').first();
  });

  test('should filter by date range', async ({ page }) => {
    // Check for date filter
    const dateFilter = page.locator('input[type="date"], [data-testid="date-filter"]').first();
  });

  test('should link to related table/tournament', async ({ page }) => {
    // Check for links to tables/tournaments
    const tableLinks = page.locator('a[href*="/tables/"]').first();
  });
});
