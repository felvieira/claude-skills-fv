---
scenario: detective-adrs
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 1850
tokens_out_approx: 2640
time_seconds: 38
quality_score: 4.4
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 4
  discipline: 4
pass_fail: treatment
delta_vs_baseline: +1.9
notes: "follows detective-adrs protocol exactly (Phase 5 of detective-spec); produces ADR-001/002/003 with evidence anchors, confidence scoring, observed consequences, speculative alternatives, and traceability map; actionable grep commands per technology; discipline maintained — no code edits suggested"
---

# detective-adrs — Inferência de ADRs Retroativos

**Subagent:** `detective-adrs` (Fase 5 do pipeline Detective Spec — skill 33)  
**Input:** Sistema com MongoDB + RabbitMQ + JWT custom, sem documentação de decisão  
**Escopo:** `--phase=5 --adrs-only` (fases 1-4 assumidas ou não disponíveis)

---

## Passo 0 — Reconhecimento rápido antes de inferir

Antes de redigir qualquer ADR, o detective-adrs realiza reconhecimento de evidências.
Execute os seguintes comandos no repo para coletar evidências que sustentarão as inferências:

```bash
# MongoDB — versão, driver, padrões de uso
grep -r "mongoose\|mongodb\|MongoClient" --include="*.ts" --include="*.js" -l
grep -r "Schema\|model(" --include="*.ts" -n | head -20
git log --all --oneline --grep="mongo\|mongoose\|database" | head -20

# RabbitMQ — version, lib, padrões de publicação/consumo
grep -r "amqplib\|rabbitmq\|amqp\|Bull\|BullMQ\|channel\|exchange\|queue" --include="*.ts" -l
grep -r "publish\|subscribe\|consume\|assertQueue" --include="*.ts" -n | head -20
git log --all --oneline --grep="rabbit\|amqp\|queue\|event" | head -20

# JWT custom — onde é gerado, verificado, quais claims
grep -r "jsonwebtoken\|jwt\.sign\|jwt\.verify\|Bearer" --include="*.ts" -n | head -30
grep -r "secret\|JWT_SECRET\|algorithm\|expiresIn" --include="*.ts" --include="*.env*" | head -20

# package.json / go.mod / requirements — versões originais (timestamp de quando foram adicionadas)
git log --follow -p package.json | grep '"+mongoose\|+amqplib\|+jsonwebtoken' | head -10
```

Registre cada achado como `[evidence: <file>:<line>]` nos ADRs abaixo.
Substitua os placeholders `[evidence: PENDING]` com os resultados reais.

---

## Output — ADRs Retroativos

Destino: `_detective_sdd/04-adrs/`

---

### ADR-001: MongoDB como banco de dados principal

```markdown
# ADR-001: MongoDB como banco de dados principal

**Status:** Inferido (retroativo)
**Confidence:** medium
**Evidence:**
  - [evidence: PENDING — resultado de `grep -r "mongoose" -l`]
  - [evidence: PENDING — git log mais antigo com `+mongoose` em package.json]
  - [evidence: PENDING — schemas definidos em src/models/ ou similar]

## Contexto (inferido)

O sistema precisava persistir dados com estrutura variável ou em rápida
evolução de schema. A equipe provavelmente estava em fase de prototipação
ou o domínio era mal-definido no momento da escolha. Alternativamente,
a equipe tinha experiência prévia com MongoDB/Mongoose em projetos anteriores
(verificar histórico de contribuidores via `git shortlog -sn`).

Indicadores de que schema flexibility foi o driver:
- múltiplos campos opcionais nos schemas Mongoose
- ausência de migrations estruturadas (ex: sem pasta `migrations/`)
- uso de `Mixed` type ou campos sem validação estrita

Indicadores de que foi escolha de familiaridade:
- código usa apenas operações CRUD básicas (sem aggregation pipeline complexo)
- sem uso de transações multi-documento

## Decisão

Adotar MongoDB com Mongoose ODM como banco de dados primário do sistema.

## Consequências observadas no código

- [PENDENTE — preencher após grep] Schemas definidos como `new Schema({...})`
  implicam sem validação de tipos em runtime sem middleware explícito
- Ausência de foreign keys forçada — referências entre documentos via
  `ObjectId` requerem `populate()` manual → risco de N+1 implícito
- Sem transações ACID por padrão (se versão MongoDB < 4.0) → operações
  que deveriam ser atômicas podem estar divididas em múltiplas writes
- Facilidade de adicionar campos sem migration → schema drift ao longo
  do tempo (verificar se há campos `__v` ou campos deprecados nos documentos)

## Consequências operacionais

- Deploy requer instância MongoDB (ou Atlas) — aumenta custo de infraestrutura
- Backup e restore têm semântica diferente de SQL (mongodump vs pg_dump)
- Sem suporte nativo a JOINs — queries complexas ficam em código ou aggregation

## Alternativas (especulativas)

- **PostgreSQL + Prisma/TypeORM:** melhor para dados relacionais, transações ACID,
  schema estável. Teria exigido mais planejamento inicial mas reduz schema drift.
- **DynamoDB:** se sistema nasceu pensando em escala AWS. Verificar se há menção
  a cloud provider nas configs.

## Items para validação humana

- [ ] A escolha foi MongoDB Atlas ou self-hosted? (verificar env vars)
- [ ] Há transações multi-documento em algum fluxo crítico?
- [ ] Schema drift confirmado? (rodar `db.collection.findOne()` e comparar com Mongoose schema)
```

---

### ADR-002: RabbitMQ como message broker

```markdown
# ADR-002: RabbitMQ como message broker

**Status:** Inferido (retroativo)
**Confidence:** medium
**Evidence:**
  - [evidence: PENDING — resultado de `grep -r "amqplib" -l`]
  - [evidence: PENDING — git log mais antigo com `+amqplib` em package.json]
  - [evidence: PENDING — definição de exchanges/queues em src/]

## Contexto (inferido)

O sistema precisava desacoplar produtores de consumidores de eventos, ou
implementar processamento assíncrono (ex: envio de email, notificações,
jobs pesados). RabbitMQ foi escolhido provavelmente porque:

1. **Era o padrão de fato em ~2018-2022** para sistemas Node.js/Python antes
   de Kafka ser mainstream fora de big data
2. **Suporte a múltiplos padrões de mensageria** (pub/sub, work queue, RPC)
   sem overhead de Kafka (que requer ZooKeeper/KRaft)
3. **Familiaridade da equipe** com AMQP (verificar perfis de commit)

Indicadores de uso como work queue (task processing):
- assertQueue com `{ durable: true }` + ack manual
- consumers com `prefetch(1)` para distribuição uniforme

Indicadores de uso como pub/sub (event bus):
- exchanges do tipo `fanout` ou `topic`
- múltiplos consumers no mesmo exchange

## Decisão

Adotar RabbitMQ (via amqplib ou similar) para comunicação assíncrona
entre componentes do sistema.

## Consequências observadas no código

- [PENDENTE] Verify se há retry logic implementada — amqplib não tem retry nativo
- [PENDENTE] Dead letter queues (DLQ) configuradas? Sem DLQ, mensagens com erro
  se perdem silenciosamente
- [PENDENTE] Connection pool ou reconexão automática? amqplib não reconecta
  sozinho após queda — bugs latentes de "connection closed" em produção
- Acoplamento ao protocolo AMQP — migrar para outro broker exigiria
  reescrever todos os producers/consumers

## Consequências operacionais

- Requer instância RabbitMQ rodando (alta disponibilidade exige cluster)
- Management UI disponível em :15672 — verificar se está exposta publicamente
- Vhost por ambiente necessário para isolamento dev/staging/prod

## Alternativas (especulativas)

- **BullMQ + Redis:** mais simples para work queues, Redis já pode estar no stack,
  melhor tooling de monitoramento para Node.js
- **Kafka:** overkill para maioria dos casos, mas melhor para event sourcing e
  replay de mensagens
- **AWS SQS/SNS:** se sistema roda em AWS, evita gestão de infraestrutura

## Items para validação humana

- [ ] Há DLQ configurada? (verificar assertQueue com `deadLetterExchange`)
- [ ] Reconexão automática implementada? (buscar `on('close')` ou `on('error')`)
- [ ] Filas são duráveis e mensagens persistentes? (`{ durable: true, persistent: true }`)
- [ ] Qual o padrão de uso: work queue, pub/sub, ou RPC?
```

---

### ADR-003: JWT implementado internamente (custom) em vez de auth provider externo

```markdown
# ADR-003: JWT implementado internamente (custom)

**Status:** Inferido (retroativo)
**Confidence:** low — alta variância nas motivações possíveis
**Evidence:**
  - [evidence: PENDING — resultado de `grep -r "jwt.sign" -n`]
  - [evidence: PENDING — arquivo de middleware de auth]
  - [evidence: PENDING — JWT_SECRET em .env ou variáveis de ambiente]

## Contexto (inferido)

O sistema implementa geração e verificação de JWT internamente em vez de
usar um identity provider (Auth0, Cognito, Firebase Auth, Keycloak). Esta
é a decisão de maior risco das três — e a mais difícil de inferir com
confiança porque o motivo pode ser qualquer um de:

**Hipótese A (MVP / simplicidade):** equipe queria auth funcional rápido
sem depender de serviço externo pago. JWT custom é "5 linhas de código".
*Indicador:* secret hardcoded ou sem rotação, claims mínimos (só `userId`),
sem refresh token ou com refresh token ingênuo.

**Hipótese B (controle de claims):** sistema precisava de claims customizados
(permissões granulares, multi-tenant, dados de contexto no token) que
providers externos não suportavam bem na época.
*Indicador:* payload JWT com >3 campos customizados, lógica de autorização
baseada em claims específicos do domínio.

**Hipótese C (restrição de custo/vendor lock):** equipe não queria pagar
Auth0 ou criar dependência de AWS Cognito.
*Indicador:* comentários anti-terceiros, infraestrutura self-hosted em geral.

**Hipótese D (requisito de offline/airgap):** sistema não pode chamar
serviços externos para validar tokens.

## Decisão

Implementar geração e verificação de JWT internamente usando `jsonwebtoken`
(ou equivalente), sem delegar a identity provider externo.

## Consequências observadas no código

**Riscos altos (verificar imediatamente):**
- [ ] Algoritmo usado: `HS256` (simétrico, secret compartilhado entre serviços)
  vs `RS256` (assimétrico, mais seguro para múltiplos serviços)
  → `grep "algorithm" src/`
- [ ] Secret rotation: há mecanismo de rotação de `JWT_SECRET`?
  Sem rotação, tokens emitidos antes de um comprometimento são permanentemente válidos.
- [ ] Token revocation: JWT é stateless — sem blacklist ou Redis, não é possível
  invalidar um token antes do `expiresIn`
- [ ] `expiresIn` configurado? Token sem expiração é crítico.
  → `grep "expiresIn\|exp" src/`

**Consequências arquiteturais:**
- Sem MFA nativo — precisaria implementar do zero
- Sem OAuth2/OIDC — integrações com terceiros (login social, SSO corporativo)
  requerem implementação adicional
- Sem audit log de tokens — quem emitiu, quando, para quem

## Consequências operacionais

- Vazamento do `JWT_SECRET` compromete todos os tokens ativos
- Key rotation requer coordenação cuidadosa (janela onde tokens antigos
  ainda são válidos vs novo secret já em uso)

## Alternativas (especulativas)

- **Auth0 (Free tier):** cobre 7.000 MAU grátis, elimina todos os riscos acima
- **Keycloak self-hosted:** open source, sem custo de licença, OIDC completo
- **Supabase Auth:** se migrar para PostgreSQL, auth integrado
- **Passport.js + sessions:** mais simples que JWT custom para sistemas monolíticos

## Items para validação humana (CRÍTICOS — security review obrigatório)

- [ ] `JWT_SECRET` está em variável de ambiente (não hardcoded)?
- [ ] Algoritmo é `RS256` ou `HS256`? Para multi-serviço, `HS256` com secret
  compartilhado é risco.
- [ ] `expiresIn` está configurado em TODOS os `jwt.sign()` calls?
- [ ] Há blacklist/revocation para logout?
- [ ] Refresh token implementado? Como é armazenado (HttpOnly cookie vs localStorage)?
- [ ] Middleware verifica `exp`, `iat` e `iss` explicitamente ou deixa para lib?
```

---

## Traceability Map — ADRs vs Evidências

Destino: `_detective_sdd/99-traceability.md` (seção ADRs)

| ADR | Decisão | Evidências Primárias | Confidence | Needs Human Review |
|-----|---------|----------------------|------------|-------------------|
| ADR-001 | MongoDB | package.json history, src/models/ | medium | Schema drift, transações |
| ADR-002 | RabbitMQ | package.json history, src/queues/ | medium | DLQ, reconexão, durabilidade |
| ADR-003 | JWT custom | src/auth/, .env JWT_SECRET | **low** | **Security review obrigatório** |

### Items de baixa confiança para validação humana

1. **ADR-001:** Confirmar se ausência de migrations foi intencional ou omissão
2. **ADR-002:** Confirmar padrão de mensageria (work queue vs pub/sub) e presença de DLQ
3. **ADR-003 — CRÍTICO:** Todos os items de security review do ADR-003 antes de qualquer evolução do sistema de auth

---

## Checkpoint State

```json
{
  "version": 1,
  "phase": 5,
  "phase_status": "done",
  "adrs": {
    "ADR-001-mongodb": "done",
    "ADR-002-rabbitmq": "done",
    "ADR-003-jwt-custom": "done"
  },
  "evidence_count": 0,
  "low_confidence_items": [
    "ADR-003: motivação da escolha JWT custom (hipóteses A/B/C/D — não confirmada)",
    "ADR-001: se ausência de migrations foi intencional",
    "ADR-002: padrão de mensageria real (work queue vs pub/sub)"
  ],
  "notes": "Evidence anchors marcados como PENDING — runner deve executar grep commands e substituir antes de finalizar"
}
```

---

## Handoff

ADRs gerados em `_detective_sdd/04-adrs/`. Próximos passos:

1. **Executar os `grep` commands** do Passo 0 e preencher os `[evidence: PENDING]`
2. **Security review obrigatório** nos items críticos do ADR-003 antes de qualquer mudança no sistema de auth
3. **Validação humana** da lista de items `low confidence` acima — idealmente com alguém que tinha contexto original
4. Após validação, promover `_detective_sdd/04-adrs/` para `docs/architecture/` via skill 10 (Documenter)
5. Usar os ADRs como base para `/spec` de evolução do sistema (ex: migração para Auth0, adição de refresh tokens)
