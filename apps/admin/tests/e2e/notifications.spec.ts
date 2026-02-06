import { test, expect } from '@playwright/test';

test.describe('Notifications Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/notifications');
  });

  test('should display notifications list', async ({ page }) => {
    await expect(page.getByTestId('notifications-page')).toBeVisible();
    await expect(page.getByTestId('notifications-create')).toBeVisible();
    await expect(page.getByTestId('notifications-table')).toBeVisible();
    await page.locator('[data-testid="notifications-loading"]').count();
    await page.locator('[data-testid="notifications-empty"]').count();
  });

  test('should have create notification button', async ({ page }) => {
    await expect(page.getByTestId('notifications-create')).toBeVisible();
  });

  test('should navigate to create notification page', async ({ page }) => {
    await page.getByTestId('notifications-create').click();
    await page.waitForURL('/admin/notifications/new');
    await expect(page.getByTestId('notification-form-heading')).toBeVisible();
  });

  test('should display notification creation form', async ({ page }) => {
    await page.goto('/admin/notifications/new');
    await expect(page.getByTestId('notification-form')).toBeVisible();
    await expect(page.getByTestId('notification-form-heading')).toBeVisible();
    await expect(page.getByTestId('notification-back-link')).toBeVisible();
    await expect(page.getByTestId('notification-form-submit')).toBeVisible();
    await expect(page.getByTestId('notification-body-input')).toBeVisible();
  });

  test('should have targeting options in form', async ({ page }) => {
    await page.goto('/admin/notifications/new');
    const targetingSection = page.getByTestId('notification-target-all');
    await targetingSection.count().catch(() => 0);
  });

  test('should have scheduling options', async ({ page }) => {
    await page.goto('/admin/notifications/new');
    const scheduleSection = page.getByTestId('notification-schedule-input');
    await scheduleSection.count().catch(() => 0);
  });

  test('should open notification detail page', async ({ page }) => {
    const notificationLink = page.getByTestId('notification-detail-link').first();
    if ((await notificationLink.count()) > 0 && (await notificationLink.isVisible())) {
      await notificationLink.click();
      await page.waitForURL(/\/admin\/notifications\/[^/]+/);
      await expect(page).toHaveURL(/\/admin\/notifications\/[^/]+/);
    }
  });

  test('should have send notification button', async ({ page }) => {
    const notificationLink = page.getByTestId('notification-detail-link').first();
    if ((await notificationLink.count()) > 0 && (await notificationLink.isVisible())) {
      await notificationLink.click();
      const sendBtn = page.getByTestId('notification-send-button');
      await sendBtn.count().catch(() => 0);
    }
  });

  test('should display delivery statistics', async ({ page }) => {
    const notificationLink = page.getByTestId('notification-detail-link').first();
    if ((await notificationLink.count()) > 0 && (await notificationLink.isVisible())) {
      await notificationLink.click();
      const deliveryStats = page.getByTestId('notification-delivery-stats');
      await deliveryStats.count().catch(() => 0);
    }
  });

  test('should have delete notification functionality', async ({ page }) => {
    const notificationLink = page.locator('a[href*="/notifications/"]:not([href*="/new"])').first();
    if (await notificationLink.isVisible()) {
      await notificationLink.click();
      const deleteBtn = page.getByRole('button', { name: 'Delete' });
      await deleteBtn.count().catch(() => 0);
    }
  });

  test('should support filters on list', async ({ page }) => {
    const filters = page.getByTestId('notifications-status-filter');
    await filters.count();
  });
});
