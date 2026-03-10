---
name: frontend-integration
description: |
  Skill do Frontend Developer para implementação com React/Next.js, Zustand, React Query, e Skeleton loading.
  Use quando precisar implementar componentes, páginas, integração com API, gerenciamento de estado, ou
  qualquer código frontend. Trigger em: "React", "Next.js", "componente", "página", "Zustand", "React Query",
  "TanStack Query", "skeleton", "loading", "hook", "frontend", "integração", "responsivo", "Tailwind",
  "formulário", "roteamento".
---

# Frontend Developer - React/Next.js + Zustand + React Query

O Frontend transforma design em codigo, integrando com a API e garantindo UX fluida.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`, `policies/tool-safety.md` e `policies/evals.md`.

Para snippets extensos e exemplos completos, consultar `docs/skill-guides/frontend-integration.md` apenas quando a tarefa exigir.

Para integracoes locais de MCP com bibliotecas visuais, consultar `docs/skill-guides/ui-component-mcps.md`.

Quando a tarefa exigir navegacao real, screenshots ou verificacao visual do app rodando, esta skill pode configurar ou reutilizar `Playwright MCP` localmente.

## Quando Usar

- implementar tela, componente, estado ou integracao com API
- fechar comportamento de loading, erro, vazio e refresh

## Quando Nao Usar

- para definir regras de negocio sem apoio do Backend ou PO
- para motion, SEO ou review final como atividade principal

## Entradas Esperadas

- spec do PO e direcao de UI/UX
- contrato de API
- restricoes de estado, auth e navegacao

## Saidas Esperadas

- interface funcional integrada
- estados de UX tratados
- handoff claro para QA

Para auth, o access token fica apenas em memoria. Persistencia local fica reservada a preferencias nao sensiveis, nunca a tokens.

## Responsabilidades

1. Implementar interfaces conforme spec do UI/UX
2. Integrar com APIs usando React Query
3. Gerenciar estado global com Zustand
4. Implementar skeleton loading em toda tela com fetch
5. Garantir responsividade mobile-first
6. Código limpo, DRY, e tipado

## Stack e Estrutura

Stack de referencia:

- React ou Next.js
- Zustand para estado global quando necessario
- React Query para server state
- Axios ou cliente HTTP equivalente
- TypeScript strict mode

Para estrutura de pastas e exemplos completos de store, auth e API client, consultar `docs/skill-guides/frontend-integration.md`.

## Padroes Principais

- estado global pequeno e focado em UI ou sessao
- `accessToken` apenas em memoria
- server state separado do estado local
- estados de loading, erro, vazio e retry definidos por tela

## MCPs de Componentes

Esta skill pode instalar ou configurar localmente MCPs de bibliotecas como `Magic UI MCP` e `React Bits MCP` quando isso acelerar a implementacao e o projeto nao tiver equivalente melhor.

Regras:

- verificar se o MCP ja existe antes de configurar outro
- adaptar componentes ao design system do app
- nao introduzir visual ou motion que destoem do produto
- registrar a instalacao/configuracao local no handoff quando houver mudanca no workspace

## MCP de Browser

Para validacao visual real, esta skill pode usar `Playwright MCP` para:

- abrir o app localmente
- navegar por telas e fluxos
- verificar comportamento responsivo
- capturar screenshots para confirmar detalhes de UI

Usar especialmente quando a mudanca visual nao puder ser validada com confianca apenas por leitura de codigo.

Para exemplos completos de store, authStore, uiStore e api client, consultar `docs/skill-guides/frontend-integration.md`.

## React Query - Padrão de Hooks

**src/lib/query-keys.ts**

```typescript
export const queryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (params: Record<string, unknown>) => [...queryKeys.users.lists(), params] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (params: Record<string, unknown>) => [...queryKeys.posts.lists(), params] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
  },
} as const;
```

**src/hooks/useApi.ts**

```typescript
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api';

export function usePaginatedQuery<T>(
  queryKey: readonly unknown[],
  url: string,
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<T>>(url, { params });
      return data;
    },
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useDetailQuery<T>(
  queryKey: readonly unknown[],
  url: string,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<T>>(url);
      return data.data;
    },
    ...options,
  });
}

export function useApiMutation<TInput, TOutput = unknown>(
  method: 'post' | 'patch' | 'delete',
  url: string | ((variables: TInput) => string),
  options?: {
    invalidateKeys?: readonly unknown[][];
    onSuccess?: (data: TOutput) => void;
    optimistic?: {
      queryKey: readonly unknown[];
      updater: (old: any, variables: TInput) => any;
    };
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: TInput) => {
      const endpoint = typeof url === 'function' ? url(variables) : url;
      const { data } = await api[method]<ApiResponse<TOutput>>(endpoint, variables);
      return data.data;
    },

    onMutate: options?.optimistic
      ? async (variables) => {
          await queryClient.cancelQueries({ queryKey: options.optimistic!.queryKey });
          const previous = queryClient.getQueryData(options.optimistic!.queryKey);
          queryClient.setQueryData(
            options.optimistic!.queryKey,
            (old: any) => options.optimistic!.updater(old, variables)
          );
          return { previous };
        }
      : undefined,

    onError: options?.optimistic
      ? (err, variables, context: any) => {
          queryClient.setQueryData(options.optimistic!.queryKey, context?.previous);
        }
      : undefined,

    onSuccess: (data) => {
      options?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      options?.onSuccess?.(data);
    },
  });
}
```

## Skeleton Loading - Implementação

**src/components/ui/Skeleton.tsx**

```typescript
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export function Skeleton({ className, variant = 'text', width, height, lines = 1 }: SkeletonProps) {
  const baseClass = 'animate-pulse bg-gray-200 rounded';

  if (variant === 'circular') {
    return (
      <div
        className={cn(baseClass, 'rounded-full', className)}
        style={{ width: width || 40, height: height || 40 }}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={cn(baseClass, className)}
        style={{ width: width || '100%', height: height || 200 }}
      />
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(baseClass, 'h-4', className)}
          style={{
            width: i === lines - 1 ? '60%' : i % 2 === 0 ? '100%' : '80%',
          }}
        />
      ))}
    </div>
  );
}

export function withSkeleton<T>(
  Component: React.ComponentType<T>,
  SkeletonComponent: React.ComponentType
) {
  return function SkeletonWrapper({ isLoading, ...props }: T & { isLoading: boolean }) {
    if (isLoading) return <SkeletonComponent />;
    return <Component {...(props as T)} />;
  };
}
```

**src/components/skeletons/UserListSkeleton.tsx**

```typescript
import { Skeleton } from '@/components/ui/Skeleton';

export function UserListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton variant="circular" width={48} height={48} />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" variant="rectangular" />
        </div>
      ))}
    </div>
  );
}
```

## API Client - Axios com Interceptors

**src/lib/api-client.ts**

```typescript
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const csrfToken = getCookie('csrf-token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: Function; reject: Function }> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
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
        
        const { accessToken, user } = data.data;
        useAuthStore.getState().setAuth(user, accessToken);
        
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : null;
}
```

## Providers Setup

**src/app/providers.tsx**

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

## Exemplo Completo - Listagem com Skeleton

**src/app/(dashboard)/users/page.tsx**

```typescript
'use client';

import { useState } from 'react';
import { usePaginatedQuery } from '@/hooks/useApi';
import { queryKeys } from '@/lib/query-keys';
import { UserListSkeleton } from '@/components/skeletons/UserListSkeleton';
import { UserCard } from '@/components/features/UserCard';
import { Pagination } from '@/components/ui/Pagination';
import { SearchInput } from '@/components/ui/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';
import type { User } from '@/types/user';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  
  const params = { page, perPage: 20, search: debouncedSearch };
  
  const { data, isLoading, isError, error } = usePaginatedQuery<User>(
    queryKeys.users.list(params),
    '/api/v1/users',
    params
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold">Usuários</h1>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar usuários..."
        />
      </div>
      
      {isLoading ? (
        <UserListSkeleton count={5} />
      ) : isError ? (
        <ErrorState message={error.message} onRetry={() => {}} />
      ) : data?.data.length === 0 ? (
        <EmptyState message="Nenhum usuário encontrado" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.data.map((user) => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
          {data?.meta && (
            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
```

### Error States Robustos

Toda tela que faz fetch DEVE ter estes estados:
- Loading (skeleton)
- Sucesso (dados)
- Erro (mensagem + botao retry)
- Vazio (empty state com acao)
- Timeout (mensagem especifica + retry)
- Offline (detectar navigator.onLine)
- Dados stale (indicador visual quando cache expirou)

Retry pattern no useApi:
```typescript
const RETRY_CONFIG = {
  retries: 3,
  retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 10000),
};
```

## Evidencia de Conclusao

- interface implementada conforme fluxo esperado
- loading, erro, vazio e auth tratados
- pontos criticos para QA e Motion destacados

## Handoff para QA

Entregar:
1. App rodando em ambiente de staging
2. Lista de features implementadas com rotas
3. Componentes interativos documentados (Storybook se houver)
4. Variáveis de ambiente documentadas
5. Como rodar localmente (README)

## Código Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
