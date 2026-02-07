import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import {
  Card,
  GamePhase,
  GAME_CONSTANTS,
  GameState,
  JokerOption,
  Rank,
  StandardCard,
  Suit,
  TableCard,
  TrumpDecisionType,
} from '@joker/shared';
import { AppModule } from '../src/app.module';
import { GameEngineService } from '../src/game/services/game-engine.service';
import { StateMachineService } from '../src/game/services/state-machine.service';
import { RoomManager } from '../src/game/services/room.manager';
import { RedisService } from '../src/database/redis.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('App (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication;
  let gameEngine: GameEngineService;
  let stateMachine: StateMachineService;
  let roomManager: RoomManager;
  let serverUrl: string;
  let prismaMock: {
    $connect: jest.Mock;
    $disconnect: jest.Mock;
    game: {
      upsert: jest.Mock;
      updateMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
  };

  const socketTimeoutMs = 40000;

  const players = ['p1', 'p2', 'p3', 'p4'];
  const names = ['Alice', 'Boris', 'Chen', 'Dana'];

  const createSocketPlayers = (label: string) => {
    const suffix = `${label}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    return {
      ids: players.map((id) => `${id}-${suffix}`),
      names: names.map((name) => `${name}-${label}`),
    };
  };

  const createCard = (suit: Suit, rank: Rank): StandardCard => ({
    type: 'standard',
    id: `${suit}-${rank}`,
    suit,
    rank,
  });

  const createJoker = (id: 1 | 2) => ({
    type: 'joker' as const,
    id: `joker-${id}`,
    jokerId: id,
  });

  const waitForEvent = <T>(socket: Socket, event: string, timeoutMs = socketTimeoutMs) =>
    new Promise<T>((resolve, reject) => {
      const onEvent = (payload: T) => {
        cleanup();
        resolve(payload);
      };
      const onError = (payload: { message?: string } | Error) => {
        cleanup();
        if (payload instanceof Error) {
          reject(payload);
        } else {
          reject(new Error(payload?.message ?? 'socket error'));
        }
      };
      const onConnectError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for ${event}`));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timeout);
        socket.off(event, onEvent);
        socket.off('error', onError);
        socket.off('connect_error', onConnectError);
      };

      socket.once(event, onEvent);
      socket.once('error', onError);
      socket.once('connect_error', onConnectError);
    });

  const waitForState = (socket: Socket, timeoutMs = socketTimeoutMs) =>
    waitForEvent<{ state: GameState }>(socket, 'game_state', timeoutMs);

  const waitForCondition = async (
    condition: () => boolean,
    timeoutMs = socketTimeoutMs,
    errorMessage = 'Condition was not met in time',
  ) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (condition()) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    throw new Error(errorMessage);
  };

  const waitForStateWithoutPlayer = (
    socket: Socket,
    playerId: string,
    timeoutMs = socketTimeoutMs,
  ) =>
    new Promise<{ state: GameState }>((resolve, reject) => {
      const onEvent = (payload: { state: GameState }) => {
        const hasPlayer = payload.state.players.some((player) => player.id === playerId);
        if (hasPlayer) return;
        cleanup();
        resolve(payload);
      };
      const onError = (payload: { message?: string } | Error) => {
        cleanup();
        if (payload instanceof Error) {
          reject(payload);
        } else {
          reject(new Error(payload?.message ?? 'socket error'));
        }
      };
      const onConnectError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout waiting for game_state'));
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timeout);
        socket.off('game_state', onEvent);
        socket.off('error', onError);
        socket.off('connect_error', onConnectError);
      };

      socket.on('game_state', onEvent);
      socket.once('error', onError);
      socket.once('connect_error', onConnectError);
    });

  beforeAll(async () => {
    process.env.E2E_TEST = 'true'; // Disable Redis connection

    prismaMock = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      game: {
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to resolve test server address');
    }
    serverUrl = `http://127.0.0.1:${address.port}`;
    roomManager = app.get(RoomManager);
    gameEngine = app.get(GameEngineService);
    stateMachine = app.get(StateMachineService);
  });

  afterAll(async () => {
    // Force disconnect Redis client if exposed
    try {
      const redisService = app.get(RedisService);
      if (redisService) {
        await redisService.onModuleDestroy();
      }
    } catch (e) {
      // Ignore if service not found or already closed
    }
    await app.close();
  });

  it('initializes the application', () => {
    expect(app).toBeDefined();
  });

  it('persists telegram user in database on socket connect', async () => {
    const telegramId = `${Date.now()}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;
    const playerName = 'ConnectSyncUser';

    prismaMock.user.findUnique.mockReset();
    prismaMock.user.create.mockReset();

    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    prismaMock.user.create.mockResolvedValueOnce({
      id: 'test-user-id',
      tgId: BigInt(telegramId),
      username: playerName,
    });

    const client = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: false,
      forceNew: true,
      query: {
        userId: telegramId,
        userName: playerName,
      },
    });

    try {
      const connectPromise = waitForEvent<void>(client, 'connect');
      client.connect();
      await connectPromise;

      await waitForCondition(
        () => prismaMock.user.findUnique.mock.calls.length > 0,
        5000,
        'User sync was not triggered on socket connect',
      );

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { tgId: BigInt(telegramId) },
      });
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          tgId: BigInt(telegramId),
          username: playerName,
        },
      });
    } finally {
      roomManager.removeFromQueue(telegramId);
      client.disconnect();
    }
  });

  it('creates a room via websocket matchmaking', async () => {
    let roomId: string | null = null;
    const { ids: playerIds, names: playerNames } = createSocketPlayers('matchmaking');
    const clients = playerIds.map((playerId, index) =>
      io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        forceNew: true,
        query: {
          userId: playerId,
          userName: playerNames[index],
        },
      }),
    );

    try {
      const connectPromises = clients.map((client) => waitForEvent<void>(client, 'connect'));
      clients.forEach((client) => client.connect());
      await Promise.all(connectPromises);

      const startedPromises = clients.map((client) =>
        waitForEvent<{ roomId: string }>(client, 'game_started'),
      );
      const statePromises = clients.map((client) =>
        waitForEvent<{ state: { phase: GamePhase; players: unknown[]; round: number } }>(
          client,
          'game_state',
        ),
      );

      clients.forEach((client) => client.emit('find_game'));

      const started = await Promise.all(startedPromises);
      const activeRoomId = started[0].roomId;
      roomId = activeRoomId;
      started.forEach((payload) => expect(payload.roomId).toBe(activeRoomId));

      const states = await Promise.all(statePromises);
      states.forEach(({ state }) => {
        expect([GamePhase.Betting, GamePhase.TrumpSelection]).toContain(state.phase);
        expect(state.players).toHaveLength(4);
        expect(state.round).toBe(1);
      });
    } finally {
      if (roomId) {
        await roomManager.cleanupRoom(roomId);
      }
      playerIds.forEach((playerId) => roomManager.removeFromQueue(playerId));
      clients.forEach((client) => client.disconnect());
    }
  });

  it('allows a player to leave game via websocket', async () => {
    let roomId: string | null = null;
    const { ids: playerIds, names: playerNames } = createSocketPlayers('leave-game');
    const clients = playerIds.map((playerId, index) =>
      io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        forceNew: true,
        query: {
          userId: playerId,
          userName: playerNames[index],
        },
      }),
    );

    const leavingIndex = 0;
    const leavingClient = clients[leavingIndex];
    const leavingPlayerId = playerIds[leavingIndex];

    try {
      const connectPromises = clients.map((client) => waitForEvent<void>(client, 'connect'));
      clients.forEach((client) => client.connect());
      await Promise.all(connectPromises);

      const startedPromises = clients.map((client) =>
        waitForEvent<{ roomId: string }>(client, 'game_started'),
      );

      clients.forEach((client) => client.emit('find_game'));

      const started = await Promise.all(startedPromises);
      roomId = started[0].roomId;
      started.forEach((payload) => expect(payload.roomId).toBe(roomId));

      const leftPromise = waitForEvent<{ roomId: string }>(leavingClient, 'left_game');
      const playerLeftPromise = waitForEvent<{
        playerId: string;
        playerName: string;
        playersCount: number;
      }>(clients[1], 'player_left');
      const nextStatePromise = waitForStateWithoutPlayer(clients[1], leavingPlayerId, 60000);

      leavingClient.emit('leave_game', { roomId });

      const [leftPayload, playerLeftPayload] = await Promise.all([leftPromise, playerLeftPromise]);

      expect(leftPayload.roomId).toBe(roomId);
      expect(playerLeftPayload.playerId).toBe(leavingPlayerId);
      expect(playerLeftPayload.playersCount).toBe(GAME_CONSTANTS.PLAYERS_COUNT);

      const nextState = await nextStatePromise;
      expect(nextState.state.players).toHaveLength(GAME_CONSTANTS.PLAYERS_COUNT);
      expect(nextState.state.players.some((player) => player.isBot)).toBe(true);
    } finally {
      if (roomId) {
        await roomManager.cleanupRoom(roomId);
      }
      playerIds.forEach((playerId) => roomManager.removeFromQueue(playerId));
      clients.forEach((client) => client.disconnect());
    }
  }, 90000);

  it('restores game state after reconnect', async () => {
    let roomId: string | null = null;
    const { ids: playerIds, names: playerNames } = createSocketPlayers('reconnect');
    const clients = playerIds.map((playerId, index) =>
      io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        forceNew: true,
        query: {
          userId: playerId,
          userName: playerNames[index],
        },
      }),
    );

    const reconnectIndex = 0;
    const reconnectPlayerId = playerIds[reconnectIndex];
    const reconnectPlayerName = playerNames[reconnectIndex];
    const disconnectClient = clients[reconnectIndex];
    let reconnectClient: Socket | null = null;

    try {
      const connectPromises = clients.map((client) => waitForEvent<void>(client, 'connect'));
      clients.forEach((client) => client.connect());
      await Promise.all(connectPromises);

      const startedPromises = clients.map((client) =>
        waitForEvent<{ roomId: string }>(client, 'game_started'),
      );
      const initialStatePromise = waitForState(clients[0]);

      clients.forEach((client) => client.emit('find_game'));

      const started = await Promise.all(startedPromises);
      roomId = started[0].roomId;
      started.forEach((payload) => expect(payload.roomId).toBe(roomId));
      await initialStatePromise;

      const disconnectPromise = waitForEvent<string>(disconnectClient, 'disconnect');
      disconnectClient.disconnect();
      await disconnectPromise;

      await new Promise((resolve) => setTimeout(resolve, 300));

      reconnectClient = io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        forceNew: true,
        query: {
          userId: reconnectPlayerId,
          userName: reconnectPlayerName,
        },
      });

      const reconnectPromise = waitForEvent<void>(reconnectClient, 'connect');
      const reconnectStatePromise = waitForState(reconnectClient);
      reconnectClient.connect();
      await reconnectPromise;

      const statePayload = await reconnectStatePromise;
      const player = statePayload.state.players.find((p) => p.id === reconnectPlayerId);
      expect(player?.connected).toBe(true);
    } finally {
      if (roomId) {
        await roomManager.cleanupRoom(roomId);
      }
      playerIds.forEach((playerId) => roomManager.removeFromQueue(playerId));
      clients.forEach((client) => client.disconnect());
      reconnectClient?.disconnect();
    }
  });

  it('fills matchmaking with bots after timeout', async () => {
    let botApp: INestApplication | null = null;
    let botRoomManager: RoomManager | null = null;
    let botServerUrl: string | null = null;
    let roomId: string | null = null;
    let client: Socket | null = null;
    let playerId: string | null = null;

    const previousMatchmakingTimeout = process.env.MATCHMAKING_TIMEOUT_MS;
    process.env.MATCHMAKING_TIMEOUT_MS = '500';
    process.env.E2E_TEST = 'true';

    const prismaMock = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      game: {
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    try {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(prismaMock)
        .compile();

      botApp = moduleFixture.createNestApplication();
      await botApp.init();
      await botApp.listen(0);

      const address = botApp.getHttpServer().address();
      if (!address || typeof address === 'string') {
        throw new Error('Failed to resolve bot-fill test server address');
      }

      botServerUrl = `http://127.0.0.1:${address.port}`;
      botRoomManager = botApp.get(RoomManager);

      const { ids: playerIds, names: playerNames } = createSocketPlayers('bot-fill');
      playerId = playerIds[0];
      const playerName = playerNames[0];

      client = io(botServerUrl, {
        transports: ['websocket'],
        autoConnect: false,
        forceNew: true,
        query: {
          userId: playerId,
          userName: playerName,
        },
      });

      const connectPromise = waitForEvent<void>(client, 'connect');
      const startedPromise = waitForEvent<{ roomId: string }>(client, 'game_started', 50000);
      const statePromise = waitForState(client, 50000);

      client.connect();
      await connectPromise;
      client.emit('find_game');

      const started = await startedPromise;
      roomId = started.roomId;

      const statePayload = await statePromise;
      expect(statePayload.state.players).toHaveLength(GAME_CONSTANTS.PLAYERS_COUNT);
      const botCount = statePayload.state.players.filter((player) => player.isBot).length;
      expect(botCount).toBe(GAME_CONSTANTS.PLAYERS_COUNT - 1);
      expect(statePayload.state.players.some((player) => player.id === playerId)).toBe(true);
    } finally {
      if (roomId && botRoomManager) {
        await botRoomManager.cleanupRoom(roomId);
      }
      if (botRoomManager && playerId) {
        botRoomManager.removeFromQueue(playerId);
      }
      client?.disconnect();

      if (botApp) {
        try {
          const redisService = botApp.get(RedisService);
          if (redisService) {
            await redisService.onModuleDestroy();
          }
        } catch (e) {
          void e;
        }
        await botApp.close();
      }

      if (previousMatchmakingTimeout === undefined) {
        delete process.env.MATCHMAKING_TIMEOUT_MS;
      } else {
        process.env.MATCHMAKING_TIMEOUT_MS = previousMatchmakingTimeout;
      }
    }
  }, 90000);

  it('plays bets and a trick via websocket flow', async () => {
    let roomId: string | null = null;
    const { ids: playerIds, names: playerNames } = createSocketPlayers('bet-trick');
    const clients = playerIds.map((playerId, index) =>
      io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        forceNew: true,
        query: {
          userId: playerId,
          userName: playerNames[index],
        },
      }),
    );

    const playerHands = new Map<string, Card[]>();

    clients.forEach((client, index) => {
      const playerId = playerIds[index];
      client.on('game_state', (payload: { state: GameState }) => {
        const player = payload.state.players.find((item) => item.id === playerId);
        if (player) {
          playerHands.set(playerId, player.hand);
        }
      });
    });

    try {
      const connectPromises = clients.map((client) => waitForEvent<void>(client, 'connect'));
      clients.forEach((client) => client.connect());
      await Promise.all(connectPromises);

      const startedPromises = clients.map((client) =>
        waitForEvent<{ roomId: string }>(client, 'game_started'),
      );
      const initialStatePromises = clients.map((client) => waitForState(client));
      clients.forEach((client) => client.emit('find_game'));

      const started = await Promise.all(startedPromises);
      const activeRoomId = started[0].roomId;
      roomId = activeRoomId;
      started.forEach((payload) => expect(payload.roomId).toBe(activeRoomId));

      const initialStates = await Promise.all(initialStatePromises);
      let currentState = initialStates[0].state;
      expect([GamePhase.Betting, GamePhase.TrumpSelection]).toContain(currentState.phase);

      // Handle Trump Selection if needed
      if (currentState.phase === GamePhase.TrumpSelection && currentState.trumpSelection) {
        const chooserId = currentState.trumpSelection.chooserPlayerId;
        const socketIndex = playerIds.indexOf(chooserId);
        const chooserSocket = clients[socketIndex];

        const nextStatePromise = waitForState(clients[0]);
        chooserSocket.emit('select_trump', {
          roomId: activeRoomId,
          decision: { type: 'SUIT', suit: Suit.Hearts },
        });
        currentState = (await nextStatePromise).state;
      }

      // Check if we are back to Betting after Trump Selection (Round 1 edge case or normal flow)
      // In Round 1, if trump selection happens, it goes back to Betting.
      // But if Round > 1, Trump Selection only happens if Hidden/Joker, usually phase is Betting directly.
      expect([GamePhase.Betting, GamePhase.Playing]).toContain(currentState.phase);

      // If still betting, proceed with betting loop
      if (currentState.phase === GamePhase.Betting) {
        for (let i = 0; i < GAME_CONSTANTS.PLAYERS_COUNT; i++) {
          const currentPlayerId = currentState.players[currentState.currentPlayerIndex].id;
          const socketIndex = playerIds.indexOf(currentPlayerId);
          const currentSocket = clients[socketIndex];
          if (!currentSocket) {
            throw new Error(`Missing socket for player ${currentPlayerId}`);
          }

          const nextStatePromise = waitForState(clients[0]);
          currentSocket.emit('make_bet', { roomId: activeRoomId, amount: 0 });
          currentState = (await nextStatePromise).state;
        }
      }

      expect(currentState.phase).toBe(GamePhase.Playing);

      for (let i = 0; i < GAME_CONSTANTS.PLAYERS_COUNT; i++) {
        const currentPlayerId = currentState.players[currentState.currentPlayerIndex].id;
        const socketIndex = playerIds.indexOf(currentPlayerId);
        const currentSocket = clients[socketIndex];
        if (!currentSocket) {
          throw new Error(`Missing socket for player ${currentPlayerId}`);
        }
        const hand = playerHands.get(currentPlayerId) ?? [];
        const card = hand[0];

        if (!card) {
          throw new Error(`No card available for player ${currentPlayerId}`);
        }

        const payload: {
          roomId: string;
          cardId: string;
          jokerOption?: JokerOption;
          requestedSuit?: Suit;
        } = {
          roomId: activeRoomId,
          cardId: card.id,
        };

        if (card.type === 'joker') {
          if (currentState.table.length === 0) {
            payload.jokerOption = JokerOption.High;
            payload.requestedSuit = Suit.Hearts;
          } else {
            payload.jokerOption = JokerOption.Top;
          }
        }

        const nextStatePromise = waitForState(clients[0]);
        currentSocket.emit('throw_card', payload);
        currentState = (await nextStatePromise).state;
      }

      // With the new delay mechanic, we might receive TrickComplete state first
      // If so, we need to wait for the actual Round change (which happens after delay)
      if (currentState.phase === GamePhase.TrickComplete) {
        currentState = (await waitForState(clients[0])).state;
      }

      expect(currentState.round).toBe(2);
      // Round 2 may start in TrumpSelection or Betting depending on card deal
      expect([GamePhase.Betting, GamePhase.TrumpSelection]).toContain(currentState.phase);
    } finally {
      if (roomId) {
        await roomManager.cleanupRoom(roomId);
      }
      playerIds.forEach((playerId) => roomManager.removeFromQueue(playerId));
      clients.forEach((client) => client.disconnect());
    }
  });

  it('rejects forbidden dealer bet in opening round', () => {
    let state = gameEngine.createGame(players, names);
    state.dealerIndex = 3;
    state.currentPlayerIndex = stateMachine.getFirstPlayerIndex(state.dealerIndex);

    state = gameEngine.startGame(state);

    // In round 1, phase might be TrumpSelection or Betting depending on card deal
    expect([GamePhase.Betting, GamePhase.TrumpSelection]).toContain(state.phase);

    // If we landed in Trump Selection, force a decision to proceed to Betting
    if (state.phase === GamePhase.TrumpSelection && state.trumpSelection) {
      const chooserId = state.trumpSelection.chooserPlayerId;
      state = gameEngine.selectTrump(state, chooserId, {
        type: TrumpDecisionType.Suit,
        suit: Suit.Hearts,
      });
    }

    expect(state.phase).toBe(GamePhase.Betting);

    for (let i = 0; i < GAME_CONSTANTS.PLAYERS_COUNT - 1; i++) {
      const currentPlayerId = state.players[state.currentPlayerIndex].id;
      state = gameEngine.makeBet(state, currentPlayerId, 0);
    }

    const dealerId = state.players[state.dealerIndex].id;

    expect(() => gameEngine.makeBet(state, dealerId, 1)).toThrow(/Cannot bet/i);

    state = gameEngine.makeBet(state, dealerId, 0);
    expect(state.phase).toBe(GamePhase.Playing);
  });

  it('enforces follow-suit when lead suit is available', () => {
    const leadCard = createCard(Suit.Hearts, Rank.Ten);
    const offSuitCard = createCard(Suit.Spades, Rank.Ace);
    const followSuitCard = createCard(Suit.Hearts, Rank.Seven);

    const state = gameEngine.createGame(players, names);
    const orderedPlayerIds = state.players.map((player) => player.id);
    state.phase = GamePhase.Playing;
    state.trump = Suit.Spades;
    state.table = [{ card: leadCard, playerId: orderedPlayerIds[0] } as TableCard];
    state.currentPlayerIndex = 1;
    state.players[0].hand = [leadCard];
    state.players[1].hand = [followSuitCard, offSuitCard];
    state.players[2].hand = [createCard(Suit.Clubs, Rank.Ace)];
    state.players[3].hand = [createCard(Suit.Diamonds, Rank.Ace)];

    expect(() => gameEngine.playCard(state, orderedPlayerIds[1], offSuitCard.id)).toThrow(
      /Must play/i,
    );
  });

  it('requires high/low option when joker leads', () => {
    const state = gameEngine.createGame(players, names);
    state.phase = GamePhase.Playing;
    state.trump = Suit.Hearts;
    state.currentPlayerIndex = 0;
    state.table = [] as TableCard[];

    const currentPlayerId = state.players[state.currentPlayerIndex].id;

    const joker = createJoker(1);
    state.players[state.currentPlayerIndex].hand = [joker];

    expect(() =>
      gameEngine.playCard(state, currentPlayerId, joker.id, JokerOption.Top, Suit.Hearts),
    ).toThrow(/Joker/i);
  });

  it('plays a full 1-card round and advances to next round', () => {
    let state = gameEngine.createGame(players, names);
    state.dealerIndex = 3;
    state.currentPlayerIndex = stateMachine.getFirstPlayerIndex(state.dealerIndex);
    state = gameEngine.startGame(state);

    const orderedPlayerIds = state.players.map((player) => player.id);

    const roundHands: Card[][] = [
      [createCard(Suit.Hearts, Rank.Seven)],
      [createCard(Suit.Hearts, Rank.Ace)],
      [createCard(Suit.Hearts, Rank.King)],
      [createCard(Suit.Hearts, Rank.Queen)],
    ];

    state.players = state.players.map((player, index) => ({
      ...player,
      hand: roundHands[index],
      bet: null,
      tricks: 0,
    }));
    state.trump = null;
    state.table = [] as TableCard[];
    state.phase = GamePhase.Betting;
    state.currentPlayerIndex = stateMachine.getFirstPlayerIndex(state.dealerIndex);

    for (let i = 0; i < GAME_CONSTANTS.PLAYERS_COUNT; i++) {
      const currentPlayerId = state.players[state.currentPlayerIndex].id;
      state = gameEngine.makeBet(state, currentPlayerId, 0);
    }

    state = gameEngine.playCard(state, orderedPlayerIds[0], roundHands[0][0].id);
    state = gameEngine.playCard(state, orderedPlayerIds[1], roundHands[1][0].id);
    state = gameEngine.playCard(state, orderedPlayerIds[2], roundHands[2][0].id);
    state = gameEngine.playCard(state, orderedPlayerIds[3], roundHands[3][0].id);

    expect(state.phase).toBe(GamePhase.TrickComplete);

    state = gameEngine.completeTrick(state);
    expect(state.phase).toBe(GamePhase.RoundComplete);
    expect(state.players.find((player) => player.id === orderedPlayerIds[1])?.tricks).toBe(1);

    state = gameEngine.completeRound(state);

    expect(state.round).toBe(2);
    expect(state.cardsPerPlayer).toBe(2);
    expect([GamePhase.Betting, GamePhase.TrumpSelection]).toContain(state.phase);

    // Handle Trump Selection if needed (auto-select to proceed for test consistency)
    if (state.phase === GamePhase.TrumpSelection && state.trumpSelection) {
      const chooserId = state.trumpSelection.chooserPlayerId;
      state = gameEngine.selectTrump(state, chooserId, {
        type: TrumpDecisionType.Suit,
        suit: Suit.Hearts,
      });
    }

    expect(state.phase).toBe(GamePhase.Betting);
    expect(state.history.length).toBe(1);
    expect(state.players.find((player) => player.id === orderedPlayerIds[1])?.roundScores[0]).toBe(
      10,
    );
    state.players.forEach((player) => expect(player.hand.length).toBe(2));
  });

  it('handles multi-trick round with trump and lead suit winners', () => {
    let state = gameEngine.createGame(players, names);
    state.phase = GamePhase.Playing;
    state.round = 1;
    state.pulka = 1;
    state.cardsPerPlayer = 2;
    state.trump = Suit.Spades;
    state.table = [] as TableCard[];
    state.currentPlayerIndex = 0;

    const orderedPlayerIds = state.players.map((player) => player.id);

    const hands: Card[][] = [
      [createCard(Suit.Hearts, Rank.Seven), createCard(Suit.Hearts, Rank.Nine)],
      [createCard(Suit.Hearts, Rank.Eight), createCard(Suit.Spades, Rank.Six)],
      [createCard(Suit.Hearts, Rank.Ace), createCard(Suit.Hearts, Rank.Queen)],
      [createCard(Suit.Hearts, Rank.King), createCard(Suit.Hearts, Rank.Ten)],
    ];

    state.players = state.players.map((player, index) => ({
      ...player,
      hand: hands[index],
      bet: 0,
      tricks: 0,
    }));

    state = gameEngine.playCard(state, orderedPlayerIds[0], hands[0][0].id);
    state = gameEngine.playCard(state, orderedPlayerIds[1], hands[1][0].id);
    state = gameEngine.playCard(state, orderedPlayerIds[2], hands[2][0].id);
    state = gameEngine.playCard(state, orderedPlayerIds[3], hands[3][0].id);
    expect(state.phase).toBe(GamePhase.TrickComplete);

    state = gameEngine.completeTrick(state);
    expect(state.phase).toBe(GamePhase.Playing);
    expect(state.currentPlayerIndex).toBe(2);
    expect(state.players[2].tricks).toBe(1);

    state = gameEngine.playCard(state, orderedPlayerIds[2], hands[2][1].id);
    state = gameEngine.playCard(state, orderedPlayerIds[3], hands[3][1].id);
    state = gameEngine.playCard(state, orderedPlayerIds[0], hands[0][1].id);
    state = gameEngine.playCard(state, orderedPlayerIds[1], hands[1][1].id);
    expect(state.phase).toBe(GamePhase.TrickComplete);

    state = gameEngine.completeTrick(state);
    expect(state.phase).toBe(GamePhase.RoundComplete);
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.players[1].tricks).toBe(1);
  });

  it('applies shtanga penalty when player misses with positive bet', () => {
    let state = gameEngine.createGame(players, names);
    state.phase = GamePhase.RoundComplete;
    state.round = 1;
    state.pulka = 1;
    state.cardsPerPlayer = 3;
    state.trump = null;
    state.table = [] as TableCard[];

    const orderedPlayerIds = state.players.map((player) => player.id);

    state.players = state.players.map((player, index) => ({
      ...player,
      hand: [],
      bet: index === 0 ? 2 : 0,
      tricks: 0,
      spoiled: false,
    }));

    state = gameEngine.completeRound(state);

    const shtangaPlayer = state.players.find((player) => player.id === orderedPlayerIds[0]);
    expect(shtangaPlayer?.roundScores[0]).toBe(GAME_CONSTANTS.SCORE_SHTANGA_PENALTY);
    expect(shtangaPlayer?.totalScore).toBe(GAME_CONSTANTS.SCORE_SHTANGA_PENALTY);
  });

  it('awards took-all bonus when player takes all tricks', () => {
    let state = gameEngine.createGame(players, names);
    state.phase = GamePhase.RoundComplete;
    state.round = 2;
    state.pulka = 1;
    state.cardsPerPlayer = 2;
    state.trump = null;
    state.table = [] as TableCard[];

    const orderedPlayerIds = state.players.map((player) => player.id);

    state.players = state.players.map((player, index) => ({
      ...player,
      hand: [],
      bet: index === 1 ? 2 : 0,
      tricks: index === 1 ? 2 : 0,
      spoiled: false,
    }));

    state = gameEngine.completeRound(state);

    const winner = state.players.find((player) => player.id === orderedPlayerIds[1]);
    const tookAllScore = GAME_CONSTANTS.SCORE_TOOK_ALL_MULTIPLIER * 2;
    expect(winner?.roundScores[0]).toBe(tookAllScore);
    expect(winner?.totalScore).toBe(tookAllScore);
  });
});
