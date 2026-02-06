import { test as base, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const configDir = path.dirname(fileURLToPath(import.meta.url));

// Admin test credentials - should match seeded admin user
export const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_TEST_USERNAME ?? 'admin',
  password: process.env.ADMIN_TEST_PASSWORD ?? 'admin123',
};

export const AUTH_STORAGE_PATH = path.join(configDir, '..', '.auth', 'admin.json');

// Ensure auth directory exists
const authDir = path.dirname(AUTH_STORAGE_PATH);
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

/**
 * Wait for app to be ready (React hydrated)
 */
export async function waitForAppReady(page: Page): Promise<void> {
  // Wait for React to hydrate - look for any interactive element
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  // Give React time to hydrate
  await page.waitForTimeout(500);
}

/**
 * Login to admin panel and save storage state
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/signin');
  await waitForAppReady(page);

  // Wait for login form using data-testid
  const usernameInput = page.getByTestId('username-input');
  await expect(usernameInput).toBeVisible({ timeout: 15_000 });

  // Fill credentials
  await usernameInput.fill(ADMIN_CREDENTIALS.username);
  await page.getByTestId('password-input').fill(ADMIN_CREDENTIALS.password);

  // Submit - find button by text
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

  // Verify we're authenticated - check for sidebar or main content
  await expect(page.locator('aside, nav, [role="navigation"]').first()).toBeVisible({
    timeout: 10_000,
  });
}

/**
 * Logout from admin panel
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to settings where logout button is
  await page.goto('/settings');
  await waitForAppReady(page);

  // Click logout button
  const logoutButton = page.getByRole('button', { name: /logout|sign out|выйти/i });
  if (await logoutButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await logoutButton.click();
    await expect(page).toHaveURL(/\/signin/, { timeout: 10_000 });
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
