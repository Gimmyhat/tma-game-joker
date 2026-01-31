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

        const modal = page.getByText(/Place Your Bet|Ваша ставка/i).first();
        const visible = await modal.isVisible();
        if (!visible) continue;

        const modalRoot = modal.locator('..').locator('..');
        const betButtons = modalRoot.locator('button:not([disabled])');
        const buttonCount = await betButtons.count();

        for (let b = 0; b < buttonCount; b += 1) {
          await betButtons.nth(b).click({ force: true });
          try {
            await expect(modal).toBeHidden({ timeout: 3000 });
            betPlaced.add(i);
            break;
          } catch {
            // Try next available bet
          }
        }
      }

      if (betPlaced.size < pages.length) {
        await pages[0].waitForTimeout(500);
      }
    }

    expect(betPlaced.size).toBe(pages.length);
    // Wait for the round/game UI to be visible instead of looking for specific text that might change
    // The "Round" indicator is always visible in game phase
    await expect(pages[0].getByText(/Round|Раунд/i).first()).toBeVisible({
      timeout: 30000,
    });

    // Also verify the table element exists, confirming we are in game view
    // Use .first() to resolve strict mode violation if multiple matching containers exist
    await expect(pages[0].locator('.w-full.h-full.z-10').first()).toBeVisible();
  } finally {
    await Promise.all(pages.map((page) => page.close()));
    await Promise.all(contexts.map((context) => context.close()));
  }
});
