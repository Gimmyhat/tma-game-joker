import { expect, test, Page } from '@playwright/test';
import * as path from 'path';

const players = [
  { id: 1001, name: 'Player 1' },
  { id: 1002, name: 'Player 2' },
  { id: 1003, name: 'Player 3' },
  { id: 1004, name: 'Player 4' },
];

/**
 * Helper: Capture debug screenshot with timestamp
 */
async function captureDebugScreenshot(
  page: Page,
  playerIndex: number,
  label: string,
): Promise<string> {
  const timestamp = Date.now();
  const filename = `debug-player${playerIndex + 1}-${label}-${timestamp}.png`;
  const screenshotPath = path.join('test-results', filename);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

/**
 * Helper: Get current page state for debugging
 */
async function getPageState(page: Page): Promise<string> {
  const url = page.url();

  // Check for various UI elements
  const checks = {
    lobbyTitle: await page
      .getByRole('heading', { name: /Joker|Джокер/i })
      .isVisible()
      .catch(() => false),
    findGameBtn: await page
      .getByRole('button', { name: /Find Game|Найти игру/i })
      .isVisible()
      .catch(() => false),
    leaveQueueBtn: await page
      .getByRole('button', { name: /Leave Queue|Покинуть очередь/i })
      .isVisible()
      .catch(() => false),
    waitingText: await page
      .getByText(/Waiting for players|Ожидание/i)
      .isVisible()
      .catch(() => false),
    roundIndicator: await page
      .getByText(/Round|Раунд/i)
      .first()
      .isVisible()
      .catch(() => false),
    trumpModal: await page
      .getByText(/Choose Trump|Выбор козыря/i)
      .isVisible()
      .catch(() => false),
    trumpWaiting: await page
      .getByText(/is choosing|выбирает/i)
      .isVisible()
      .catch(() => false),
    betModal: await page
      .getByText(/Place Your Bet|Ваша ставка/i)
      .isVisible()
      .catch(() => false),
    loadingSpinner: await page
      .locator('.animate-spin')
      .isVisible()
      .catch(() => false),
    errorBanner: await page
      .locator('.bg-red-900, .text-red-400')
      .first()
      .isVisible()
      .catch(() => false),
  };

  const visibleElements = Object.entries(checks)
    .filter(([, visible]) => visible)
    .map(([name]) => name);

  return `URL: ${url} | Visible: [${visibleElements.join(', ')}]`;
}

/**
 * Helper: Wait for the game to be ready for betting/playing
 * This waits until the game is past tuzovanie and into an actionable phase
 */
async function waitForGameReady(
  page: Page,
  playerIndex: number,
  allPages: Page[],
  timeout = 45000,
): Promise<void> {
  const start = Date.now();

  // Poll for game ready indicators
  while (Date.now() - start < timeout) {
    // Check for trump selection modal (chooser view)
    const chooseTrumpHeader = page.getByText(/Choose Trump|Выбор козыря/i).first();
    if (await chooseTrumpHeader.isVisible().catch(() => false)) {
      return;
    }

    // Check for trump selection waiting view (non-chooser)
    const waitingForTrump = page.getByText(/is choosing|выбирает/i).first();
    if (await waitingForTrump.isVisible().catch(() => false)) {
      return;
    }

    // Check for bet modal header
    const betModal = page.getByText(/Place Your Bet|Ваша ставка/i).first();
    if (await betModal.isVisible().catch(() => false)) {
      return;
    }

    // Check for generic round indicator (means game screen is loaded)
    // This is needed for players who are NOT the active better/chooser
    const roundIndicator = page.getByText(/Round|Раунд/i).first();
    if (await roundIndicator.isVisible().catch(() => false)) {
      return;
    }

    // Small wait before retrying
    await page.waitForTimeout(200);
  }

  // TIMEOUT - capture debug info for ALL pages
  console.error(`\n=== TIMEOUT DEBUG INFO (Player ${playerIndex + 1}) ===`);
  for (let i = 0; i < allPages.length; i++) {
    try {
      const state = await getPageState(allPages[i]);
      console.error(`Player ${i + 1}: ${state}`);
      await captureDebugScreenshot(allPages[i], i, 'timeout');
    } catch (e) {
      console.error(`Player ${i + 1}: Failed to capture state - ${e}`);
    }
  }
  console.error('=== END DEBUG INFO ===\n');

  throw new Error(
    `Timeout waiting for game to be ready (past tuzovanie) - Player ${playerIndex + 1}`,
  );
}

/**
 * Helper: Handle trump selection phase.
 * Only the chooser sees buttons, others see a waiting spinner.
 * Returns true if trump was selected on this page.
 */
async function trySelectTrump(page: Page): Promise<boolean> {
  // Look for suit buttons (only chooser has them)
  // Use locator with text match instead of getByRole for more reliable detection
  const suitButtonSelectors = [
    page.locator('button:has-text("Hearts")'),
    page.locator('button:has-text("Diamonds")'),
    page.locator('button:has-text("Clubs")'),
    page.locator('button:has-text("Spades")'),
    page.locator('button:has-text("Червы")'),
    page.locator('button:has-text("Бубны")'),
    page.locator('button:has-text("Трефы")'),
    page.locator('button:has-text("Пики")'),
  ];

  for (const btn of suitButtonSelectors) {
    try {
      const isVisible = await btn.isVisible({ timeout: 100 });
      if (isVisible) {
        const isDisabled = await btn.isDisabled();
        if (!isDisabled) {
          await btn.click({ force: true });
          await page.waitForTimeout(300);
          return true;
        }
      }
    } catch {
      // Button not found, continue
    }
  }
  return false;
}

/**
 * Helper: Handle betting phase.
 * Returns true if bet was placed on this page.
 */
async function tryPlaceBet(page: Page): Promise<boolean> {
  // Look for the betting modal by its header text
  const betModalHeader = page.getByText(/Place Your Bet|Ваша ставка/i).first();

  try {
    const isVisible = await betModalHeader.isVisible({ timeout: 100 });
    if (!isVisible) return false;
  } catch {
    return false;
  }

  // Find the modal container and its buttons
  // The modal structure: fixed container > relative container (modalRoot) > header + numpad
  const modalContainer = betModalHeader.locator('..').locator('..');
  const betButtons = modalContainer.locator('button:not([disabled])');

  const buttonCount = await betButtons.count();
  if (buttonCount === 0) return false;

  // Click the first available bet button (usually "0" or lowest valid bet)
  try {
    await betButtons.first().click({ force: true });
    // Wait for modal to close (bet submitted)
    await expect(betModalHeader).toBeHidden({ timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

test('4 players can place bets and reach playing phase', async ({ browser }) => {
  test.setTimeout(120000); // Increase timeout for CI stability
  const contexts = await Promise.all(players.map(() => browser.newContext()));
  const pages = await Promise.all(contexts.map((context) => context.newPage()));

  try {
    // Connect all players and click Find Game
    for (let i = 0; i < pages.length; i += 1) {
      const player = players[i];
      const page = pages[i];
      await page.goto(`/?devUserId=${player.id}&devUserName=${encodeURIComponent(player.name)}`);

      // Wait for page to load (lobby or game screen)
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

      // Capture baseline screenshot before clicking Find Game
      await captureDebugScreenshot(page, i, 'before-find-game');
      console.log(`Player ${i + 1}: Clicking Find Game...`);

      await findGameButton.click();
    }

    console.log('All players clicked Find Game, waiting for game to be ready...');

    // Wait for the game to start on all pages (should see Round indicator)
    // This ensures we're past matchmaking and into the actual game
    await Promise.all(pages.map((page, index) => waitForGameReady(page, index, pages, 45000)));

    // Give the game a moment to fully initialize after all players see the game screen
    await pages[0].waitForTimeout(1000);

    const betPlaced = new Set<number>();
    const trumpSelected = { done: false };
    const start = Date.now();
    const maxDuration = 60000; // 60 seconds max for betting phase

    // Main game loop: handle trump selection, then betting
    while (betPlaced.size < pages.length && Date.now() - start < maxDuration) {
      // Phase 1: Trump Selection (only one player is the chooser)
      if (!trumpSelected.done) {
        for (const page of pages) {
          if (await trySelectTrump(page)) {
            trumpSelected.done = true;
            // Wait for phase transition after trump selection
            await page.waitForTimeout(500);
            break;
          }
        }
      }

      // Phase 2: Betting (each player takes turns)
      for (let i = 0; i < pages.length; i += 1) {
        if (betPlaced.has(i)) continue;

        // Check if this page can place a bet
        if (await tryPlaceBet(pages[i])) {
          betPlaced.add(i);
          // Wait a bit for state sync before checking other pages
          await pages[i].waitForTimeout(300);
        }
      }

      // Small delay before next iteration to avoid busy-waiting
      if (betPlaced.size < pages.length) {
        await pages[0].waitForTimeout(200);
      }
    }

    // Verify all players placed bets
    expect(betPlaced.size).toBe(pages.length);

    // Verify game is in playing phase - Round indicator should still be visible
    await expect(pages[0].getByText(/Round|Раунд/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Also verify the table element exists, confirming we are in game view
    await expect(pages[0].locator('.w-full.h-full.z-10').first()).toBeVisible();
  } finally {
    await Promise.all(pages.map((page) => page.close()));
    await Promise.all(contexts.map((context) => context.close()));
  }
});
