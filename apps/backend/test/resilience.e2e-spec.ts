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
      if (key === 'TURN_TIMEOUT_MS') return '2000';
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

  // Test autopilot mode: disconnected player gets controlledByBot = true
  it('enables autopilot for disconnected player', async () => {
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

      // Find first human player
      const humanPlayer = statePayload.state.players.find((p) => !p.isBot);
      if (!humanPlayer) {
        throw new Error('No human players found');
      }

      const playerIndex = players.indexOf(humanPlayer.id);
      if (playerIndex === -1) {
        throw new Error(`Player ${humanPlayer.id} not found in test clients`);
      }
      const targetClient = clients[playerIndex];

      console.log(`Disconnecting player ${humanPlayer.id} (index ${playerIndex})...`);

      // Disconnect the player
      targetClient.disconnect();

      // Wait for game_state with controlledByBot = true
      const otherClient = clients.find((_, i) => i !== playerIndex && clients[i].connected)!;

      // Wait for updated state showing autopilot enabled
      const updatedState = await waitForEvent<{ state: GameState }>(
        otherClient,
        'game_state',
        5000,
      );

      // Verify autopilot is enabled for disconnected player
      const disconnectedPlayer = updatedState.state.players.find((p) => p.id === humanPlayer.id);
      expect(disconnectedPlayer).toBeDefined();
      expect(disconnectedPlayer!.connected).toBe(false);
      expect(disconnectedPlayer!.controlledByBot).toBe(true);

      console.log(`Player ${humanPlayer.id} now on autopilot`);
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
