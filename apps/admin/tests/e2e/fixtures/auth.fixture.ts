import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

// Admin test credentials - should match seeded admin user
export const ADMIN_CREDENTIALS = {
  username: process.env.E2E_ADMIN_USERNAME ?? 'admin',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'admin123',
};

export const AUTH_STORAGE_PATH = path.join(configDir, '..', '.auth', 'admin.json');

// Ensure auth directory exists
const authDir = path.dirname(AUTH_STORAGE_PATH);
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

/**
 * Login to admin panel and save storage state
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/signin');

  // Wait for login form
  await expect(page.locator('input[name="username"], input[type="text"]').first()).toBeVisible();

  // Fill credentials
  await page
    .locator('input[name="username"], input[type="text"]')
    .first()
    .fill(ADMIN_CREDENTIALS.username);
  await page
    .locator('input[name="password"], input[type="password"]')
    .first()
    .fill(ADMIN_CREDENTIALS.password);

  // Submit
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

  // Verify we're authenticated - check for sidebar or user menu
  await expect(page.locator('[data-testid="sidebar"], nav, aside').first()).toBeVisible();
}

/**
 * Logout from admin panel
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to settings where logout button is
  await page.goto('/settings');

  // Click logout button
  const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Выйти")');
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await expect(page).toHaveURL(/\/signin/);
  }
}

/**
 * Extended test with admin authentication
 */
export const test = base.extend<{ adminPage: Page }>({
  adminPage: async ({ page }, use) => {
    // If storage state doesn't exist, login first
    if (!fs.existsSync(AUTH_STORAGE_PATH)) {
      await loginAsAdmin(page);
      await page.context().storageState({ path: AUTH_STORAGE_PATH });
    }
    await use(page);
  },
});

export { expect };
