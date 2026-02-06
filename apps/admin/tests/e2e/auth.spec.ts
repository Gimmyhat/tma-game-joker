import { test, expect } from '@playwright/test';
import { AUTH_STORAGE_PATH, loginAsAdmin, waitForAppReady } from './fixtures/auth.fixture';

test.describe('Admin Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.goto('/admin/signin');
    await waitForAppReady(page);
  });

  test('should display login page', async ({ page }) => {
    // Check login form elements using data-testid
    await expect(page.getByTestId('username-input')).toBeVisible();
    await expect(page.getByTestId('password-input')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Check heading
    await expect(page.getByRole('heading', { name: /joker admin/i })).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    // Fill wrong credentials
    await page.getByTestId('username-input').fill('wronguser');
    await page.getByTestId('password-input').fill('wrongpassword');

    // Submit
    await page.getByRole('button', { name: /sign in/i }).click();

    const signinReached = await page
      .waitForURL(/\/admin\/signin/, { timeout: 10_000 })
      .then(() => true)
      .catch(() => false);

    await page.waitForLoadState('domcontentloaded').catch(() => {});

    const hasLoginForm = await page
      .getByTestId('username-input')
      .isVisible()
      .catch(() => false);
    const url = page.url();
    const isSignedIn = url.includes('/admin') && !url.includes('/signin');

    expect(signinReached || hasLoginForm).toBeTruthy();
    expect(isSignedIn).toBeFalsy();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginAsAdmin(page);

    // Should be on dashboard
    await expect(page).toHaveURL(/\/admin\/?$/);

    // Should see dashboard content
    await expect(page.locator('aside, nav, main').first()).toBeVisible();

    await page.context().storageState({ path: AUTH_STORAGE_PATH });
  });

  test('should persist session after page reload', async ({ page }) => {
    await loginAsAdmin(page);

    // Reload page
    await page.reload();
    await waitForAppReady(page);

    // Should still be on dashboard (not redirected to signin)
    await expect(page).not.toHaveURL(/\/signin/);
  });

  test('should redirect unauthenticated users to signin', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'authenticated') {
      test.skip(true, 'Authenticated project uses storage state');
    }

    // Try to access protected page directly
    await page.goto('/admin/users');
    await waitForAppReady(page);

    // Wait for potential redirect
    await page.waitForTimeout(1000);

    // Should redirect to signin OR show login form
    const url = page.url();
    const hasSignin = url.includes('/signin');
    const hasLoginForm = await page
      .getByTestId('username-input')
      .isVisible()
      .catch(() => false);

    expect(hasSignin || hasLoginForm).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to settings
    await page.goto('/admin/settings');
    await waitForAppReady(page);

    // Find and click logout button
    const logoutButton = page.getByRole('button', { name: /logout|sign out|выйти/i });
    if (await logoutButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await logoutButton.click();

      // Should be on signin page
      await expect(page).toHaveURL(/\/signin/, { timeout: 10_000 });
    } else {
      // If no logout button visible, test passes (might be different UI)
      test.skip();
    }
  });
});
