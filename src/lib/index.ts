// ============================================================
// src/lib/api-client.ts — Axios com interceptors
// ============================================================
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// === Request interceptor ===
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Injeta access token do Zustand (acesso direto sem hook)
  try {
    const stored = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('auth-storage') || '{}')
      : null;
    const token = stored?.state?.accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}

  // CSRF token do cookie
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(^| )csrf-token=([^;]+)/);
    if (match) config.headers['X-CSRF-Token'] = match[2];
  }

  return config;
});

// === Response interceptor — Auto refresh ===
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.data.accessToken;

        // Atualiza Zustand store
        try {
          const stored = JSON.parse(localStorage.getItem('auth-storage') || '{}');
          stored.state.accessToken = newToken;
          if (data.data.user) stored.state.user = data.data.user;
          localStorage.setItem('auth-storage', JSON.stringify(stored));
        } catch {}

        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Limpa auth e redireciona
        try {
          localStorage.removeItem('auth-storage');
        } catch {}
        if (typeof window !== 'undefined') window.location.href = '/login';

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// src/lib/query-keys.ts — Factory de query keys type-safe
// ============================================================

// Factory genérica DRY — cria query keys pra qualquer domínio
function createQueryKeys<T extends string>(domain: T) {
  return {
    all: [domain] as const,
    lists: () => [domain, 'list'] as const,
    list: (params: Record<string, unknown>) => [domain, 'list', params] as const,
    details: () => [domain, 'detail'] as const,
    detail: (id: string) => [domain, 'detail', id] as const,
  };
}

export const queryKeys = {
  auth: { me: ['auth', 'me'] as const },
  users: createQueryKeys('users'),
  posts: createQueryKeys('posts'),
  // Adicionar novos domínios aqui:
  // products: createQueryKeys('products'),
  // orders: createQueryKeys('orders'),
} as const;

// ============================================================
// src/lib/utils.ts — Utilidades DRY
// ============================================================

// ClassNames helper (substitui clsx)
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Formata data para pt-BR
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(new Date(date));
}

// Formata moeda BRL
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

// Trunca texto com ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

// Sleep helper pra testes
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gera iniciais de um nome
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Debounce pra funções (fora de React)
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Cria slug a partir de string
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
