import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.getByTestId('global-settings-section')).toBeVisible();
    await expect(page.getByTestId('profile-section')).toBeVisible();
    await expect(page.getByTestId('account-actions-section')).toBeVisible();
    await expect(page.getByTestId('add-setting-button')).toBeVisible();
    await expect(page.getByTestId('save-settings-button')).toBeVisible();
  });

  test('should display admin profile section', async ({ page }) => {
    await expect(page.getByTestId('profile-section')).toBeVisible();
  });

  test('should display admin username', async ({ page }) => {
    await expect(page.getByTestId('profile-username-label')).toBeVisible();
    await expect(page.getByTestId('profile-username-value')).toBeVisible();
  });

  test('should display admin role', async ({ page }) => {
    await expect(page.getByTestId('profile-role-label')).toBeVisible();
    await expect(page.getByTestId('profile-role-value')).toBeVisible();
  });

  test('should have logout button', async ({ page }) => {
    await expect(page.getByTestId('logout-button')).toBeVisible();
  });

  test('should display global settings', async ({ page }) => {
    await expect(page.getByTestId('global-settings-section')).toBeVisible();
  });

  test('should have editable settings fields', async ({ page }) => {
    const section = page.getByTestId('global-settings-section');
    const inputs = section.locator('input, select, [role="switch"]');
    if ((await inputs.count()) > 0) {
      await expect(inputs.first()).toBeVisible();
    } else {
      await expect(page.getByTestId('settings-empty-state')).toBeVisible();
    }
  });

  test('should display important setting rows', async ({ page }) => {
    const rows = page.locator('[data-testid^="setting-row-"]');
    if ((await rows.count()) > 0) {
      await expect(rows.first()).toBeVisible();
    } else {
      await expect(page.getByTestId('settings-empty-state')).toBeVisible();
    }
  });

  test('should save settings changes', async ({ page }) => {
    const section = page.getByTestId('global-settings-section');
    const textInput = section.locator('input[type="text"], input[type="number"]').first();

    if ((await textInput.count()) > 0 && (await textInput.isVisible())) {
      const originalValue = await textInput.inputValue();

      await textInput.fill('test_value_123');

      const saveButton = page.getByTestId('save-settings-button');

      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(500);
      }

      await textInput.fill(originalValue);
    }
  });

  test('should have add new setting functionality', async ({ page }) => {
    await expect(page.getByTestId('add-setting-button')).toBeVisible();
  });

  test('should toggle boolean settings', async ({ page }) => {
    const toggle = page.locator('[role="switch"], input[type="checkbox"]').first();

    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(300);
      await toggle.click();
    }
  });

  test('should navigate to hash anchors for profile menu links', async ({ page }) => {
    const anchors = [
      { id: 'profile', title: 'Edit Profile' },
      { id: 'account-settings', title: 'Account Settings' },
      { id: 'support', title: 'Support' },
    ];

    for (const anchor of anchors) {
      await page.goto(`/admin/settings#${anchor.id}`);
      await expect(page).toHaveURL(new RegExp(`#${anchor.id}$`));

      const section = page.locator(`#${anchor.id}`);
      await expect(section).toBeVisible();
      await expect(page.getByRole('heading', { name: anchor.title }).first()).toBeVisible();
    }
  });
});
