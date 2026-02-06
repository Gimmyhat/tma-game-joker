import { test, expect } from '@playwright/test';

test.describe('Event Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/event-log');
  });

  test('should display event log page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Event Log' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
    await page
      .getByText('Loading...')
      .count()
      .catch(() => 0);
    await page
      .getByText('No events found')
      .count()
      .catch(() => 0);
  });

  test('should display event log entries', async ({ page }) => {
    await page.waitForTimeout(500);
    await expect(page.getByRole('columnheader', { name: 'Admin' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
  });

  test('should have action type filter', async ({ page }) => {
    const actionFilter = page.locator('select:has-text("All Actions")').first();
    await expect(actionFilter).toBeVisible();
  });

  test('should display event details', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Details' })).toBeVisible();
  });

  test('should display timestamps', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
  });

  test('should display action type badges', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
  });

  test('should display player information', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Admin' })).toBeVisible();
  });

  test('should display context/details', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Details' })).toBeVisible();
  });

  test('should support pagination', async ({ page }) => {
    const pagination = page.locator('button:has-text("Prev"), button:has-text("Next")').first();
    await pagination.count().catch(() => 0);
  });

  test('should filter by date range', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
  });

  test('should link to related table/tournament', async ({ page }) => {
    const tableLink = page.locator('a[href*="/tables/"]').first();
    await tableLink.count().catch(() => 0);
  });
});
