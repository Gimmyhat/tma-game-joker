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
} from '@joker/shared';
import { AppModule } from '../src/app.module';
import { GameEngineService } from '../src/game/services/game-engine.service';
import { StateMachineService } from '../src/game/services/state-machine.service';
import { RoomManager } from '../src/gateway/room.manager';
import { RedisService } from '../src/database/redis.service';

describe('App (e2e)', () => {
  jest.setTimeout(20000);

  let app: INestApplication;
  let gameEngine: GameEngineService;
  let stateMachine: StateMachineService;
  let roomManager: RoomManager;
  let serverUrl: string;

  const socketTimeoutMs = 15000;

  const players = ['p1', 'p2', 'p3', 'p4'];
  const names = ['Alice', 'Boris', 'Chen', 'Dana'];

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

  beforeAll(async () => {
    process.env.E2E_TEST = 'true'; // Disable Redis connection

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it('creates a room via websocket matchmaking', async () => {
    let roomId: string | null = null;
    const clients = players.map((playerId, index) =>
      io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        forceNew: true,
        query: {
          userId: playerId,
          userName: names[index],
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
        expect(state.phase).toBe(GamePhase.Betting);
        expect(state.players).toHaveLength(4);
        expect(state.round).toBe(1);
      });
    } finally {
      if (roomId) {
        roomManager.cleanupRoom(roomId);
      }
      clients.forEach((client) => client.disconnect());
    }
  });

  it('plays bets and a trick via websocket flow', async () => {
    let roomId: string | null = null;
    const clients = players.map((playerId, index) =>
      io(serverUrl, {
        transports: ['websocket'],
        autoConnect: false,
        forceNew: true,
        query: {
          userId: playerId,
          userName: names[index],
        },
      }),
    );

    const playerHands = new Map<string, Card[]>();

    clients.forEach((client, index) => {
      const playerId = players[index];
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
      expect(currentState.phase).toBe(GamePhase.Betting);

      for (let i = 0; i < GAME_CONSTANTS.PLAYERS_COUNT; i++) {
        const currentPlayerId = currentState.players[currentState.currentPlayerIndex].id;
        const socketIndex = players.indexOf(currentPlayerId);
        const currentSocket = clients[socketIndex];
        if (!currentSocket) {
          throw new Error(`Missing socket for player ${currentPlayerId}`);
        }

        const nextStatePromise = waitForState(clients[0]);
        currentSocket.emit('make_bet', { roomId: activeRoomId, amount: 0 });
        currentState = (await nextStatePromise).state;
      }

      expect(currentState.phase).toBe(GamePhase.Playing);

      for (let i = 0; i < GAME_CONSTANTS.PLAYERS_COUNT; i++) {
        const currentPlayerId = currentState.players[currentState.currentPlayerIndex].id;
        const socketIndex = players.indexOf(currentPlayerId);
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

      expect(currentState.round).toBe(2);
      expect(currentState.phase).toBe(GamePhase.Betting);
    } finally {
      if (roomId) {
        roomManager.cleanupRoom(roomId);
      }
      clients.forEach((client) => client.disconnect());
    }
  });

  it('rejects forbidden dealer bet in opening round', () => {
    let state = gameEngine.createGame(players, names);
    state.dealerIndex = 3;
    state.currentPlayerIndex = stateMachine.getFirstPlayerIndex(state.dealerIndex);

    state = gameEngine.startGame(state);
    expect(state.phase).toBe(GamePhase.Betting);

    state = gameEngine.makeBet(state, players[0], 0);
    state = gameEngine.makeBet(state, players[1], 0);
    state = gameEngine.makeBet(state, players[2], 0);

    expect(() => gameEngine.makeBet(state, players[3], 1)).toThrow(/Cannot bet/i);

    state = gameEngine.makeBet(state, players[3], 0);
    expect(state.phase).toBe(GamePhase.Playing);
  });

  it('enforces follow-suit when lead suit is available', () => {
    const leadCard = createCard(Suit.Hearts, Rank.Ten);
    const offSuitCard = createCard(Suit.Spades, Rank.Ace);
    const followSuitCard = createCard(Suit.Hearts, Rank.Seven);

    const state = gameEngine.createGame(players, names);
    state.phase = GamePhase.Playing;
    state.trump = Suit.Spades;
    state.table = [{ card: leadCard, playerId: players[0] } as TableCard];
    state.currentPlayerIndex = 1;
    state.players[0].hand = [leadCard];
    state.players[1].hand = [followSuitCard, offSuitCard];
    state.players[2].hand = [createCard(Suit.Clubs, Rank.Ace)];
    state.players[3].hand = [createCard(Suit.Diamonds, Rank.Ace)];

    expect(() => gameEngine.playCard(state, players[1], offSuitCard.id)).toThrow(/Must play/i);
  });

  it('requires high/low option when joker leads', () => {
    const state = gameEngine.createGame(players, names);
    state.phase = GamePhase.Playing;
    state.trump = Suit.Hearts;
    state.currentPlayerIndex = 0;
    state.table = [] as TableCard[];

    const joker = createJoker(1);
    state.players[0].hand = [joker];

    expect(() =>
      gameEngine.playCard(state, players[0], joker.id, JokerOption.Top, Suit.Hearts),
    ).toThrow(/Joker/i);
  });

  it('plays a full 1-card round and advances to next round', () => {
    let state = gameEngine.createGame(players, names);
    state.dealerIndex = 3;
    state.currentPlayerIndex = stateMachine.getFirstPlayerIndex(state.dealerIndex);
    state = gameEngine.startGame(state);

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

    state = gameEngine.makeBet(state, players[0], 0);
    state = gameEngine.makeBet(state, players[1], 0);
    state = gameEngine.makeBet(state, players[2], 0);
    state = gameEngine.makeBet(state, players[3], 0);

    state = gameEngine.playCard(state, players[0], roundHands[0][0].id);
    state = gameEngine.playCard(state, players[1], roundHands[1][0].id);
    state = gameEngine.playCard(state, players[2], roundHands[2][0].id);
    state = gameEngine.playCard(state, players[3], roundHands[3][0].id);

    expect(state.phase).toBe(GamePhase.TrickComplete);

    state = gameEngine.completeTrick(state);
    expect(state.phase).toBe(GamePhase.RoundComplete);
    expect(state.players.find((player) => player.id === players[1])?.tricks).toBe(1);

    state = gameEngine.completeRound(state);

    expect(state.round).toBe(2);
    expect(state.cardsPerPlayer).toBe(2);
    expect(state.phase).toBe(GamePhase.Betting);
    expect(state.history.length).toBe(1);
    expect(state.players.find((player) => player.id === players[1])?.roundScores[0]).toBe(10);
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

    state = gameEngine.playCard(state, players[0], hands[0][0].id);
    state = gameEngine.playCard(state, players[1], hands[1][0].id);
    state = gameEngine.playCard(state, players[2], hands[2][0].id);
    state = gameEngine.playCard(state, players[3], hands[3][0].id);
    expect(state.phase).toBe(GamePhase.TrickComplete);

    state = gameEngine.completeTrick(state);
    expect(state.phase).toBe(GamePhase.Playing);
    expect(state.currentPlayerIndex).toBe(2);
    expect(state.players[2].tricks).toBe(1);

    state = gameEngine.playCard(state, players[2], hands[2][1].id);
    state = gameEngine.playCard(state, players[3], hands[3][1].id);
    state = gameEngine.playCard(state, players[0], hands[0][1].id);
    state = gameEngine.playCard(state, players[1], hands[1][1].id);
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

    state.players = state.players.map((player, index) => ({
      ...player,
      hand: [],
      bet: index === 0 ? 1 : 0,
      tricks: 0,
      spoiled: false,
    }));

    state = gameEngine.completeRound(state);

    const shtangaPlayer = state.players.find((player) => player.id === players[0]);
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

    state.players = state.players.map((player, index) => ({
      ...player,
      hand: [],
      bet: index === 1 ? 2 : 0,
      tricks: index === 1 ? 2 : 0,
      spoiled: false,
    }));

    state = gameEngine.completeRound(state);

    const winner = state.players.find((player) => player.id === players[1]);
    const tookAllScore = GAME_CONSTANTS.SCORE_TOOK_ALL_MULTIPLIER * 2;
    expect(winner?.roundScores[0]).toBe(tookAllScore);
    expect(winner?.totalScore).toBe(tookAllScore);
  });
});
