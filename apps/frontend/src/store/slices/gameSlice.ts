import { StateCreator } from 'zustand';
import { GameStore } from '../gameStore';
import {
  GameState,
  Card,
  JokerOption,
  Suit,
  TrumpDecision,
  TrumpDecisionType,
  TrumpSelectionState,
} from '@joker/shared';
import { emitLeaveGame, emitMakeBet, emitThrowCard, emitSelectTrump } from '../../lib/socket';
import { TelegramUser } from '../../lib/telegram';

export interface GameSlice {
  user: TelegramUser | null;
  gameState: GameState | null;
  myHand: Card[];
  myPlayerId: string | null;
  turnExpiresAt: number | null;
  currentTurnPlayerId: string | null;
  pulkaRecapExpiresAt: number | null;

  // Derived selectors for trump selection
  isTrumpChooser: () => boolean;
  getTrumpSelection: () => TrumpSelectionState | null;

  leaveGame: () => void;
  makeBet: (amount: number) => void;
  throwCard: (cardId: string, jokerOption?: JokerOption, requestedSuit?: Suit) => void;
  selectTrump: (decision: TrumpDecision) => void;
  selectTrumpSuit: (suit: Suit) => void;
  selectNoTrump: () => void;
  requestRedeal: () => void;

  _setGameState: (state: GameState, myHand: Card[]) => void;
}

export const createGameSlice: StateCreator<GameStore, [], [], GameSlice> = (set, get) => ({
  user: null,
  gameState: null,
  myHand: [],
  myPlayerId: null,
  turnExpiresAt: null,
  currentTurnPlayerId: null,
  pulkaRecapExpiresAt: null,

  isTrumpChooser: () => {
    const { gameState, myPlayerId } = get();
    if (!gameState?.trumpSelection || !myPlayerId) return false;
    return gameState.trumpSelection.chooserPlayerId === myPlayerId;
  },

  getTrumpSelection: () => {
    const { gameState } = get();
    return gameState?.trumpSelection || null;
  },

  leaveGame: () => {
    const roomId = get().roomId;
    if (!roomId) return;
    emitLeaveGame(roomId);
    get()._reset();
  },

  makeBet: (amount: number) => {
    const { roomId, gameState, myPlayerId } = get();
    if (!roomId || gameState?.phase !== 'betting') return;
    if (gameState.players[gameState.currentPlayerIndex]?.id !== myPlayerId) return;
    emitMakeBet(roomId, amount);
  },

  throwCard: (cardId: string, jokerOption?: JokerOption, requestedSuit?: Suit) => {
    const { roomId, gameState, myPlayerId } = get();
    if (!roomId || gameState?.phase !== 'playing') return;
    if (gameState.players[gameState.currentPlayerIndex]?.id !== myPlayerId) return;
    emitThrowCard(roomId, cardId, jokerOption, requestedSuit);
  },

  selectTrump: (decision: TrumpDecision) => {
    const { roomId, gameState, myPlayerId } = get();
    if (!roomId || gameState?.phase !== 'trump_selection') return;
    if (gameState.trumpSelection?.chooserPlayerId !== myPlayerId) return;
    emitSelectTrump(roomId, decision);
  },

  selectTrumpSuit: (suit: Suit) => {
    get().selectTrump({ type: TrumpDecisionType.Suit, suit });
  },

  selectNoTrump: () => {
    get().selectTrump({ type: TrumpDecisionType.NoTrump });
  },

  requestRedeal: () => {
    get().selectTrump({ type: TrumpDecisionType.Redeal });
  },

  _setGameState: (state: GameState, myHand: Card[]) => {
    set({
      gameState: state,
      myHand,
      lobbyStatus: state.phase === 'waiting' ? 'waiting' : 'idle',
      currentTurnPlayerId: state.players[state.currentPlayerIndex]?.id || null,
    });
  },
});
