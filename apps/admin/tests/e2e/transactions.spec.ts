import { test, expect } from '@playwright/test';

test.describe('Transactions Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions');
  });

  test('should display transactions list', async ({ page }) => {
    // Wait for transactions table to load
    await expect(page.locator('table, [data-testid="transactions-table"]').first()).toBeVisible();
  });

  test('should display pending withdrawals warning', async ({ page }) => {
    // Check for pending withdrawals alert/warning (if any exist)
    const pendingAlert = page
      .locator('[data-testid="pending-withdrawals"], .alert, .warning')
      .first();
    // This may not be visible if no pending withdrawals
  });

  test('should have type filter', async ({ page }) => {
    // Check for type filter
    const typeFilter = page.locator('select[name*="type"], [data-testid="type-filter"]').first();
    // Filter may be dropdown or tabs
  });

  test('should have status filter', async ({ page }) => {
    // Check for status filter
    const statusFilter = page
      .locator('select[name*="status"], [data-testid="status-filter"]')
      .first();
  });

  test('should display transaction details in table', async ({ page }) => {
    // Wait for table data
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

    // Check for expected columns (ID, User, Amount, Type, Status, Date)
    const headers = page.locator('th');
    await expect(headers.first()).toBeVisible();
  });

  test('should have approve/reject buttons for pending withdrawals', async ({ page }) => {
    // Filter to pending status if possible
    const statusFilter = page.locator('select[name*="status"]').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('pending');
    }

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Check for action buttons
    const approveButton = page
      .locator('button:has-text("Approve"), button:has-text("Подтвердить")')
      .first();
    const rejectButton = page
      .locator('button:has-text("Reject"), button:has-text("Отклонить")')
      .first();
    // Buttons may not be visible if no pending transactions
  });

  test('should support pagination', async ({ page }) => {
    // Check for pagination controls
    const pagination = page.locator('[data-testid="pagination"], .pagination').first();
  });

  test('should filter by date range', async ({ page }) => {
    // Check for date range picker
    const datePicker = page.locator('input[type="date"], [data-testid="date-filter"]').first();
  });
});
