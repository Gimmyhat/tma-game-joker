import { StateCreator } from 'zustand';
import { GameStore } from '../gameStore';
import { Card } from '@joker/shared';
import { emitFindGame, emitLeaveQueue } from '../../lib/socket';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
export type LobbyStatus = 'idle' | 'searching' | 'waiting' | 'starting' | 'tuzovanie';

export interface LobbySlice {
  connectionStatus: ConnectionStatus;
  lobbyStatus: LobbyStatus;
  roomId: string | null;
  playersInRoom: number;
  requiredPlayers: number;
  tuzovanieCards: Card[][] | null;
  tuzovanieDealerIndex: number | null;

  findGame: () => void;
  leaveQueue: () => void;
  _setConnectionStatus: (status: ConnectionStatus) => void;
}

export const createLobbySlice: StateCreator<GameStore, [], [], LobbySlice> = (set, get) => ({
  connectionStatus: 'disconnected',
  lobbyStatus: 'idle',
  roomId: null,
  playersInRoom: 0,
  requiredPlayers: 4,
  tuzovanieCards: null,
  tuzovanieDealerIndex: null,

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

  _setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },
});
