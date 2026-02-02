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
// TRUMP SELECTION TYPES
// =====================================

export enum TrumpDecisionType {
  Suit = 'SUIT',
  NoTrump = 'NO_TRUMP',
  Redeal = 'REDEAL',
}

export type TrumpDecision =
  | { type: TrumpDecisionType.Suit; suit: Suit }
  | { type: TrumpDecisionType.NoTrump }
  | { type: TrumpDecisionType.Redeal };

export type TrumpSelectionTrigger = 'FULL_DEAL_ROUND' | 'JOKER_UPCARD';

export interface TrumpSelectionState {
  /** Player who must choose trump */
  chooserPlayerId: string;
  /** Seat index of chooser */
  chooserSeatIndex: number;
  /** Number of cards visible to chooser (always 3) */
  visibleCardCount: number;
  /** Allowed options for this selection */
  allowed: {
    suits: Suit[];
    noTrump: boolean;
    redeal: boolean;
  };
  /** Current redeal count for this round */
  redealCount: number;
  /** Maximum allowed redeals */
  maxRedeals: number;
  /** Server timestamp when selection times out */
  deadlineTs: number;
  /** What triggered trump selection */
  trigger: TrumpSelectionTrigger;
  /** Cards that were not yet dealt (for completing deal after selection) */
  pendingCards?: Card[][];
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

export interface TuzovanieDeal {
  playerId: string;
  card: Card;
  dealIndex: number;
}

// =====================================
// PLAYER TYPES
// =====================================

/**
 * Visual badges displayed next to player names in score table
 * Georgian Joker "Popular" variant rules
 */
export interface PlayerBadges {
  /** 🎭 Player has joker(s) in hand */
  hasJokers: boolean;
  /** ❌ Player failed a contract this pulka (bet >= 1, tricks < bet) */
  spoiled: boolean;
  /** ⭐ Player completed ALL contracts in pulka (only shown at pulka end) */
  perfectPulka: boolean;
  /** 💎 Player "took all" at least once this pulka (bet === tricks === roundLength) */
  tookAll: boolean;
  /** ⚡ Player had perfect pass at least once this pulka (bet === 0, tricks === 0) */
  perfectPass: boolean;
}

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
  /** @deprecated Use RoundHistory.jokerCounts instead */
  hadJokerInRounds: boolean[];
  /** Number of jokers in hand at start of each round (0, 1, or 2) */
  jokerCountPerRound: (0 | 1 | 2)[];

  // Badge tracking (accumulated during pulka, reset at pulka start)
  tookAllInPulka?: boolean;
  perfectPassInPulka?: boolean;

  // Computed badges for display (set by backend before sending to client)
  badges?: PlayerBadges;
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
  /** Number of jokers each player had at round start (for scoresheet display) */
  jokerCounts: Record<string, 0 | 1 | 2>;
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

  // Trump selection (only present during TrumpSelection phase with partial deal)
  trumpSelection?: TrumpSelectionState;

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
// FINAL RESULTS TYPES (for end-game scoresheet)
// =====================================

/** Single round entry for the handwritten scoresheet */
export interface ScoreSheetRoundEntry {
  roundNumber: number;
  cardsPerPlayer: number;
  /** Bid amount (null if not yet placed) */
  bid: number | null;
  /** True if player made their contract (bet === tricks) */
  bidMade: boolean;
  tricks: number;
  score: number;
  /** Number of jokers player had at round start (0, 1, or 2) - shown as dots on vertical line */
  jokerCount: 0 | 1 | 2;
}

/** Summary of a single pulka for one player */
export interface PulkaSummary {
  pulkaNumber: number;
  rounds: ScoreSheetRoundEntry[];
  /** Average score per round in this pulka (X row in scoresheet) */
  pulkaAverage: number;
  /** Cumulative total score after this pulka (including premiums) */
  cumulativeTotal: number;
  /** Premium bonus/penalty applied at pulka end */
  premiumScore: number;
}

/** Individual player's final ranking */
export interface PlayerRanking {
  playerId: string;
  playerName: string;
  /** Final place (1-4) */
  place: 1 | 2 | 3 | 4;
  /** Final total score */
  totalScore: number;
  /** Detailed pulka-by-pulka breakdown */
  pulkaSummaries: PulkaSummary[];
  /** True if this player won (place === 1) */
  isWinner: boolean;
  /** Original seat index (for podium display order) */
  seatIndex: number;
}

/** Complete final game results */
export interface FinalGameResults {
  gameId: string;
  finishedAt: number;
  /** All players ranked by final score */
  rankings: PlayerRanking[];
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
  decision: TrumpDecision;
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

/** Payload for game:finished event - sent when game ends */
export interface GameFinishedPayload {
  /** Full game results with rankings and scoresheet data */
  results: FinalGameResults;
  /** Receiving player's final place (1-4) */
  yourPlace: 1 | 2 | 3 | 4;
  /** True if receiving player won (yourPlace === 1) */
  isVictory: boolean;
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
  TURN_TIMEOUT_MS: 300_000, // 5 minutes
  RECONNECT_TIMEOUT_MS: 30_000,
  FROZEN_ROOM_TIMEOUT_MS: 60_000, // 1 minute - close room if last human disconnected
  MATCHMAKING_TIMEOUT_MS: 60_000,
  PULKA_RECAP_TIMEOUT_MS: 60_000, // 1 minute
  TRICK_RECAP_TIMEOUT_MS: 3000, // 3 seconds delay after each trick
  TUZOVANIE_CARD_DELAY_MS: 340,
  TUZOVANIE_BUFFER_MS: 2400,
  BOT_MOVE_DELAY_MS: 1000,
  GAME_CLEANUP_DELAY_MS: 30_000,

  // Trump Selection
  TRUMP_SELECTION_VISIBLE_CARDS: 3, // Cards shown to chooser before trump decision
  TRUMP_SELECTION_TIMEOUT_MS: 60_000, // 1 minute to choose trump
  TRUMP_SELECTION_MAX_REDEALS: 2, // Maximum allowed redeals

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
