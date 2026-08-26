# Playwright — Padroes de Arquitetura, Flaky Tests, Sharding e Mock de OAuth

Referencia de apoio para a skill 05 (QA Engineer). Cobre decisoes que o playbook principal nao aprofunda: como organizar codigo reutilizavel de teste, como investigar e corrigir teste flaky, como paralelizar em CI, e como mockar OAuth/SSO em teste E2E sem depender do provider real.

## Page Object Model vs Fixtures vs Helper

Nao e "escolha um padrao" — a maioria dos projetos usa os tres juntos, cada um pra um tipo de reuso:

| Camada | Serve pra | Ciclo de vida | Quando promover pra ela |
|---|---|---|---|
| **Helper function** | Utilitario sem estado (gerar email, formatar preco, montar URL) | Nenhum | Ponto de partida padrao quando em duvida |
| **Page Object** | Interacao de UI com 5+ acoes reutilizadas em 3+ arquivos de teste | Manual (metodos da classe) | Quando a pagina/componente acumula interacoes reusadas |
| **Fixture (`test.extend`)** | Recurso com setup **e** teardown garantido (usuario de teste, conexao de banco, client de API, auth state) | Automatico via `use()` — teardown roda mesmo se o teste falhar | Sempre que existir ciclo de vida (criar/destruir) |

Se só puder adotar um padrão, comece por **fixtures** — o Playwright é desenhado em torno delas, compõem bem (uma depende da outra) e resolvem teardown garantido, que é a causa mais comum de state leak entre testes.

Regra prática de decisão: página/componente com interação → cresce pra Page Object quando passa de 5 interações reusadas; recurso com criar/destruir → sempre Fixture, nunca Page Object (Page Object não deve fazer chamada de API ou gerenciar banco — isso pertence à fixture, que garante cleanup mesmo em falha); lógica pura sem navegador → Helper function.

Anti-padrões a evitar: Page Object que só expõe locators sem métodos de intenção (`login()`, `reserve()`) — se não tem método, não precisa de classe; fixture monolítica fazendo setup de usuário + seed de produtos + pagamento tudo junto — quebrar em fixtures pequenas e compostas; helper com estado em variável de módulo (`let createdUserId`) — vaza entre testes paralelos, se precisa de cleanup vira fixture.

## Debugando Teste Flaky

Antes de tentar corrigir, categorize — o fix certo depende da categoria:

| Categoria | Sintoma | Causa comum |
|---|---|---|
| **UI-driven** | Elemento nao encontrado, clique nao surtiu efeito | Falta wait, animacao em curso, render assincrono |
| **Timing/race condition** | Falha intermitente mesmo local, sem padrao claro | Teste corre na frente da aplicacao — sleep fixo em vez de esperar condicao |
| **Data/paralelismo** | So falha com 2+ workers | Dados compartilhados entre workers, mesma conta reusada, colisao de estado |
| **State leak entre testes** | So falha quando roda junto com outro teste especifico, nao isolado | Fixture sem teardown, variavel de modulo compartilhada, ordem de execucao importa |
| **Ambiente/CI-only** | Passa local, falha so em CI | CPU mais lenta, cold start de browser, timeout curto demais pro ambiente |

Fluxo de investigacao: primeiro reproduza de forma confiavel (`npx playwright test arquivo.spec.ts --repeat-each=20`), depois isole paralelismo (`--workers=1` — se some, e data/parallelism-driven), depois cheque se falha so acompanhado de outros testes (state leak) ou so em CI (`CI=true npx playwright test --repeat-each=10`). Habilite `trace: 'on-first-retry'` no config pra ter evidencia de qualquer falha intermitente sem custo em runs verdes.

**Erro classico de race condition** — `waitForTimeout` fixo espera um tempo arbitrario e torce pra aplicacao ja ter respondido; o fix e esperar a condicao real (resposta de rede especifica ou assertion com auto-wait), nunca aumentar o timeout global como band-aid — isso so mascara a causa e deixa a suite inteira mais lenta.

**Erro classico de state leak** — `page` ou dado criado em `beforeAll` e reusado entre testes (`let sharedPage`) quebra o isolamento padrao do Playwright (cada teste ja ganha context/page fresco); a correcao e usar o `page` injetado por teste e mover qualquer recurso com ciclo de vida pra fixture com `use()`, que garante teardown mesmo em falha.

Auth state merece atencao especial em paralelismo: `storageState` fixo e global (`.auth/user.json`) compartilhado entre workers colide quando os testes mutam a mesma conta — usar fixture `scope: 'worker'` que gera um arquivo de storage state por `workerInfo.workerIndex`.

Depois de identificar e corrigir, faça burn-in antes de confiar no fix: `npx playwright test arquivo.spec.ts --repeat-each=50 --workers=4` — se passar consistente sob paralelismo real, a causa foi mesmo endereçada.

**Anti-padrao a nunca aplicar:** aumentar retries pra "resolver" flakiness. Retry esconde problema sistemico; serve so pra diagnostico, nao pra producao. Se um teste so passa na segunda tentativa, ele esta reportando um bug real de timing — trate como tal.

## Sharding Paralelo em CI

Duas dimensões de paralelismo, não confundir: **workers** (processos concorrentes numa única máquina) e **shards** (divisão do conjunto de testes entre múltiplos jobs de CI).

```bash
# Workers — dentro de uma maquina
npx playwright test --workers=4
npx playwright test --workers=50%

# Sharding — entre jobs de CI
npx playwright test --shard=1/4   # job 1 de 4
npx playwright test --shard=4/4   # job 4 de 4

# Merge dos reports depois que os shards terminam
npx playwright merge-reports --reporter=html ./all-blob-reports
```

Regra prática: comece aumentando `workers` (com `fullyParallel: true` no config, testes dentro do mesmo arquivo também correm em paralelo, não só arquivos diferentes entre si). Só migre pra `--shard` quando a suíte ultrapassar ~5 minutos mesmo no teto de workers da máquina — sharding distribui entre runners de CI diferentes, workers não resolve isso sozinho.

Quando shardar, o job de merge precisa rodar depois de todos os shards terminarem (`needs: test` no GitHub Actions) e baixar todos os blob reports antes de consolidar em HTML — sem isso o report final fica incompleto silenciosamente.

## Mock de OAuth/SSO em Teste E2E

Nunca dependa do provider real (Google, GitHub, SAML) rodando em CI — é lento, instável e às vezes bloqueia por detecção de bot. O padrão é interceptar as duas pontas do fluxo: o callback de redirect e o endpoint de verificação/sessão.

```typescript
// Mock do callback OAuth (troca "codigo" por sessao)
await page.route('**/auth/google/callback**', (route) => {
  route.fulfill({
    status: 302,
    headers: { Location: '/dashboard?token=mock-jwt-token' },
  });
});

// Mock do endpoint que valida a sessao/usuario apos o callback
await page.route('**/api/auth/verify', (route) =>
  route.fulfill({
    json: { valid: true, user: { id: '123', email: 'test@gmail.com', name: 'Test User' } },
  })
);
```

Pra reuso entre specs, envolva isso numa fixture parametrizada por provider (`mockOAuth('github', user)`) que registra as rotas de callback, sessão e perfil de uma vez — evita duplicar os três `page.route` em cada teste que precisa de login.

SAML/SSO segue o mesmo princípio: mockar o Assertion Consumer Service (`**/saml/acs`) devolvendo redirect + cookie de sessão, e mockar o endpoint de validação de sessão subsequente. O ponto central em qualquer mock de auth federada: você não está testando o provider terceiro, está testando que a aplicação reage certo a uma sessão autenticada — então mock no nível de fronteira (callback + sessão), não tente simular o fluxo interno do provider.

## Service Worker / PWA — nota rapida

Teste de service worker frequentemente colide com cache do worker anterior entre execuções. Registrar limpeza explícita do service worker (`navigator.serviceWorker.getRegistrations()` + `unregister()`) num hook `beforeEach`/`afterEach` evita que um teste herde estado de cache do teste anterior — outra fonte comum de flakiness classificada como "state leak" na tabela acima, mas específica o suficiente pra listar à parte.

## Fontes

Adaptado de [currents-dev/playwright-best-practices-skill](https://github.com/currents-dev/playwright-best-practices-skill) (MIT), arquivos `architecture/pom-vs-fixtures.md`, `debugging/flaky-tests.md`, `infrastructure-ci-cd/parallel-sharding.md` e `advanced/third-party.md`.
