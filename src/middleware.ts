// ============================================================
// src/middleware.ts — Next.js middleware para auth redirect
// ============================================================
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas que NÃO precisam de autenticação
const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

// Rotas que só não-autenticados podem acessar
const authRoutes = ['/login', '/register'];

// Rotas de API que não precisam de auth
const publicApiRoutes = ['/api/health', '/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignora assets estáticos e API routes públicas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    publicApiRoutes.some((r) => pathname.startsWith(r))
  ) {
    return NextResponse.next();
  }

  // Checa se tem token (via cookie de session ou header)
  // Em produção, validar JWT server-side aqui
  const hasSession = request.cookies.has('refresh-token');

  // Rota pública: permite acesso
  if (publicRoutes.some((r) => pathname.startsWith(r))) {
    // Se já autenticado, redireciona pra dashboard
    if (hasSession && authRoutes.some((r) => pathname.startsWith(r))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // Rota protegida sem sessão: redireciona pra login
  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Security headers em todas as respostas
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
