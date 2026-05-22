---
scenario: codeql-runner
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 850
tokens_out_approx: 1420
time_seconds: 35
quality_score: 5.0
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 5
pass_fail: PASS
delta_vs_baseline: +2.25
notes: "Agent protocol applied in full: commit-hash cache pre-check, .detective-scan/ convention, tools/codeql/ commit rule, suite selection table, complete custom .ql with @kind path-problem annotation, isSanitizer + isAdditionalTaintStep troubleshooting for both FP and FN middleware cases, jq SARIF reading, 4-point guardrails, structured handoff to sarif-parsing + semgrep-triager. Zero clarifying questions needed."
---

# CodeQL Runner — SQL Injection Interprocedural em TypeScript

> Subagent: `codeql-runner` | Protocolo: agents/codeql-runner.md

## Por que o Semgrep não pegou

Semgrep usa análise intraprocedural. O path `controller → middleware → repo` cruza pelo menos 3 arquivos e 3 call sites — isso está fora do alcance de Semgrep sem regras customizadas de dataflow multi-arquivo. CodeQL com taint tracking interprocedural rastreia esse caminho completo.

---

## Passo 1 — Verificar CodeQL CLI

```bash
command -v codeql >/dev/null || {
  echo "CodeQL não instalado. Download: https://github.com/github/codeql-cli-binaries/releases"
  exit 1
}
codeql --version
```

Se não estiver instalado, baixe o binário da release mais recente, extraia e adicione ao PATH.

---

## Passo 2 — Build da Database (com cache check)

**Atenção: build leva 5-30min.** O pre-check abaixo evita rebuild desnecessário quando o código não mudou.

```bash
LANG=javascript
DB_DIR=".detective-scan/codeql-db/$LANG"
CURRENT_HASH=$(git rev-parse HEAD)
CACHED_HASH=$(cat "$DB_DIR/.commit-hash" 2>/dev/null || echo "")

if [ "$CURRENT_HASH" = "$CACHED_HASH" ] \
   && [ -f "$DB_DIR/codeql-database.yml" ] \
   && [ -d "$DB_DIR/db-$LANG" ]; then
  echo "Reusing cached CodeQL database (commit $CURRENT_HASH)"
else
  mkdir -p "$DB_DIR"
  # TypeScript/JS não precisa de --command (linguagem interpretada)
  codeql database create "$DB_DIR" \
    --language="$LANG" \
    --source-root=. \
    --overwrite
  echo "$CURRENT_HASH" > "$DB_DIR/.commit-hash"
fi
```

**Onde a database fica:** `.detective-scan/codeql-db/javascript/` — nunca commitar (adicionar ao `.gitignore` se necessário).

---

## Passo 3 — Executar Suite de Segurança

Para o cenário de SQLi interprocedural, use `security-extended` (cobre taint tracking completo):

```bash
codeql database analyze .detective-scan/codeql-db/javascript \
  --format=sarif-latest \
  --output=.detective-scan/codeql-js.sarif \
  codeql/javascript-queries:codeql-suites/javascript-security-extended.qls
```

| Suite | Quando usar |
|---|---|
| `javascript-security-and-quality` | balanceada, default para scans gerais |
| `javascript-security-extended` | **use aqui** — interprocedural SQLi incluído |
| `javascript-security-experimental` | bleeding edge, mais falsos positivos |

---

## Passo 4 — Query Customizada para o Path Controller → Middleware → Repo

Se a suite padrão não detectar o path específico (ex: porque o middleware aplica transformação que obscurece o taint), escreva uma query customizada:

**Crie `tools/codeql/sqli-interprocedural.ql`** (commitar queries reutilizáveis em `tools/codeql/`):

```ql
/**
 * @name SQL injection interprocedural (controller → middleware → repo)
 * @description Tracks tainted input from HTTP request through middleware sanitization to DB query
 * @kind path-problem
 * @problem.severity error
 * @id js/sqli-interprocedural-custom
 */

import javascript
import semmle.javascript.security.dataflow.SqlInjectionQuery
import DataFlow::PathGraph

class Configuration extends TaintTracking::Configuration {
  Configuration() { this = "SqlInjectionInterproceduralConfig" }

  override predicate isSource(DataFlow::Node source) {
    // Fontes: req.body, req.params, req.query (RemoteFlowSource padrão TS/Express)
    source instanceof RemoteFlowSource
  }

  override predicate isSink(DataFlow::Node sink) {
    // Sinks: argumentos de query ao banco (TypeORM, Prisma raw, pg, mysql2, etc.)
    sink = any(DatabaseAccess da).getAQueryArgument()
  }

  // Se o middleware sanitiza corretamente e você quer excluir do report:
  // override predicate isSanitizer(DataFlow::Node node) {
  //   exists(CallExpr call |
  //     call.getCalleeName() = "sanitizeInput" and
  //     node.asExpr() = call
  //   )
  // }
}

from Configuration cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink,
  "SQL injection: tainted value from $@ reaches DB query without safe sanitization",
  source.getNode(), "this HTTP input"
```

Execute a query customizada:

```bash
codeql database analyze .detective-scan/codeql-db/javascript \
  --format=sarif-latest \
  --output=.detective-scan/codeql-variant.sarif \
  tools/codeql/sqli-interprocedural.ql
```

---

## Passo 5 — Verificar se o Middleware é Reconhecido como Sanitizador

**Problema comum:** o CodeQL ainda reporta o path mesmo que o middleware sanitize corretamente — isso é falso positivo. Para investigar:

1. Leia o path no SARIF: o CodeQL mostra cada nó do caminho (`source → node1 → node2 → sink`)
2. Se o middleware aparece **no meio do path**, o CodeQL não o reconhece como sanitizador
3. Adicione o `isSanitizer` na query (ver comentário acima) mapeando a função de sanitização do seu middleware

**Problema oposto:** o path não aparece no report. Causas possíveis:
- O middleware transforma o dado de forma que o taint é "perdido" modelagem (renomeação de variável, spread, destructuring)
- Adicione `isAdditionalTaintStep` para cobrir a transformação:

```ql
override predicate isAdditionalTaintStep(DataFlow::Node pred, DataFlow::Node succ) {
  // Ex: taint flui de req.body para next(req) no middleware
  exists(CallExpr c | c.getCalleeName() = "next" |
    pred.asExpr() = c.getArgument(0) and
    succ.asExpr() = c
  )
}
```

---

## Passo 6 — Ler o SARIF

```bash
# Contagem rápida por severidade
jq '[.runs[0].results[] | .level] | group_by(.) | map({level: .[0], count: length})' \
  .detective-scan/codeql-js.sarif

# Ver paths interprocedurais (a força do CodeQL)
jq '.runs[0].results[] | {
  rule: .ruleId,
  message: .message.text,
  locations: [.codeFlows[0].threadFlows[0].locations[].location.physicalLocation.artifactLocation.uri]
}' .detective-scan/codeql-js.sarif
```

Passe o `.sarif` para `sarif-parsing` agregar e `semgrep-triager` triar os findings.

---

## Hard Guardrails

1. Database em `.detective-scan/codeql-db/` — **nunca commitar**. Adicionar ao `.gitignore` se ausente.
2. Comunicar duração: "Building CodeQL database for javascript — this takes 5-30min."
3. Queries reutilizáveis em `tools/codeql/` — **essas sim commitam**.
4. **0 findings ≠ código seguro.** Se a suite retornar vazio, escalar para revisão manual via skill 06 (security-reviewer).

---

## Handoff

Ao concluir esta execução:

1. **SARIF path:** `.detective-scan/codeql-js.sarif` (suite) + `.detective-scan/codeql-variant.sarif` (custom)
2. **Contagem:** ver output do `jq` acima
3. **Paths interprocedurais encontrados:** listar aqui qualquer `controller → middleware → repo` trackeado
4. **Próximos passos:** `sarif-parsing` para agregar findings → `semgrep-triager` para triagem → skill 06 para revisão de falsos negativos

