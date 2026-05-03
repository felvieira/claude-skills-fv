---
name: static-analysis
description: |
  Skill de scan automatizado de codigo para vulnerabilidades, bugs e code smells via Semgrep e CodeQL.
  Use antes de toda release, em PRs grandes, ou quando suspeitar de classe de bug recorrente.
  Trigger em: "semgrep", "codeql", "static analysis", "scan de seguranca", "SAST", "varredura",
  "pre-deploy security", "OWASP scan", "CVE check", "auditoria automatizada".
argument-hint: "[--tool=semgrep|codeql|both] [--ruleset=p/owasp-top-ten] [--lang=js,py,go]"
allowed-tools: Read, Grep, Glob, Bash(semgrep *), Bash(codeql *), Bash(npx *), Bash(pip *)
---

# Static Analysis — Scan Automatizado de Vulnerabilidades

Eleva a Security Review (skill 06) de "review manual" para "scan + triagem". Semgrep para velocidade e cobertura ampla, CodeQL para taint tracking interprocedural quando o caso exige.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md`, `policies/quality-gates.md`, `policies/writing-clarity.md`.

Consultar `docs/skill-guides/static-analysis.md` para rulesets avancados, custom rules e integracao em CI.

## Quando Usar

- pre-release (toda release passa por scan)
- PR que toca auth, validacao de input, parsing, serializacao, deps externas
- bug encontrado: rodar variant analysis para achar similares
- suspeita de classe de bug recorrente (ex: SQL injection, SSRF, prototype pollution)
- antes de promover modulo para producao
- auditoria periodica (mensal ou trimestral)

## Quando Nao Usar

- bug fix localizado em arquivo conhecido
- refactor sem mudanca de comportamento
- prototipagem inicial (onde codigo ainda muda muito)

## Entradas Esperadas

- caminho do repositorio ou subdiretorio
- linguagens predominantes
- (opcional) ruleset especifico ou bug similar a procurar

## Saidas Esperadas

- relatorio em SARIF (`.sarif`) ou markdown estruturado
- findings classificados por severidade (Critical / High / Medium / Low / Info)
- triagem (true positive / false positive / needs investigation)
- handoff para skill 06 (Security Review) com top findings
- handoff para debugger se finding tiver root cause nao trivial

## Responsabilidades / Protocolo

1. **Detectar linguagens** do repositorio
2. **Selecionar rulesets** apropriados (default: `--config=auto` + ruleset OWASP)
3. **Executar scan** (Semgrep primeiro; CodeQL se padrao envolve fluxo)
4. **Gerar SARIF** + relatorio markdown
5. **Triagem** — classificar TP/FP/needs-investigation
6. **Suprimir FPs** com comentario justificando
7. **Handoff** para skill 06 com sumario
8. **Variant analysis** se padrao recorrer (custom rule)
9. **CI integration** quando aplicavel

Detalhes operacionais nas sub-secoes a seguir.

## Ferramentas

### Semgrep (default — comecar por aqui)

**Instalar:**
```bash
pip install semgrep
# ou via Docker
docker run --rm -v "$PWD:/src" returntocorp/semgrep semgrep --config=auto
```

**Rodar:**
```bash
# Auto: detecta linguagens, aplica rulesets oficiais
semgrep --config=auto --sarif --output=semgrep.sarif

# Ruleset especifico
semgrep --config=p/owasp-top-ten --sarif --output=owasp.sarif
semgrep --config=p/security-audit
semgrep --config=p/typescript

# Custom rule
semgrep --config=./my-rule.yml src/
```

**Rulesets recomendados por linguagem:**
- TS/JS: `p/typescript`, `p/javascript`, `p/react`, `p/nextjs`, `p/owasp-top-ten`
- Python: `p/python`, `p/django`, `p/flask`, `p/owasp-top-ten`
- Go: `p/golang`, `p/gosec`
- Java: `p/java`, `p/spring`
- Geral: `p/security-audit`, `p/secrets`, `p/ci`

### CodeQL (quando precisar de taint tracking interprocedural)

**Instalar:**
```bash
# Download CodeQL CLI
# https://github.com/github/codeql-cli-binaries/releases
```

**Rodar:**
```bash
# Build database
codeql database create db --language=javascript --source-root=.

# Run query suite
codeql database analyze db --format=sarif-latest --output=results.sarif \
  codeql/javascript-queries

# Custom query
codeql query run --database=db my-query.ql
```

**Quando usar CodeQL em vez de Semgrep:**
- bug envolvendo data flow entre funcoes/arquivos
- bug que so aparece em condicoes de chamada especificas
- variant analysis sofisticada apos achar bug inicial

### Subagents auxiliares (despachaveis via Task tool)

Para escala (multi-linguagem, >20 findings, variant analysis), despachar via Task:

- **`semgrep-scanner`** — executa scans em paralelo por categoria de linguagem, agrega SARIF. Use quando repo tem 2+ linguagens primarias.
- **`semgrep-triager`** — classifica findings em TP/FP/needs-investigation lendo contexto fonte. Use quando ha >20 findings.
- **`codeql-runner`** — orquestra build de database CodeQL + queries com taint tracking interprocedural. Use quando bug envolve data flow entre arquivos/funcoes.
- **`sarif-parsing`** — parse, dedup, agregacao de SARIF de multiplas fontes. Use quando consolidar Semgrep + CodeQL ou multiplos scans.
- **`variant-analysis`** — caca variantes do mesmo padrao apos achar bug inicial, gera custom rule reusavel. Use apos confirmar bug que pertence a classe (SQLi, XSS, missing auth, etc).

Cada subagent tem definicao em `.claude/agents/<name>.md` com protocolo, inputs, outputs e guardrails proprios. Para uso simples (1 linguagem, scan rapido, poucos findings), rodar inline conforme blocos abaixo.

## Pipeline Recomendado

```
1. Semgrep --config=auto    (5-30s, cobertura ampla)
   → triage via `semgrep-triager` subagent (ou inline se <20 findings)
   → fix critical/high
2. Se finding for bug de fluxo: CodeQL com query especifica
   → variant analysis para achar similares
3. SARIF → markdown report → handoff para skill 06
4. Skill 06 valida findings + adiciona contexto OWASP
5. Reviewer (skill 11) bloqueia merge se Critical/High aberto
```

## Triagem de Findings

Para cada finding, classificar:

- **True Positive (TP)** — bug real, fix obrigatorio (Critical/High)
- **False Positive (FP)** — regra disparou em codigo seguro, suprimir com justificativa
- **Needs Investigation** — comportamento ambiguo, escalar para skill 06

**Suprimir FP corretamente:**
```javascript
// nosemgrep: rule-id  // motivo: contexto valida input acima na linha 42
const sql = `SELECT * FROM users WHERE id = ${id}`;
```

Nao suprimir sem comentario explicando porque.

## Severidade

| Nivel | Critério | Acao |
|---|---|---|
| Critical | RCE, SQLi, XSS confirmado, secret hardcoded | bloqueia merge, fix imediato |
| High | Auth bypass possivel, SSRF, deps com CVE high | bloqueia merge, fix antes da release |
| Medium | Validacao fraca, missing rate limit, dep com CVE medium | fix no proximo sprint |
| Low | Code smell, deprecated API, missing header opcional | backlog |
| Info | Sugestao de hardening | opcional |

## Anti-Rationalization Table (Triagem de Findings)

Triagem de findings tem viesses recorrentes. Pensamentos que significam STOP:

| Pensamento | Realidade |
|---|---|
| "Isso parece falso positivo" | Validacao em outro arquivo nao garante. Verificar fluxo real. |
| "Eu sei que esse codigo e seguro" | Sem evidencia (validacao explicita ou teste), e suposicao. |
| "Esse modulo e legado, nao toca" | Legado e onde CVE mora. Tratar igual. |
| "Suprimir e mais rapido" | FP nao validado vira buraco de seguranca em 6 meses. |
| "A regra e generica, nao se aplica" | Genericas pegam padroes reais. Investigar antes de descartar. |
| "Tem outros bugs maiores agora" | Critical/High nao espera. Triagem e pre-deploy gate. |
| "Funcionava antes do scan" | Bug existia antes — scan so revelou. |
| "Vamos abrir issue e seguir" | Critical aberto = no merge. Issue nao substitui fix. |

Toda supressao precisa de comentario explicando **por que** o codigo e seguro naquele contexto.

## Quando Criar Custom Rules

- bug recorrente que rulesets oficiais nao pegam
- padrao especifico do projeto (ex: nunca chamar `internalApi.X` sem `auditLog`)
- regra de negocio que vira invariante de seguranca

Exemplo Semgrep:
```yaml
rules:
  - id: missing-audit-log
    pattern: |
      internalApi.$X(...)
    pattern-not: |
      auditLog($Y)
      ...
      internalApi.$X(...)
    message: chamada a internalApi sem auditLog precedente
    severity: ERROR
    languages: [typescript]
```

Custom rules vivem em `tools/semgrep/` ou `.semgrep/` no repo.

## Output Format

Markdown estruturado para handoff:

```markdown
# Static Analysis Report — <YYYY-MM-DD>

**Tool:** semgrep --config=auto + p/owasp-top-ten
**Scope:** src/
**Duration:** 23s
**Files scanned:** 247

## Summary
- Critical: 1
- High: 3
- Medium: 8
- Low: 14
- Info: 22

## Critical Findings

### F-001: SQL Injection em src/db/users.ts:42
**Rule:** javascript.lang.security.sql-injection
**Confidence:** high (TP confirmed)
**Evidence:**
```ts
const query = `SELECT * FROM users WHERE id = ${userId}`;
```
**Fix:** usar prepared statement
```ts
const query = `SELECT * FROM users WHERE id = $1`;
db.query(query, [userId]);
```
**Owner:** skill 03 (Backend)

## High Findings
...

## Suppressed (FP)
- src/legacy/oldHash.ts:88 — `weak-crypto`: hash usado para deduplicacao, nao seguranca
```

## Integracao com CI

Adicionar a `.github/workflows/`:

```yaml
- name: Semgrep scan
  run: semgrep --config=auto --error --severity=ERROR
```

`--error` faz CI quebrar em finding Critical/High.

## Codigo Limpo

Output deve seguir `policies/writing-clarity.md`. Sem narrativa, sem hedging, sem prosa decorativa. Tabela de findings + acao concreta por linha.

## Evidencia de Conclusao

- relatorio SARIF gerado (timestamped)
- findings triados (TP/FP/needs-investigation)
- top Critical/High com fix sugerido
- FPs suprimidos com comentario justificando
- handoff para skill 06 com sumario

## Handoff

Apos conclusao, entregar:
1. caminho do `.sarif` + `.md`
2. contagem por severidade
3. lista de Critical/High que bloqueiam merge
4. sugestao: skill 06 valida, debugger investiga root cause complexo, variant analysis se padrao recorrente

## Integracao com Pipeline

- **Security Review (skill 06):** consome output, valida contexto OWASP, bloqueia release
- **Debugger (subagent):** investiga root cause de finding com fluxo complexo
- **Reviewer (skill 11):** quality gate — Critical/High aberto = no merge
- **Release Manager (skill 24):** scan obrigatorio antes de cada release
- **Migration & Refactor (skill 23):** scan antes/depois de refactor grande para detectar regressao
