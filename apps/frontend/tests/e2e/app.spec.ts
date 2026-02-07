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

test('opens tournament details and performs join/leave flow', async ({ page }) => {
  await page.route('**/tournaments?pageSize=20', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 't-001',
            title: 'Weekly Cup',
            status: 'REGISTRATION',
            config: { maxPlayers: 16 },
            registrationStart: '2026-02-10T10:00:00.000Z',
            startTime: '2026-02-10T12:00:00.000Z',
            currentStage: 1,
            bracketState: null,
            _count: { participants: 1 },
          },
        ],
      }),
    });
  });

  await page.route('**/tournaments/t-001', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 't-001',
        title: 'Weekly Cup',
        status: 'REGISTRATION',
        config: { maxPlayers: 16 },
        registrationStart: '2026-02-10T10:00:00.000Z',
        startTime: '2026-02-10T12:00:00.000Z',
        currentStage: 1,
        bracketState: {
          format: 'single_elimination',
          size: 16,
          currentStage: 1,
          finished: false,
          winnerUserId: null,
          updatedAt: '2026-02-10T12:00:00.000Z',
          stages: [
            {
              stage: 1,
              matches: [
                {
                  id: 's1m1',
                  stage: 1,
                  index: 0,
                  player1UserId: '111111111',
                  player2UserId: '777777777',
                  winnerUserId: null,
                  status: 'PENDING',
                },
              ],
            },
          ],
        },
        _count: { participants: 1 },
      }),
    });
  });

  await page.route('**/tournaments/t-001/join', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.route('**/tournaments/t-001/leave', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.goto('/');

  const tournamentsButton = page.getByRole('button', { name: /tournaments|турниры/i }).first();
  await expect(tournamentsButton).toBeVisible();
  await tournamentsButton.click();

  await expect(page.getByTestId('tournament-details-t-001')).toBeVisible();
  await page.getByTestId('tournament-details-t-001').click();

  await expect(page.getByTestId('tournament-bracket')).toBeVisible();
  await expect(page.getByTestId('tournament-match-s1m1')).toBeVisible();

  await page.getByTestId('tournament-join').click();
  await expect(
    page.getByText(/registered for this tournament|успешно зарегистрированы на турнир/i),
  ).toBeVisible();

  await page.getByTestId('tournament-leave').click();
  await expect(
    page.getByText(/registration has been cancelled|регистрация в турнире отменена/i),
  ).toBeVisible();
});
