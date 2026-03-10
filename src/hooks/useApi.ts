// ============================================================
// src/hooks/useApi.ts — Hooks DRY para React Query
// ============================================================
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { AxiosError } from 'axios';

type QueryKey = readonly unknown[];

// ── GET com paginação ──
export function usePaginatedQuery<T>(
  queryKey: QueryKey,
  url: string,
  params?: Record<string, unknown>,
  options?: Omit<UseQueryOptions<PaginatedResponse<T>, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<PaginatedResponse<T>, AxiosError>({
    queryKey: [...queryKey, params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<T>>(url, { params });
      return data;
    },
    placeholderData: (prev) => prev,
    ...options,
  });
}

// ── GET detalhe ──
export function useDetailQuery<T>(
  queryKey: QueryKey,
  url: string,
  options?: Omit<UseQueryOptions<T, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, AxiosError>({
    queryKey,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<T>>(url);
      return data.data;
    },
    ...options,
  });
}

// ── Mutation genérica DRY ──
interface ApiMutationOptions<TInput, TOutput> {
  invalidateKeys?: QueryKey[];
  onSuccessCallback?: (data: TOutput) => void;
  optimistic?: {
    queryKey: QueryKey;
    updater: (old: any, variables: TInput) => any;
  };
}

export function useApiMutation<TInput = void, TOutput = unknown>(
  method: 'post' | 'patch' | 'put' | 'delete',
  url: string | ((variables: TInput) => string),
  options?: ApiMutationOptions<TInput, TOutput>
) {
  const queryClient = useQueryClient();

  return useMutation<TOutput, AxiosError, TInput, { previous?: unknown }>({
    mutationFn: async (variables: TInput) => {
      const endpoint = typeof url === 'function' ? url(variables) : url;
      const { data } =
        method === 'delete'
          ? await api.delete<ApiResponse<TOutput>>(endpoint)
          : await api[method]<ApiResponse<TOutput>>(endpoint, variables);
      return data.data;
    },

    onMutate: options?.optimistic
      ? async (variables) => {
          await queryClient.cancelQueries({ queryKey: options.optimistic!.queryKey });
          const previous = queryClient.getQueryData(options.optimistic!.queryKey);
          queryClient.setQueryData(options.optimistic!.queryKey, (old: any) =>
            options.optimistic!.updater(old, variables)
          );
          return { previous };
        }
      : undefined,

    onError: options?.optimistic
      ? (_err, _vars, context) => {
          if (context?.previous) {
            queryClient.setQueryData(options.optimistic!.queryKey, context.previous);
          }
        }
      : undefined,

    onSuccess: (data) => {
      options?.invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      options?.onSuccessCallback?.(data);
    },
  });
}

// ── Hooks específicos por operação (DRY wrappers) ──

export function useCreateMutation<TInput, TOutput = unknown>(
  url: string,
  options?: ApiMutationOptions<TInput, TOutput>
) {
  return useApiMutation<TInput, TOutput>('post', url, options);
}

export function useUpdateMutation<TInput, TOutput = unknown>(
  url: string | ((variables: TInput) => string),
  options?: ApiMutationOptions<TInput, TOutput>
) {
  return useApiMutation<TInput, TOutput>('patch', url, options);
}

export function useDeleteMutation<TOutput = unknown>(
  url: string | ((id: string) => string),
  options?: ApiMutationOptions<string, TOutput>
) {
  return useApiMutation<string, TOutput>('delete', url as any, options);
}
