---
scenario: semgrep-scanner
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 210
tokens_out_approx: 1480
time_seconds: 18
quality_score: 3.3
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 4
  discipline: 4
pass_fail: baseline
delta_vs_baseline: n/a
notes: "Cold answer — no skill loaded. Subagent dev-team-kit-fv:semgrep-scanner does not exist yet in .claude/agents/."
---

# Semgrep Multi-Linguagem em Paralelo — Baseline (sem skill)

## Contexto

Repo com três stacks: TypeScript (frontend + backend), Python (workers), Go (microsserviços). Objetivo: rodar Semgrep com regras OWASP + CWE em paralelo por linguagem e agregar os resultados SARIF.

---

## 1. Estratégia de paralelização

Semgrep não tem flag nativa `--parallel-by-lang`, mas você consegue paralelismo lançando processos independentes por grupo de linguagem e reunindo os SARIFs ao final.

### Estrutura de diretórios sugerida

```
scan/
├── run.sh            # orquestrador principal
├── ts.sarif          # output TypeScript
├── py.sarif          # output Python
├── go.sarif          # output Go
└── merged.sarif      # SARIF agregado final
```

### Script de orquestração (`run.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"
OUT="./scan"
mkdir -p "$OUT"

# --- 1. Scans em paralelo por linguagem ---
semgrep scan \
  --config p/owasp-top-ten \
  --config p/typescript \
  --config p/javascript \
  --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" \
  --sarif --output "$OUT/ts.sarif" \
  "$ROOT" &
PID_TS=$!

semgrep scan \
  --config p/owasp-top-ten \
  --config p/python \
  --config p/flask \
  --include="*.py" \
  --sarif --output "$OUT/py.sarif" \
  "$ROOT" &
PID_PY=$!

semgrep scan \
  --config p/owasp-top-ten \
  --config p/golang \
  --config p/gosec \
  --include="*.go" \
  --sarif --output "$OUT/go.sarif" \
  "$ROOT" &
PID_GO=$!

wait $PID_TS $PID_PY $PID_GO
echo "Scans concluídos."

# --- 2. Merge dos SARIFs ---
# Opção A: jq (leve, sem dependências extras)
jq -s '
  .[0] as $base |
  $base |
  .runs = ([.[].runs] | flatten)
' "$OUT/ts.sarif" "$OUT/py.sarif" "$OUT/go.sarif" > "$OUT/merged.sarif"

echo "SARIF agregado em $OUT/merged.sarif"
```

---

## 2. Rulesets por linguagem

| Linguagem | Rulesets recomendados |
|---|---|
| TypeScript/JS | `p/owasp-top-ten`, `p/typescript`, `p/javascript`, `p/react`, `p/nextjs` |
| Python | `p/owasp-top-ten`, `p/python`, `p/flask` (ou `p/django`) |
| Go | `p/owasp-top-ten`, `p/golang`, `p/gosec` |

Para CWE explícito, adicionar `p/cwe-top-25` a todos.

---

## 3. Adicionando CWE

```bash
# Adicionar às chamadas acima:
--config p/cwe-top-25
```

Ou usar o ruleset consolidado que já inclui mapeamento CWE → OWASP:

```bash
semgrep scan --config p/security-audit ...
```

---

## 4. Agregação de SARIF sem jq

Se preferir Python:

```python
import json, pathlib

sarif_files = ["scan/ts.sarif", "scan/py.sarif", "scan/go.sarif"]
merged = json.loads(pathlib.Path(sarif_files[0]).read_text())
for f in sarif_files[1:]:
    other = json.loads(pathlib.Path(f).read_text())
    merged["runs"].extend(other["runs"])

pathlib.Path("scan/merged.sarif").write_text(json.dumps(merged, indent=2))
print("Merged", sum(len(r["results"]) for r in merged["runs"]), "findings")
```

---

## 5. Consumir o SARIF agregado

```bash
# Contar findings por severidade
jq '[.runs[].results[].level] | group_by(.) | map({level: .[0], count: length})' scan/merged.sarif

# Exportar CSV de findings
jq -r '.runs[].results[] | [.level, .ruleId, .locations[0].physicalLocation.artifactLocation.uri] | @csv' scan/merged.sarif
```

---

## 6. CI (GitHub Actions)

```yaml
jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install semgrep
      - name: Scan TS
        run: semgrep scan --config p/owasp-top-ten --config p/typescript --include="*.ts" --sarif --output ts.sarif &
      - name: Scan Python
        run: semgrep scan --config p/owasp-top-ten --config p/python --include="*.py" --sarif --output py.sarif &
      - name: Scan Go
        run: semgrep scan --config p/owasp-top-ten --config p/golang --config p/gosec --include="*.go" --sarif --output go.sarif &
      - run: wait
      - name: Upload SARIFs
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: ts.sarif
      # repetir para py.sarif, go.sarif
```

---

## 7. Riscos e ressalvas

- `p/owasp-top-ten` tem sobreposição com `p/cwe-top-25` — espere duplicatas no merged SARIF; use `semgrep-triager` ou o script Python para dedupar por `ruleId + uri + startLine`.
- Scans em paralelo num CI compartilhado podem estourar memória; ajustar `--max-memory` por processo se necessário.
- Go: `p/gosec` cobre goroutine safety e cryptography — priorizar findings de `G401`/`G501` (crypto fraca).
- TS backend: revisar findings de `javascript.lang.security.audit.sqli` — frequentes em ORMs com interpolação de string.
