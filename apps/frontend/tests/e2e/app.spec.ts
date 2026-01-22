import { expect, test } from '@playwright/test';

test('renders landing screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Joker' })).toBeVisible();
  await expect(page.getByText('Card Game')).toBeVisible();
  await expect(page.getByText('Loading...')).toBeVisible();
});

test('sets document title and loads Telegram WebApp script', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Joker - Card Game');
  await expect(page.locator('script[src*="telegram-web-app.js"]')).toHaveCount(1);
});

test('does not emit console or page errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!text.includes('telegram-web-app.js')) {
        errors.push(text);
      }
    }
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('verifies essential meta tags for mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    'content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#000000');
});

test('verifies application root element', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeAttached();
});
