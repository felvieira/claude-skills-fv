# QA Testing Guide

> Guia auxiliar da skill `05-qa-testing`. Consultar apenas quando houver setup real de estrategia de testes, configuracao de ferramentas ou implementacao de fixtures.

---

## Indice

- [Stack e Setup](#stack-e-setup)
- [Vitest — Unitarios e Componentes](#vitest--unitarios-e-componentes)
- [MSW — Mocking de API](#msw--mocking-de-api)
- [Playwright — Testes E2E](#playwright--testes-e2e)
- [Fixtures Autenticadas](#fixtures-autenticadas)
- [Smoke Tests](#smoke-tests)
- [Checklist de QA antes de Aprovar](#checklist-de-qa-antes-de-aprovar)

---

## Stack e Setup

| Ferramenta | Uso |
|------------|-----|
| **Vitest** | Unitarios, hooks, stores, utils |
| **Testing Library** | Componentes React |
| **MSW** | Mock de endpoints HTTP |
| **Playwright** | E2E, fluxos, screenshots |
| **Playwright MCP** | Navegacao real, inspecao visual |

### Instalar dependencias

```bash
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event jsdom
npm install -D msw playwright @playwright/test
npx playwright install --with-deps
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
      exclude: [
        'node_modules/**',
        'src/tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

### src/tests/setup.ts

```typescript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Vitest — Unitarios e Componentes

### Testando um hook

```typescript
// src/hooks/__tests__/useCounter.test.ts
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('incrementa o contador', () => {
    const { result } = renderHook(() => useCounter(0));
    act(() => result.current.increment());
    expect(result.current.count).toBe(1);
  });

  it('nao ultrapassa o maximo', () => {
    const { result } = renderHook(() => useCounter(10, { max: 10 }));
    act(() => result.current.increment());
    expect(result.current.count).toBe(10);
  });
});
```

### Testando um componente

```tsx
// src/components/__tests__/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';

describe('LoginForm', () => {
  it('exibe erro quando email esta vazio', async () => {
    render(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));
    expect(await screen.findByText(/email obrigatorio/i)).toBeInTheDocument();
  });

  it('chama onSuccess com credenciais validas', async () => {
    const onSuccess = vi.fn();
    render(<LoginForm onSuccess={onSuccess} />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@empresa.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'senha123');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  });
});
```

### Testando uma store (Zustand)

```typescript
// src/stores/__tests__/authStore.test.ts
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from '../authStore';

beforeEach(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false });
});

describe('authStore', () => {
  it('seta o usuario apos login', () => {
    const { result } = renderHook(() => useAuthStore());
    act(() => {
      result.current.setUser({ id: '1', email: 'user@test.com', name: 'User' });
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('user@test.com');
  });
});
```

---

## MSW — Mocking de API

### src/tests/mocks/handlers.ts

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/v1/auth/login', () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'mock-access-token',
        user: { id: '1', email: 'user@test.com', name: 'User Test' },
      },
    });
  }),

  http.get('/api/v1/users/me', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return HttpResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });
    }
    return HttpResponse.json({
      success: true,
      data: { id: '1', email: 'user@test.com', name: 'User Test' },
    });
  }),

  http.get('/api/v1/projects', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: '1', name: 'Projeto Alpha', status: 'active' },
        { id: '2', name: 'Projeto Beta', status: 'archived' },
      ],
      meta: { total: 2, page: 1, perPage: 20 },
    });
  }),
];
```

### src/tests/mocks/server.ts

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Override de handler por teste

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

it('exibe erro quando login falha', async () => {
  server.use(
    http.post('/api/v1/auth/login', () => {
      return HttpResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email ou senha invalidos' } },
        { status: 401 }
      );
    })
  );
  // ... render e assertions
});
```

---

## Playwright — Testes E2E

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['line']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E — Fluxo de auth

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Autenticacao', () => {
  test('login com credenciais validas redireciona para dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('user@empresa.com');
    await page.getByLabel('Senha').fill('senha123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Bem-vindo')).toBeVisible();
  });

  test('credenciais invalidas exibem mensagem de erro', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('wrong@email.com');
    await page.getByLabel('Senha').fill('senhaerrada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByRole('alert')).toContainText('Email ou senha invalidos');
    await expect(page).toHaveURL('/login');
  });
});
```

---

## Fixtures Autenticadas

```typescript
// e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: { page: import('@playwright/test').Page };
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(process.env.E2E_USER_EMAIL!);
    await page.getByLabel('Senha').fill(process.env.E2E_USER_PASSWORD!);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('/dashboard');
    await use({ page });
  },
});

export { expect };
```

```typescript
// e2e/projects.spec.ts
import { test, expect } from './fixtures';

test('usuario autenticado ve lista de projetos', async ({ authenticatedPage: { page } }) => {
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Meus Projetos' })).toBeVisible();
  await expect(page.getByRole('list')).not.toBeEmpty();
});
```

---

## Smoke Tests

Smoke tests validam os caminhos criticos apos deploy. Devem ser rapidos (< 30s) e nao depender de estado.

```typescript
// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smoke — pos deploy', () => {
  test('pagina inicial carrega', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MeuApp/);
    await expect(page.getByRole('main')).toBeVisible();
  });

  test('pagina de login carrega', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('health check responde 200', async ({ request }) => {
    const resp = await request.get('/api/health');
    expect(resp.ok()).toBe(true);
    const body = await resp.json();
    expect(body.status).toBe('ok');
  });
});
```

---

## Checklist de QA antes de Aprovar

```
Testes
☐ Unitarios passando (npm run test)
☐ Cobertura >= 80% ou gap documentado
☐ Componentes criticos com testes de interacao
☐ E2E caminho feliz passando
☐ E2E fluxo de erro principal coberto
☐ Regressao conhecida coberta

Qualidade
☐ Sem testes flakey em CI
☐ Criterios de aceitacao do PO cobertos
☐ Mocks nao mascaram comportamentos reais
☐ Fixtures autonomas (nao dependem de ordem de execucao)

Entrega
☐ Evidencias de validacao registradas
☐ Gaps de cobertura classificados por impacto
☐ Handoff para Security claro
```
