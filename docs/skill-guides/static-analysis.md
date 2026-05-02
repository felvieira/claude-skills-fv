# Static Analysis — Guia Estendido

Anexos longos para `skills/34-static-analysis/SKILL.md`. Carregar sob demanda.

## Sumario

- [Rulesets recomendados por contexto](#rulesets-recomendados-por-contexto)
- [Custom rules — exemplos completos](#custom-rules--exemplos-completos)
- [Integracao em CI — exemplos por plataforma](#integracao-em-ci--exemplos-por-plataforma)
- [Triagem em escala (>100 findings)](#triagem-em-escala-100-findings)
- [Comparativo Semgrep vs CodeQL](#comparativo-semgrep-vs-codeql)
- [Casos de uso reais](#casos-de-uso-reais)

---

## Rulesets recomendados por contexto

### TypeScript/JavaScript

**Web app (Next/React/Express):**
```bash
semgrep \
  --config=p/typescript \
  --config=p/javascript \
  --config=p/react \
  --config=p/owasp-top-ten \
  --config=p/secrets \
  --config=p/jwt
```

**Node backend puro:**
```bash
semgrep \
  --config=p/javascript \
  --config=p/nodejs \
  --config=p/owasp-top-ten \
  --config=p/security-audit
```

**Lib/SDK (publicado no npm):**
```bash
semgrep \
  --config=p/javascript \
  --config=p/typescript \
  --config=p/security-audit \
  --config=p/supply-chain
```

### Python

**Django:**
```bash
semgrep --config=p/python --config=p/django --config=p/owasp-top-ten
```

**Flask:**
```bash
semgrep --config=p/python --config=p/flask --config=p/owasp-top-ten
```

**FastAPI:**
```bash
semgrep --config=p/python --config=p/fastapi --config=p/owasp-top-ten
```

### Go

```bash
semgrep --config=p/golang --config=p/gosec --config=p/security-audit
```

### Java/Kotlin

```bash
semgrep --config=p/java --config=p/spring --config=p/owasp-top-ten
```

---

## Custom rules — exemplos completos

### Regra: forbid `eval()` e equivalentes

```yaml
# tools/semgrep/no-eval.yml
rules:
  - id: no-eval
    pattern-either:
      - pattern: eval(...)
      - pattern: new Function(...)
      - pattern: setTimeout($CODE, ...)
        where:
          - metavariable: $CODE
            type: str
      - pattern: setInterval($CODE, ...)
        where:
          - metavariable: $CODE
            type: str
    message: dynamic code execution detected — refactor to avoid
    severity: ERROR
    languages: [javascript, typescript]
```

### Regra: missing audit log antes de admin op

```yaml
# tools/semgrep/admin-audit.yml
rules:
  - id: admin-without-audit
    patterns:
      - pattern: |
          adminApi.$METHOD(...)
      - pattern-not-inside: |
          auditLog($EVENT, ...)
          ...
          adminApi.$METHOD(...)
    message: admin operation without preceding audit log
    severity: ERROR
    languages: [typescript]
    metadata:
      category: security
      owasp: A09:2021 - Security Logging Failures
```

### Regra: PII em log

```yaml
# tools/semgrep/pii-in-log.yml
rules:
  - id: pii-in-log
    pattern-either:
      - pattern: console.log(..., $USER.email, ...)
      - pattern: console.log(..., $USER.cpf, ...)
      - pattern: logger.info(..., $USER.email, ...)
    message: PII (email/cpf) being logged — use hashed or redacted version
    severity: ERROR
    languages: [typescript, javascript]
```

### Regra: SQL string concatenation

```yaml
# tools/semgrep/sql-concat.yml
rules:
  - id: sql-string-concat
    patterns:
      - pattern-either:
          - pattern: db.query("..." + $X + "...")
          - pattern: db.query(`...${$X}...`)
      - pattern-not-inside: |
          // sql-safe: $REASON
          ...
    message: SQL via string concat — use parameterized query
    severity: ERROR
    languages: [typescript, javascript]
```

---

## Integracao em CI — exemplos por plataforma

### GitHub Actions

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  pull_request:
  push:
    branches: [main]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/owasp-top-ten
            p/typescript
            tools/semgrep/
        env:
          SEMGREP_BLOCKING: "true"  # bloqueia PR em finding ERROR
```

### GitLab CI

```yaml
# .gitlab-ci.yml
semgrep:
  stage: test
  image: returntocorp/semgrep
  script:
    - semgrep --config=auto --error --severity=ERROR --sarif --output=semgrep.sarif
  artifacts:
    reports:
      sast: semgrep.sarif
```

### Pre-commit hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/returntocorp/semgrep
    rev: v1.0.0
    hooks:
      - id: semgrep
        args: ["--config=auto", "--error", "--severity=ERROR"]
```

---

## Triagem em escala (>100 findings)

Quando scan retorna 100+ findings (comum em codebase legada):

### Estrategia 1: priorizar por severidade

```bash
# Filtrar so Critical+High
jq '[.runs[].results[] | select(.level == "error")]' results.sarif > critical.json
```

### Estrategia 2: agrupar por rule

```bash
jq '[.runs[].results[] | .ruleId] | group_by(.) | map({rule: .[0], count: length}) | sort_by(.count) | reverse' results.sarif
```

Top rules revelam padroes recorrentes — fix sistemico vence fix individual.

### Estrategia 3: agrupar por arquivo

```bash
jq '[.runs[].results[] | .locations[0].physicalLocation.artifactLocation.uri] | group_by(.) | map({file: .[0], count: length}) | sort_by(.count) | reverse' results.sarif
```

Arquivos com 10+ findings provavelmente tem problema arquitetural.

### Estrategia 4: baseline + diff

```bash
# Salvar baseline atual
semgrep --config=auto --sarif --output=baseline.sarif

# Em PRs subsequentes, comparar
semgrep --config=auto --sarif --baseline-ref=main --output=new-only.sarif
```

So findings novos quebram CI — debt existente vira backlog gerenciado.

---

## Comparativo Semgrep vs CodeQL

| Criterio | Semgrep | CodeQL |
|---|---|---|
| Velocidade | 10-60s tipico | 5-30min (build database) |
| Cobertura de linguagens | 30+ | 10 (mais maduras) |
| Custom rules | YAML simples | QL (Datalog-like) — curva alta |
| Taint tracking | basico | interprocedural completo |
| Falsos positivos | medio | baixo |
| Setup CI | trivial | mais complexo |
| Custo | OSS + Pro pago | OSS + GitHub Advanced Security pago |
| Quando usar | scan amplo + custom rules | bug specifico de fluxo |

**Combo recomendado:** Semgrep como gate padrao em todo PR + CodeQL semanal/mensal em main.

---

## Casos de uso reais

### Caso 1: SQL injection encontrada — variant analysis

**Contexto:** scan inicial achou SQL injection em `userController.ts`. Suspeita de padrao recorrente.

**Acoes:**
1. Custom Semgrep rule (acima — `sql-string-concat`)
2. Rodar contra repo inteiro
3. 12 ocorrencias adicionais encontradas em outros controllers
4. Fix em PR unico (incluindo o original)
5. Adicionar regra ao CI para prevenir regressao

### Caso 2: Migracao para CSP strict

**Contexto:** time vai habilitar Content-Security-Policy strict. Precisa achar todo `eval`, inline scripts, etc.

**Acoes:**
1. Semgrep com `p/javascript-csp`
2. Lista exaustiva de violations
3. Refactor incremental
4. Rule custom para bloquear novos casos no CI antes de habilitar CSP

### Caso 3: Auditoria pre-release de release major

**Contexto:** versao 2.0 sai semana que vem. Quer scan completo + triagem.

**Acoes:**
1. Semgrep `p/owasp-top-ten` + `p/security-audit`
2. CodeQL com query suite `javascript-security-extended`
3. Triagem por severidade (skill 06 valida cada Critical/High)
4. Variant analysis em padroes encontrados
5. Suprimir FPs com comentario justificando
6. Release notes incluem secao "Security improvements"

---

## Quando atualizar este guia

- novo ruleset oficial liberado por linguagem
- custom rule reutilizavel surgir em multiplos projetos
- CI platform nova (Bitbucket, CircleCI, etc.)
- caso de uso real que extrai aprendizado generalizavel
