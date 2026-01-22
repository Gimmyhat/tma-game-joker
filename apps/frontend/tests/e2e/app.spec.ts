import { expect, test } from '@playwright/test';

test('renders landing screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Joker' })).toBeVisible();
  await expect(page.getByText('Card Game')).toBeVisible();
  await expect(page.getByText('Loading...')).toBeVisible();
});
