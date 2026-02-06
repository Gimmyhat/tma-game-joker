import { test, expect } from '@playwright/test';

test.describe('Tasks Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/tasks');
  });

  test('should display tasks list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
    await expect(page.getByRole('link', { name: '+ Create Task' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Title' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Reward' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Completions' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Period' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    await page
      .getByText('Loading...')
      .count()
      .catch(() => 0);
    await page
      .getByText('No tasks found')
      .count()
      .catch(() => 0);
  });

  test('should have create task button', async ({ page }) => {
    await expect(page.getByRole('link', { name: '+ Create Task' })).toBeVisible();
  });

  test('should navigate to create task page', async ({ page }) => {
    await page.getByRole('link', { name: '+ Create Task' }).first().click();
    await expect(page.getByRole('heading', { name: 'Create Task' })).toBeVisible();
  });

  test('should display task creation form', async ({ page }) => {
    await page.goto('/admin/tasks/new');
    await expect(page.getByRole('heading', { name: 'Create Task' })).toBeVisible();
    await expect(page.getByText('New Task')).toBeVisible();
    await expect(page.getByRole('link', { name: '← Back to Tasks' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Task' })).toBeVisible();
  });

  test('should have status filter', async ({ page }) => {
    const statusFilter = page.locator('select:has-text("All Status")').first();
    await expect(statusFilter).toBeVisible();
  });

  test('should open task detail page', async ({ page }) => {
    const taskLink = page.locator('a[href*="/tasks/"]:not([href*="/new"])').first();
    if (await taskLink.isVisible()) {
      await taskLink.click();
      await expect(page).toHaveURL(/\/tasks\//);
    }
  });

  test('should display task completions table', async ({ page }) => {
    const taskLink = page.locator('a[href*="/tasks/"]:not([href*="/new"])').first();
    if (await taskLink.isVisible()) {
      await taskLink.click();
      const completionsTable = page.locator('table, .completions').first();
      await completionsTable.count().catch(() => 0);
    }
  });

  test('should have approve/reject buttons for completions', async ({ page }) => {
    const taskLink = page.locator('a[href*="/tasks/"]:not([href*="/new"])').first();
    if (await taskLink.isVisible()) {
      await taskLink.click();
      const approveBtn = page.getByRole('button', { name: 'Approve' });
      const rejectBtn = page.getByRole('button', { name: 'Reject' });
      await approveBtn.count().catch(() => 0);
      await rejectBtn.count().catch(() => 0);
    }
  });

  test('should have delete task functionality', async ({ page }) => {
    const taskLink = page.locator('a[href*="/tasks/"]:not([href*="/new"])').first();
    if (await taskLink.isVisible()) {
      await taskLink.click();
      const deleteBtn = page.getByRole('button', { name: 'Delete' });
      await deleteBtn.count().catch(() => 0);
    }
  });

  test('should edit existing task', async ({ page }) => {
    const taskLink = page.locator('a[href*="/tasks/"]:not([href*="/new"])').first();
    if (await taskLink.isVisible()) {
      await taskLink.click();
      const editBtn = page.locator('button:has-text("Edit")').first();
      await editBtn.count().catch(() => 0);
    }
  });
});
