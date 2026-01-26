// =====================================
// ENUMS
// =====================================

export enum Suit {
  Hearts = 'hearts',
  Diamonds = 'diamonds',
  Clubs = 'clubs',
  Spades = 'spades',
}

export enum Rank {
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
  Ten = 10,
  Jack = 11,
  Queen = 12,
  King = 13,
  Ace = 14,
}

export enum GamePhase {
  Waiting = 'waiting',
  Tuzovanie = 'tuzovanie',
  TrumpSelection = 'trump_selection',
  Betting = 'betting',
  Playing = 'playing',
  TrickComplete = 'trick_complete',
  RoundComplete = 'round_complete',
  PulkaComplete = 'pulka_complete',
  Finished = 'finished',
}

export enum JokerOption {
  High = 'high',
  Low = 'low',
  Top = 'top',
  Bottom = 'bottom',
}

// =====================================
// CARD TYPES
// =====================================

export interface StandardCard {
  type: 'standard';
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface JokerCard {
  type: 'joker';
  id: string;
  jokerId: 1 | 2;
}

export type Card = StandardCard | JokerCard;

export interface TableCard {
  card: Card;
  playerId: string;
  jokerOption?: JokerOption;
  requestedSuit?: Suit;
}

// =====================================
// PLAYER TYPES
// =====================================

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  socketId?: string;
  connected: boolean;

  // Current round state
  hand: Card[];
  bet: number | null;
  tricks: number;

  // Scoring
  roundScores: number[];
  pulkaScores: number[];
  totalScore: number;

  // Pulka state
  spoiled: boolean;
  hadJokerInRounds: boolean[];
}

// =====================================
// GAME STATE
// =====================================

export interface RoundHistory {
  round: number;
  pulka: number;
  cardsPerPlayer: number;
  trump: Suit | null;
  bets: Record<string, number>;
  tricks: Record<string, number>;
  scores: Record<string, number>;
  tableHistory: TableCard[][];
}

export interface PremiumResult {
  playerId: string;
  received: number;
  takenFromPlayerId: string | null;
  takenAmount: number;
}

export interface PulkaResults {
  pulka: number;
  premiums: PremiumResult[];
  playerScores: Record<string, number>; // Bonus/penalty for this pulka
  highestTrickScore: number;
}

export interface GameState {
  id: string;

  // Players
  players: Player[];
  dealerIndex: number;
  currentPlayerIndex: number;

  // Round info
  round: number;
  pulka: number;
  cardsPerPlayer: number;
  phase: GamePhase;

  // Cards
  trump: Suit | null;
  trumpCard: Card | null; // The actual card that determined trump (shown on table)
  table: TableCard[];

  // Timing
  turnStartedAt: number;
  turnTimeoutMs: number;

  // History
  history: RoundHistory[];
  lastPulkaResults: PulkaResults | null;

  // Metadata
  createdAt: number;
  finishedAt: number | null;
  winnerId: string | null;
}

// =====================================
// EVENTS (Client -> Server)
// =====================================

export interface FindGamePayload {
  // Empty - just trigger matchmaking
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface MakeBetPayload {
  roomId: string;
  amount: number;
}

export interface ThrowCardPayload {
  roomId: string;
  cardId: string;
  jokerOption?: JokerOption;
  requestedSuit?: Suit;
}

export interface SelectTrumpPayload {
  roomId: string;
  trump: Suit | null;
}

// =====================================
// EVENTS (Server -> Client)
// =====================================

export interface GameStateUpdate {
  state: GameState;
  yourHand: Card[];
  roomId?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface TurnTimerPayload {
  playerId: string;
  expiresAt: number;
}

export interface PlayerReplacedPayload {
  playerId: string;
  playerName: string;
}

export * from './logic';

// =====================================
// CONSTANTS
// =====================================

export const GAME_CONSTANTS = {
  PLAYERS_COUNT: 4,
  TOTAL_ROUNDS: 24,
  TOTAL_PULKAS: 4,

  // Timeouts
  TURN_TIMEOUT_MS: 60_000, // 1 minute
  RECONNECT_TIMEOUT_MS: 30_000,
  MATCHMAKING_TIMEOUT_MS: 60_000,
  PULKA_RECAP_TIMEOUT_MS: 60_000, // 1 minute
  TRICK_RECAP_TIMEOUT_MS: 3000, // 3 seconds delay after each trick

  // Scoring
  SCORE_TOOK_OWN_MULTIPLIER: 50,
  SCORE_TOOK_ALL_MULTIPLIER: 100,
  SCORE_MISS_MULTIPLIER: 10,
  SCORE_SHTANGA_PENALTY: -200,
  SCORE_PASS_BONUS: 50,

  // Card Power Constants (for sorting/visuals)
  POWER_JOKER_TOP: 1000,
  POWER_JOKER_HIGH_TRUMP: 300,
  POWER_JOKER_HIGH_SUIT: 199,
  POWER_TRUMP_BASE: 200,
  POWER_SUIT_BASE: 100,
  POWER_JOKER_LOW: 101, // Beats off-suit (rank < 100)
  POWER_JOKER_BOTTOM: 0,

  // Pulka structure
  PULKA_STRUCTURE: [
    { pulka: 1, rounds: [1, 2, 3, 4, 5, 6, 7, 8], cardsPerRound: [1, 2, 3, 4, 5, 6, 7, 8] },
    { pulka: 2, rounds: [9, 10, 11, 12], cardsPerRound: [9, 9, 9, 9] },
    { pulka: 3, rounds: [13, 14, 15, 16, 17, 18, 19, 20], cardsPerRound: [8, 7, 6, 5, 4, 3, 2, 1] },
    { pulka: 4, rounds: [21, 22, 23, 24], cardsPerRound: [9, 9, 9, 9] },
  ],
} as const;

export const resolveTimeoutMs = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// =====================================
// UTILITY TYPES
// =====================================

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  message?: string;
  requiredSuit?: Suit;
  forbiddenBet?: number;
}
