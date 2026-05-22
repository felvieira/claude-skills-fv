---
scenario: 34-static-analysis
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 820
time_seconds: 18
quality_score: 3.0
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 3
  actionability: 3
  discipline: 3
pass_fail: n/a
delta_vs_baseline: 0
notes: "generic advice, no multi-language parallelism detail, no SARIF consolidation strategy, triagem superficial"
---

# Baseline — Static Analysis em Repo Multi-linguagem (TS + Python + Go)

## Pipeline Geral

Para um repo com TypeScript, Python e Go, você vai querer rodar Semgrep e CodeQL em paralelo por linguagem para não bloquear um scan no outro.

### Semgrep

Semgrep tem suporte nativo a múltiplas linguagens no mesmo comando:

```bash
semgrep --config=auto --sarif --output=semgrep.sarif
```

Você pode também segmentar por linguagem para paralelizar:

```bash
# Rodar em paralelo (bash)
semgrep --config=p/typescript --include="*.ts,*.tsx" --sarif --output=semgrep-ts.sarif &
semgrep --config=p/python --include="*.py" --sarif --output=semgrep-py.sarif &
semgrep --config=p/golang --include="*.go" --sarif --output=semgrep-go.sarif &
wait
```

### CodeQL

CodeQL precisa de um banco de dados por linguagem:

```bash
codeql database create db-js --language=javascript
codeql database create db-python --language=python
codeql database create db-go --language=go

codeql database analyze db-js --format=sarif-latest --output=codeql-js.sarif
codeql database analyze db-python --format=sarif-latest --output=codeql-py.sarif
codeql database analyze db-go --format=sarif-latest --output=codeql-go.sarif
```

## Consolidar SARIF

Depois de gerar múltiplos arquivos `.sarif`, você pode consolidar com `jq`:

```bash
jq -s '{ version: "2.1.0", runs: [.[].runs[]] }' semgrep-ts.sarif semgrep-py.sarif semgrep-go.sarif codeql-js.sarif codeql-py.sarif codeql-go.sarif > consolidated.sarif
```

Ou usar uma ferramenta como `sarif-tools` (Python):

```bash
pip install sarif-tools
sarif summary consolidated.sarif
```

## Triagem TP/FP

Para separar true positives de false positives:

1. **Priorize por severidade** — críticos e altos primeiro
2. **Revisar contexto** — abrir o arquivo e verificar se o finding é exploitável no contexto real
3. **Suprimir FPs** — adicionar `// nosemgrep: rule-id` com comentário explicando
4. **Manter backlog** — findings de baixa severidade que não são fix imediato

```bash
# Filtrar só ERROR/CRITICAL em SARIF com jq
jq '[.runs[].results[] | select(.level == "error")]' consolidated.sarif
```

## Estrutura de Pipeline Recomendada

```
pre-release
  ├── Semgrep (paralelo por linguagem, ~30s)
  ├── CodeQL (paralelo por linguagem, ~10-20min)
  ├── Consolidar SARIF
  ├── Triagem automática (filtrar por severidade)
  ├── Review manual dos Critical/High
  └── Fix obrigatório dos Critical antes de merge
```

## Dicas

- Use `--baseline-ref=main` no Semgrep para só mostrar findings novos em PRs
- CodeQL é mais lento mas melhor para taint tracking (SQLi, XSS com data flow)
- Semgrep é mais rápido e cobre mais casos com regras OWASP simples
