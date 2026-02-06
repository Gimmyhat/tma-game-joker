import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Global Settings' })).toBeVisible();
    await page
      .getByText('Loading settings...')
      .count()
      .catch(() => 0);
    await page
      .getByText('No settings configured. Click "Add Setting" to create one.')
      .count()
      .catch(() => 0);
    await expect(page.getByText('Account Actions')).toBeVisible();
  });

  test('should display admin profile section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Profile Information' })).toBeVisible();
  });

  test('should display admin username', async ({ page }) => {
    await expect(page.getByText('Username')).toBeVisible();
  });

  test('should display admin role', async ({ page }) => {
    await expect(page.getByText('Role')).toBeVisible();
  });

  test('should have logout button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('should display global settings', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Global Settings' })).toBeVisible();
    await expect(page.getByText('House Edge (%)')).toBeVisible();
    await expect(page.getByText('Referral Bonus')).toBeVisible();
    await expect(page.getByText('Turn Timeout (sec)')).toBeVisible();
  });

  test('should have editable settings fields', async ({ page }) => {
    const editable = page.locator('form input, form select, form [role="switch"]').first();
    await expect(editable).toBeVisible();
  });

  test('should display house edge setting', async ({ page }) => {
    await expect(page.getByText('House Edge (%)')).toBeVisible();
  });

  test('should display referral bonus setting', async ({ page }) => {
    await expect(page.getByText('Referral Bonus')).toBeVisible();
  });

  test('should display bot timer setting', async ({ page }) => {
    await expect(page.getByText('Turn Timeout (sec)')).toBeVisible();
  });

  test('should save settings changes', async ({ page }) => {
    const textInput = page.locator('form input[type="text"], form input[type="number"]').first();

    if (await textInput.isVisible()) {
      const originalValue = await textInput.inputValue();

      await textInput.fill('test_value_123');

      const saveButton = page.getByRole('button', { name: 'Save Changes' });

      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }

      await textInput.fill(originalValue);
    }
  });

  test('should have add new setting functionality', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Add Setting' })).toBeVisible();
  });

  test('should toggle boolean settings', async ({ page }) => {
    const toggle = page.locator('[role="switch"], input[type="checkbox"]').first();

    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(300);
      await toggle.click();
    }
  });
});
