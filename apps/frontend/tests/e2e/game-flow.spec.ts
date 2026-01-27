import { expect, test } from '@playwright/test';

const players = [
  { id: 1001, name: 'Player 1' },
  { id: 1002, name: 'Player 2' },
  { id: 1003, name: 'Player 3' },
  { id: 1004, name: 'Player 4' },
];

test('4 players can place bets and reach playing phase', async ({ browser }) => {
  test.setTimeout(90000);
  const contexts = await Promise.all(players.map(() => browser.newContext()));
  const pages = await Promise.all(contexts.map((context) => context.newPage()));

  try {
    // Connect all players and click Find Game
    for (let i = 0; i < pages.length; i += 1) {
      const player = players[i];
      const page = pages[i];
      await page.goto(`/?devUserId=${player.id}&devUserName=${encodeURIComponent(player.name)}`);

      // Wait for page to load
      await Promise.race([
        page
          .getByRole('heading', { name: /Joker|Джокер/i })
          .waitFor({ state: 'visible', timeout: 15000 }),
        page
          .getByText(/Round|Раунд/i)
          .first()
          .waitFor({ state: 'visible', timeout: 15000 }),
      ]);

      // Wait for socket connection - button only appears when connected
      const findGameButton = page.getByRole('button', { name: /Find Game|Найти игру/i });
      await findGameButton.waitFor({ state: 'visible', timeout: 20000 });
      await findGameButton.click();
    }

    const betPlaced = new Set<number>();
    const start = Date.now();

    while (betPlaced.size < pages.length && Date.now() - start < 60000) {
      for (let i = 0; i < pages.length; i += 1) {
        if (betPlaced.has(i)) continue;
        const page = pages[i];

        // Check for Trump Selection first
        const trumpModal = page.getByText(/Choose Trump|Выберите козырь/i);
        if (await trumpModal.isVisible()) {
          // If trump selection appears, select Hearts to proceed
          const heartsButton = page.getByRole('button', { name: /Hearts|Черви/i }).first();
          if (await heartsButton.isVisible()) {
            await heartsButton.click();
            await expect(trumpModal).toBeHidden({ timeout: 10000 });
            // Note: we don't mark as betPlaced yet, we just handled the interruption
            continue;
          }
        }

        const modal = page.getByText(/Make Your Bet|Ваша ставка/i);
        const visible = await modal.isVisible();
        if (!visible) continue;

        await page.locator('button', { hasText: '0' }).first().click();
        await page.getByRole('button', { name: /Confirm Bet|Подтвердить/i }).click();
        await expect(modal).toBeHidden({ timeout: 10000 });
        betPlaced.add(i);
      }

      if (betPlaced.size < pages.length) {
        await pages[0].waitForTimeout(500);
      }
    }

    expect(betPlaced.size).toBe(pages.length);
    // Updated to match "Play a Card" (en) or "Сделайте ход" (ru) or "playing" (legacy/fallback)
    // Using .first() to target the Phase Badge (visible to all) instead of Hint (visible only to active player)
    await expect(pages[0].getByText(/Play a Card|Сделайте ход|playing/i).first()).toBeVisible({
      timeout: 20000,
    });
  } finally {
    await Promise.all(pages.map((page) => page.close()));
    await Promise.all(contexts.map((context) => context.close()));
  }
});
