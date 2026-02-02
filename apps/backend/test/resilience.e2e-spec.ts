import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { GameState } from '@joker/shared';
import { AppModule } from '../src/app.module';
import { RoomManager } from '../src/game/services/room.manager';
import { RedisService } from '../src/database/redis.service';
import { PrismaService } from '../src/prisma/prisma.service';

// TODO: Fix resilience tests. Timing issues with Bot Fill timer in test environment cause flakiness.
import { ConfigService } from '@nestjs/config';

// Needs reliable ConfigService mocking for timeouts.
describe('Resilience (e2e)', () => {
  jest.setTimeout(60000); // Increased global timeout

  let app: INestApplication;
  let roomManager: RoomManager;
  let serverUrl: string;

  // Use env var or default for timeouts. In CI we might want longer timeouts.
  const TURN_TIMEOUT = Number(process.env.TEST_TURN_TIMEOUT) || 2000;

  const players = ['r1', 'r2', 'r3', 'r4'];
  const names = ['Res1', 'Res2', 'Res3', 'Res4'];

  const waitForEvent = <T>(socket: Socket, event: string, timeoutMs = 20000) =>
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
    // Disable Redis for local tests to avoid network issues
    process.env.E2E_TEST = 'true';
    process.env.NODE_ENV = 'test';

    // CRITICAL: Allow bypassing Telegram auth for test clients
    process.env.SKIP_AUTH = 'true';
    process.env.MATCHMAKING_TIMEOUT_MS = '60000'; // Set explicitly

    const prismaMock = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      game: {
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    // SPY ON CONFIG SERVICE to enforce timeouts regardless of .env files
    const configService = moduleFixture.get(ConfigService);
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'MATCHMAKING_TIMEOUT_MS') return '60000';
      if (key === 'TURN_TIMEOUT_MS') return String(TURN_TIMEOUT);
      if (key === 'SKIP_AUTH') return 'true';
      if (key === 'E2E_TEST') return 'true';
      return process.env[key];
    });

    app = moduleFixture.createNestApplication({
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });
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
    } catch (error) {
      void error;
    }
    await app.close();
  });

  // TODO: Fix timing issues in CI environment. Currently Matchmaking timer fires too early or ConfigService env vars are not picked up correctly in test mode.
  // See issue: Timer conflict causes premature bot replacement.
  it('replaces disconnected player with bot after turn timeout', async () => {
    const clients = players.map((id, i) =>
      io(serverUrl, {
        transports: ['websocket'],
        query: { userId: id, userName: names[i] },
        forceNew: true,
        autoConnect: false,
      }),
    );

    let roomId: string;

    try {
      // Connect all
      console.log('Connecting clients...');
      const connectPromises = clients.map((c, i) => {
        c.connect();
        return waitForEvent(c, 'connect').then(() => console.log(`Client ${i} connected`));
      });
      await Promise.all(connectPromises);

      // Start Game
      console.log('Starting matchmaking...');

      // Emit find_game sequentially to ensure order and avoid race conditions
      for (const c of clients) {
        c.emit('find_game');
        await new Promise((r) => setTimeout(r, 50));
      }

      const started = await waitForEvent<{ roomId: string }>(clients[0], 'game_started');
      roomId = started.roomId;
      console.log(`Game started: ${roomId}`);

      // Wait for initial state
      let statePayload = await waitForEvent<{ state: GameState }>(clients[0], 'game_state');

      // If bots are present, it's fine, just log it.
      const bots = statePayload.state.players.filter((p) => p.isBot);
      if (bots.length > 0) {
        console.log(
          'Info: Game started with bots:',
          bots.map((b) => b.name),
        );
      }

      let currentPlayerId = statePayload.state.players[statePayload.state.currentPlayerIndex].id;

      // Ensure current player is HUMAN (wait for turns if needed)
      let attempts = 0;
      while (
        statePayload.state.players.find((p) => p.id === currentPlayerId)?.isBot &&
        attempts < 10
      ) {
        console.log(`Current player ${currentPlayerId} is bot. Waiting for next turn...`);
        statePayload = await waitForEvent<{ state: GameState }>(clients[0], 'game_state', 5000);
        currentPlayerId = statePayload.state.players[statePayload.state.currentPlayerIndex].id;
        attempts++;
      }

      if (statePayload.state.players.find((p) => p.id === currentPlayerId)?.isBot) {
        throw new Error('Timed out waiting for a human turn');
      }

      // Find which client is current player
      const playerIndex = players.indexOf(currentPlayerId);
      if (playerIndex === -1) {
        // Should not happen if we filtered for human turns from our list
        throw new Error(
          `Current player ${currentPlayerId} not found in test clients (unexpected ID)`,
        );
      }
      const currentClient = clients[playerIndex];

      console.log(`Current player is ${currentPlayerId} (index ${playerIndex}). Disconnecting...`);

      // Disconnect the current player
      currentClient.disconnect();

      // Wait for timeout + buffer (2.5s)
      // Others should receive 'player_replaced'
      const otherClient = clients.find((_, i) => i !== playerIndex)!;

      const replacedEvent = await waitForEvent<{ playerId: string }>(
        otherClient,
        'player_replaced',
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
      transports: ['websocket'],
      query: { userId: playerId, userName: 'Recon' },
      forceNew: true,
    });

    // We need 3 others to start a game
    const others = ['o1', 'o2', 'o3'].map((id) =>
      io(serverUrl, {
        transports: ['websocket'],
        query: { userId: id, userName: id },
        forceNew: true,
      }),
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
        transports: ['websocket'],
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
