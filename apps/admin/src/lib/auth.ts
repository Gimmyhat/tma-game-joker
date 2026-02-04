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
  isAuthenticated: boolean;
  setAuth: (token: string, admin: Admin) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      admin: null,
      isAuthenticated: false,
      setAuth: (token, admin) =>
        set({
          token,
          admin,
          isAuthenticated: true,
        }),
      logout: () =>
        set({
          token: null,
          admin: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({ token: state.token, admin: state.admin }),
    },
  ),
);
