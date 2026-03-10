// ============================================================
// src/hooks/useInfiniteScroll.ts — Infinite scroll com React Query
// ============================================================
import { useRef, useCallback, useEffect } from 'react';
import { useInfiniteQuery, type UseInfiniteQueryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { PaginatedResponse } from '@/types/api';

interface UseInfiniteScrollOptions<T> {
  queryKey: readonly unknown[];
  url: string;
  perPage?: number;
  params?: Record<string, unknown>;
  enabled?: boolean;
}

export function useInfiniteScroll<T>({
  queryKey,
  url,
  perPage = 20,
  params = {},
  enabled = true,
}: UseInfiniteScrollOptions<T>) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const query = useInfiniteQuery({
    queryKey: [...queryKey, params],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get<PaginatedResponse<T>>(url, {
        params: { ...params, page: pageParam, perPage },
      });
      return data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled,
  });

  // Intersection Observer para trigger automático
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (query.isLoading || query.isFetchingNextPage) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && query.hasNextPage) {
            query.fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );

      if (node) observerRef.current.observe(node);
    },
    [query.isLoading, query.isFetchingNextPage, query.hasNextPage, query.fetchNextPage]
  );

  // Flat data de todas as páginas
  const allData = query.data?.pages.flatMap((page) => page.data) ?? [];
  const totalItems = query.data?.pages[0]?.meta.total ?? 0;

  return {
    data: allData,
    totalItems,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    lastElementRef, // Attach isso ao último elemento da lista
  };
}
