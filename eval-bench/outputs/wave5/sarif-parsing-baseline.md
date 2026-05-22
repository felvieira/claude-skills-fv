---
scenario: sarif-parsing
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 85
tokens_out_approx: 520
time_seconds: 9
quality_score: 2.0
quality_breakdown:
  specificity: 2
  completeness: 2
  correctness: 3
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: null
notes: "Cold answer — no skill loaded. Missed npm audit SARIF conversion gap, no fingerprint-based dedup, no library recommendations, no consensus detection."
---

# SARIF Aggregation — Baseline (Cold Answer)

## Como agregar 3 SARIF de ferramentas diferentes e gerar relatório executivo

Para consolidar SARIF de Semgrep, CodeQL e npm audit, siga estes passos:

### 1. Agregar em um único SARIF

Use `jq` para mesclar os arquivos:

```bash
jq -s '{
  version: "2.1.0",
  runs: [.[].runs[]]
}' semgrep.sarif codeql.sarif npmaudit.sarif > aggregated.sarif
```

### 2. Deduplicar

Findings duplicados ocorrem quando a mesma vulnerabilidade é detectada por múltiplas ferramentas. A chave de dedup mais simples é `(file, line, rule)`.

```bash
jq '[.runs[].results[] | {
  file: .locations[0].physicalLocation.artifactLocation.uri,
  line: .locations[0].physicalLocation.region.startLine,
  rule: .ruleId
}] | unique' aggregated.sarif
```

Isso é uma simplificação — regras de ferramentas diferentes raramente têm o mesmo `ruleId`.

### 3. Normalizar severidades

Cada ferramenta usa escalas diferentes:
- Semgrep: `ERROR`, `WARNING`, `INFO`
- CodeQL: `error`, `warning`, `note`
- npm audit: `critical`, `high`, `moderate`, `low`

Você precisa mapear manualmente para uma escala comum (ex: Critical/High/Medium/Low).

### 4. Gerar relatório

Após a agregação, extraia contagens por severidade:

```bash
jq '[.runs[].results[] | .level] | group_by(.) | map({(.[0]): length}) | add' aggregated.sarif
```

### 5. Integração com viewers

O arquivo `aggregated.sarif` pode ser importado no GitHub Security tab ou SonarQube.

---

**Limitações desta abordagem:**
- A dedup por `(file, line, rule)` não captura casos onde ferramentas diferentes detectam o mesmo bug com regras de nomes distintos (ex: `js/sql-injection` vs `javascript.lang.security.audit.sql-injection`)
- npm audit não gera SARIF nativo — você precisaria converter antes
- O relatório executivo precisa ser gerado separadamente
