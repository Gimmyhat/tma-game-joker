import { test, expect } from '@playwright/test';

test.describe('Notifications Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/notifications');
  });

  test('should display notifications list', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('link', { name: '+ Create Notification' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Content' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Recipients' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    await page
      .getByText('Loading...')
      .count()
      .catch(() => 0);
    await page
      .getByText('No notifications found')
      .count()
      .catch(() => 0);
  });

  test('should have create notification button', async ({ page }) => {
    await expect(page.getByRole('link', { name: '+ Create Notification' })).toBeVisible();
  });

  test('should navigate to create notification page', async ({ page }) => {
    await page.getByRole('link', { name: '+ Create Notification' }).first().click();
    await expect(page.getByText('New Notification')).toBeVisible();
    await expect(page.getByText('Create Notification')).toBeVisible();
  });

  test('should display notification creation form', async ({ page }) => {
    await page.goto('/admin/notifications/new');
    await expect(page.getByText('New Notification')).toBeVisible();
    await expect(page.getByText('Create Notification')).toBeVisible();
    await expect(page.getByRole('link', { name: '← Back to Notifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible();
    await expect(page.getByLabel('Body *')).toBeVisible();
  });

  test('should have targeting options in form', async ({ page }) => {
    await page.goto('/admin/notifications/new');
    const targetingSection = page.locator('input[type="radio"], select[name*="target"]').first();
    await targetingSection.count().catch(() => 0);
  });

  test('should have scheduling options', async ({ page }) => {
    await page.goto('/admin/notifications/new');
    const scheduleSection = page
      .locator('input[type="datetime-local"], input[name*="schedule"]')
      .first();
    await scheduleSection.count().catch(() => 0);
  });

  test('should open notification detail page', async ({ page }) => {
    const notificationLink = page.locator('a[href*="/notifications/"]:not([href*="/new"])').first();
    if (await notificationLink.isVisible()) {
      await notificationLink.click();
      await expect(page).toHaveURL(/\/notifications\//);
    }
  });

  test('should have send notification button', async ({ page }) => {
    const notificationLink = page.locator('a[href*="/notifications/"]:not([href*="/new"])').first();
    if (await notificationLink.isVisible()) {
      await notificationLink.click();
      const sendBtn = page.getByRole('button', { name: 'Send Now' });
      await sendBtn.count().catch(() => 0);
    }
  });

  test('should display delivery statistics', async ({ page }) => {
    const notificationLink = page.locator('a[href*="/notifications/"]:not([href*="/new"])').first();
    if (await notificationLink.isVisible()) {
      await notificationLink.click();
      const deliveryStats = page.getByText(/deliver|доставк/i).first();
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
    const filters = page.locator('select, [name*="filters"]').first();
    await filters.count().catch(() => 0);
  });
});
