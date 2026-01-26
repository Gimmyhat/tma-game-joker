import { StateCreator } from 'zustand';
import { GameStore } from '../gameStore';
import { GameState, Card, JokerOption, Suit } from '@joker/shared';
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

  leaveGame: () => void;
  makeBet: (amount: number) => void;
  throwCard: (cardId: string, jokerOption?: JokerOption, requestedSuit?: Suit) => void;
  selectTrump: (trump: Suit | null) => void;

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

  leaveGame: () => {
    const roomId = get().roomId;
    if (!roomId) return;
    emitLeaveGame(roomId);
    get()._reset();
  },

  makeBet: (amount: number) => {
    const { roomId, gameState } = get();
    if (!roomId || gameState?.phase !== 'betting') return;
    emitMakeBet(roomId, amount);
  },

  throwCard: (cardId: string, jokerOption?: JokerOption, requestedSuit?: Suit) => {
    const { roomId, gameState } = get();
    if (!roomId || gameState?.phase !== 'playing') return;
    emitThrowCard(roomId, cardId, jokerOption, requestedSuit);
  },

  selectTrump: (trump: Suit | null) => {
    const { roomId, gameState } = get();
    if (!roomId || gameState?.phase !== 'trump_selection') return;
    emitSelectTrump(roomId, trump);
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
