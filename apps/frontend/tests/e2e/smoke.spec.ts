import { test, expect } from '@playwright/test';

test('App loads and shows lobby', async ({ page }) => {
  // 1. Navigate to the app root
  await page.goto('/');

  // 2. Wait for loading spinner to disappear (it has animate-spin class)
  await expect(page.locator('.animate-spin')).toBeHidden({ timeout: 10000 });

  // 3. Check for the title "Joker"
  // Assuming default locale is EN or RU, let's look for h1
  await expect(page.locator('h1')).toBeVisible();

  // 4. Check for "Find Game" button
  // We look for a button that contains text "Find Game" or "Найти игру"
  // Or just check for the 🃏 emoji which is hardcoded
  await expect(page.getByText('🃏')).toBeVisible();

  // Check for development mode text since we are not in Telegram
  await expect(page.getByText('(Development Mode)')).toBeVisible();

  // 5. Take a screenshot for evidence
  await page.screenshot({ path: 'tests/e2e/smoke-test.png' });
});
