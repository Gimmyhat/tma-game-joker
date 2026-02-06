import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Admin {
  id: string;
  username: string;
  role: string;
}

interface AuthState {
  token: string | null;
  admin: Admin | null;
  isHydrated: boolean;
  setAuth: (token: string, admin: Admin) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      isHydrated: false,
      setAuth: (token, admin) =>
        set({
          token,
          admin,
        }),
      logout: () =>
        set({
          token: null,
          admin: null,
        }),
      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({ token: state.token, admin: state.admin }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

// Computed selector - isAuthenticated derived from token
export const selectIsAuthenticated = (state: AuthState) => !!state.token;
