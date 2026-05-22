---
scenario: semgrep-scanner
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 3800
tokens_out_approx: 2100
time_seconds: 31
quality_score: 4.8
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.5
notes: "Skill static-analysis:semgrep (Trail of Bits plugin) loaded. dev-team-kit-fv:semgrep-scanner subagent does not exist in .claude/agents/ — gap surfaced below."
---

# Semgrep Multi-Linguagem em Paralelo — Treatment (com skill)

> Skill carregada: `static-analysis:semgrep` (Trail of Bits plugin v1.1.0)
> Subagent `dev-team-kit-fv:semgrep-scanner` referenciado em skill 34 mas **não existe** em `.claude/agents/`. Gap registrado no final.

---

## Arquitetura de Orquestração (conforme skill)

```
MAIN AGENT
  1. Detectar linguagens + verificar Semgrep Pro
  2. Selecionar rulesets (OWASP + CWE + específicos por lang)
  3. HARD GATE: apresentar plano e aguardar aprovação
  4. Spawn Tasks paralelos: semgrep-scanner (1 por linguagem)
  5. Spawn Tasks paralelos: semgrep-triager (1 por linguagem)
  6. Merge SARIF + relatório final
```

---

## Step 1 — Detectar linguagens e Pro

```bash
# Verificar Semgrep Pro
semgrep --pro --validate --config p/default 2>/dev/null \
  && echo "Pro: DISPONÍVEL" || echo "Pro: OSS apenas"

# Contar arquivos por linguagem
fd -t f -e ts -e tsx -e js -e jsx -e py -e go \
  | sed 's/.*\.//' | sort | uniq -c | sort -rn
```

Resultado esperado para este repo:
- TypeScript/JS → frontend (React/Next.js) + backend (Node/Express/NestJS)
- Python → workers (possivelmente async, Flask ou scripts puros)
- Go → microsserviços (net/http, Gin, gRPC)

---

## Step 2 — Rulesets selecionados

### Plano de rulesets para aprovação (Step 3)

| Linguagem | Rulesets obrigatórios | Rulesets opcionais |
|---|---|---|
| TypeScript/JS (frontend) | `p/typescript`, `p/javascript`, `p/react`, `p/owasp-top-ten` | `p/nextjs`, `p/cwe-top-25` |
| TypeScript/JS (backend) | `p/nodejs`, `p/security-audit`, `p/secrets` | `p/express` |
| Python | `p/python`, `p/owasp-top-ten`, `p/secrets` | `p/flask`, `p/django` |
| Go | `p/golang`, `p/gosec`, `p/owasp-top-ten` | — |
| Todos | `https://github.com/trailofbits/semgrep-rules` | — |

> Trail of Bits rules são **obrigatórias** pela skill — cobrem padrões não presentes no registry oficial.

---

## Step 3 — HARD GATE (para uso interativo)

Antes de executar, apresentar ao usuário:

```
## Plano de Scan Semgrep

Target: <repo-root>
Output: ./semgrep-results-001/
Engine: Semgrep Pro (cross-file) | OSS (single-file)

Linguagens detectadas:
- TypeScript/JS (frontend + backend)
- Python (workers)
- Go (microsserviços)

Rulesets que serão executados:
- TypeScript: p/typescript, p/javascript, p/react, p/nextjs, p/nodejs, p/owasp-top-ten, p/cwe-top-25, p/secrets
- Python: p/python, p/owasp-top-ten, p/secrets
- Go: p/golang, p/gosec, p/owasp-top-ten
- Todos: Trail of Bits (https://github.com/trailofbits/semgrep-rules)

Estratégia: 3 Tasks paralelos (scanner) → 3 Tasks paralelos (triager)

Confirmar? (yes / modificar rulesets)
```

> Em modo não-interativo (subagent autônomo): assumir aprovação implícita e continuar.

---

## Step 4 — Spawn paralelo dos scan Tasks

Disparar **na mesma mensagem** (paralelismo real):

### Task 1 — TypeScript Scanner

```bash
mkdir -p semgrep-results-001

semgrep scan \
  --metrics=off \
  --config p/typescript \
  --config p/javascript \
  --config p/react \
  --config p/nextjs \
  --config p/nodejs \
  --config p/owasp-top-ten \
  --config p/cwe-top-25 \
  --config p/secrets \
  --config https://github.com/trailofbits/semgrep-rules \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" \
  --sarif --output semgrep-results-001/ts.sarif \
  --json --output semgrep-results-001/ts.json \
  .
```

### Task 2 — Python Scanner

```bash
semgrep scan \
  --metrics=off \
  --config p/python \
  --config p/owasp-top-ten \
  --config p/cwe-top-25 \
  --config p/secrets \
  --config https://github.com/trailofbits/semgrep-rules \
  --include="*.py" \
  --sarif --output semgrep-results-001/py.sarif \
  --json --output semgrep-results-001/py.json \
  .
```

### Task 3 — Go Scanner

```bash
semgrep scan \
  --metrics=off \
  --config p/golang \
  --config p/gosec \
  --config p/owasp-top-ten \
  --config p/cwe-top-25 \
  --config https://github.com/trailofbits/semgrep-rules \
  --include="*.go" \
  --sarif --output semgrep-results-001/go.sarif \
  --json --output semgrep-results-001/go.json \
  .
```

Se Semgrep Pro disponível, adicionar `--pro` e `-j 1` a cada comando (requerido pelo Pro engine).

---

## Step 5 — Spawn paralelo dos triage Tasks

Após os scan Tasks concluírem, disparar **na mesma mensagem**:

- **Task 4 — TS Triager**: lê `semgrep-results-001/ts.json`, lê código fonte das localizações, classifica TP/FP/needs-investigation, grava `semgrep-results-001/ts-triage.json`
- **Task 5 — Python Triager**: mesmo padrão sobre `py.json` → `py-triage.json`
- **Task 6 — Go Triager**: mesmo padrão sobre `go.json` → `go-triage.json`

Subagent type para ambas as fases: `static-analysis:semgrep-triager`

---

## Step 6 — Merge SARIF e relatório

### Merge via script da skill

```bash
uv run ~/.claude/plugins/cache/trailofbits/static-analysis/1.1.0/scripts/merge_triaged_sarif.py \
  semgrep-results-001/
```

Fallback manual (Python puro, sem dependências):

```python
import json, pathlib

sarif_files = [
    "semgrep-results-001/ts.sarif",
    "semgrep-results-001/py.sarif",
    "semgrep-results-001/go.sarif",
]

merged = json.loads(pathlib.Path(sarif_files[0]).read_text())
for f in sarif_files[1:]:
    other = json.loads(pathlib.Path(f).read_text())
    merged["runs"].extend(other["runs"])

# Dedup por (ruleId, uri, startLine)
seen = set()
for run in merged["runs"]:
    unique = []
    for r in run.get("results", []):
        key = (
            r.get("ruleId"),
            r.get("locations", [{}])[0]
             .get("physicalLocation", {})
             .get("artifactLocation", {})
             .get("uri"),
            r.get("locations", [{}])[0]
             .get("physicalLocation", {})
             .get("region", {})
             .get("startLine"),
        )
        if key not in seen:
            seen.add(key)
            unique.append(r)
    run["results"] = unique

pathlib.Path("semgrep-results-001/findings-triaged.sarif").write_text(
    json.dumps(merged, indent=2)
)
total = sum(len(r["results"]) for r in merged["runs"])
print(f"Merged {total} findings (deduped) → findings-triaged.sarif")
```

### Contagem por severidade

```bash
jq '[.runs[].results[].level] | group_by(.) | map({level: .[0], count: length})' \
  semgrep-results-001/findings-triaged.sarif
```

---

## Estrutura de output esperada

```
semgrep-results-001/
├── ts.sarif            # raw TS
├── ts.json             # raw TS (JSON)
├── ts-triage.json      # TP/FP/needs-investigation (TS)
├── py.sarif
├── py.json
├── py-triage.json
├── go.sarif
├── go.json
├── go-triage.json
└── findings-triaged.sarif   # merged, somente TPs
```

---

## Integração CI (GitHub Actions)

```yaml
name: Semgrep Multi-Lang
on: [push, pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install semgrep

      - name: Scan TS (background)
        run: |
          semgrep scan --metrics=off \
            --config p/typescript --config p/owasp-top-ten --config p/secrets \
            --include="*.ts" --include="*.tsx" \
            --sarif --output ts.sarif . &

      - name: Scan Python (background)
        run: |
          semgrep scan --metrics=off \
            --config p/python --config p/owasp-top-ten --config p/secrets \
            --include="*.py" \
            --sarif --output py.sarif . &

      - name: Scan Go (background)
        run: |
          semgrep scan --metrics=off \
            --config p/golang --config p/gosec --config p/owasp-top-ten \
            --include="*.go" \
            --sarif --output go.sarif . &

      - run: wait

      - uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: ts.sarif }
      - uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: py.sarif }
      - uses: github/codeql-action/upload-sarif@v3
        with: { sarif_file: go.sarif }
```

---

## Gap detectado — subagent `dev-team-kit-fv:semgrep-scanner`

A skill 34 (`skills/34-static-analysis/SKILL.md`) referencia:

> `semgrep-scanner` — executa scans em paralelo por categoria de linguagem, agrega SARIF. Use quando repo tem 2+ linguagens primárias.

Mas o arquivo `.claude/agents/semgrep-scanner.md` **não existe** neste repositório. Consequências:

1. Qualquer invocação de `Agent({ subagent_type: "dev-team-kit-fv:semgrep-scanner" })` falhará ou cairá em cold-start sem protocolo.
2. O subagent `static-analysis:semgrep-scanner` do plugin Trail of Bits **existe** e cobre o caso, mas é um namespace diferente.
3. Recomendação: criar `.claude/agents/semgrep-scanner.md` que delega para `static-analysis:semgrep-scanner` ou que replica o protocolo de Step 4 da skill com inputs/outputs bem definidos.
