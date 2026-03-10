// ============================================================
// src/hooks/index.ts — Barrel export de todos os hooks
// ============================================================

// API & Data
export { usePaginatedQuery, useDetailQuery, useApiMutation, useCreateMutation, useUpdateMutation, useDeleteMutation } from './useApi';
export { useInfiniteScroll } from './useInfiniteScroll';
export { usePagination } from './usePagination';

// Auth
export { useAuth } from './useAuth';

// Forms
export { useForm } from './useForm';

// UI & Interaction
export { useDebounce, useDebouncedCallback } from './useDebounce';
export { useMediaQuery, useBreakpoint } from './useMediaQuery';

// Utilities (estes estão no mesmo arquivo, em produção separar)
// export { useClickOutside } from './useClickOutside';
// export { useKeyboard } from './useKeyboard';
// export { useToggle } from './useToggle';
// export { useCopyToClipboard } from './useCopyToClipboard';
// export { useDocumentTitle } from './useDocumentTitle';
