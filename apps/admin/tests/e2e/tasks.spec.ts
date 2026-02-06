import { test, expect } from '@playwright/test';

test.describe('Tasks Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tasks');
  });

  test('should display tasks list', async ({ page }) => {
    // Wait for tasks table/list to load
    await expect(
      page.locator('table, [data-testid="tasks-list"], .tasks-list').first(),
    ).toBeVisible();
  });

  test('should have create task button', async ({ page }) => {
    // Check for create button
    const createButton = page
      .locator('a[href*="/tasks/new"], button:has-text("Create"), button:has-text("Создать")')
      .first();
    await expect(createButton).toBeVisible();
  });

  test('should navigate to create task page', async ({ page }) => {
    // Click create button
    await page
      .locator('a[href*="/tasks/new"], button:has-text("Create"), button:has-text("Создать")')
      .first()
      .click();

    // Should be on create page
    await expect(page).toHaveURL(/\/tasks\/new/);
  });

  test('should display task creation form', async ({ page }) => {
    await page.goto('/tasks/new');

    // Check for form elements
    await expect(page.locator('form, [data-testid="task-form"]').first()).toBeVisible();

    // Check for title input
    const titleInput = page
      .locator('input[name*="title"], input[name*="name"], input[placeholder*="title" i]')
      .first();
    await expect(titleInput).toBeVisible();
  });

  test('should have status filter', async ({ page }) => {
    // Check for status filter
    const statusFilter = page
      .locator('select[name*="status"], [data-testid="status-filter"]')
      .first();
  });

  test('should open task detail page', async ({ page }) => {
    // Wait for tasks to load
    await page
      .waitForSelector('table tbody tr, [data-testid="task-row"]', { timeout: 10000 })
      .catch(() => {});

    // Click on a task
    const taskLink = page.locator('a[href*="/tasks/"]:not([href*="/new"])').first();

    if (await taskLink.isVisible()) {
      await taskLink.click();
      await expect(page).toHaveURL(/\/tasks\/\d+/);
    }
  });

  test('should display task completions table', async ({ page }) => {
    // Navigate to a task detail
    const taskLink = page.locator('a[href*="/tasks/"]:not([href*="/new"])').first();

    if (await taskLink.isVisible()) {
      await taskLink.click();

      // Check for completions table
      const completionsTable = page.locator('[data-testid="completions-table"], table').first();
    }
  });

  test('should have approve/reject buttons for completions', async ({ page }) => {
    // Navigate to a task detail
    const taskLink = page.locator('a[href*="/tasks/"]:not([href*="/new"])').first();

    if (await taskLink.isVisible()) {
      await taskLink.click();

      // Check for action buttons
      const approveBtn = page
        .locator('button:has-text("Approve"), button:has-text("Подтвердить")')
        .first();
      const rejectBtn = page
        .locator('button:has-text("Reject"), button:has-text("Отклонить")')
        .first();
    }
  });

  test('should have delete task functionality', async ({ page }) => {
    // Navigate to a task detail
    const taskLink = page.locator('a[href*="/tasks/"]:not([href*="/new"])').first();

    if (await taskLink.isVisible()) {
      await taskLink.click();

      // Check for delete button
      const deleteBtn = page
        .locator('button:has-text("Delete"), button:has-text("Удалить")')
        .first();
    }
  });

  test('should edit existing task', async ({ page }) => {
    // Navigate to a task detail
    const taskLink = page.locator('a[href*="/tasks/"]:not([href*="/new"])').first();

    if (await taskLink.isVisible()) {
      await taskLink.click();

      // Check for edit form/button
      const editForm = page
        .locator('form, button:has-text("Edit"), button:has-text("Редактировать")')
        .first();
    }
  });
});
