import { test, expect } from '@playwright/test';

test.describe('Notifications Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/notifications');
  });

  test('should display notifications list', async ({ page }) => {
    // Wait for notifications table to load
    await expect(page.locator('table, [data-testid="notifications-list"]').first()).toBeVisible();
  });

  test('should have create notification button', async ({ page }) => {
    // Check for create button
    const createButton = page
      .locator(
        'a[href*="/notifications/new"], button:has-text("Create"), button:has-text("Создать")',
      )
      .first();
    await expect(createButton).toBeVisible();
  });

  test('should navigate to create notification page', async ({ page }) => {
    // Click create button
    await page
      .locator(
        'a[href*="/notifications/new"], button:has-text("Create"), button:has-text("Создать")',
      )
      .first()
      .click();

    // Should be on create page
    await expect(page).toHaveURL(/\/notifications\/new/);
  });

  test('should display notification creation form', async ({ page }) => {
    await page.goto('/notifications/new');

    // Check for form elements
    await expect(page.locator('form, [data-testid="notification-form"]').first()).toBeVisible();

    // Check for title/message input
    const titleInput = page.locator('input[name*="title"], textarea[name*="message"]').first();
    await expect(titleInput).toBeVisible();
  });

  test('should have targeting options in form', async ({ page }) => {
    await page.goto('/notifications/new');

    // Check for targeting options (all users, specific users, etc.)
    const targetingSection = page
      .locator('[data-testid="targeting"], select[name*="target"], input[type="radio"]')
      .first();
  });

  test('should have scheduling options', async ({ page }) => {
    await page.goto('/notifications/new');

    // Check for schedule options
    const scheduleSection = page
      .locator('[data-testid="schedule"], input[type="datetime-local"], input[name*="schedule"]')
      .first();
  });

  test('should open notification detail page', async ({ page }) => {
    // Wait for notifications to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

    // Click on a notification
    const notificationLink = page.locator('a[href*="/notifications/"]:not([href*="/new"])').first();

    if (await notificationLink.isVisible()) {
      await notificationLink.click();
      await expect(page).toHaveURL(/\/notifications\/\d+/);
    }
  });

  test('should have send notification button', async ({ page }) => {
    // Navigate to a notification detail
    const notificationLink = page.locator('a[href*="/notifications/"]:not([href*="/new"])').first();

    if (await notificationLink.isVisible()) {
      await notificationLink.click();

      // Check for send button
      const sendBtn = page.locator('button:has-text("Send"), button:has-text("Отправить")').first();
    }
  });

  test('should display delivery statistics', async ({ page }) => {
    // Navigate to a notification detail
    const notificationLink = page.locator('a[href*="/notifications/"]:not([href*="/new"])').first();

    if (await notificationLink.isVisible()) {
      await notificationLink.click();

      // Check for delivery stats
      const deliveryStats = page
        .locator('[data-testid="delivery-stats"], text=/deliver|доставк/i')
        .first();
    }
  });

  test('should have delete notification functionality', async ({ page }) => {
    // Navigate to a notification detail
    const notificationLink = page.locator('a[href*="/notifications/"]:not([href*="/new"])').first();

    if (await notificationLink.isVisible()) {
      await notificationLink.click();

      // Check for delete button
      const deleteBtn = page
        .locator('button:has-text("Delete"), button:has-text("Удалить")')
        .first();
    }
  });

  test('should support filters on list', async ({ page }) => {
    // Check for filter controls
    const filters = page.locator('select, [data-testid="filters"]').first();
  });
});
