# Frontend Integration Guide

Guia de referência para a skill `04-frontend-integration`. Consultar quando precisar de exemplos de store, API client, refresh flow ou estrutura de pastas.

## Estrutura de Pastas

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # grupo de rotas autenticadas
│   ├── (public)/           # grupo de rotas públicas
│   ├── layout.tsx
│   └── providers.tsx
├── components/
│   ├── ui/                 # componentes primitivos (Button, Input, Skeleton)
│   ├── features/           # componentes de domínio (UserCard, PostList)
│   ├── skeletons/          # skeletons por tela
│   └── layout/             # Header, Footer, Sidebar
├── hooks/
│   ├── useApi.ts           # hooks genéricos de query/mutation
│   └── useDebounce.ts
├── lib/
│   ├── api-client.ts       # axios com interceptors
│   ├── query-keys.ts       # chaves tipadas do React Query
│   └── utils.ts
├── stores/
│   ├── authStore.ts        # sessão e token
│   └── uiStore.ts          # estado de UI (modais, toasts)
└── types/
    ├── api.ts              # tipos de resposta padronizados
    └── user.ts             # tipos de domínio
```

## Auth Store (Zustand)

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,  // NUNCA em localStorage
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}));
```

## API Client com Refresh Automático

```typescript
// src/lib/api-client.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then((token) => { original.headers.Authorization = `Bearer ${token}`; return api(original); });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {}, { withCredentials: true });
        useAuthStore.getState().setAuth(data.data.user, data.data.accessToken);
        failedQueue.forEach((p) => p.resolve(data.data.accessToken));
        failedQueue = [];
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(original);
      } catch (e) {
        failedQueue.forEach((p) => p.reject(e));
        failedQueue = [];
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

## Hooks de Query Genéricos

```typescript
// src/hooks/useApi.ts
export function usePaginatedQuery<T>(queryKey, url, params?, options?) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: async () => { const { data } = await api.get(url, { params }); return data; },
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useApiMutation<TInput, TOutput>(method, url, options?) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: TInput) => {
      const endpoint = typeof url === 'function' ? url(variables) : url;
      const { data } = await api[method](endpoint, variables);
      return data.data as TOutput;
    },
    onSuccess: (data) => {
      options?.invalidateKeys?.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      options?.onSuccess?.(data);
    },
  });
}
```

## QueryClient Setup

```typescript
// src/app/providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});
```

## Estados Obrigatórios por Tela

Toda tela com fetch deve tratar:

| Estado | Componente sugerido |
|--------|---------------------|
| Loading | Skeleton correspondente |
| Sucesso | Conteúdo real |
| Erro | Mensagem + botão retry |
| Vazio | Empty state com CTA |
| Timeout | Mensagem específica + retry |
| Offline | Detectar `navigator.onLine` |
| Stale | Indicador visual de cache expirado |

## Skeleton Component

```typescript
// src/components/ui/Skeleton.tsx
export function Skeleton({ className, variant = 'text', width, height, lines = 1 }: SkeletonProps) {
  if (variant === 'circular') return <div className={cn('animate-pulse bg-gray-200 rounded-full', className)} style={{ width, height }} />;
  if (variant === 'rectangular') return <div className={cn('animate-pulse bg-gray-200 rounded', className)} style={{ width: width || '100%', height }} />;
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn('animate-pulse bg-gray-200 rounded h-4', className)}
          style={{ width: i === lines - 1 ? '60%' : i % 2 === 0 ? '100%' : '80%' }} />
      ))}
    </div>
  );
}
```
