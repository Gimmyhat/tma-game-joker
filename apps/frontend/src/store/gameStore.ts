/**
 * Zustand store for game state management
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { GameState, GamePhase } from '@joker/shared';
import { getSocket, setUserInfo, type GameSocket } from '../lib/socket';
import { getMockUser, type TelegramUser } from '../lib/telegram';

import { GameSlice, createGameSlice } from './slices/gameSlice';
import { LobbySlice, createLobbySlice } from './slices/lobbySlice';
import { UISlice, createUISlice } from './slices/uiSlice';

// =====================================
// Store State Types
// =====================================

export type GameStore = GameSlice &
  LobbySlice &
  UISlice & {
    initialize: (user?: TelegramUser) => void;
    _reset: () => void;
  };

// =====================================
// Store
// =====================================

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get, api) => ({
    ...createGameSlice(set, get, api),
    ...createLobbySlice(set, get, api),
    ...createUISlice(set, get, api),

    initialize: (user?: TelegramUser) => {
      // Use provided user or mock for development
      const resolvedUser = user || getMockUser();

      // Check dev mode from URL
      const searchParams = new URLSearchParams(window.location.search);
      const isDev = searchParams.get('dev') === 'true';

      set({
        user: resolvedUser,
        myPlayerId: String(resolvedUser.id),
        isDevMode: isDev,
      });

      setUserInfo(resolvedUser);

      const socket = getSocket();
      setupSocketListeners(socket, set, get);

      set({ connectionStatus: 'connecting' });
    },

    _reset: () => {
      set({
        connectionStatus: get().connectionStatus,
        lobbyStatus: 'idle',
        roomId: null,
        playersInRoom: 0,
        tuzovanieCards: null,
        tuzovanieDealerIndex: null,
        gameState: null,
        myHand: [],
        turnExpiresAt: null,
        currentTurnPlayerId: null,
        pulkaRecapExpiresAt: null,
        lastError: null,
        // Keep user, playerId, isDevMode, logs
      });
    },
  })),
);

// =====================================
// Socket Event Handlers
// =====================================

function setupSocketListeners(
  socket: GameSocket,
  set: (partial: Partial<GameStore> | ((state: GameStore) => Partial<GameStore>)) => void,
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

  // Tuzovanie event
  socket.on('tuzovanie_started', (data) => {
    console.log('[Store] Tuzovanie started:', data);

    // Create mock game state to switch to GameScreen
    const mockPlayers = data.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: false, // Doesn't matter for UI
      connected: true,
      hand: [],
      bet: null,
      tricks: 0,
      roundScores: [],
      pulkaScores: [],
      totalScore: 0,
      spoiled: false,
      hadJokerInRounds: [],
    }));

    const mockGameState: GameState = {
      id: 'tuzovanie-temp',
      players: mockPlayers,
      dealerIndex: data.dealerIndex, // We know the result, but animation will reveal it
      currentPlayerIndex: 0,
      round: 1,
      pulka: 1,
      cardsPerPlayer: 1,
      phase: GamePhase.Tuzovanie,
      trump: null,
      trumpCard: null,
      table: [],
      turnStartedAt: Date.now(),
      turnTimeoutMs: 0,
      history: [],
      lastPulkaResults: null,
      createdAt: Date.now(),
      finishedAt: null,
      winnerId: null,
    };

    set({
      lobbyStatus: 'tuzovanie',
      tuzovanieCards: data.cardsDealt,
      tuzovanieDealerIndex: data.dealerIndex,
      // Set GameState immediately to trigger screen switch
      gameState: mockGameState,
      myHand: [],
    });
  });

  // Game events
  socket.on('game_started', (data) => {
    console.log('[Store] Game started:', data);
    set({ lobbyStatus: 'starting', roomId: data.roomId });
  });

  socket.on('game_state', (data) => {
    // Log state updates
    const store = get();
    if (store.isDevMode) {
      const phase = data.state.phase;
      // [INFO] General state update
      const currentLog = `[INFO] State: ${phase} (R${data.state.round})`;
      store.addLog(currentLog);

      // [TURN] Turn change
      if (data.state.currentPlayerIndex !== store.gameState?.currentPlayerIndex) {
        const player = data.state.players[data.state.currentPlayerIndex];
        store.addLog(`[TURN] ${player.name} (${player.id})`);
      }

      // [GAME] Trick completion (check if phase changed to trick_complete)
      if (phase === 'trick_complete' && store.gameState?.phase !== 'trick_complete') {
        store.addLog(`[GAME] Trick complete. Calculating winner...`);
      }

      // [GAME] Trick Winner Detection (Tricks count increased)
      const oldPlayers = store.gameState?.players || [];
      const newPlayers = data.state.players;
      for (const player of newPlayers) {
        const oldPlayer = oldPlayers.find((p) => p.id === player.id);
        if (oldPlayer && player.tricks > oldPlayer.tricks) {
          store.addLog(`[GAME] Trick won by ${player.name} (Total: ${player.tricks})`);
        }
      }

      // [GAME] Round Completion
      if (phase === 'round_complete' && store.gameState?.phase !== 'round_complete') {
        store.addLog(`[GAME] Round ${data.state.round} Complete.`);
        newPlayers.forEach((p) => {
          const roundScore = p.roundScores[p.roundScores.length - 1];
          store.addLog(`[SCORE] ${p.name}: ${roundScore} pts (Total: ${p.totalScore})`);
        });
      }

      // Auto-cleanup on Pulka Complete
      if (phase === 'pulka_complete' && store.gameState?.phase !== 'pulka_complete') {
        store.addLog(`[GAME] Pulka Complete. Clearing old logs...`);
        // Keep last 10 logs + new message
        setTimeout(() => {
          useGameStore.setState((state) => ({
            gameLogs: [...state.gameLogs.slice(-10), '[SYSTEM] Logs auto-cleared for new Pulka'],
          }));
        }, 5000); // Clear after 5 seconds so user sees the "Complete" message
      }
    }

    console.log('[Store] Game state update:', data.state.phase, 'round:', data.state.round);
    const currentPlayerId = get().myPlayerId;
    const fallbackHand = currentPlayerId
      ? data.state.players.find((p) => p.id === currentPlayerId)?.hand || []
      : [];
    const myHand = Array.isArray(data.yourHand) ? data.yourHand : fallbackHand;
    if (data.roomId && data.roomId !== get().roomId) {
      set({ roomId: data.roomId });
    }

    // Call internal setter from GameSlice
    get()._setGameState(data.state, myHand);
  });

  // Turn timer
  socket.on('turn_timer_started', (data) => {
    set({
      turnExpiresAt: data.expiresAt,
      currentTurnPlayerId: data.playerId,
      pulkaRecapExpiresAt: null, // Clear pulka timer when turn starts
    });
  });

  socket.on('pulka_recap_started', (data) => {
    console.log('[Store] Pulka recap started:', data);
    set({
      pulkaRecapExpiresAt: data.expiresAt,
      turnExpiresAt: null, // Clear turn timer
      currentTurnPlayerId: null,
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
