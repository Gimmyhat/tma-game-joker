/**
 * Zustand store for game state management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GameState, Card, GamePhase, Suit, JokerOption, ErrorPayload } from '@joker/shared';
import {
  getSocket,
  emitFindGame,
  emitLeaveQueue,
  emitLeaveGame,
  emitMakeBet,
  emitThrowCard,
  emitSelectTrump,
  type GameSocket,
  setUserInfo,
} from '../lib/socket';
import { getMockUser, type TelegramUser } from '../lib/telegram';

// =====================================
// Store State Types
// =====================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type LobbyStatus = 'idle' | 'searching' | 'waiting' | 'starting';

export interface GameStore {
  // Connection
  connectionStatus: ConnectionStatus;

  // User
  user: TelegramUser | null;

  // Lobby
  lobbyStatus: LobbyStatus;
  roomId: string | null;
  playersInRoom: number;
  requiredPlayers: number;

  // Game
  gameState: GameState | null;
  myHand: Card[];
  myPlayerId: string | null;

  // Turn timer
  turnExpiresAt: number | null;
  currentTurnPlayerId: string | null;

  // Errors
  lastError: ErrorPayload | null;

  // Actions
  initialize: (user?: TelegramUser) => void;
  findGame: () => void;
  leaveQueue: () => void;
  leaveGame: () => void;
  makeBet: (amount: number) => void;
  throwCard: (cardId: string, jokerOption?: JokerOption, requestedSuit?: Suit) => void;
  selectTrump: (trump: Suit | null) => void;
  clearError: () => void;

  // Internal
  _setConnectionStatus: (status: ConnectionStatus) => void;
  _setGameState: (state: GameState, myHand: Card[]) => void;
  _reset: () => void;
}

// =====================================
// Initial State
// =====================================

const initialState = {
  connectionStatus: 'disconnected' as ConnectionStatus,
  user: null as TelegramUser | null,
  lobbyStatus: 'idle' as LobbyStatus,
  roomId: null as string | null,
  playersInRoom: 0,
  requiredPlayers: 4,
  gameState: null as GameState | null,
  myHand: [] as Card[],
  myPlayerId: null as string | null,
  turnExpiresAt: null as number | null,
  currentTurnPlayerId: null as string | null,
  lastError: null as ErrorPayload | null,
};

// =====================================
// Store
// =====================================

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    initialize: (user?: TelegramUser) => {
      // Use provided user or mock for development
      const resolvedUser = user || getMockUser();
      set({
        user: resolvedUser,
        myPlayerId: String(resolvedUser.id),
      });

      setUserInfo(resolvedUser);

      const socket = getSocket();
      setupSocketListeners(socket, set, get);

      set({ connectionStatus: 'connecting' });
    },

    findGame: () => {
      if (get().lobbyStatus !== 'idle') return;
      set({ lobbyStatus: 'searching', lastError: null });
      emitFindGame();
    },

    leaveQueue: () => {
      const status = get().lobbyStatus;
      if (status !== 'searching' && status !== 'waiting') return;
      emitLeaveQueue();
      set({ lobbyStatus: 'idle', roomId: null, playersInRoom: 0 });
    },

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

    clearError: () => {
      set({ lastError: null });
    },

    _setConnectionStatus: (status: ConnectionStatus) => {
      set({ connectionStatus: status });
    },

    _setGameState: (state: GameState, myHand: Card[]) => {
      set({
        gameState: state,
        myHand,
        lobbyStatus: state.phase === 'waiting' ? 'waiting' : 'idle',
        currentTurnPlayerId: state.players[state.currentPlayerIndex]?.id || null,
      });
    },

    _reset: () => {
      set({
        ...initialState,
        user: get().user,
        myPlayerId: get().myPlayerId,
        connectionStatus: get().connectionStatus,
      });
    },
  })),
);

// =====================================
// Socket Event Handlers
// =====================================

function setupSocketListeners(
  socket: GameSocket,
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore,
): void {
  // Connection events
  socket.on('connect', () => {
    console.log('[Store] Socket connected');
    set({ connectionStatus: 'connected' });
  });

  socket.on('disconnect', () => {
    console.log('[Store] Socket disconnected');
    set({ connectionStatus: 'disconnected' });
  });

  socket.on('connect_error', () => {
    console.log('[Store] Socket connection error');
    set({ connectionStatus: 'error' });
  });

  // Room events
  socket.on('room_joined', (data) => {
    console.log('[Store] Room joined:', data);
    set({
      roomId: data.roomId,
      playersInRoom: data.playersCount,
      lobbyStatus: 'waiting',
    });
  });

  socket.on('waiting_for_players', (data) => {
    console.log('[Store] Waiting for players:', data);
    set({
      roomId: data.roomId,
      playersInRoom: data.current,
      requiredPlayers: data.required,
      lobbyStatus: 'waiting',
    });
  });

  socket.on('player_joined', (data) => {
    console.log('[Store] Player joined:', data);
    set({ playersInRoom: data.playersCount });
  });

  socket.on('player_left', (data) => {
    console.log('[Store] Player left:', data);
    set({ playersInRoom: data.playersCount });
  });

  // Game events
  socket.on('game_started', (data) => {
    console.log('[Store] Game started:', data);
    set({ lobbyStatus: 'starting', roomId: data.roomId });
  });

  socket.on('game_state', (data) => {
    console.log('[Store] Game state update:', data.state.phase, 'round:', data.state.round);
    const currentPlayerId = get().myPlayerId;
    const fallbackHand = currentPlayerId
      ? data.state.players.find((p) => p.id === currentPlayerId)?.hand || []
      : [];
    const myHand = Array.isArray(data.yourHand) ? data.yourHand : fallbackHand;
    if (data.roomId && data.roomId !== get().roomId) {
      set({ roomId: data.roomId });
    }
    get()._setGameState(data.state, myHand);
  });

  // Turn timer
  socket.on('turn_timer', (data) => {
    set({
      turnExpiresAt: data.expiresAt,
      currentTurnPlayerId: data.playerId,
    });
  });

  // Player status events
  socket.on('player_disconnected', (data) => {
    console.log('[Store] Player disconnected:', data);
  });

  socket.on('player_reconnected', (data) => {
    console.log('[Store] Player reconnected:', data);
  });

  socket.on('player_replaced', (data) => {
    console.log('[Store] Player replaced by bot:', data);
  });

  // Errors
  socket.on('error', (data) => {
    console.error('[Store] Error:', data);
    set({ lastError: data });

    // Reset searching state on error
    if (get().lobbyStatus === 'searching') {
      set({ lobbyStatus: 'idle' });
    }
  });
}

// =====================================
// Selectors
// =====================================

export const selectIsMyTurn = (state: GameStore): boolean => {
  if (!state.gameState || !state.myPlayerId) return false;
  const currentPlayer = state.gameState.players[state.gameState.currentPlayerIndex];
  return currentPlayer?.id === state.myPlayerId;
};

export const selectCurrentPhase = (state: GameStore): GamePhase | null => {
  return state.gameState?.phase || null;
};

export const selectMyPlayer = (state: GameStore) => {
  if (!state.gameState || !state.myPlayerId) return null;
  return state.gameState.players.find((p) => p.id === state.myPlayerId) || null;
};

export const selectOtherPlayers = (state: GameStore) => {
  if (!state.gameState || !state.myPlayerId) return [];
  return state.gameState.players.filter((p) => p.id !== state.myPlayerId);
};

export const selectCanMakeBet = (state: GameStore): boolean => {
  return state.gameState?.phase === 'betting' && selectIsMyTurn(state);
};

export const selectCanThrowCard = (state: GameStore): boolean => {
  return state.gameState?.phase === 'playing' && selectIsMyTurn(state);
};

export const selectCanSelectTrump = (state: GameStore): boolean => {
  return state.gameState?.phase === 'trump_selection' && selectIsMyTurn(state);
};
