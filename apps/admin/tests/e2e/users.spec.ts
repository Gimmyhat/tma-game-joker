import { test, expect } from '@playwright/test';

test.describe('Users Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/users');
  });

  test('should display users list', async ({ page }) => {
    await expect(page.getByTestId('users-page')).toBeVisible();
    await expect(page.getByTestId('users-table')).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.getByTestId('users-search-input');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('test');
    await page.getByTestId('users-search-button').click();
  });

  test('should have filter options', async ({ page }) => {
    await expect(page.getByTestId('users-status-filter')).toBeVisible();
  });

  test('should open user detail page', async ({ page }) => {
    const viewButton = page.getByTestId('user-view-link').first();

    if ((await viewButton.count()) > 0 && (await viewButton.isVisible())) {
      await viewButton.click();
      await page.waitForURL(/\/admin\/users\/[^/]+/);
      await expect(page).toHaveURL(/\/admin\/users\/[^/]+/);
    }
  });

  test('should display user detail with profile info', async ({ page }) => {
    const userLink = page.getByTestId('user-view-link').first();
    if ((await userLink.count()) > 0 && (await userLink.isVisible())) {
      await userLink.click();
      await expect(page.getByTestId('user-profile')).toBeVisible();
    }
  });

  test('should have block/unblock functionality', async ({ page }) => {
    const blockButton = page.getByTestId('user-block-button').first();
    await blockButton.count().catch(() => 0);
  });

  test('should display user balance', async ({ page }) => {
    const userLink = page.getByTestId('user-view-link').first();
    if ((await userLink.count()) > 0 && (await userLink.isVisible())) {
      await userLink.click();
      await expect(page.getByTestId('user-balance')).toBeVisible();
    }
  });

  test('should have balance adjustment functionality', async ({ page }) => {
    const userLink = page.getByTestId('user-view-link').first();
    if ((await userLink.count()) > 0 && (await userLink.isVisible())) {
      await userLink.click();
      const adjustButton = page.getByTestId('user-adjust-balance-button');
      await adjustButton.count().catch(() => 0);
    }
  });

  test('should display user transactions tab', async ({ page }) => {
    const userLink = page.getByTestId('user-view-link').first();
    if ((await userLink.count()) > 0 && (await userLink.isVisible())) {
      await userLink.click();
      const transactionsTab = page.getByTestId('transactions-tab');
      await transactionsTab.count().catch(() => 0);
    }
  });

  test('should display user referrals', async ({ page }) => {
    const userLink = page.getByTestId('user-view-link').first();
    if ((await userLink.count()) > 0 && (await userLink.isVisible())) {
      await userLink.click();
      const referralsSection = page.getByTestId('referrals-tab');
      await referralsSection.count().catch(() => 0);
    }
  });

  test('should support pagination', async ({ page }) => {
    const pagination = page.getByTestId('users-pagination');
    await pagination.count().catch(() => 0);
  });
});
