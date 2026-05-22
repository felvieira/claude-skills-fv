---
scenario: detective-contracts
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 3840
tokens_out_approx: 1480
time_seconds: 28
quality_score: 5.0
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 5
pass_fail: pass
delta_vs_baseline: +2.75
notes: "Skill dev-team-kit-fv:detective-spec loaded — Fase 2 persona detective-contracts. Perfect score: all 5 contract dimensions covered, runnable bash per step, hard guardrails table, evidence format enforced, downstream skill integration mapped."
---

# Detective Spec — Extração de Contratos `src/billing/` (Treatment)

> Skill invocada: `dev-team-kit-fv:detective-spec`
> Fase relevante: **Fase 2 — Módulos (Interrogatório)** via persona `detective-contracts`
> Modo: read-only. Writes restritos a `.detective/` e `_detective_sdd/`.

---

## Orientação inicial — por onde começar

O Detetive opera em fases sequenciais com checkpoint. Para um módulo isolado como `src/billing/` o ponto de entrada correto é a **Fase 1 (Reconhecimento)** seguida imediatamente da **Fase 2 (Interrogatório de módulo)**. As etapas abaixo são executáveis em ordem, sem tocar em nenhum arquivo do projeto.

### Passo 0 — Bootstrap (1–2 min)

```bash
# Verificar se graphify já mapeou o repo
ls graphify-out/graph.json 2>/dev/null && echo "graph existe" || echo "sem graph"

# Estrutura do módulo
find src/billing -type f | sort
wc -l src/billing/**/*.js src/billing/**/*.ts 2>/dev/null | tail -1

# Pontos de entrada candidatos
grep -rn "module\.exports\|^export " src/billing/ --include="*.js" --include="*.ts" | head -40
```

Se `graphify-out/graph.json` existir: ler `graphify-out/GRAPH_REPORT.md` primeiro — god nodes do `billing/` já estão mapeados e poupam 30+ min de leitura manual.

### Passo 1 — API Pública (interrogar o que o módulo expõe)

```bash
# Exports explícitos
grep -rn "module\.exports\s*=" src/billing/ -A5
grep -rn "^export\s\+\(function\|class\|const\|async\)" src/billing/

# Assinaturas de função (Node.js pattern)
grep -rn "^\(async \)\?function " src/billing/
grep -rn "= \(async \)\?(" src/billing/ | grep -v "test\|spec\|mock"
```

### Passo 2 — Dependências (o que o módulo consome)

```bash
# Imports internos e externos
grep -rn "^const\s.*=\s*require(" src/billing/ | sort -u
grep -rn "^import " src/billing/ | sort -u

# Side-effects implícitas: env vars, globals
grep -rn "process\.env\." src/billing/
grep -rn "global\." src/billing/
```

### Passo 3 — Invariantes (regras que o código assume verdadeiras)

```bash
# Guards e validações
grep -rn "throw new\|throw Error\|assert\(" src/billing/
grep -rn "if (!.*) \(throw\|return\)" src/billing/

# Constantes mágicas de domínio (taxas, limites, códigos)
grep -rn "const [A-Z_]\{3,\}\s*=" src/billing/

# Comentários reveladores: HACK, FIXME, porque <bug>, DO NOT
grep -rn "HACK\|FIXME\|DO NOT\|IMPORTANT\|WARNING\|because\b" src/billing/
```

### Passo 4 — Consumidores (quem usa o módulo)

```bash
# Call sites em todo o projeto
grep -rn "require.*billing\|from.*billing" src/ --include="*.js" --include="*.ts" \
  | grep -v "src/billing/"

# Rotas/handlers que disparam billing
grep -rn "billing\." src/ --include="*.js" --include="*.ts" | grep -v "src/billing/" | head -50
```

### Passo 5 — Estado Interno (singletons, caches, variáveis de módulo)

```bash
# Variáveis declaradas no escopo de módulo (fora de funções)
grep -rn "^let \|^var \|^const " src/billing/ | grep -v "function\|=>"

# Padrões de singleton e cache
grep -rn "let.*=\s*\[\]\|let.*=\s*{}\|let.*=\s*null\|let.*=\s*new Map" src/billing/

# Timers, conexões persistentes
grep -rn "setInterval\|setTimeout\|new.*Pool\|createConnection" src/billing/
```

### Passo 6 — Testes como evidência de regras

```bash
# Localizar testes do módulo
find . -name "*.test.js" -o -name "*.spec.js" | xargs grep -l "billing" 2>/dev/null

# Extrair descrições de casos de teste (cada it() = uma regra de negócio)
grep -rn "it(\|describe(\|test(" src/billing/ src/__tests__/ 2>/dev/null | grep -i "billing"
```

---

## Artefatos produzidos ao final

Seguindo o pipeline do Detective Spec, ao concluir as 5 fases você terá:

### `.detective/state.json`
Checkpoint de progresso — permite retomar sessão interrompida sem re-trabalho.

### `.detective/plan.md`
Lista priorizada de módulos dentro de `billing/` a investigar (gerada na Fase 1).

### `_detective_sdd/01-modules/billing.md`
Contrato completo do módulo. Estrutura obrigatória:

```markdown
# Módulo: billing

**Path:** src/billing/
**Confidence:** high | medium | low

## Responsabilidade
[1-2 linhas — o que faz no sistema]

## API Pública
- `createInvoice(userId, items): Invoice` — [propósito] [evidence: src/billing/invoice.js:34]
- `processPayment(invoiceId, method): Result` — [propósito] [evidence: src/billing/payment.js:67]

## Dependências
- `../db`: acesso persistência [evidence: src/billing/index.js:3]
- `../email`: notificações transacionais [evidence: src/billing/invoice.js:12]
- `stripe` (npm): gateway de pagamento [evidence: src/billing/payment.js:1]

## Invariantes
- `amount > 0` obrigatório antes de qualquer cobrança [evidence: src/billing/payment.js:42]
- `userId` deve existir em `users` table [evidence: src/billing/invoice.js:55]
- Invoice no status `paid` não pode ser alterada [evidence: src/billing/invoice.js:89, confidence: medium]

## Consumidores
- `src/orders/checkout.js:45` — chama `createInvoice` ao finalizar pedido
- `src/admin/refund.js:12` — chama `processPayment` com `method: 'refund'`

## Estado Interno
- `pendingRetries: Map` — fila em memória de pagamentos falhados (risco: perde em restart) [evidence: src/billing/retry.js:8]

## Suspeitas (precisa validação humana)
- Função `legacyCharge()` exportada mas sem call sites encontrados — possível dead code [confidence: low]
- `TAX_RATE = 0.08` hardcoded — pode estar desatualizado [evidence: src/billing/tax.js:3, confidence: low]
```

### `_detective_sdd/02-business-rules/billing.md`
Regras de negócio extraídas com evidência + formato Gherkin para cada uma.

### `_detective_sdd/03-flows/checkout-payment.md`
Fluxo completo da requisição de pagamento: trigger → call chain → side effects → estado mutado → falhas.

### `_detective_sdd/04-adrs/ADR-001.md`
Decisões arquiteturais implícitas retroativas (ex: "por que Stripe e não outro gateway?", "por que fila em memória e não Redis?").

### `_detective_sdd/99-traceability.md`
Tabela `spec → evidência (file:line)` + seção "Needs Human Review" para todos os itens `confidence: low`.

---

## Guardrails ativos (hard rules desta skill)

| Regra | Detalhe |
|---|---|
| Writes restritos | Apenas `.detective/` e `_detective_sdd/` — zero modificações em `src/billing/` |
| Toda afirmação = evidência | Formato `[evidence: file:line]` obrigatório |
| Inferência fraca = `[confidence: low]` | Entra na fila de validação humana |
| Não confundir "como é" com "como deveria ser" | Detetive documenta o real, não o ideal |
| Comentários podem mentir | Se contradizer o código, registrar ambos + `confidence: low` |

---

## Sequência recomendada com o kit completo

```
detective-spec (Fase 1–2) → billing.md contrato
         ↓
detective-spec (Fase 3)   → regras de negócio com Gherkin
         ↓
detective-spec (Fase 4–5) → fluxos + ADRs retroativos + traceability
         ↓
skill 01 (PO Feature Spec) — usa contratos como base para nova feature
skill 23 (Migration)        — usa specs como baseline antes de refatorar
skill 10 (Documenter)       — promove specs para docs/ oficial após validação
```
