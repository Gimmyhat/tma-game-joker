/**
 * Socket.io client with Telegram authentication
 */

import { io, Socket } from 'socket.io-client';
import { getMockInitData, getMockUser, type TelegramUser } from './telegram';
import type {
  FindGamePayload,
  MakeBetPayload,
  ThrowCardPayload,
  SelectTrumpPayload,
  GameStateUpdate,
  ErrorPayload,
  TurnTimerPayload,
  PlayerReplacedPayload,
  JokerOption,
  Suit,
  Card,
  TrumpDecision,
  GameFinishedPayload,
  TuzovanieDeal,
} from '@joker/shared';

// Server events (received from server)
export interface ServerToClientEvents {
  // Room events
  waiting_for_players: (data: { roomId: string; current: number; required: number }) => void;
  player_left: (data: { playerId: string; playerName: string; playersCount: number }) => void;
  queue_left: (data: { playerId: string }) => void;
  left_game: (data: { playerId?: string; roomId?: string }) => void;

  // Game events
  tuzovanie_started: (data: {
    cardsDealt: Card[][];
    dealSequence: TuzovanieDeal[];
    dealerIndex: number;
    players: { id: string; name: string }[];
  }) => void;
  game_started: (data: { roomId: string }) => void;
  game_state: (data: GameStateUpdate) => void;
  'game:finished': (data: GameFinishedPayload) => void;
  game_finished: (data: any) => void; // Legacy

  // Turn events
  turn_timer_started: (data: TurnTimerPayload) => void;
  pulka_recap_started: (data: { expiresAt: number }) => void;

  // Player status
  player_replaced: (data: PlayerReplacedPayload) => void;

  // Errors
  error: (data: ErrorPayload) => void;

  // Connection
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
}

// Client events (sent to server)
export interface ClientToServerEvents {
  find_game: (payload: FindGamePayload) => void;
  leave_queue: () => void;
  leave_game: (payload: { roomId: string }) => void;
  make_bet: (payload: MakeBetPayload) => void;
  throw_card: (payload: ThrowCardPayload) => void;
  select_trump: (payload: SelectTrumpPayload) => void;
}

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;
let storedInitData: string | null = null;
let storedUser: TelegramUser | null = null;

/**
 * Set user info for socket connection
 */
export function setUserInfo(user: TelegramUser): void {
  storedUser = user;
}

/**
 * Set initData for socket authentication
 * Should be called after SDK initialization
 */
export function setInitData(initData: string): void {
  storedInitData = initData;
}

/**
 * Get socket server URL
 */
function getSocketUrl(): string {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl) return envUrl;

  // In development, use localhost
  if (
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    return 'http://localhost:3000';
  }
  // In production, use same origin
  return window.location.origin;
}

/**
 * Create and connect socket
 */
export function createSocket(): GameSocket {
  if (socket?.connected) {
    return socket;
  }

  const url = getSocketUrl();
  const initData = storedInitData || getMockInitData();
  const user = storedUser || getMockUser();

  console.log('[Socket] Connecting to:', url);

  socket = io(url, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket'], // WebSocket only - game requires low latency
    query: {
      userId: String(user.id),
      userName: `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`,
    },
    auth: {
      initData,
    },
  });

  // Log connection events
  socket.on('connect', () => {
    console.log('[Socket] Connected, id:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
}

/**
 * Get existing socket or create new one
 */
export function getSocket(): GameSocket {
  if (!socket) {
    return createSocket();
  }
  return socket;
}

/**
 * Disconnect and cleanup socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Check if socket is connected
 */
export function isConnected(): boolean {
  return socket?.connected ?? false;
}

// =====================================
// Socket action helpers
// =====================================

export function emitFindGame(): void {
  getSocket().emit('find_game', {});
}

export function emitLeaveQueue(): void {
  getSocket().emit('leave_queue');
}

export function emitLeaveGame(roomId: string): void {
  getSocket().emit('leave_game', { roomId });
}

export function emitMakeBet(roomId: string, amount: number): void {
  getSocket().emit('make_bet', { roomId, amount });
}

export function emitThrowCard(
  roomId: string,
  cardId: string,
  jokerOption?: JokerOption,
  requestedSuit?: Suit,
): void {
  getSocket().emit('throw_card', { roomId, cardId, jokerOption, requestedSuit });
}

export function emitSelectTrump(roomId: string, decision: TrumpDecision): void {
  getSocket().emit('select_trump', { roomId, decision });
}
