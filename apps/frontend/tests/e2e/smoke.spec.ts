import { test, expect } from '@playwright/test';

test('App loads and shows lobby', async ({ page }) => {
  // 1. Navigate to the app root
  await page.goto('/');

  // 2. Wait for loading spinner to disappear (it has animate-spin class)
  await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

  // 3. Lobby shell is visible
  await expect(page.getByTestId('lobby-root')).toBeVisible();

  // 4. Title and connection status are rendered regardless of current connection phase
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.getByTestId('lobby-connection-status')).toBeVisible();

  // 5. Take a screenshot for evidence
  await page.screenshot({ path: 'tests/e2e/smoke-test.png' });
});
