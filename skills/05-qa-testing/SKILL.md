---
name: qa-testing
description: |
  Skill do QA Engineer para testes unitários, integração e E2E. Use quando precisar escrever testes,
  configurar test runners, testes com Playwright, testes de componentes React, cobertura de código,
  ou qualquer atividade de quality assurance. Trigger em: "teste", "test", "QA", "Playwright", "Vitest",
  "Jest", "E2E", "end-to-end", "unitário", "cobertura", "coverage", "mock", "fixture", "CI test",
  "teste de regressão", "teste de integração", "testing library".
---

# QA Engineer - Testes Unitários e E2E

O QA garante que tudo funciona como esperado antes de chegar em produção.

## Responsabilidades

1. Escrever testes unitários para hooks, stores e utils
2. Escrever testes de componente com Testing Library
3. Escrever testes E2E com Playwright
4. Manter cobertura de código acima de 80%
5. Testes de regressão em features existentes
6. Validar critérios de aceitação do PO via testes

## Stack de Testes

```
Unitário/Componente:  Vitest + React Testing Library
E2E:                  Playwright
Mocks:                MSW (Mock Service Worker)
Coverage:             Vitest c8/istanbul
CI:                   GitHub Actions / pipeline do time
```

## Estrutura de Testes

```
src/
├── __tests__/              # Testes unitários colocados junto ou aqui
├── hooks/
│   ├── useDebounce.ts
│   └── useDebounce.test.ts  # Teste junto do arquivo
├── stores/
│   ├── authStore.ts
│   └── authStore.test.ts
tests/
├── e2e/                    # Testes E2E Playwright
│   ├── auth.spec.ts
│   ├── users.spec.ts
│   └── fixtures/
│       ├── auth.fixture.ts
│       └── users.fixture.ts
├── mocks/
│   ├── handlers.ts         # MSW handlers
│   ├── server.ts           # MSW server setup
│   └── data/               # Dados mock
│       ├── users.ts
│       └── posts.ts
└── setup.ts                # Global test setup
```

## Configuração Vitest

**vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts', '**/*.config.*'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

**tests/setup.ts**

```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

## MSW - Mock de API

**tests/mocks/handlers.ts**

```typescript
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3001/api/v1';

export const handlers = [
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@test.com' && body.password === 'Test@123') {
      return HttpResponse.json({
        success: true,
        data: {
          accessToken: 'mock-access-token',
          user: { id: '1', email: 'test@test.com', name: 'Test User', role: 'USER' },
        },
      });
    }
    return HttpResponse.json(
      { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Credenciais inválidas' } },
      { status: 401 }
    );
  }),

  http.get(`${API_URL}/users`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);

    return HttpResponse.json({
      success: true,
      data: mockUsers.slice((page - 1) * 20, page * 20),
      meta: { page, perPage: 20, total: mockUsers.length, totalPages: Math.ceil(mockUsers.length / 20) },
    });
  }),

  http.get(`${API_URL}/users/:id`, ({ params }) => {
    const user = mockUsers.find((u) => u.id === params.id);
    if (!user) return HttpResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    return HttpResponse.json({ success: true, data: user });
  }),
];
```

**tests/mocks/server.ts**

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

## Testes Unitários - Patterns

### Testando Hooks

**src/hooks/useDebounce.test.ts**

```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('retorna valor inicial imediatamente', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('debounce o valor após o delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'hello', delay: 300 } }
    );

    rerender({ value: 'world', delay: 300 });
    expect(result.current).toBe('hello');

    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe('world');
  });

  it('cancela debounce anterior quando valor muda', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'ab' });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: 'abc' });
    act(() => vi.advanceTimersByTime(300));

    expect(result.current).toBe('abc');
  });
});
```

### Testando Zustand Stores

**src/stores/authStore.test.ts**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  });
  
  it('setAuth atualiza user e token', () => {
    const user = { id: '1', email: 'a@b.com', name: 'Test', role: 'USER' };
    useAuthStore.getState().setAuth(user, 'token-123');
    
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('token-123');
    expect(state.isAuthenticated).toBe(true);
  });
  
  it('clearAuth limpa tudo', () => {
    useAuthStore.getState().setAuth({ id: '1', email: 'a@b.com', name: 'Test', role: 'USER' }, 'tk');
    useAuthStore.getState().clearAuth();
    
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
```

### Testando Componentes com React Testing Library

**src/components/features/UserCard.test.tsx**

```typescript
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { UserCard } from './UserCard';

const mockUser = {
  id: '1',
  name: 'Felipe Vieira',
  email: 'felipe@test.com',
  role: 'ADMIN',
};

describe('UserCard', () => {
  it('renderiza informações do usuário', () => {
    render(<UserCard user={mockUser} />);
    
    expect(screen.getByText('Felipe Vieira')).toBeInTheDocument();
    expect(screen.getByText('felipe@test.com')).toBeInTheDocument();
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });
  
  it('chama onEdit ao clicar no botão editar', async () => {
    const onEdit = vi.fn();
    render(<UserCard user={mockUser} onEdit={onEdit} />);
    
    await userEvent.click(screen.getByRole('button', { name: /editar/i }));
    expect(onEdit).toHaveBeenCalledWith('1');
  });
  
  it('mostra skeleton quando loading', () => {
    render(<UserCard isLoading />);
    
    expect(screen.queryByText('Felipe Vieira')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
```

## Testes E2E - Playwright

### Configuração

**playwright.config.ts**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Fixtures DRY

**tests/e2e/fixtures/auth.fixture.ts**

```typescript
import { test as base, expect } from '@playwright/test';

type AuthFixture = {
  authenticatedPage: ReturnType<typeof base['page']>;
};

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    const response = await page.request.post('/api/v1/auth/login', {
      data: { email: 'test@test.com', password: 'Test@123' },
    });
    const { data } = await response.json();

    await page.evaluate((token) => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: { accessToken: token, isAuthenticated: true },
      }));
    }, data.accessToken);

    await page.goto('/');
    await use(page);
  },
});

export { expect };
```

### Testes E2E

**tests/e2e/auth.spec.ts**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Autenticação', () => {
  test('login com credenciais válidas', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('test@test.com');
    await page.getByLabel('Senha').fill('Test@123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Bem-vindo')).toBeVisible();
  });

  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('wrong@test.com');
    await page.getByLabel('Senha').fill('wrong');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('Credenciais inválidas')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('redireciona para login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
```

**tests/e2e/users.spec.ts**

```typescript
import { test, expect } from './fixtures/auth.fixture';

test.describe('Listagem de Usuários', () => {
  test('mostra skeleton enquanto carrega', async ({ authenticatedPage: page }) => {
    await page.goto('/users');

    await expect(page.locator('.animate-pulse').first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Usuários' })).toBeVisible();

    await expect(page.locator('.animate-pulse')).toHaveCount(0);
  });

  test('busca filtra resultados', async ({ authenticatedPage: page }) => {
    await page.goto('/users');
    await page.getByPlaceholder('Buscar usuários...').fill('Felipe');

    await page.waitForResponse((resp) => resp.url().includes('search=Felipe'));

    const cards = page.locator('[data-testid="user-card"]');
    await expect(cards).toHaveCount(1);
  });

  test('paginação funciona', async ({ authenticatedPage: page }) => {
    await page.goto('/users');

    await page.getByRole('button', { name: 'Próxima' }).click();
    await expect(page).toHaveURL(/page=2/);
  });

  test('responsivo: cards em coluna no mobile', async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/users');

    const grid = page.locator('[data-testid="users-grid"]');
    await expect(grid).toHaveCSS('grid-template-columns', /^(?!.*\d+px \d+px)/);
  });
});
```

## Smoke Tests — Pós-Deploy

Template com verificações críticas para rodar após cada deploy:

```
[ ] App carrega sem erro (HTTP 200 na rota principal)
[ ] Login funciona (credencial de teste)
[ ] Listagem principal retorna dados
[ ] Criar item funciona
[ ] Busca retorna resultados
[ ] Paginação funciona
[ ] Logout funciona
[ ] Rotas protegidas redirecionam sem auth
```

## Regression Tests — Para Bugfixes

Checklist obrigatório para correção de bugs:

- Escrever teste que reproduz o bug ANTES de corrigir
- Corrigir o bug
- Verificar que o teste passa
- Rodar suite completa pra garantir que nada quebrou
- Verificar features adjacentes manualmente

## Performance Baseline

Registrar métricas antes de mudanças grandes:

- **Lighthouse score:** Performance, Accessibility, Best Practices, SEO
- **Bundle size:** main.js, vendor.js
- **API response times:** p50, p95, p99 dos endpoints críticos
- **Time to Interactive (TTI)**

Após a mudança:

- Comparar métricas com o baseline registrado
- Rejeitar se degradação > 10% sem justificativa documentada

## Checklist de QA antes de aprovar

- [ ] Testes unitários passando (hooks, stores, utils)
- [ ] Testes de componente passando (renderização, interação, estados)
- [ ] Testes E2E passando (happy path, error cases, edge cases)
- [ ] Cobertura >= 80%
- [ ] Testes rodam em CI sem flakiness
- [ ] Testes mobile (viewport 375px e 768px)
- [ ] Testes de acessibilidade (tab navigation, screen reader)
- [ ] Critérios de aceitação do PO cobertos por testes
- [ ] Nenhum console.error/warning nos testes
- [ ] Performance: nenhum teste leva mais de 30s (E2E) ou 5s (unitário)

## Handoff para Security Review

Entregar:
1. Report de cobertura de testes
2. Lista de testes E2E com cenários cobertos
3. Resultado do CI (todos green)
4. Notas sobre edge cases encontrados

## Código Limpo

Todo código gerado DEVE ser livre de comentários.
Nomes descritivos substituem comentários. Código auto-explicativo.

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
