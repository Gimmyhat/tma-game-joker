import { StateCreator } from 'zustand';
import { GameStore } from '../gameStore';
import { ErrorPayload, FinalGameResults } from '@joker/shared';

export interface UISlice {
  lastError: ErrorPayload | null;
  isDevMode: boolean;
  gameLogs: string[];

  // Results & Score Sheet
  showVictoryScreen: boolean;
  showScoreSheet: boolean;
  finalResults: FinalGameResults | null;
  finalPlace: 1 | 2 | 3 | 4 | null;

  clearError: () => void;
  addLog: (message: string) => void;
  toggleDevMode: (enabled?: boolean) => void;

  setShowVictoryScreen: (show: boolean) => void;
  setShowScoreSheet: (show: boolean) => void;
  setFinalResults: (results: FinalGameResults, place: 1 | 2 | 3 | 4) => void;
}

export const createUISlice: StateCreator<GameStore, [], [], UISlice> = (set, get) => ({
  lastError: null,
  isDevMode: false,
  gameLogs: [],

  showVictoryScreen: false,
  showScoreSheet: false,
  finalResults: null,
  finalPlace: null,

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

  setShowVictoryScreen: (show: boolean) => {
    set({ showVictoryScreen: show });
  },

  setShowScoreSheet: (show: boolean) => {
    set({ showScoreSheet: show });
  },

  setFinalResults: (results: FinalGameResults, place: 1 | 2 | 3 | 4) => {
    set({
      finalResults: results,
      finalPlace: place,
      showVictoryScreen: true, // Auto-show victory screen when results arrive
    });
  },
});
