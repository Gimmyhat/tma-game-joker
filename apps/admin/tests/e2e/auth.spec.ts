import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  logout,
  ADMIN_CREDENTIALS,
  AUTH_STORAGE_PATH,
} from './fixtures/auth.fixture';
import fs from 'fs';

test.describe('Admin Authentication', () => {
  test.beforeEach(async () => {
    // Clean up auth state before each test
    if (fs.existsSync(AUTH_STORAGE_PATH)) {
      fs.unlinkSync(AUTH_STORAGE_PATH);
    }
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/signin');

    // Check page title
    await expect(page).toHaveTitle(/admin|sign in|login/i);

    // Check login form elements
    await expect(page.locator('input[name="username"], input[type="text"]').first()).toBeVisible();
    await expect(
      page.locator('input[name="password"], input[type="password"]').first(),
    ).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/signin');

    // Fill wrong credentials
    await page.locator('input[name="username"], input[type="text"]').first().fill('wronguser');
    await page
      .locator('input[name="password"], input[type="password"]')
      .first()
      .fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Should show error message
    await expect(page.locator('text=/invalid|error|incorrect|wrong/i').first()).toBeVisible({
      timeout: 5000,
    });

    // Should stay on signin page
    await expect(page).toHaveURL(/\/signin/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginAsAdmin(page);

    // Should be on dashboard
    await expect(page).toHaveURL(/\/$/);

    // Should see admin UI elements
    await expect(page.locator('nav, aside, [data-testid="sidebar"]').first()).toBeVisible();
  });

  test('should persist session after page reload', async ({ page }) => {
    await loginAsAdmin(page);

    // Save storage state
    await page.context().storageState({ path: AUTH_STORAGE_PATH });

    // Reload page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('nav, aside, [data-testid="sidebar"]').first()).toBeVisible();
  });

  test('should redirect unauthenticated users to signin', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/users');

    // Should redirect to signin
    await expect(page).toHaveURL(/\/signin/);
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsAdmin(page);
    await logout(page);

    // Should be on signin page
    await expect(page).toHaveURL(/\/signin/);

    // Try to access protected route
    await page.goto('/');
    await expect(page).toHaveURL(/\/signin/);
  });
});
