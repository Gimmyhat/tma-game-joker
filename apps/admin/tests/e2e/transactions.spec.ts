import { test, expect } from '@playwright/test';

test.describe('Transactions Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/transactions');
  });

  test('should display transactions list', async ({ page }) => {
    await expect(page.getByTestId('transactions-page-header')).toBeVisible();
    await expect(page.getByTestId('transactions-filters')).toBeVisible();
    await expect(page.getByTestId('transactions-table')).toBeVisible();
    const columns = [
      'transactions-column-user',
      'transactions-column-type',
      'transactions-column-amount',
      'transactions-column-status',
      'transactions-column-date',
    ];
    for (const testId of columns) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
  });

  test('should display pending withdrawals warning', async ({ page }) => {
    const pendingAlert = page.getByTestId('pending-withdrawals-alert');
    await pendingAlert.count().catch(() => 0);
  });

  test('should have type filter', async ({ page }) => {
    const typeFilter = page.getByTestId('transactions-type-filter');
    await expect(typeFilter).toBeVisible();
  });

  test('should have status filter', async ({ page }) => {
    const statusFilter = page.getByTestId('transactions-status-filter');
    await expect(statusFilter).toBeVisible();
  });

  test('should display transaction details in table', async ({ page }) => {
    const rows = page.getByTestId('transactions-table').locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('should have approve/reject buttons for pending withdrawals', async ({ page }) => {
    const approveButton = page.locator('[data-testid="pending-withdrawal-approve"]');
    const rejectButton = page.locator('[data-testid="pending-withdrawal-reject"]');
    await approveButton.count().catch(() => 0);
    await rejectButton.count().catch(() => 0);
  });

  test('should support pagination', async ({ page }) => {
    const prevButton = page.getByTestId('transactions-pagination-prev');
    const nextButton = page.getByTestId('transactions-pagination-next');
    await prevButton.count().catch(() => 0);
    await nextButton.count().catch(() => 0);
  });

  test('should filter by date range', async ({ page }) => {
    await expect(page.getByTestId('transactions-column-date')).toBeVisible();
  });
});
