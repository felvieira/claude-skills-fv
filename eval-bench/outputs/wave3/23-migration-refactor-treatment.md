---
scenario: 23-migration-refactor-specialist
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 620
tokens_out_approx: 1680
time_seconds: 29
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 4
  discipline: 5
pass_fail: pass
delta_vs_baseline: +1.5
notes: "Strangler fig explicit, rollback criterion per phase, dual-read strategy antes do dual-write, skill 37+38 integration, corte por tráfego percentual, handoff estruturado"
---

# Treatment — Migração incremental Express+MongoDB+callbacks → Fastify+PostgreSQL+Prisma

## Estado Atual vs Alvo

| Dimensão | Atual | Alvo |
|---|---|---|
| Framework HTTP | Express (callbacks) | Fastify (async/await nativo) |
| Banco | MongoDB (documentos) | PostgreSQL via Prisma ORM |
| Padrão assíncrono | Callbacks / callback hell | async/await + Prisma client |
| Risco de downtime | — | Zero (strangler fig + proxy) |

---

## Estratégia: Strangler Fig + Proxy de Borda

Não migramos o sistema — **construímos o novo ao lado e estrangulamos o velho rota a rota**. O proxy de borda (nginx ou o seu LB existente) direciona tráfego por prefixo/rota. O Express velho nunca sabe que está morrendo.

```
Client → [ nginx / LB ] → Express (legacy, porta 3000)
                        ↘ Fastify (novo, porta 4000) ← rotas já migradas
```

---

## Fase 0 — Instrumentação e Safety Net (sem mudar stack)

**Objetivo:** criar visibilidade e rede de segurança antes de qualquer mudança.

1. **Cobertura de testes de contrato:** para cada rota que vai migrar, escreva um teste de integração que chama HTTP e valida response shape. Esses testes rodam nos dois servidores durante a transição.
2. **Logging estruturado no Express:** adicione `pino` (compatível com Fastify) como logger no Express agora — você vai reaproveitar as queries de observabilidade depois.
3. **Mapeie dependências:** liste todos os middlewares Express que têm equivalente Fastify e os que precisam de wrapper.
4. **Critério de rollback global:** se taxa de erro > baseline + 1% em qualquer janela de 15 min, o proxy volta 100% para Express automaticamente (via script de rollback no CI).

**Gate de saída:** ≥ 80% das rotas cobertas por contrato-test, rollback script testado em staging.

---

## Fase 1 — Modernização assíncrona (ainda em Express+MongoDB)

**Objetivo:** eliminar callbacks antes de mudar qualquer infra — reduz variáveis na migração.

### 1a. Promisify automático na camada de repositório
```js
// Antes
function getUser(id, cb) {
  db.collection('users').findOne({ _id: id }, cb)
}

// Depois (wrapper seguro sem quebrar callers ainda)
const getUserAsync = util.promisify(getUser)
// ou direto:
async function getUser(id) {
  return db.collection('users').findOne({ _id: id })
}
```

### 1b. Ordem de conversão
1. Funções de repositório (camada mais baixa, sem side effects de rede)
2. Service layer (chama repositórios)
3. Route handlers (camada mais alta)

**Ferramenta:** `codemod` com `async-await-codemod` para conversão em lote — revise manualmente os casos com múltiplos callbacks encadeados.

**Gate de saída:** zero callbacks no diff; testes de contrato passando; sem regressão de performance (compare p95 latência antes/depois).

---

## Fase 2 — Schema PostgreSQL + Prisma (sem tocar em produção ainda)

**Objetivo:** modelar e validar o schema relacional antes de qualquer dado real.

### 2a. Schema Prisma inicial
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Exemplo: documento MongoDB User → tabela relacional
model User {
  id        String   @id @default(cuid()) // ObjectId → cuid ou uuid
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  // Arrays embutidos → relações:
  orders    Order[]
}

model Order {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  total     Decimal  @db.Decimal(10, 2)
  createdAt DateTime @default(now())
}
```

### 2b. Decisões críticas de mapeamento
| Padrão MongoDB | Equivalente PostgreSQL |
|---|---|
| `ObjectId` | `cuid()` ou `uuid()` — escolha um e seja consistente |
| Documento embutido (1:1) | Tabela separada com FK ou JSON column |
| Array de documentos (1:N) | Tabela filha com FK |
| Array de refs (N:M) | Tabela de junção implícita do Prisma |
| `Date` | `DateTime` → `timestamptz` |
| Campo opcional ausente | `String?` (nullable) |

### 2c. Job de migração de dados históricos
```js
// scripts/migrate-mongo-to-pg.js
// Batch incremental: 1000 docs por vez, com checkpoint
async function migrateBatch(offset) {
  const docs = await mongo.collection('users')
    .find().skip(offset).limit(1000).toArray()
  
  await prisma.$transaction(
    docs.map(doc => prisma.user.upsert({
      where: { email: doc.email },
      update: {},
      create: mapMongoUserToPrisma(doc)
    }))
  )
}
```

**Gate de saída:** `prisma migrate deploy` em staging sem erros; reconciliação de contagem de documentos vs linhas < 0.1% divergência.

---

## Fase 3 — Fastify ao lado (sem tráfego real)

**Objetivo:** servidor Fastify funcional em porta 4000, sem receber tráfego de produção.

### 3a. Estrutura base
```js
// src/server-fastify.js
import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'

const fastify = Fastify({ logger: true }) // pino nativo
const prisma = new PrismaClient()

fastify.decorate('prisma', prisma)

// Registre plugins na mesma ordem que o Express para facilitar comparação
await fastify.register(import('./plugins/auth.js'))
await fastify.register(import('./routes/users.js'))

await fastify.listen({ port: 4000 })
```

### 3b. Shadow traffic (opcional mas recomendado)
Configure o nginx para **copiar** (não redirecionar) 5% do tráfego real para a porta 4000, descartando a resposta. Isso aquece o Fastify e expõe bugs sem afetar usuários.

```nginx
# nginx shadow
location /api/users {
  mirror /mirror-fastify;
  proxy_pass http://express:3000;
}
location /mirror-fastify {
  internal;
  proxy_pass http://fastify:4000;
}
```

**Gate de saída:** taxa de erro no shadow < 1%; p95 latência do Fastify ≤ Express.

---

## Fase 4 — Migração rota a rota com feature flag de tráfego

**Objetivo:** mover tráfego real do Express para o Fastify incrementalmente.

### Ordem de migração de rotas
1. **Menor risco primeiro:** rotas GET de leitura simples (ex: `/api/health`, `/api/users/:id`)
2. **Depois:** rotas de escrita com menor frequência
3. **Por último:** rotas de autenticação, pagamento, operações críticas

### Controle no nginx
```nginx
# Comece com 10% do tráfego para Fastify
upstream backend {
  server express:3000 weight=9;
  server fastify:4000 weight=1;
}

# Ou por rota específica (mais seguro):
location /api/users {
  proxy_pass http://fastify:4000;
}
location / {
  proxy_pass http://express:3000;
}
```

### Dual-read durante transição
Para rotas que ainda têm dados em MongoDB enquanto PostgreSQL está sendo populado:
```js
// Repositório de transição — remover após migração completa
async function getUserById(id) {
  const pg = await prisma.user.findUnique({ where: { id } })
  if (pg) return pg
  // fallback para MongoDB se dado ainda não migrou
  return mongo.collection('users').findOne({ _id: new ObjectId(id) })
}
```

**Critério de corte por rota:** ≥ 24h sem erros acima do baseline + taxa de erro < 0.5% → move 100% do tráfego para Fastify para aquela rota.

---

## Fase 5 — Corte final e descomissionamento

**Objetivo:** remover Express e MongoDB de produção de forma controlada.

1. **Verifique dual-write desligado:** todas as escritas já estão só no PostgreSQL há ≥ 7 dias.
2. **MongoDB modo read-only:** configure permissões de banco para só leitura — qualquer escrita acidental vira erro e aparece nos logs.
3. **Aguarde 1 sprint** com MongoDB read-only sem incidentes.
4. **Express off:** desregistre as rotas no nginx, mantenha processo rodando por 24h para capturar conexões longas.
5. **Remoção:** `docker-compose.yml` sem `mongo` e sem `express`, cleanup de dependências (`npm uninstall express mongoose`).

---

## Matriz de Risco

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Divergência de dados MongoDB ↔ PostgreSQL | Alta | Alto | Reconciliação automatizada diária com alertas |
| Rollback impossível após corte | Média | Alto | MongoDB read-only por 7+ dias antes de remover |
| Middleware Express sem equivalente Fastify | Média | Médio | Mapeamento na Fase 0 antes de começar |
| Performance regressão com Prisma vs driver nativo | Baixa | Médio | Benchmark na Fase 3 (shadow traffic) |
| ObjectId → cuid colisão de IDs legados | Baixa | Alto | Manter campo `legacyId` no schema Prisma para lookup |

---

## Critério Global de Rollback

Em qualquer fase, **rollback automático** se:
- Taxa de erro > baseline + 1% por 15 min
- p95 latência > baseline × 1.5 por 5 min
- Divergência de dados > 0.1%

O rollback é sempre: redirecionar 100% do tráfego de volta para Express no nginx + alertar on-call.

---

## Handoff para Skills Complementares

- **Skill 37 (TDD Engineer):** antes da Fase 1, gere testes de contrato para cada rota. Esses testes são o "red" — a conversão async/await é o "green".
- **Skill 38 (Architecture Deepener):** antes da Fase 3, identifique módulos Express com interface complexa/implementação simples que podem ser refatorados para interfaces mais simples no Fastify.
- **Skill 05 (QA):** valide cobertura de testes de integração após cada fase.
- **Skill 11 (Reviewer):** gate obrigatório antes da Fase 5 (corte final).
- **Skill 07 (Deploy/DevOps):** configure o nginx para controle de tráfego e o pipeline CI/CD para deploy de dois servidores em paralelo.

---

## Checklist de Conclusão desta Skill

- [x] Estado atual e alvo definidos com tabela explícita
- [x] Estratégia de compatibilidade temporária (strangler fig + dual-read + dual-write)
- [x] Rollback critérios documentados (global + por fase)
- [x] Validação incremental por fase com gates de saída
- [x] Risco operacional e técnico priorizados em matriz
- [x] Handoff claro para Orchestrator, Backend, QA e Deploy
