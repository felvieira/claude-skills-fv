// ============================================================
// src/hooks/useAuth.ts — Auth hook completo
// ============================================================
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';
import type { ApiResponse } from '@/types/api';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput extends LoginInput {
  name: string;
}

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; name: string; role: string };
}

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();

  // Login
  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/login', input);
      return data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      queryClient.clear();
      router.push('/dashboard');
    },
  });

  // Register
  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput) => {
      const { data } = await api.post<ApiResponse<AuthResponse>>('/auth/register', input);
      return data.data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      router.push('/dashboard');
    },
  });

  // Logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSettled: () => {
      clearAuth();
      queryClient.clear();
      router.push('/login');
    },
  });

  // Me query — valida token no mount
  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AuthResponse['user']>>('/auth/me');
      return data.data;
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user,
    isAuthenticated,
    isLoading: loginMutation.isPending || registerMutation.isPending,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error,
    register: registerMutation.mutateAsync,
    registerError: registerMutation.error,
    logout: logoutMutation.mutate,
    meQuery,
  };
}
