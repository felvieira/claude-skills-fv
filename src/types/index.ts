// ============================================================
// src/types/api.ts — Tipos compartilhados da API
// ============================================================

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ============================================================
// src/types/user.ts
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN' | 'MODERATOR';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  role?: User['role'];
  isActive?: boolean;
}

// ============================================================
// src/types/auth.ts
// ============================================================

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Session {
  id: string;
  userId: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: string;
  createdAt: string;
}
