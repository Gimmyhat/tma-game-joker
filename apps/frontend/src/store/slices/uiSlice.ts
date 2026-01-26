import { StateCreator } from 'zustand';
import { GameStore } from '../gameStore';
import { ErrorPayload } from '@joker/shared';

export interface UISlice {
  lastError: ErrorPayload | null;
  isDevMode: boolean;
  gameLogs: string[];

  clearError: () => void;
  addLog: (message: string) => void;
  toggleDevMode: (enabled?: boolean) => void;
}

export const createUISlice: StateCreator<GameStore, [], [], UISlice> = (set, get) => ({
  lastError: null,
  isDevMode: false,
  gameLogs: [],

  clearError: () => {
    set({ lastError: null });
  },

  addLog: (message: string) => {
    if (!get().isDevMode) return;
    const timestamp = new Date().toLocaleTimeString();
    set((state) => ({
      gameLogs: [...state.gameLogs, `[${timestamp}] ${message}`],
    }));
  },

  toggleDevMode: (enabled?: boolean) => {
    set((state) => ({
      isDevMode: enabled !== undefined ? enabled : !state.isDevMode,
    }));
  },
});
