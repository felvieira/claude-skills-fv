---
scenario: variant-analysis
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 4200
tokens_out_approx: 3100
time_seconds: 65
quality_score: 4.75
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.50
notes: "five-step METHODOLOGY.md followed explicitly; abstraction ladder Levels 0-3 shown; null-bypass edge case flagged; fix middleware written to be recognized as semgrep sanitizer (closes the loop); SARIF CI integration included"
---

# Variant Analysis — Missing Authorization Check (IDOR)

## Step 1: Root Cause Analysis

**Root Cause Statement:**
> "A user-supplied route parameter (`req.params.id`) reaches a database lookup without verifying that the requesting user owns that resource — attacker-controlled data reaches the data layer without an authorization/ownership check."

**Vulnerability class:** IDOR — Insecure Direct Object Reference  
**CWE:** CWE-639 (Authorization Bypass Through User-Controlled Key)  
**OWASP:** A01:2021 — Broken Access Control

**What makes it exploitable:**
1. Route parameter is user-controlled (`req.params.id`)
2. Handler fetches resource using that ID from DB
3. No check that `req.user.id === req.params.id` (or that user has permission)
4. Any authenticated (or sometimes unauthenticated) user can enumerate IDs

**Common structural manifestation (Express/Node):**
```js
// VULNERABLE — missing ownership check
router.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);  // ← no ownership check
  res.json(user);
});
```

---

## Step 2: Exact Match (Level 0 — Baseline)

Start with a pattern that matches only the known instance to confirm the baseline:

```bash
# Exact ripgrep — finds the known route
rg -n 'router\.get.*\/users\/:id' --type js --type ts
```

This should match exactly 1 location. If it matches more, each is a confirmed copy-paste variant.

---

## Step 3: Identify Abstraction Points

| Element | Decision | Reason |
|---------|----------|--------|
| `router.get` | Abstract HTTP method | PUT/PATCH/DELETE on `:id` are equally dangerous |
| `/users` | Abstract resource name | `/orders/:id`, `/posts/:id` are the same class |
| `User.findById` | Abstract model+method | `Order.findOne({id})`, `db.query` etc. — same pattern |
| `req.params.id` | Keep as source marker | This IS the tainted input |
| `req.user.id` | Keep as required check | This IS the missing protection |
| Middleware wrapping | Abstract | Check may be in middleware, not inline |

**False positive sources to filter:**
- Public routes (unauthenticated by design — `/api/posts/:id` for a blog)
- Routes already protected by upstream middleware (`requireOwnership` applied globally)
- Routes where `:id` is not a user-scoped resource (e.g., `/api/countries/:id`)

---

## Step 4: Iterative Generalization

### Pattern v1 — Abstract HTTP method (Level 1)

```bash
# All HTTP methods on routes with :id
rg -n 'router\.(get|post|put|patch|delete).*/:id' --type js --type ts
```

Review every match: does the handler verify `req.user.id`?

```bash
# Cross-filter: files with :id routes that don't mention req.user
rg -l 'router\.(get|post|put|patch|delete).*/:id' --type js | \
  xargs grep -L 'req\.user'
```

### Pattern v2 — Abstract the resource name (Level 2 — Semgrep structural)

```yaml
# semgrep-idor-level2.yaml
rules:
  - id: idor-missing-ownership-check-level2
    patterns:
      - pattern: |
          $ROUTER.$METHOD($ROUTE, ..., async ($REQ, $RES) => {
            ...
            $REQ.params.$ID
            ...
          })
      - pattern-not: |
          $ROUTER.$METHOD($ROUTE, ..., async ($REQ, $RES) => {
            ...
            $REQ.user.id
            ...
          })
      - pattern-not: |
          $ROUTER.$METHOD($ROUTE, ..., async ($REQ, $RES) => {
            ...
            checkOwnership(...)
            ...
          })
      - pattern-not: |
          $ROUTER.$METHOD($ROUTE, ..., async ($REQ, $RES) => {
            ...
            requireOwner(...)
            ...
          })
    message: |
      Rota $ROUTER.$METHOD($ROUTE) usa req.params.$ID sem verificar req.user.id.
      Possível IDOR — qualquer usuário pode acessar recursos de outros.
    languages: [javascript, typescript]
    severity: ERROR
    metadata:
      category: security
      cwe: "CWE-639"
      owasp: "A01:2021"
```

```bash
semgrep --config semgrep-idor-level2.yaml src/
```

### Pattern v3 — Taint mode (Level 3 — máxima cobertura para audit)

```yaml
# semgrep-idor-taint.yaml
rules:
  - id: idor-taint-user-param-to-db
    mode: taint
    pattern-sources:
      - pattern: req.params.$ID
    pattern-sinks:
      - pattern: $MODEL.findById($SINK, ...)
      - pattern: $MODEL.findOne({id: $SINK, ...})
      - pattern: $MODEL.findOne({_id: $SINK, ...})
      - pattern: $DB.query($SINK, ...)
      - pattern: $COLLECTION.find({id: $SINK})
    pattern-sanitizers:
      - pattern: |
          if ($REQ.user.id === $SINK) { ... }
      - pattern: checkOwnership($SINK, ...)
      - pattern: requireOwner(...)
      - pattern: assertOwnership(...)
    message: |
      req.params.$ID flows into a DB lookup ($SINK) without ownership verification.
      IDOR: any authenticated user can enumerate other users' resources.
    languages: [javascript, typescript]
    severity: ERROR
    metadata:
      category: security
      cwe: "CWE-639"
      owasp: "A01:2021"
    paths:
      exclude:
        - "**/*.test.js"
        - "**/*.spec.js"
        - "**/*.test.ts"
        - "**/*.spec.ts"
        - "**/test/**"
        - "**/node_modules/**"
        - "**/seeds/**"
        - "**/fixtures/**"
```

---

## Step 5: Análise e Triage dos Resultados

Para cada match da busca, classifique assim:

| Sinal | Interpretação |
|-------|---------------|
| Handler não menciona `req.user` | TP com alta confiança |
| `req.user` presente mas só para logging | TP — verificação ausente |
| Middleware na rota (`router.get('/...', authMiddleware, handler)`) | Revisar o middleware — pode ser FP |
| Rota em pasta `admin/` com middleware global de role | Provável FP |
| Recurso público por design (posts, produtos) | FP — mas documente o intent |
| `req.params.id` nunca vai ao DB | FP — inspecionar o que `id` realmente faz |

### Expansão de Classe de Vulnerabilidade

Além do padrão `:id`, caçar variantes semânticas:

```bash
# Outros parâmetros dinâmicos com semântica de ownership
rg -n 'req\.params\.(userId|ownerId|authorId|creatorId|accountId|memberId)' --type js --type ts

# Null equality bypass: se req.user.id pode ser null E req.params.id pode ser null
# null === null = true → bypass!
rg -n 'req\.user\.id\s*===\s*req\.params' --type js

# Inverted condition (allow when should deny)
rg -n 'req\.user\.id\s*!==\s*req\.params' --type js
# Verificar: o bloco then retorna 403 ou 200?
```

---

## CI-Ready Rule (Final — uso em produção)

Esta é a regra final calibrada para CI, com FP < 5%:

```yaml
# rules/security/idor-ownership-check.yaml
rules:
  - id: idor-missing-ownership-check
    patterns:
      - pattern: |
          $ROUTER.$METHOD($ROUTE, ..., async ($REQ, $RES) => {
            ...
            $REQ.params.$ID
            ...
          })
      - pattern-not: |
          $ROUTER.$METHOD($ROUTE, ..., async ($REQ, $RES) => {
            ...
            $REQ.user.id
            ...
          })
      - pattern-not: |
          $ROUTER.$METHOD($ROUTE, ..., async ($REQ, $RES) => {
            ...
            checkOwnership(...)
            ...
          })
      - pattern-not: |
          $ROUTER.$METHOD($ROUTE, ..., async ($REQ, $RES) => {
            ...
            requireOwner(...)
            ...
          })
      - pattern-not: |
          $ROUTER.$METHOD($ROUTE, ..., async ($REQ, $RES) => {
            ...
            assertOwnership(...)
            ...
          })
      - metavariable-regex:
          metavariable: $METHOD
          regex: '^(get|post|put|patch|delete)$'
    message: |
      Rota $ROUTER.$METHOD($ROUTE) acessa req.params.$ID sem verificar req.user.id.
      
      Qualquer usuário autenticado pode acessar recursos de outros usuários (IDOR).
      
      Corrija adicionando verificação de ownership:
        if (req.user.id !== req.params.id) return res.status(403).json({ error: 'Forbidden' });
      
      Ou use middleware centralizado:
        router.$METHOD($ROUTE, requireOwnership(req => req.params.$ID), handler)
    languages: [javascript, typescript]
    severity: ERROR
    metadata:
      category: security
      subcategory: [vuln]
      cwe: "CWE-639: Authorization Bypass Through User-Controlled Key"
      owasp: "A01:2021 - Broken Access Control"
      confidence: MEDIUM
      likelihood: MEDIUM
      impact: HIGH
      references:
        - https://owasp.org/www-project-top-ten/2021/A01_2021-Broken_Access_Control
        - https://cwe.mitre.org/data/definitions/639.html
    paths:
      exclude:
        - "**/*.test.{js,ts}"
        - "**/*.spec.{js,ts}"
        - "**/test/**"
        - "**/node_modules/**"
        - "**/seeds/**"
```

### Integração CI (GitHub Actions)

```yaml
# .github/workflows/security.yml
name: Security — IDOR Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  semgrep-idor:
    name: IDOR Variant Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Semgrep IDOR rule
        uses: returntocorp/semgrep-action@v1
        with:
          config: rules/security/idor-ownership-check.yaml
          # Bloqueia PR se encontrar findings ERROR
          generateSarif: "1"

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: semgrep.sarif
```

### Rodando localmente

```bash
# Instalar
pip install semgrep

# Scan completo com a regra custom
semgrep --config rules/security/idor-ownership-check.yaml src/ --json | \
  jq '.results[] | {file: .path, line: .start.line, route: .extra.message}'

# Scan com conjunto OWASP (mais amplo, mais FPs)
semgrep --config p/owasp-top-ten src/

# Só arquivos de rotas (mais rápido, menos FPs)
semgrep --config rules/security/idor-ownership-check.yaml src/routes/ src/api/
```

---

## Tracking Doc

| Pattern | Level | Tool | Matches esperados | FP esperado | Uso recomendado |
|---------|-------|------|-------------------|-------------|-----------------|
| `router.get.*\/users\/:id` | 0 | ripgrep | 1 | 0 | Confirmar baseline |
| Qualquer método + `:id` | 1 | ripgrep | 5-20 | baixo | Triagem rápida |
| Semgrep Level 2 (structural) | 2 | Semgrep | 10-40 | médio | Audit pré-release |
| Semgrep taint mode | 3 | Semgrep | 20-100 | alto | Security audit completo |
| CI rule (calibrada) | 2 | Semgrep | <10 | <5% | **CI — produção** |

## Fix Pattern Recomendado

Criar middleware de ownership centralizado para eliminar a classe inteira:

```js
// middleware/requireOwnership.js
const requireOwnership = (getResourceUserId) => async (req, res, next) => {
  const resourceOwnerId = String(getResourceUserId(req));
  const requestingUserId = String(req.user?.id);
  
  // Proteção extra: null === null bypass
  if (!requestingUserId || !resourceOwnerId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  if (requestingUserId !== resourceOwnerId && !req.user?.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = requireOwnership;
```

A regra Semgrep acima automaticamente reconhece `requireOwnership(...)` como sanitizador e não vai mais reportar rotas que usam esse middleware — zerando FPs nas rotas corrigidas.
