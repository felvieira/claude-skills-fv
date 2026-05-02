# Detective Spec — Guia Estendido

Anexos longos para `skills/33-detective-spec/SKILL.md`. Carregar sob demanda apenas quando precisar de exemplos completos, templates ou heuristicas avancadas.

## Sumario

- [Quando usar Detective Spec vs alternativas](#quando-usar-detective-spec-vs-alternativas)
- [Templates completos por fase](#templates-completos-por-fase)
- [Heuristicas avancadas por linguagem](#heuristicas-avancadas-por-linguagem)
- [Casos de uso reais](#casos-de-uso-reais)
- [Anti-padroes recorrentes](#anti-padroes-recorrentes)

---

## Quando usar Detective Spec vs alternativas

| Situacao | Use |
|---|---|
| Codebase nova, vc escreve a spec | `/spec` |
| Codebase legada, sem doc, sem teste | **`/detective-spec`** |
| Codebase legada, com doc desatualizada | `/detective-spec` (compara doc vs codigo) |
| Bug pontual em modulo conhecido | debugger subagent |
| Refatoracao de modulo conhecido | `/simplify` apos `/detective-spec --module=X` |
| So quer mapa estrutural | `/audit-repo` |
| Onboarding em codebase grande | `/detective-spec` (foco em fluxos criticos) |
| Migracao para nova stack | `/detective-spec` antes, `/spec` depois |

---

## Templates completos por fase

### Fase 1 — `_detective_sdd/00-overview.md` (versao inicial)

```markdown
# Sistema: <nome inferido>

**Status:** Em investigacao (Fase 1 de 5)
**Data inicio:** YYYY-MM-DD

## Sinais primarios (do reconhecimento)

- **Linguagem:** TypeScript 5.x (estrito), Node 20
- **Framework HTTP:** Express 4.x
- **ORM:** Prisma 5
- **DB:** PostgreSQL 15
- **Auth:** JWT (header Authorization: Bearer)
- **Build:** tsc + esbuild
- **Tests:** vitest

## Estrutura de modulos detectada

```
src/
├── routes/      ← 12 rotas HTTP (entry points)
├── services/    ← 8 services (logica de dominio)
├── middleware/  ← 4 middlewares (auth, logging, validation, error)
├── models/      ← 6 prisma models
├── utils/       ← helpers diversos (suspeito de virar dump)
└── jobs/        ← 3 cron jobs
```

## Pontos de entrada identificados

- HTTP: src/routes/*.ts (12 rotas)
- CLI: package.json scripts (migrate, seed, cleanup)
- Cron: src/jobs/*.ts (3 jobs)
- Webhooks: src/routes/webhooks/*.ts (2 endpoints)

## Plano de investigacao priorizado (em `.detective/plan.md`)

1. src/services/orderService.ts (god module — 47 consumidores)
2. src/services/authService.ts (critico, sem teste)
3. src/services/billingService.ts (regras complexas, comentarios densos)
4. ...

## Riscos detectados na fase 1

- 3 modulos sem nenhum teste cobrindo
- 8 TODOs com mais de 1 ano (git blame)
- 2 funcoes exportadas sem consumidor encontrado
```

### Fase 2 — Modulo de exemplo

```markdown
# Modulo: orderService

**Path:** src/services/orderService.ts
**Confidence:** medium

## Responsabilidade

Orquestra criacao, atualizacao e cancelamento de pedidos.
Aplica regras de desconto, validacao de estoque e disparo de eventos.

## API Publica

- `createOrder(userId: string, items: Item[]): Promise<Order>` — cria pedido [evidence: src/services/orderService.ts:45]
- `updateOrder(id: string, patch: Partial<Order>): Promise<Order>` — atualiza pedido [evidence: src/services/orderService.ts:120]
- `cancelOrder(id: string, reason: string): Promise<void>` — cancela [evidence: src/services/orderService.ts:180]
- `applyDiscount(order: Order, code: string): Promise<Order>` — aplica cupom [evidence: src/services/orderService.ts:230]

## Dependencias

- internas: `inventoryService`, `userService`, `eventBus`, `priceCalculator`
- externas: `prisma`, `zod`, `dayjs`
- side effects: DB (orders, order_items, audit_log), SNS (order.* events)

## Invariantes

- userId nunca null ao chegar — middleware auth garante [evidence: src/middleware/auth.ts:34]
- items.length >= 1 — validacao zod no input [evidence: src/services/orderService.ts:50]
- order.status comeca como `pending` [evidence: src/services/orderService.ts:80]

## Consumidores (47 call sites — god module)

- src/routes/orders.ts:* (12 rotas)
- src/jobs/orderCleanup.ts:23 (job de limpeza de pedidos abandonados)
- src/services/billingService.ts:88 (cobranca depende de pedido)
- src/services/notificationService.ts:42 (notifica criacao)
- ...

## Estado Interno

- cache de cupons em memoria: `Map<string, Coupon>` com TTL 5min [evidence: src/services/orderService.ts:25]

## Suspeitas

- `applyDiscount` permite cupom expirado se cache nao foi invalidado [src/services/orderService.ts:240] — bug latente
- `cancelOrder` nao reverte estoque (so muda status) — possivel inconsistencia
- TODO de 2024-03 sobre rate limiting nunca implementado [src/services/orderService.ts:200]
```

### Fase 3 — Regra de exemplo

```markdown
# Regras de Negocio — orders

## RN-001: Pedido com VIP recebe 10% de desconto

**Confidence:** high
**Evidence:**
- src/services/orderService.ts:67 (calculo)
- src/services/orderService.test.ts:34 (teste verde)

**Quando:** user.tier === 'VIP' AND items.length > 0
**Entao:** total *= 0.9
**Por que (inferido):** programa de fidelidade — comentario em commit 8f3a2b1 menciona "VIP discount per spec"

**Testavel como:**
> DADO um user VIP com 3 items somando R$ 100
> QUANDO chamar createOrder
> ENTAO total deve ser R$ 90

**Exemplos do codigo:**
- input VIP `{ tier: 'VIP', items: [{price: 100}] }` → total: 90 [src/services/orderService.test.ts:34]
- input regular `{ tier: 'BASIC', items: [{price: 100}] }` → total: 100 [src/services/orderService.test.ts:42]

---

## RN-002: Pedido sem estoque retorna erro 409

**Confidence:** high
**Evidence:**
- src/services/inventoryService.ts:55
- src/services/orderService.test.ts:78

**Quando:** qualquer item.qty > stock.available
**Entao:** throws OutOfStockError com lista de items afetados
**Por que (inferido):** evitar venda de produto inexistente

**Testavel como:**
> DADO produto X com stock 5
> QUANDO criar pedido com 10 unidades de X
> ENTAO throws OutOfStockError com `items: [{id: X, requested: 10, available: 5}]`
```

### Fase 5 — ADR de exemplo

```markdown
# ADR-001: Express 4.x como framework HTTP

**Status:** Inferido (retroativo)
**Confidence:** high
**Data inferida:** ~2023-Q2 (primeiro commit em src/server.ts: 2023-04-12)
**Evidence:**
- package.json (express ^4.18.2)
- src/server.ts:1 (`import express from 'express'`)
- 12 routes em src/routes/
- 4 middlewares em src/middleware/
- commit a1b2c3d "initial server setup" (2023-04-12)

## Contexto (inferido)

Equipe pequena (3 devs no log), prototipagem rapida, todos com experiencia previa em Express. TypeScript foi adicionado 6 meses depois (commit f4e5d6c, 2023-10-05) com `@types/express` — sugere que decisao original priorizou velocidade sobre type safety end-to-end.

## Decisao

Express 4.x escolhido como framework HTTP. Roteamento via `express.Router()`. Middleware pattern usado para auth, logging, validation e error handling.

## Consequencias observadas no codigo

- 4 middlewares compoem cada rota (consistente)
- Routes nao tem tipagem forte — controllers fazem `req.body as MyType` (47 ocorrencias)
- 3 wrappers customizados para async handlers (compensam ausencia de async support nativo no Express 4)
- `express.json()` configurado com limit 10mb (alto — possivel risco DoS)

## Alternativas (especulativas)

- Fastify: ganho ~30% perf + tipagem nativa via TypeBox/zod, exigiria reescrita de middleware
- Next.js API routes: se ja houvesse Next, eliminaria server separado
- Hono / Elysia: opcoes modernas, imaturas em Q2 2023

## Implicacoes para evolucao

- Trocar framework custa ~12 routes + 4 middlewares + 47 type assertions
- Para ganhar tipagem forte sem trocar framework: introduzir `ts-rest` ou `zod-express`
- Se for trocar, Fastify e o caminho menos doloroso (API similar)
```

---

## Heuristicas avancadas por linguagem

### TypeScript / JavaScript

- **Validacoes:** `zod`, `yup`, `joi`, `class-validator`, `ajv`, `io-ts`
- **State machines:** `xstate`, enums TS, discriminated unions
- **Side effects:** procurar `prisma.*`, `db.*`, `redis.*`, `fetch(`, `axios.`, `await sns.`, `await sqs.`
- **Magic constants:** procurar `const [A-Z_][A-Z0-9_]+ =`
- **Tests com regras:** `describe.*`, `it(`, `test(` — descricao revela regra

### Python

- **Validacoes:** `pydantic`, `marshmallow`, `cerberus`, `assert`, raises
- **State:** Enum, transitions library, manual flags
- **Side effects:** `session.execute`, `requests.`, `httpx.`, `boto3.`, `celery.`
- **Magic:** module-level UPPERCASE
- **Tests:** pytest functions, descricao do test name

### Go

- **Validacoes:** `validator` package, manual `if x < 0 { return errors.New(...) }`
- **State:** const blocks com iota
- **Side effects:** `db.Exec`, `http.Get`, `kafka.Write`
- **Magic:** package-level constants
- **Tests:** `func Test*`, table tests revelam regras (`tt.want`)

### Java / Kotlin

- **Validacoes:** `@Valid`, `@NotNull`, `Objects.requireNonNull`, custom validators
- **State:** enums, sealed classes (Kotlin), state pattern
- **Side effects:** `entityManager.persist`, `restTemplate.`, `webClient.`, `kafkaTemplate.`
- **Magic:** `static final` constants
- **Tests:** `@Test` methods, `@DisplayName` revela intencao

---

## Casos de uso reais

### Caso 1: Onboarding em monolito de 5 anos

**Contexto:** time novo herda monolito Node.js de 250k LOC sem documentacao.

**Estrategia:**
1. `/audit-repo` primeiro (mapa estrutural)
2. `graphify update .` (identifica god nodes e comunidades)
3. `/detective-spec` no repo inteiro (Fase 1: prioriza top 10 god modules)
4. Apos Fase 5, time tem `_detective_sdd/` como onboarding doc canonico
5. Cada PR novo referencia regras (`closes RN-042`) ou ADRs (`see ADR-007`)

**Resultado tipico:** 50-150 RNs extraidas, 5-15 ADRs retroativos, 20-50 fluxos mapeados.

### Caso 2: Pre-migracao de stack

**Contexto:** decisao de migrar de Express+JS para Fastify+TS.

**Estrategia:**
1. `/detective-spec --feature=auth` (extrai contratos do dominio mais critico)
2. `/detective-spec --feature=billing` (idem)
3. Cada modulo extraido vira spec de input para `/spec` na nova stack
4. Migracao incremental valida contra RNs (testes derivados)

**Resultado:** zero regressao funcional, decisao baseada em ADR-NNN.

### Caso 3: Auditoria pos-incidente

**Contexto:** producao caiu por inconsistencia entre cache e DB. Time quer mapear todos os pontos de risco similar.

**Estrategia:**
1. `/detective-spec --module=src/services/cache` (foco no modulo afetado)
2. Fase 4 (flows) revela todos os caminhos onde cache write nao esta em transacao com DB
3. Cada inconsistencia vira issue no tracker referenciando `_detective_sdd/03-flows/<flow>.md`

---

## Anti-padroes recorrentes

### 1. "Detetive consertou bug"

Sintoma: PR do detective contem mudanca em arquivo do projeto legado.
Causa: agente cedeu a tentacao de "consertar enquanto estava la".
Mitigacao: hard guardrail em `policies/detective-write-guardrails.md` + verificacao dupla com `git diff --name-only HEAD`.

### 2. "Spec descreve o que deveria ser, nao o que e"

Sintoma: RN-NNN diz "validacao deve checar X" mas codigo nao checa.
Causa: agente confundiu inferencia com prescricao.
Mitigacao: cada RN precisa de evidencia direta (`file:line`); sem evidencia, vira "Suspeita".

### 3. "Confidence inflado"

Sintoma: 95% das RNs marcadas `high`.
Causa: agente tratou ausencia de teste como evidencia neutra, nao negativa.
Mitigacao: regra `high` so com **teste verde** + validacao explicita; tudo mais e `medium` ou `low`.

### 4. "Modulos demais, fluxos de menos"

Sintoma: 50 modulos documentados, 2 fluxos.
Causa: agente parou no Fase 2.
Mitigacao: Fase 4 e onde valor real acontece — fluxos sao o que outros agentes consomem para nao quebrar producao.

### 5. "Re-investigar do zero apos interrupcao"

Sintoma: re-rodou `/detective-spec` e perdeu progresso.
Causa: nao usou `--resume`.
Mitigacao: `.detective/state.json` e checkpoint — sempre re-iniciar com `/detective-spec --resume`.

---

## Quando atualizar este guia

- novo padrao de linguagem nao coberto
- caso de uso novo que extrai aprendizado generalizavel
- anti-padrao recorrente observado em multiplas sessoes
- mudanca em personas/subagents detective-* que afete templates aqui

Manter este guia **enxuto**. Se passar de 600 linhas, dividir em sub-guias por fase.
