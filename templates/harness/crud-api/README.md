# Harness Template — CRUD API

## Quando usar

Business service expondo entidades de dado via HTTP. REST ou GraphQL. Geralmente:
- Persistência em SQL/NoSQL
- Auth via JWT/session
- Validação de input
- Paginação, filtros, ordenação
- Logging estruturado

## Topology profile

```yaml
runtime: [node, deno, python, go, rust, java, ...]
http_framework: [express, fastify, nest, fastapi, gin, axum, spring, ...]
persistence: [postgres, mysql, mongodb, dynamodb, ...]
auth: [jwt, session, oauth2]
api_style: [rest, graphql, trpc]
```

## Guides (feedforward)

### `guides/conventions.md`

Convenções específicas:
- Naming: `users.controller.ts`, `users.service.ts`, `users.repository.ts`
- Response shape: `{ data, error, meta }` padrão JSON:API ou similar
- Validação: schema na entrada (zod/joi/pydantic/etc) — nunca validar manualmente
- Error handling: throw typed errors, middleware traduz pra response

### `guides/architecture.md`

Module boundaries esperados:
```
src/
├── modules/<entity>/
│   ├── <entity>.controller.ts  ← HTTP boundary
│   ├── <entity>.service.ts     ← business logic
│   ├── <entity>.repository.ts  ← data access
│   ├── <entity>.dto.ts         ← request/response shapes
│   └── <entity>.schema.ts      ← validation schemas
├── shared/                     ← cross-cutting (auth, errors, logger)
└── config/                     ← env vars, app config
```

**Regra:** controller nunca acessa repository direto, sempre via service. Repository nunca conhece HTTP.

### `guides/domain-glossary.md`

Lista de entidades + invariantes. Skill 01 (PO) gera, skill 03 (backend) consome.

## Sensors (feedback)

### `sensors/fitness-functions.yml`

```yaml
fitness_functions:
  - id: api-response-shape
    description: Todas as responses HTTP seguem { data, error, meta } padrão
    type: structural
    runner: grep
    rule: 'res.json\\(\\{(?!.*data).*\\}'
    fail_threshold: 0
    severity: high

  - id: p95-latency-budget
    description: P95 latency < 300ms em endpoints GET
    type: performance
    runner: artillery
    budget_ms: 300
    severity: high

  - id: no-controller-to-repo
    description: Controllers não importam repositories diretamente
    type: structural
    runner: dep-cruiser
    forbidden:
      - from: '\\.controller\\.ts$'
        to: '\\.repository\\.ts$'
    severity: high

  - id: dto-coverage
    description: Toda controller method tem DTO de entrada e saída
    type: structural
    runner: tsc-walker
    rule: 'controllers without typed @Body/@Query/@Param/@Returns'
    severity: medium

  - id: log-context-trace-id
    description: Todos os logs incluem trace_id
    type: structural
    runner: grep
    rule: 'logger\\.\\w+\\((?!.*trace_id)'
    fail_threshold: 5
    severity: medium
```

### Lint rules específicas

- Forbid `console.log` (use logger)
- Forbid raw SQL strings (use query builder ou ORM)
- Forbid `any` em DTOs
- Require `try/catch` em controllers

### Structural tests

- Cada controller method tem teste e2e
- Repository tests usam fixtures, não banco real
- Service tests mockam repository

## Gaps cobertos vs não cobertos

**Cobre:**
- Maintainability: naming, structure, boundaries
- Architecture fitness: latency, response shape, log structure
- Behaviour parcial: cada endpoint tem teste e2e

**NÃO cobre:**
- Business logic correctness — humano ainda revisa
- Migrações de schema — separado (skill 23)
- Performance sob carga real — staging env

## Aplicação

```bash
# Setup inicial num projeto novo
cp -r .bot/templates/harness/crud-api/* ./.harness/
# Customizar config.yml com thresholds próprios
# Plugar fitness-functions.yml no CI:
node .bot/scripts/run-program.mjs .harness/sensors/fitness-functions.yml
```

## Próximos passos

- v2.5.1 — `sensors/fitness-functions.yml` totalmente runnable via `/run-fitness`
- v2.5.2 — `/init-harness crud-api` command
