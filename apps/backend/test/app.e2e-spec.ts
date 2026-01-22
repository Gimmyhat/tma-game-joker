import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  Card,
  GamePhase,
  GAME_CONSTANTS,
  JokerOption,
  Rank,
  StandardCard,
  Suit,
  TableCard,
} from '@joker/shared';
import { AppModule } from '../src/app.module';
import { GameEngineService } from '../src/game/services/game-engine.service';
import { StateMachineService } from '../src/game/services/state-machine.service';

describe('App (e2e)', () => {
  let app: INestApplication;
  let gameEngine: GameEngineService;
  let stateMachine: StateMachineService;

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

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    gameEngine = app.get(GameEngineService);
    stateMachine = app.get(StateMachineService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('initializes the application', () => {
    expect(app).toBeDefined();
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
