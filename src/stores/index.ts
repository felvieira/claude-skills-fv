// ============================================================
// src/stores/createStore.ts — Factory DRY pra criar stores
// ============================================================
import { create, type StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type StoreMiddleware = [['zustand/devtools', never], ['zustand/immer', never]];
type PersistedStoreMiddleware = [
  ['zustand/devtools', never],
  ['zustand/persist', unknown],
  ['zustand/immer', never],
];

export function createStore<T extends object>(
  name: string,
  initializer: StateCreator<T, StoreMiddleware>,
  options?: { persist?: boolean; partialize?: (state: T) => Partial<T> }
) {
  if (options?.persist) {
    return create<T>()(
      devtools(
        persist(immer(initializer as any) as any, {
          name: `${name}-storage`,
          partialize: options.partialize as any,
        }),
        { name }
      ) as any
    );
  }

  return create<T>()(devtools(immer(initializer), { name }));
}

// ============================================================
// src/stores/authStore.ts
// ============================================================
interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (data: Partial<User>) => void;
}

export const useAuthStore = createStore<AuthState>(
  'auth',
  (set) => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,

    setAuth: (user, accessToken) =>
      set((state) => {
        state.user = user;
        state.accessToken = accessToken;
        state.isAuthenticated = true;
      }),

    clearAuth: () =>
      set((state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      }),

    updateUser: (data) =>
      set((state) => {
        if (state.user) Object.assign(state.user, data);
      }),
  }),
  {
    persist: true,
    partialize: (state) => ({
      user: state.user,
      accessToken: state.accessToken,
      isAuthenticated: state.isAuthenticated,
    }),
  }
);

// ============================================================
// src/stores/uiStore.ts
// ============================================================
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toasts: Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>;
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: UIState['theme']) => void;
  addToast: (toast: Omit<UIState['toasts'][0], 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = createStore<UIState>(
  'ui',
  (set) => ({
    sidebarOpen: true,
    theme: 'system',
    toasts: [],

    toggleSidebar: () => set((s) => { s.sidebarOpen = !s.sidebarOpen; }),
    setSidebarOpen: (open) => set((s) => { s.sidebarOpen = open; }),
    setTheme: (theme) => set((s) => { s.theme = theme; }),
    addToast: (toast) =>
      set((s) => {
        const id = Math.random().toString(36).slice(2);
        s.toasts.push({ ...toast, id });
        // Auto-remove após 5s
        setTimeout(() => useUIStore.getState().removeToast(id), 5000);
      }),
    removeToast: (id) =>
      set((s) => {
        s.toasts = s.toasts.filter((t) => t.id !== id);
      }),
  }),
  { persist: true, partialize: (s) => ({ sidebarOpen: s.sidebarOpen, theme: s.theme }) }
);
