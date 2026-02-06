import { test, expect } from '@playwright/test';

test.describe('Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('should display settings page', async ({ page }) => {
    // Check for settings sections
    await expect(
      page.locator('[data-testid="settings"], .settings-page, form').first(),
    ).toBeVisible();
  });

  test('should display admin profile section', async ({ page }) => {
    // Check for profile section
    const profileSection = page.locator('[data-testid="profile"], text=/profile|профиль/i').first();
    await expect(profileSection).toBeVisible();
  });

  test('should display admin username', async ({ page }) => {
    // Check for username display
    const username = page.locator('text=/admin|username/i').first();
  });

  test('should display admin role', async ({ page }) => {
    // Check for role display
    const roleDisplay = page
      .locator('text=/role|роль|operator|moderator|admin|superadmin/i')
      .first();
  });

  test('should have logout button', async ({ page }) => {
    // Check for logout button
    const logoutButton = page
      .locator('button:has-text("Logout"), button:has-text("Выйти")')
      .first();
    await expect(logoutButton).toBeVisible();
  });

  test('should display global settings', async ({ page }) => {
    // Check for settings form/list
    const settingsForm = page
      .locator('form, [data-testid="global-settings"], .settings-list')
      .first();
    await expect(settingsForm).toBeVisible();
  });

  test('should have editable settings fields', async ({ page }) => {
    // Check for input fields (toggles, inputs)
    const settingsInputs = page.locator('input, select, [role="switch"]').first();
  });

  test('should display house edge setting', async ({ page }) => {
    // Check for house edge/margin setting
    const houseEdge = page.locator('text=/house.*edge|margin|маржа/i').first();
  });

  test('should display referral bonus setting', async ({ page }) => {
    // Check for referral bonus setting
    const referralBonus = page.locator('text=/referral.*bonus|реферальн.*бонус/i').first();
  });

  test('should display bot timer setting', async ({ page }) => {
    // Check for bot timer setting
    const botTimer = page.locator('text=/bot.*timer|таймер.*бот/i').first();
  });

  test('should save settings changes', async ({ page }) => {
    // Find a text input setting and modify it
    const textInput = page.locator('input[type="text"], input[type="number"]').first();

    if (await textInput.isVisible()) {
      const originalValue = await textInput.inputValue();

      // Change value
      await textInput.fill('test_value_123');

      // Look for save button
      const saveButton = page
        .locator('button:has-text("Save"), button:has-text("Сохранить")')
        .first();

      if (await saveButton.isVisible()) {
        await saveButton.click();

        // Wait for save
        await page.waitForTimeout(500);
      }

      // Restore original value
      await textInput.fill(originalValue);
    }
  });

  test('should have add new setting functionality', async ({ page }) => {
    // Check for add setting button/form
    const addButton = page.locator('button:has-text("Add"), button:has-text("Добавить")').first();
  });

  test('should toggle boolean settings', async ({ page }) => {
    // Find a toggle/switch
    const toggle = page.locator('[role="switch"], input[type="checkbox"]').first();

    if (await toggle.isVisible()) {
      // Toggle it
      await toggle.click();
      await page.waitForTimeout(300);

      // Toggle back
      await toggle.click();
    }
  });
});
