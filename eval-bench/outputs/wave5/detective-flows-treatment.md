---
scenario: detective-flows
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 1480
time_seconds: 38
quality_score: 5.0
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 5
pass_fail: pass
delta_vs_baseline: +2.7
notes: "Skill detective-spec loaded — Phase 4 (detective-flows persona). Correct output paths (_detective_sdd/03-flows/), hard guardrails enforced, confidence scoring, checkpoint/resume, all 7 modules + 3 events + 4 tables + 2 external calls addressed with templated evidence anchors and anti-hallucination rules."
---

# Detective Spec — Phase 4: Reconstituir Fluxo "criar pedido"

**Persona ativa:** `detective-flows`
**Escopo:** fluxo `criar-pedido` (7 módulos, 3 eventos, 4 tabelas, 2 chamadas externas)
**Modo:** read-only — zero writes fora de `_detective_sdd/` e `.detective/`

---

## Pré-requisito: Checkpoint de Estado

Antes de iniciar Fase 4, verificar `.detective/state.json`:

```json
{
  "version": 1,
  "scope": "feature:criar-pedido",
  "phase": 4,
  "phase_status": "in_progress",
  "flows": { "criar-pedido": "pending" },
  "evidence_count": 0,
  "low_confidence_items": []
}
```

Se Fases 1-3 não foram executadas, executar Fase 1 primeiro (Reconhecimento via Graphify + repo-audit) para identificar os 7 módulos e os pontos de entrada. Se já existem, ler `.detective/plan.md` e pular direto.

---

## Fase 4 — Protocolo de Reconstituição do Fluxo

### Passo 1: Localizar o ponto de entrada

O fluxo começa em um handler, rota ou comando. Buscar sem modificar nada:

```bash
# Encontrar o entry point do fluxo "criar pedido"
grep -rn "createOrder\|criar_pedido\|POST.*order\|criarPedido" src/ --include="*.ts" --include="*.js" --include="*.py" -l
grep -rn "createOrder\|criar_pedido" src/ --include="*.ts" -n | head -30
```

**O que anotar:** arquivo + linha do handler. Ex: `src/orders/handler.ts:14`

**Output em `_detective_sdd/03-flows/criar-pedido.md`:**

```markdown
# Fluxo: criar-pedido

**Trigger:** [a preencher com evidência — ex: route POST /orders]
**Entry point:** [file:line]
**Confidence:** medium  ← atualizar para high após confirmar com teste
```

---

### Passo 2: Traçar o call chain pelos 7 módulos

Para cada módulo identificado na Fase 1, rastrear a sequência de chamadas **sem inferir** — seguir o código:

```bash
# Para cada função identificada no passo anterior, rastrear quem a chama e quem ela chama
grep -rn "nomeDoModulo\|nomeDoServico" src/ -n
```

**Template de step (repetir para cada um dos 7 módulos):**

```markdown
## Happy Path

1. **[ModuloA]** — `src/orders/handler.ts:14`
   → chama `validateOrder(payload)` em `src/orders/validator.ts:8`

2. **[ModuloB]** — `src/orders/validator.ts:8`
   → valida campos obrigatórios
   → retorna `ValidationResult` para o handler

3. **[ModuloC]** — `src/orders/service.ts:42`
   → chama `createOrderRecord(data)` em `src/orders/repository.ts:20`
   → side effect: INSERT em tabela `orders` [evidence: src/orders/repository.ts:20]

4. **[ModuloD]** — `src/inventory/service.ts:17`
   → chama `reserveStock(items)` em `src/inventory/repository.ts:55`
   → side effect: UPDATE em tabela `inventory` [evidence: src/inventory/repository.ts:55]

5. **[ModuloE]** — `src/payments/gateway.ts:33`
   → chamada externa 1: `PaymentProvider.charge(amount)` [evidence: src/payments/gateway.ts:33]
   → side effect: INSERT em tabela `payment_intents`

6. **[ModuloF]** — `src/notifications/service.ts:21`
   → chamada externa 2: `EmailService.send(template, recipient)` [evidence: src/notifications/service.ts:21]

7. **[ModuloG]** — `src/events/publisher.ts:9`
   → dispara eventos: `order.created`, `inventory.reserved`, `payment.initiated`
   → side effect: INSERT em tabela `outbox` (ou publish direto) [evidence: src/events/publisher.ts:9]
```

**Atenção:** Os nomes acima são placeholders. Cada item DEVE ser substituído por evidência real (`file:line`) antes de commitar a spec. Se não achar, escrever `[unknown — investigate]`, não inventar.

---

### Passo 3: Mapear os 3 eventos

```bash
# Localizar onde os 3 eventos são disparados
grep -rn "emit\|publish\|dispatch\|EventEmitter\|\.send\|\.produce" src/ --include="*.ts" -n | grep -i "order\|inventory\|payment"
```

**Template por evento:**

```markdown
## Eventos Disparados

### Evento 1: [nome — ex: order.created]
- **Onde:** `src/events/publisher.ts:12` [evidence]
- **Payload:** `{ orderId, customerId, items, total }` [evidence: interface em src/events/types.ts:5]
- **Quando no fluxo:** após step 3 (INSERT em `orders`)
- **Consumidores conhecidos:** [grep por quem escuta esse evento]
- **Confidence:** medium

### Evento 2: [nome — ex: inventory.reserved]
- **Onde:** [file:line]
- **Payload:** [extraído do código, não inventado]
- **Quando no fluxo:** após step 4
- **Confidence:** low ← se não confirmado por teste

### Evento 3: [nome — ex: payment.initiated]
- **Onde:** [file:line]
- **Confidence:** medium
```

---

### Passo 4: Mapear as 4 tabelas

```bash
# Localizar todos os writes nas 4 tabelas
grep -rn "INSERT\|UPDATE\|\.create\|\.save\|\.update" src/ --include="*.ts" -n | grep -i "order\|inventory\|payment\|outbox"
# Para ORMs (Prisma/TypeORM/Sequelize):
grep -rn "\.create\|\.update\|\.upsert\|\.save" src/ -n
```

**Template:**

```markdown
## Estado Mutado (4 tabelas)

| Step | Tabela | Operação | Transação? | Evidence |
|------|--------|----------|-----------|----------|
| 3    | `orders` | INSERT | [sim/não] | src/orders/repository.ts:20 |
| 4    | `inventory` | UPDATE | [sim/não] | src/inventory/repository.ts:55 |
| 5    | `payment_intents` | INSERT | [sim/não] | src/payments/repository.ts:8 |
| 7    | `outbox` | INSERT | [sim/não] | src/events/publisher.ts:9 |

**Transacionalidade:** [verificar se há `BEGIN`/`COMMIT`/`ROLLBACK` ou equivalente ORM]
```

---

### Passo 5: Mapear as 2 chamadas externas

```bash
# Localizar chamadas HTTP externas e SDKs de terceiros
grep -rn "fetch\|axios\|http\.request\|\.call\|\.charge\|\.send\|stripe\|twilio\|sendgrid" src/ --include="*.ts" -n
```

**Template:**

```markdown
## Chamadas Externas

### Chamada 1: [nome — ex: PaymentProvider]
- **Onde:** `src/payments/gateway.ts:33` [evidence]
- **Tipo:** HTTP POST / SDK call
- **Timeout configurado:** [sim/não — buscar configuração]
- **Retry:** [sim/não]
- **Falha → comportamento:** [rollback? compensação? dead-letter?]
- **Confidence:** high

### Chamada 2: [nome — ex: EmailService]
- **Onde:** [file:line]
- **Falha → comportamento:** [crítico para o fluxo ou fire-and-forget?]
- **Confidence:** medium
```

---

### Passo 6: Edge Cases

```bash
# Localizar tratamento de erro no caminho do fluxo
grep -rn "catch\|throw\|try\|Error\|reject\|rollback" src/orders/ src/payments/ src/inventory/ -n
# Localizar testes do fluxo (regras de edge case mais confiáveis)
grep -rn "createOrder\|criar_pedido" tests/ __tests__/ spec/ -rn
```

**Template:**

```markdown
## Edge Cases

| Condição | Step | Comportamento | Evidence |
|----------|------|---------------|----------|
| Payload inválido | 1 | retorna 422 + `ValidationError` | src/orders/validator.ts:15 |
| Stock insuficiente | 4 | lança `OutOfStockError`, rollback tabela `orders` | [file:line ou [unknown]] |
| PaymentProvider timeout | 5 | retry 3x, depois lança `PaymentTimeoutError` | [file:line] |
| EmailService falha | 6 | log de erro + continua (fire-and-forget) | [file:line] |
| Evento não entregue | 7 | [outbox pattern com retry? ou perda silenciosa?] | [file:line ou [unknown — investigate]] |

**Items com confidence low** (precisam validação humana):
- Comportamento de rollback quando PaymentProvider falha após INSERT em `orders`
- Garantia de entrega dos eventos (at-least-once? at-most-once?)
```

---

### Passo 7: Output Final em `_detective_sdd/03-flows/criar-pedido.md`

Consolidar tudo no template canônico da skill:

```markdown
# Fluxo: criar-pedido

**Trigger:** POST /orders | [ajustar com evidência real]
**Confidence:** medium  ← atualizar para high após revisão humana

## Happy Path
1. Handler recebe payload — `src/orders/handler.ts:14`
2. Validação de campos — `src/orders/validator.ts:8`
3. INSERT `orders` — `src/orders/repository.ts:20`
   → side effect: tabela `orders`
4. Reserve stock — `src/inventory/service.ts:17`
   → side effect: tabela `inventory`
5. Charge payment — `src/payments/gateway.ts:33`
   → chamada externa: PaymentProvider
   → side effect: tabela `payment_intents`
6. Send email — `src/notifications/service.ts:21`
   → chamada externa: EmailService (fire-and-forget)
7. Publish events — `src/events/publisher.ts:9`
   → eventos: `order.created`, `inventory.reserved`, `payment.initiated`
   → side effect: tabela `outbox`

## Edge Cases
[tabela do Passo 6]

## Estado Mutado
[tabela do Passo 4]

## Falhas Possíveis
[itens do Passo 6 — coluna Comportamento]

## Items para Validação Humana
- [ ] Rollback transacional entre tabelas `orders` e `inventory` (confidence: low)
- [ ] Entrega garantida de eventos (confidence: low)
- [ ] Comportamento exato quando PaymentProvider falha após writes (confidence: low)
```

---

### Passo 8: Checkpoint

Atualizar `.detective/state.json`:

```json
{
  "phase": 4,
  "phase_status": "done",
  "flows": { "criar-pedido": "done" },
  "evidence_count": 14,
  "low_confidence_items": [
    "rollback transacional orders↔inventory",
    "entrega garantida de eventos",
    "comportamento PaymentProvider failure após writes"
  ]
}
```

---

## Hard Guardrails Ativos

1. **Zero modificações** em qualquer arquivo do projeto. Só leitura (Read, Grep, Glob, git log).
2. **Writes permitidos apenas em:** `_detective_sdd/03-flows/criar-pedido.md` e `.detective/state.json`.
3. **Toda afirmação** tem `[evidence: file:line]`. Se não achar, escreve `[unknown — investigate]`.
4. **Confidence low** → item vai para `99-traceability.md` seção "Needs Human Review".
5. **Não extrapolar de 1 caso.** Regra precisa de 2 ocorrências ou teste explícito.

---

## Próximo passo após concluir Fase 4

Despachar `detective-adrs` para Fase 5:
- Identificar decisões arquiteturais implícitas (transacionalidade, entrega de eventos, fallback de pagamento)
- Escrever ADRs retroativos em `_detective_sdd/04-adrs/`
- Gerar `_detective_sdd/99-traceability.md` com mapa completo spec ↔ evidência
