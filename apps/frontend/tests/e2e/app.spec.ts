import { expect, test } from '@playwright/test';

test('renders landing screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Joker' })).toBeVisible();
  await expect(page.getByText('Card Game')).toBeVisible();
});

test('sets document title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Joker - Card Game');
});

test('does not emit console or page errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      const allowList = [
        'telegram-web-app.js',
        'Connection error',
        'connect_error',
        'ERR_CONNECTION_REFUSED',
      ];
      if (!allowList.some((allowed) => text.includes(allowed))) {
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
  // Allow strict match OR match with viewport-fit=cover
  const viewport = page.locator('meta[name="viewport"]');
  const content = await viewport.getAttribute('content');
  expect(content).toContain('width=device-width');
  expect(content).toContain('initial-scale=1.0');
  expect(content).toContain('maximum-scale=1.0');
  expect(content).toContain('user-scalable=no');
});

test('verifies application root element', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeAttached();
});
