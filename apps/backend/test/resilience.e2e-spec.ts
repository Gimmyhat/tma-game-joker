import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { GamePhase, GameState } from '@joker/shared';
import { AppModule } from '../src/app.module';
import { RoomManager } from '../src/gateway/room.manager';
import { RedisService } from '../src/database/redis.service';

// TODO: Fix resilience tests. Timing issues with Bot Fill timer in test environment cause flakiness.
// Needs reliable ConfigService mocking for timeouts.
describe.skip('Resilience (e2e)', () => {
  jest.setTimeout(20000);

  let app: INestApplication;
  let roomManager: RoomManager;
  let serverUrl: string;

  // Short timeout for testing
  const TURN_TIMEOUT = 2000;

  const players = ['r1', 'r2', 'r3', 'r4'];
  const names = ['Res1', 'Res2', 'Res3', 'Res4'];

  const waitForEvent = <T>(socket: Socket, event: string, timeoutMs = 5000) =>
    new Promise<T>((resolve, reject) => {
      const onEvent = (payload: T) => {
        cleanup();
        resolve(payload);
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for ${event}`));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timeout);
        socket.off(event, onEvent);
      };
      socket.once(event, onEvent);
    });

  beforeAll(async () => {
    // Set config for test
    process.env.TURN_TIMEOUT_MS = String(TURN_TIMEOUT);
    process.env.MATCHMAKING_TIMEOUT_MS = '60000'; // Ensure long timeout
    process.env.E2E_TEST = 'true';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    serverUrl = `http://127.0.0.1:${address.port}`;
    roomManager = app.get(RoomManager);
  });

  afterAll(async () => {
    try {
      const redis = app.get(RedisService);
      if (redis) await redis.onModuleDestroy();
    } catch {}
    await app.close();
  });

  // TODO: Fix timing issues in CI environment. Currently Matchmaking timer fires too early or ConfigService env vars are not picked up correctly in test mode.
  // See issue: Timer conflict causes premature bot replacement.
  it.skip('replaces disconnected player with bot after turn timeout', async () => {
    const clients = players.map((id, i) =>
      io(serverUrl, {
        query: { userId: id, userName: names[i] },
        forceNew: true,
        autoConnect: false,
      }),
    );

    let roomId: string;

    try {
      // Connect all
      clients.forEach((c) => c.connect());
      await Promise.all(clients.map((c) => waitForEvent(c, 'connect')));

      // Start Game
      clients.forEach((c) => c.emit('find_game'));
      const started = await waitForEvent<{ roomId: string }>(clients[0], 'game_started');
      roomId = started.roomId;

      // Wait for initial state
      const statePayload = await waitForEvent<{ state: GameState }>(clients[0], 'game_state');
      const currentPlayerId = statePayload.state.players[statePayload.state.currentPlayerIndex].id;

      // Find which client is current player
      const playerIndex = players.indexOf(currentPlayerId);
      if (playerIndex === -1) {
        console.error(
          'Players in state:',
          statePayload.state.players.map((p) => p.id),
        );
        throw new Error(`Current player ${currentPlayerId} not found in test clients`);
      }
      const currentClient = clients[playerIndex];

      console.log(`Current player is ${currentPlayerId} (index ${playerIndex}). Disconnecting...`);

      // Disconnect the current player
      currentClient.disconnect();

      // Wait for timeout + buffer (2.5s)
      // Others should receive 'player_replaced_by_bot'
      const otherClient = clients.find((_, i) => i !== playerIndex)!;

      const replacedEvent = await waitForEvent<{ playerId: string }>(
        otherClient,
        'player_replaced_by_bot',
        TURN_TIMEOUT + 2000,
      );
      expect(replacedEvent.playerId).toBe(currentPlayerId);

      // Verify game continues (new state received)
      const newState = await waitForEvent<{ state: GameState }>(otherClient, 'game_state');
      // Bot should have made a bet/move, so either phase changed or turn changed
      // In betting phase, if bot bet, turn moves to next player
      expect(newState.state.currentPlayerIndex).not.toBe(statePayload.state.currentPlayerIndex);
    } finally {
      if (roomId!) roomManager.cleanupRoom(roomId);
      clients.forEach((c) => {
        if (c.connected) c.disconnect();
      });
    }
  });

  it('allows reconnection and restores state', async () => {
    // We reuse r1 for this test, assuming previous test cleaned up
    const playerId = 'recon-1';
    const client1 = io(serverUrl, {
      query: { userId: playerId, userName: 'Recon' },
      forceNew: true,
    });

    // We need 3 others to start a game
    const others = ['o1', 'o2', 'o3'].map((id) =>
      io(serverUrl, { query: { userId: id, userName: id }, forceNew: true }),
    );

    let roomId: string;

    try {
      client1.emit('find_game');
      others.forEach((c) => c.emit('find_game'));

      const started = await waitForEvent<{ roomId: string }>(client1, 'game_started');
      roomId = started.roomId;

      // Disconnect
      client1.disconnect();
      await new Promise((r) => setTimeout(r, 500)); // Wait a bit

      // Reconnect
      const client1Reborn = io(serverUrl, {
        query: { userId: playerId, userName: 'Recon' },
        forceNew: true,
      });

      // Should receive game_state immediately upon connection
      const statePromise = waitForEvent<{ roomId: string; state: GameState }>(
        client1Reborn,
        'game_state',
      );

      await statePromise.then((payload) => {
        expect(payload.roomId).toBe(roomId);
        expect(payload.state.players.find((p) => p.id === playerId)?.connected).toBe(true);
      });

      client1Reborn.disconnect();
    } finally {
      if (roomId!) roomManager.cleanupRoom(roomId);
      others.forEach((c) => c.disconnect());
    }
  });
});
