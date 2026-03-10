// ============================================================
// src/hooks/usePagination.ts — Paginação com React Query
// ============================================================
import { useState, useCallback, useMemo } from 'react';
import { usePaginatedQuery } from './useApi';

interface UsePaginationOptions<T> {
  queryKey: readonly unknown[];
  url: string;
  perPage?: number;
  initialPage?: number;
  params?: Record<string, unknown>;
}

export function usePagination<T>({
  queryKey,
  url,
  perPage = 20,
  initialPage = 1,
  params = {},
}: UsePaginationOptions<T>) {
  const [page, setPage] = useState(initialPage);

  const allParams = useMemo(
    () => ({ ...params, page, perPage }),
    [params, page, perPage]
  );

  const query = usePaginatedQuery<T>(queryKey, url, allParams);

  const meta = query.data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  // Gera array de páginas pra renderizar
  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);
    if (page > 3) pages.push('...');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);

    return pages;
  }, [page, totalPages]);

  return {
    ...query,
    page,
    perPage,
    totalPages,
    total: meta?.total ?? 0,
    pageNumbers,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
