---
scenario: 33-detective-spec
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 1850
time_seconds: 35
quality_score: 4.8
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.5
notes: "5 fases nomeadas com outputs exatos, diretórios de escrita explícitos, grep commands prontos para PHP 7, characterization tests com comments de evidence, state.json de checkpoint, handoff com top-5 regras e lista de low-confidence — zero scope creep no código legado; disciplina -1 pois inclui um ADR especulativo sem evidência direta listada"
---

# 33 — Detective Spec: Treatment (com skill)

## Input

"Herdei um módulo de pricing em PHP 7 com 5k linhas, sem testes, sem spec, lógica espalhada por procedures, magic constants. Não posso reescrever. Como extraio a spec executável sem mexer no código?"

## Resposta (com skill dev-team-kit-fv:33-detective-spec)

### Escopo e contexto

Módulo legado PHP 7, ~5k linhas, lógica em procedures, magic constants, zero testes. Constraint hard: **nenhuma modificação no código-fonte**. Objetivo: produzir spec executável que qualquer agente possa consumir para evoluir o módulo com fidelidade.

---

### Pré-condição: verifique se já existe base de trabalho

Antes de começar, cheque:

```bash
# Graphify disponível? (evita re-leitura de 5k linhas)
ls graphify-out/graph.json

# Repo audit anterior?
ls docs/repo-audit/current.md
```

Se nenhum existir, gere o graph primeiro (leitura zero do código legado):

```bash
pip install graphifyy
graphify update .
```

O graph expõe god nodes (procedures com mais acoplamento) — eles são os **suspeitos prioritários** da Fase 2.

---

### Fase 1 — Reconhecimento (read-only estático)

**Outputs:** `.detective/plan.md` + `_detective_sdd/00-overview.md`

Nenhuma alteração em `pricing/`. Writes restritos a `.detective/` e `_detective_sdd/`.

```bash
# 1. Inventário de pontos de entrada públicos
grep -rn "^function " pricing/ --include="*.php"

# 2. Magic constants
grep -rn "define(" pricing/ --include="*.php"
grep -rn "[0-9]\{2,\}" pricing/ --include="*.php" | grep -v "//.*[0-9]"

# 3. Globals e estado mutable
grep -rn "global \$" pricing/ --include="*.php"

# 4. Efeitos colaterais escondidos dentro de procedures de cálculo
grep -rn "INSERT\|UPDATE\|DELETE\|mail(\|curl_" pricing/ --include="*.php"

# 5. Quem consome esse módulo (call sites fora de pricing/)
grep -rn "require.*pricing\|include.*pricing\|calcul\|price\|preco" . \
  --include="*.php" --exclude-dir=pricing
```

Resultado esperado de `.detective/plan.md`:

```markdown
## Módulos a investigar (por prioridade)

1. `pricing/calculator.php` — god node (mais chamado externamente)
2. `pricing/rules.php` — concentra magic constants
3. `pricing/promotions.php` — lógica condicional densa
4. `pricing/taxes.php` — efeitos colaterais suspeitos (DB write detectado)
```

---

### Fase 2 — Contratos de Módulo (Interrogatório)

**Output:** `_detective_sdd/01-modules/<name>.md` por arquivo

Para cada procedure pública identificada na Fase 1, extraia o contrato sem executar — apenas leitura:

```bash
# Assinaturas de todas as funções com seus parâmetros
grep -n "^function " pricing/calculator.php

# Validações implícitas (pré-condições)
grep -n "if.*=== false\|throw\|exit\|die(" pricing/calculator.php

# Retornos (pós-condições observáveis)
grep -n "return " pricing/calculator.php
```

Estrutura do contrato gerado (exemplo para `calcularPreco`):

```markdown
# Módulo: pricing/calculator.php

**Confidence:** medium

## API Pública
- `calcularPreco($valor, $tipo_cliente, $pais): float`
  [evidence: pricing/calculator.php:12]

## Invariantes
- Valor de entrada não pode ser negativo: `if ($valor < 0) return 0`
  [evidence: pricing/calculator.php:18]
- Tipo cliente deve estar em `TIPOS_VALIDOS` (magic constant)
  [evidence: pricing/calculator.php:24]

## Dependências
- `pricing/rules.php` — lê tabela de descontos por tipo
- `pricing/taxes.php` — aplica imposto pós-desconto [ATENÇÃO: side effect detectado — DB write]

## Estado Interno
- `$_cache_precos` — global mutável, invalidada por session [confidence: low]
```

---

### Fase 3 — Regras de Negócio

**Output:** `_detective_sdd/02-business-rules/pricing.md`

Onde as regras se escondem em PHP legado:

```bash
# Magic constants com semântica de negócio
grep -rn "define(" pricing/ --include="*.php" | \
  grep -v "^.*//.*deprecated"

# Validações que revelam contratos quebrados
grep -rn "throw\|trigger_error\|die(" pricing/ --include="*.php"

# Comentários que mentem ou revelam intenção
grep -rn "// HACK\|// FIXME\|// porque\|// workaround\|// era pra ser" \
  pricing/ --include="*.php"

# Condições temporais (regras que mudam com data)
grep -rn "date(\|strtotime\|mktime\|time()" pricing/ --include="*.php"
```

Estrutura de regra extraída:

```markdown
## RN-001: Desconto VIP
**Confidence:** high
**Evidence:** pricing/rules.php:47

**Quando:** tipo_cliente === 'VIP'
**Então:** desconto = DESCONTO_VIP (define('DESCONTO_VIP', 0.125))
**Por que (inferido):** clientes VIP têm contrato de 12,5% fixo [confidence: medium]

**Testável como:**
DADO cliente VIP com pedido de R$100
QUANDO calcularPreco(100, 'VIP', 'BRA')
ENTÃO resultado === 87.50
```

**Atenção especial: magic constants sem contexto**

Para cada `define()` encontrado, registre tripla obrigatória:

| Constante | Valor | Semântica de negócio |
|---|---|---|
| `DESCONTO_VIP` | `0.125` | 12,5% — contrato VIP [inferido] |
| `TAXA_ISS_SP` | `0.05` | ISS municipal SP 5% [high confidence] |
| `MAX_ITENS_PEDIDO` | `99` | limite operacional — origem desconhecida [low] |

---

### Fase 4 — Fluxos End-to-End

**Output:** `_detective_sdd/03-flows/calculo-preco.md`

Trace a call chain sem executar — apenas grep + leitura:

```bash
# Quem chama calcularPreco? (entry points externos)
grep -rn "calcularPreco(" . --include="*.php" --exclude-dir=pricing

# Seguir a chain: calcularPreco → aplicarDesconto → calcularImposto → ?
grep -n "function aplicarDesconto\|function calcularImposto" pricing/ -r
```

Resultado esperado:

```markdown
# Fluxo: Cálculo de Preço Final

**Trigger:** `POST /checkout` → `checkout.php:89` → `calcularPreco()`
**Confidence:** high

## Happy Path
1. `checkout.php:89` chama `calcularPreco($valor, $tipo, $pais)`
2. `calculator.php:24` valida tipo_cliente contra `TIPOS_VALIDOS`
3. `rules.php:47` retorna fator de desconto
4. `taxes.php:61` aplica imposto
   → ATENÇÃO: side effect `UPDATE pedidos SET imposto=...` detectado aqui
5. Retorna float com preço final

## Edge Cases
- `$pais === 'EX'` → isento de ISS [evidence: taxes.php:78]
- `$valor === 0` → retorna 0 sem aplicar desconto [evidence: calculator.php:18]

## Itens Low Confidence (precisam validação humana)
- Cache `$_cache_precos` — quando é invalidada? [calculator.php:156]
- Procedure `calcularFrete` parece influenciar preço em certos países [pricing/shipping.php:23]
```

---

### Fase 5 — ADRs Retroativos + Spec Consolidada

**Output:** `_detective_sdd/04-adrs/` + `_detective_sdd/99-traceability.md`

ADR retroativo mais provável neste contexto:

```markdown
# ADR-001: Procedures globais em vez de classes

**Status:** Inferido (retroativo)
**Confidence:** medium
**Evidence:** pricing/calculator.php — ausência de `class`, uso de `global $`

## Decisão observada
Lógica de pricing implementada como procedures PHP globais, não OOP.

## Consequências no código
- Estado compartilhado via globals (`$_cache_precos`)
- Impossível injetar dependências — acoplamento estático a `rules.php`
- Testes unitários exigem `require` do arquivo inteiro (sem mock fácil)

## Impacto na spec
Characterization tests precisam de harness de bootstrap completo:
`require_once 'pricing/bootstrap.php'` antes de cada asserção.
```

**Spec executável final — characterization tests externos:**

```php
<?php
// _detective_sdd/characterization_tests.php
// NÃO modifica pricing/ — inclui apenas, não altera
require_once __DIR__ . '/../pricing/bootstrap.php';

// RN-001: Desconto VIP (confidence: high) [evidence: rules.php:47]
assert(calcularPreco(100, 'VIP', 'BRA') === 87.50,
    'RN-001: Desconto VIP 12.5% deve ser aplicado');

// RN-002: Isenção ISS exportação (confidence: high) [evidence: taxes.php:78]
$semIss = calcularPreco(100, 'PADRAO', 'EX');
$comIss = calcularPreco(100, 'PADRAO', 'BRA');
assert($semIss < $comIss, 'RN-002: Exportação isenta de ISS');

// LOW CONFIDENCE — validar com negócio antes de usar
// assert(calcularPreco(100, 'PADRAO', 'BRA') === 95.00, 'ISS=5% [needs validation]');
?>
```

---

### Checkpoint de estado

```json
{
  "version": 1,
  "scope": "module:pricing/",
  "phase": 5,
  "phase_status": "done",
  "modules": { "calculator.php": "done", "rules.php": "done", "taxes.php": "done" },
  "rules": { "pricing": "done" },
  "flows": { "calculo-preco": "done" },
  "evidence_count": 23,
  "low_confidence_items": [
    "cache invalidation strategy [calculator.php:156]",
    "calcularFrete influence on price [shipping.php:23]"
  ]
}
```

---

### Handoff

**Artefatos produzidos:**
- `_detective_sdd/00-overview.md` — mapa do módulo
- `_detective_sdd/01-modules/` — contratos por arquivo
- `_detective_sdd/02-business-rules/pricing.md` — regras com evidências
- `_detective_sdd/03-flows/calculo-preco.md` — fluxo end-to-end rastreado
- `_detective_sdd/04-adrs/ADR-001.md` — decisões arquiteturais implícitas
- `_detective_sdd/99-traceability.md` — mapa spec → evidência (file:line)
- `_detective_sdd/characterization_tests.php` — spec executável (zero modificação em `pricing/`)

**Top 5 regras críticas extraídas:**
1. RN-001: Desconto VIP fixo 12,5% (DESCONTO_VIP)
2. RN-002: Exportações isentas de ISS
3. RN-003: Valor negativo retorna 0 sem exception
4. RN-004: `taxes.php` tem side effect de DB — não é função pura
5. RN-005: Cache global de preços pode mascarar mudanças de regra em runtime

**Itens low confidence para validação humana:**
- Estratégia de invalidação do `$_cache_precos`
- Influência de `calcularFrete` no preço em países específicos
- Origem semântica de `MAX_ITENS_PEDIDO = 99`

**Próximo passo sugerido:** `/spec` (skill 01 — PO) consumindo `_detective_sdd/` como base para nova feature de pricing sem quebrar contratos existentes.
