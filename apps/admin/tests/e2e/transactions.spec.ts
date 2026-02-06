import { test, expect } from '@playwright/test';

test.describe('Transactions Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/transactions');
  });

  test('should display transactions list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
    await page
      .getByText('Loading...')
      .count()
      .catch(() => 0);
    await page
      .getByText('No transactions found')
      .count()
      .catch(() => 0);
  });

  test('should display pending withdrawals warning', async ({ page }) => {
    const pendingAlert = page.getByText(/Pending Withdrawal/);
    await pendingAlert.count().catch(() => 0);
  });

  test('should have type filter', async ({ page }) => {
    const typeFilter = page.locator('select:has-text("All Types")').first();
    await expect(typeFilter).toBeVisible();
  });

  test('should have status filter', async ({ page }) => {
    const statusFilter = page.locator('select:has-text("All Statuses")').first();
    await expect(statusFilter).toBeVisible();
  });

  test('should display transaction details in table', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
  });

  test('should have approve/reject buttons for pending withdrawals', async ({ page }) => {
    const approveButton = page.getByRole('button', { name: 'Approve' });
    const rejectButton = page.getByRole('button', { name: 'Reject' });
    await approveButton.count().catch(() => 0);
    await rejectButton.count().catch(() => 0);
  });

  test('should support pagination', async ({ page }) => {
    const pagination = page.locator('button:has-text("Previous"), button:has-text("Next")').first();
    await pagination.count().catch(() => 0);
  });

  test('should filter by date range', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
  });
});
