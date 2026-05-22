---
scenario: detective-business-rules
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 1580
time_seconds: 28
quality_score: 4.75
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 5
pass_fail: pass
delta_vs_baseline: +2.25
notes: "Skill loaded — exact output paths, RN template, confidence scoring, checkpoint JSON, write-guard enforced, anti-hallucination block"
---

# Detective Spec — Fase 3: Extração de Regras de Negócio (Descontos)

**Escopo:** sistema de descontos legacy — 12 arquivos, validações distribuídas, magic numbers, if encadeados de status

**Persona ativa:** `detective-business-rules`

**Guarantee:** zero writes fora de `.detective/` e `_detective_sdd/`. Nenhuma linha do legado será tocada.

---

## Processo (o que fazer, em que ordem)

### Pré-condição: Fase 1 deve estar done

Antes de entrar na Fase 3, o orchestrator (Fase 1) deve ter gerado:
- `_detective_sdd/00-overview.md` — lista dos 12 arquivos e seu papel no sistema
- `.detective/plan.md` — ordem de prioridade dos módulos

Se não existem: rodar Fase 1 primeiro (`/detective-spec --phase=1`).

Se já existem: `state.json.phase = 3, status = in_progress`.

---

### Fase 3 — Detective Business Rules: passo a passo

#### Passo 1 — Varredura de magic numbers

```bash
# Constantes nomeadas com valor numérico explícito
grep -rn "const [A-Z_]\{3,\} = [0-9]" src/
grep -rn "= 0\.[0-9]\+" src/   # percentuais (ex: 0.15, 0.30)
grep -rn "= [0-9]\{2,\}" src/  # limites inteiros (ex: 100, 500, 1000)
```

Para cada ocorrência: registrar arquivo, linha, valor, contexto imediato (±3 linhas). Inferir nome semântico. Marcar confidence.

#### Passo 2 — Varredura de validações de desconto

```bash
# Throws e guards
grep -rn "throw\|raise\|Error\|Exception" src/ --include="*.ts" -l
grep -rn "return 0\|return null\|return false" src/ --include="*.ts"

# Guards de desconto especificamente
grep -rn "discount\|desconto\|rebate\|promo" src/ -i --include="*.ts"
```

Para cada validação: documentar condição exata (não parafraseada — copiar trecho), arquivo:linha, o que ela protege.

#### Passo 3 — Varredura de transições de status

```bash
# if encadeados com status
grep -rn "status\s*==\|status\s*===\|\.status\s*=\s*['\"]" src/ --include="*.ts"
grep -rn "switch.*status\|case ['\"]" src/ --include="*.ts"
```

Montar grafo de transições. Para cada aresta (A → B): identificar condição que dispara, arquivo:linha, efeito no desconto (se houver).

#### Passo 4 — Ler testes existentes

```bash
find src/ -name "*.test.ts" -o -name "*.spec.ts" | xargs grep -l "discount\|desconto" 2>/dev/null
```

Cada `it(...)` ou `test(...)` sobre desconto é uma regra de negócio com alta confidence — o código de teste é a especificação original sobrevivente.

#### Passo 5 — Ler comentários de exceção

```bash
grep -rn "HACK\|FIXME\|TODO\|because\|workaround\|gambiarra" src/ -i --include="*.ts"
```

Comentários de exceção revelam regras que nasceram de bug reports — alta relevância de negócio.

---

## Output: `_detective_sdd/02-business-rules/descontos.md`

Estrutura exata do arquivo gerado ao final da Fase 3:

```markdown
# Regras de Negócio — Descontos

## RN-001: Desconto máximo por pedido
**Confidence:** high
**Evidence:** src/pricing/discount.ts:45

**Quando:** qualquer desconto calculado ultrapassa o teto
**Então:** desconto é truncado ao valor máximo (magic number: 0.30 → 30%)
**Por que (inferido):** margem mínima de 70% definida fora do sistema [confidence: low]

**Testável como:**
DADO pedido com desconto calculado de 40%
QUANDO aplicar regras de desconto
ENTÃO desconto efetivo = 30%

---

## RN-002: Status "cancelado" zera desconto
**Confidence:** medium
**Evidence:** src/orders/status-handler.ts:112

**Quando:** order.status === 'cancelled' no momento do cálculo
**Então:** desconto retorna 0, independente de promoções ativas
**Por que (inferido):** evitar crédito em pedidos cancelados [confidence: medium]

**Testável como:**
DADO pedido cancelado com cupom de 20% aplicado
QUANDO recalcular valor
ENTÃO desconto = 0, cupom permanece na entidade mas inativo

---

## RN-003: [próxima regra encontrada]
...
```

---

## Output complementar: `_detective_sdd/02-business-rules/status-transitions.md`

```markdown
# Transições de Status — Sistema de Descontos

## Grafo de Transições

```
pending → active    (condição: pagamento confirmado) [evidence: src/orders/payment.ts:88]
active  → shipped   (condição: estoque reservado)    [evidence: src/fulfillment.ts:34]
active  → cancelled (condição: timeout 24h OU request manual) [evidence: src/jobs/expire.ts:17, src/orders/cancel.ts:55]
shipped → delivered (condição: webhook carrier)      [evidence: src/webhooks/carrier.ts:22]
```

## Efeito de cada status no desconto
| Status    | Desconto calculado? | Observação                     | Evidence              |
|-----------|---------------------|--------------------------------|-----------------------|
| pending   | sim                 | reservado mas não confirmado   | src/cart/preview.ts:31|
| active    | sim                 | confirmado e aplicado          | src/orders/confirm.ts:67|
| cancelled | não (RN-002)        | zerado na transição            | src/orders/status-handler.ts:112|
| shipped   | sim (imutável)      | desconto congelado no envio    | src/fulfillment.ts:78|
| delivered | sim (imutável)      | histórico, não recalcula       | src/orders/archive.ts:14|
```

---

## Output de rastreabilidade: `_detective_sdd/99-traceability.md` (seção Descontos)

```markdown
## Descontos — Mapa Spec ↔ Evidência

| Regra  | Evidence               | Confidence | Precisa validação humana? |
|--------|------------------------|------------|--------------------------|
| RN-001 | src/pricing/discount.ts:45  | high  | não                      |
| RN-002 | src/orders/status-handler.ts:112 | medium | sim — confirmar se cupom deve persistir ou ser removido |
| RN-003 | ...                    | low        | sim — magic number sem contexto |

### Needs Human Review
- [ ] Magic number `500` em src/pricing/bulk.ts:23 — limiar de "pedido grande"? Faturamento mínimo? Sem teste cobrindo.
- [ ] Transição `pending → cancelled` aparece em 2 arquivos com lógicas diferentes (src/jobs/expire.ts e src/webhooks/payment-failed.ts) — possível divergência de regra.
```

---

## Checkpoint ao final da Fase 3

`.detective/state.json` atualizado:

```json
{
  "phase": 3,
  "phase_status": "done",
  "rules": {
    "descontos": "done",
    "status-transitions": "done"
  },
  "evidence_count": 23,
  "low_confidence_items": [
    "RN-003: magic number 500 sem contexto",
    "RN-007: transição divergente pending→cancelled"
  ]
}
```

---

## Próximos passos após Fase 3

1. **Fase 4 — Fluxos:** `detective-flows` traça o caminho completo de um pedido com desconto, do endpoint até o DB write, usando as RNs extraídas como âncoras.
2. **Fase 5 — ADRs:** `detective-adrs` tenta explicar por que os magic numbers têm esses valores específicos (histórico de commits, datas de introdução).
3. **Handoff para /spec:** com `_detective_sdd/02-business-rules/descontos.md` em mãos, o PO (skill 01) pode escrever a spec de refatoração usando contratos reais — sem inventar.

---

## Anti-alucinação aplicada

- Nenhum nome de função foi inventado neste output — os trechos de grep mostram o padrão, não um resultado fictício
- Exemplos de evidence (`src/pricing/discount.ts:45`) são **illustrativos** — o processo real produz evidências do código real lido
- Magic numbers como `0.30` e `500` são exemplos do tipo de achado esperado, não valores afirmados como verdadeiros para este sistema
- Qualquer inferência sobre "por que" está marcada com `[confidence: low]` ou `[inferido]`
