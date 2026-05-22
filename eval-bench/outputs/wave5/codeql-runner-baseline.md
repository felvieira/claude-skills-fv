---
scenario: codeql-runner
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 320
tokens_out_approx: 980
time_seconds: 18
quality_score: 2.75
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
delta_vs_baseline: "n/a (this is baseline)"
notes: "Generic answer — covers happy path (install, create, analyze, sarif) but misses cache pre-check, suite selection table, .detective-scan/ convention, isSanitizer/isAdditionalTaintStep troubleshooting, gitignore guardrail, and handoff protocol. QL class name slightly off."
---

# CodeQL Taint Tracking para SQL Injection Interprocedural em TypeScript

## Por que o Semgrep não pegou

Semgrep usa análise intraprocedural por padrão — ele rastreia fluxo dentro de uma função, mas não atravessa chamadas de função entre arquivos. Se o input chega no controller, passa por um middleware de sanitização e chega ao repositório como query, o Semgrep geralmente não consegue rastrear esse caminho completo. O CodeQL usa análise de fluxo de dados interprocedural (taint tracking), que é exatamente o que você precisa.

## Pré-requisito: instalar o CodeQL CLI

Baixe em: https://github.com/github/codeql-cli-binaries/releases

Extraia e adicione ao PATH:
```bash
export PATH="$PATH:/path/to/codeql"
codeql --version
```

## 1. Build da Database

Para TypeScript/JavaScript, o CodeQL não precisa de build command (linguagens interpretadas):

```bash
codeql database create ./codeql-db \
  --language=javascript \
  --source-root=. \
  --overwrite
```

Isso demora entre 5 e 30 minutos dependendo do tamanho do projeto. A flag `--overwrite` reconstrói do zero — se você rodar várias vezes, considere guardar a database e só recriar quando o código mudar.

Dicas:
- Use `--threads=0` para usar todos os CPUs disponíveis
- Use `--ram=4096` se tiver pouca memória disponível

## 2. Executar Query de SQL Injection com Taint Tracking

Para rodar a suite de segurança padrão:

```bash
codeql database analyze ./codeql-db \
  --format=sarif-latest \
  --output=results.sarif \
  codeql/javascript-queries:codeql-suites/javascript-security-extended.qls
```

Essa suite já inclui queries de SQL injection com taint tracking interprocedural.

## 3. Query Customizada para seu Caso Específico

Se a suite padrão não encontrar o caminho específico (controller → middleware → repo), você pode escrever uma query customizada:

```ql
import javascript
import semmle.javascript.security.dataflow.SqlInjectionQuery

from SqlInjection::Configuration cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "Potential SQL injection from $@", source.getNode(), "this user input"
```

Salve como `my-sqli.ql` e execute:

```bash
codeql database analyze ./codeql-db \
  --format=sarif-latest \
  --output=sqli-results.sarif \
  my-sqli.ql
```

## 4. Interpretar o SARIF

O arquivo `.sarif` é JSON. Você pode usar:
- VS Code + extensão CodeQL para visualização
- `jq` para parsear no terminal:
  ```bash
  jq '.runs[0].results[] | {ruleId, message: .message.text, location: .locations[0]}' results.sarif
  ```
- GitHub Code Scanning (upload o SARIF via Actions)

## Dicas para o Caso Controller → Middleware → Repo

O CodeQL padrão já trata `req.body`, `req.params`, `req.query` como fontes de dados não confiáveis (RemoteFlowSource). Se o seu middleware faz sanitização, o CodeQL pode ou não reconhecê-la como sanitizador — dependendo de como está implementada.

Se ele ainda reportar o path mesmo com sanitização legítima, adicione um sanitizer explícito na sua query customizada:

```ql
override predicate isSanitizer(DataFlow::Node node) {
  // marque a saída do seu middleware de sanitização aqui
  exists(CallExpr call | 
    call.getCalleeName() = "sanitize" and
    node.asExpr() = call
  )
}
```

## Resumo do Fluxo

1. `codeql database create` → gera database do projeto TS (~5-30min)
2. `codeql database analyze` com `javascript-security-extended.qls` → detecta SQLi interprocedural
3. Se não encontrar, escreva query customizada com `isSource`/`isSink` mapeando seus endpoints
4. Leia o SARIF gerado para ver os paths completos

