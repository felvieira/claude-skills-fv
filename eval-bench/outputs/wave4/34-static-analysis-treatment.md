---
scenario: 34-static-analysis
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 1380
time_seconds: 31
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.5
notes: "rulesets concretos por linguagem, subagents nomeados, pipeline sequenciado, triagem com anti-rationalization table, SARIF consolidation com jq, CI gate explícito"
---

# Static Analysis — Repo TS + Python + Go, pre-release

## Contexto detectado

- 3 linguagens primárias: TypeScript, Python, Go
- Ferramentas: Semgrep (scan amplo) + CodeQL (taint tracking interprocedural)
- Meta: pipeline paralelo → SARIF consolidado → triagem TP/FP → gate de release

---

## 1. Semgrep — Paralelo por linguagem

Para 3 linguagens, despachar o subagent **`semgrep-scanner`** que executa scans em paralelo e agrega SARIF. Manualmente, o equivalente é:

```bash
# Rodar em paralelo
semgrep \
  --config=p/typescript \
  --config=p/javascript \
  --config=p/owasp-top-ten \
  --config=p/secrets \
  --include="*.ts" --include="*.tsx" \
  --sarif --output=semgrep-ts.sarif &

semgrep \
  --config=p/python \
  --config=p/owasp-top-ten \
  --config=p/security-audit \
  --include="*.py" \
  --sarif --output=semgrep-py.sarif &

semgrep \
  --config=p/golang \
  --config=p/gosec \
  --include="*.go" \
  --sarif --output=semgrep-go.sarif &

wait
```

> Semgrep `--config=auto` também detecta as 3 linguagens sozinho, mas segmentar permite usar rulesets específicos por stack (ex: `p/gosec` para Go, `p/secrets` para TS).

---

## 2. CodeQL — Paralelo por linguagem

CodeQL exige banco de dados separado por linguagem. Rodar em paralelo via subagent **`codeql-runner`** ou manualmente:

```bash
# Typescript/JavaScript (mesma database)
codeql database create db-js \
  --language=javascript \
  --source-root=. \
  --include-extension=.ts,.tsx,.js &

# Python
codeql database create db-py \
  --language=python \
  --source-root=. \
  --include-extension=.py &

# Go
codeql database create db-go \
  --language=go \
  --source-root=. \
  --include-extension=.go &

wait

codeql database analyze db-js --format=sarif-latest --output=codeql-js.sarif \
  codeql/javascript-security-extended &
codeql database analyze db-py --format=sarif-latest --output=codeql-py.sarif \
  codeql/python-security-extended &
codeql database analyze db-go --format=sarif-latest --output=codeql-go.sarif \
  codeql/go-security-extended &

wait
```

**Quando usar CodeQL e não Semgrep:** finding que envolve data flow entre funções/arquivos (ex: input do usuário chegando a SQL sem sanitização via 3 funções intermediárias). Semgrep não rastreia esse fluxo — CodeQL sim.

---

## 3. Consolidar SARIF

Após gerar 6 arquivos `.sarif` (3 Semgrep + 3 CodeQL), consolidar via subagent **`sarif-parsing`** ou com `jq`:

```bash
jq -s '{ version: "2.1.0", "$schema": "https://json.schemastore.org/sarif-2.1.0.json", runs: [.[].runs[]] }' \
  semgrep-ts.sarif semgrep-py.sarif semgrep-go.sarif \
  codeql-js.sarif codeql-py.sarif codeql-go.sarif \
  > consolidated.sarif
```

**Deduplicar findings repetidos** (Semgrep e CodeQL podem pegar a mesma vulnerabilidade):

```bash
# Agrupar por rule + localização para identificar duplicatas
jq '[.runs[].results[] | {rule: .ruleId, file: .locations[0].physicalLocation.artifactLocation.uri, line: .locations[0].physicalLocation.region.startLine}] | unique' \
  consolidated.sarif
```

**Resumo por severidade:**

```bash
# Contar por nível
jq '[.runs[].results[] | .level] | group_by(.) | map({level: .[0], count: length})' \
  consolidated.sarif
```

---

## 4. Triagem TP/FP

Para >20 findings, usar o subagent **`semgrep-triager`**. Protocolo de triagem inline:

| Finding | Classificação | Ação |
|---|---|---|
| SQL concat com variável de request | TP | Fix imediato, bloqueia merge |
| Weak crypto em hash de deduplicação | FP | `// nosemgrep: rule-id` + comentário |
| Input não validado em Go handler | Needs Investigation | Escalar para skill 06 |
| Secret hardcoded em arquivo de config | TP (Critical) | Revogar + fix + bloqueia merge |

**Classificar cada finding:**

- **True Positive (TP):** bug real, exploitável no contexto real do código. Fix obrigatório (Critical/High).
- **False Positive (FP):** regra disparou mas o contexto é seguro. Suprimir com justificativa explícita.
- **Needs Investigation:** comportamento ambíguo, fluxo complexo. Escalar para skill 06 (Security Review).

**Suprimir FP corretamente:**

```typescript
// nosemgrep: javascript.lang.security.audit.non-literal-regexp  // motivo: pattern vem de constante hardcoded validada em compile-time
const pattern = new RegExp(ALLOWED_PATTERNS[type]);
```

```python
# nosemgrep: python.lang.security.audit.weak-cryptographic-algorithm  # motivo: md5 usado para cache key, não para segurança
cache_key = md5(content).hexdigest()
```

```go
// nosemgrep: go.lang.security.audit.database.string-formatted-query  // motivo: query é constante, $tableName vem de enum interno não influenciável por usuário
query := fmt.Sprintf("SELECT * FROM %s WHERE id = $1", tableName)
```

**Anti-rationalization — pensamentos que indicam STOP antes de suprimir:**

| Pensamento | Realidade |
|---|---|
| "Isso parece FP" | Verificar fluxo real antes de descartar |
| "Esse módulo é legado, não toca" | Legado é onde CVE mora — tratar igual |
| "Vamos abrir issue e seguir" | Critical aberto = no merge |
| "A regra é genérica demais" | Investigar antes de descartar |

---

## 5. Pipeline completo — ordem e gates

```
PRÉ-RELEASE
│
├── [paralelo] semgrep-scanner (TS + Python + Go)     ~30-60s
├── [paralelo] codeql-runner   (JS + Python + Go)     ~10-30min
│
├── sarif-parsing: consolidar + deduplicar            ~2min
│
├── triagem:
│   ├── Critical/High → fix obrigatório antes de merge
│   ├── Medium        → issue aberta, fix no próximo sprint
│   ├── Low/Info      → backlog
│   └── FP            → suprimir com nosemgrep + comentário
│
├── skill 06 (Security Review): valida contexto OWASP
│   dos Critical/High, confirma TP/FP complexos
│
├── variant-analysis: se Critical/High tem padrão recorrente
│   → gera custom rule para CI
│
└── skill 11 (Reviewer): gate final
    → Critical/High aberto = BLOQUEIO DE MERGE
```

**Semgrep como gate de PR (rápido), CodeQL semanal em main (profundo):**

```yaml
# .github/workflows/security.yml
jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install semgrep
      - run: |
          semgrep --config=p/typescript --config=p/python --config=p/golang \
            --config=p/owasp-top-ten --config=p/secrets \
            --error --severity=ERROR \
            --baseline-ref=origin/main \
            --sarif --output=semgrep.sarif
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: semgrep.sarif
```

`--baseline-ref=origin/main` faz o CI mostrar só findings novos — não quebra em debt pré-existente.

---

## 6. Output format para handoff

```markdown
# Static Analysis Report — 2026-05-22

**Tools:** Semgrep + CodeQL
**Scope:** src/ (TypeScript, Python, Go)
**Duration:** Semgrep 45s | CodeQL 18min

## Summary
- Critical: 2
- High: 4
- Medium: 11
- Low: 18
- FP suprimidos: 6

## Critical — bloqueia merge

### F-001: SQL Injection — src/handlers/user.py:87
**Rule:** python.lang.security.sql-injection (Semgrep)
**Evidence:** `query = f"SELECT * FROM users WHERE id = {user_id}"`
**Fix:** `cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`

### F-002: Secret hardcoded — config/settings.ts:12
**Rule:** generic.secrets.security.detected-generic-api-key (Semgrep)
**Fix:** mover para variável de ambiente

## Handoff para skill 06
- F-001 e F-002: fix obrigatório, bloqueiam merge
- F-003 a F-006 (High): validar contexto antes da release
- sarif: consolidated.sarif
```

---

## Subagents usados neste cenário

| Subagent | Quando disparar |
|---|---|
| `semgrep-scanner` | repo multi-linguagem, paralela scan por lang |
| `codeql-runner` | taint tracking interprocedural necessário |
| `sarif-parsing` | consolidar + deduplicar 2+ arquivos SARIF |
| `semgrep-triager` | >20 findings para triagem automática |
| `variant-analysis` | bug recorrente, gerar custom rule reusável |
