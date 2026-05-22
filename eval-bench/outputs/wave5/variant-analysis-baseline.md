---
scenario: variant-analysis
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 280
tokens_out_approx: 1450
time_seconds: 38
quality_score: 3.25
quality_breakdown:
  specificity: 3
  completeness: 4
  correctness: 4
  actionability: 4
  discipline: 3
pass_fail: reference
delta_vs_baseline: 0
notes: "generic Express examples; decent Semgrep YAML but no abstraction-ladder discipline, no null-bypass edge case, no FP rate guidance"
---

# Caçando variantes de missing auth check + gerando regra CI reutilizável

## 1. Entenda o padrão do bug

O bug em `/api/users/:id` provavelmente se parece com isto (Express/Node como exemplo):

```js
// VULNERÁVEL — sem verificar se req.user.id === req.params.id
router.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});
```

O que está faltando é uma verificação como:

```js
if (req.user.id !== req.params.id && !req.user.isAdmin) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

## 2. Como caçar todas as variantes no codebase

### 2a. Busca manual com grep/ripgrep

```bash
# Encontra rotas que recebem :id mas não têm verificação de ownership
rg 'router\.(get|put|patch|delete).*/:id' --type js -l

# Filtra rotas onde req.user.id não aparece no mesmo bloco
rg -A 20 'router\.(get|put|patch|delete).*/:id' --type js | grep -L 'req\.user\.id'
```

Uma abordagem mais precisa é buscar rotas que usam `req.params.id` mas não contêm `req.user`:

```bash
rg -l 'req\.params\.id' --type js | xargs grep -L 'req\.user'
```

### 2b. Script de análise semi-automática (Python)

```python
import re, pathlib

ROUTE_PAT = re.compile(r'router\.(get|post|put|patch|delete)\s*\(\s*[\'"].*:id')
AUTH_CHECK = re.compile(r'req\.user\.id|requireOwnership|checkOwner|isOwner')

for f in pathlib.Path('.').rglob('*.js'):
    src = f.read_text()
    for match in ROUTE_PAT.finditer(src):
        # pega os próximos 30 linhas do match
        start = src[:match.start()].count('\n')
        lines = src.split('\n')[start:start+30]
        block = '\n'.join(lines)
        if not AUTH_CHECK.search(block):
            print(f"⚠️  {f}:{start+1} — possível missing ownership check")
            print(f"   {match.group()}\n")
```

### 2c. Com AST (mais preciso, zero falso-positivo de regex)

Use `babel-parser` (JS) ou `ast` (Python) para análise estrutural. Exemplo com `jscodeshift`:

```js
// find-missing-auth.js — jscodeshift codemod/query
module.exports = function (fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  const issues = [];

  root.find(j.CallExpression, {
    callee: { object: { name: 'router' } },
  }).forEach(path => {
    const args = path.node.arguments;
    // Verifica se a rota tem :id
    if (args[0]?.value?.includes(':id')) {
      const body = j(path).closest(j.ExpressionStatement).toSource();
      if (!body.includes('req.user.id') && !body.includes('checkOwner')) {
        issues.push({ file: fileInfo.path, route: args[0].value });
      }
    }
  });

  if (issues.length) console.log(JSON.stringify(issues, null, 2));
  return null; // não modifica
};
```

```bash
npx jscodeshift -t find-missing-auth.js src/routes/
```

## 3. Gerar regra Semgrep reutilizável para CI

**Semgrep** é a melhor ferramenta para isso — rules são YAML declarativo, rodam no CI nativamente.

### Regra básica (Express + :id)

```yaml
# rules/missing-ownership-check.yaml
rules:
  - id: missing-ownership-check-on-id-route
    patterns:
      - pattern: |
          $ROUTER.$METHOD($ROUTE, ..., async ($REQ, $RES) => {
            ...
            $REQ.params.id
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
    message: |
      Rota $ROUTER.$METHOD($ROUTE) acessa req.params.id sem verificar req.user.id.
      Qualquer usuário autenticado pode acessar recursos de outros usuários (IDOR).
      Adicione verificação de ownership antes de retornar dados do recurso.
    languages: [javascript, typescript]
    severity: ERROR
    metadata:
      category: security
      owasp: "A01:2021 - Broken Access Control"
      cwe: "CWE-639: Authorization Bypass Through User-Controlled Key"
```

### Regra mais ampla (qualquer framework, qualquer param dinâmico)

```yaml
rules:
  - id: idor-missing-auth-on-dynamic-param
    patterns:
      - pattern: |
          $APP.$METHOD($PATH, ..., $HANDLER)
      - metavariable-regex:
          metavariable: $PATH
          regex: '.*:(\w+id|\w+Id|id)\b'
      - pattern-not-inside: |
          $APP.$METHOD($PATH, ..., $HANDLER)
          ...
          requireAuth(...)
          ...
      - pattern-not-inside: |
          $APP.$METHOD($PATH, ..., $HANDLER)
          ...
          $REQ.user
          ...
    message: >
      Possível IDOR: rota com parâmetro dinâmico de ID ($PATH) sem verificação de
      autenticação ou ownership detectada. Revise manualmente.
    languages: [javascript, typescript]
    severity: WARNING
    metadata:
      category: security
      owasp: "A01:2021 - Broken Access Control"
```

### Rodando no CI (GitHub Actions)

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  semgrep:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: returntocorp/semgrep-action@v1
        with:
          config: rules/missing-ownership-check.yaml
          # ou use o registry público: p/owasp-top-ten
```

### Rodando localmente

```bash
# instalar
pip install semgrep

# rodar regra custom
semgrep --config rules/missing-ownership-check.yaml src/

# rodar conjunto OWASP (inclui IDOR)
semgrep --config p/owasp-top-ten src/
```

## 4. Triagem dos resultados

Após rodar, você terá uma lista de candidatos. Para cada um:

1. **Confirmar**: a rota realmente expõe dado de outro usuário?
2. **Verificar middleware**: talvez o auth check esteja num middleware upstream (falso positivo)
3. **Classificar severidade**: GET vs DELETE/PUT (exposição vs modificação)
4. **Priorizar por sensibilidade do dado**: `/api/users/:id/email` > `/api/posts/:id`

## 5. Fix padrão para aplicar em todas as ocorrências

Crie um middleware de ownership reutilizável:

```js
// middleware/requireOwnership.js
const requireOwnership = (resourceUserIdFn) => {
  return (req, res, next) => {
    const resourceUserId = resourceUserIdFn(req);
    if (req.user?.id !== resourceUserId && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

module.exports = requireOwnership;
```

Uso:

```js
// Antes
router.get('/api/users/:id', userController.getById);

// Depois
const requireOwnership = require('../middleware/requireOwnership');
router.get('/api/users/:id', 
  requireOwnership(req => req.params.id), 
  userController.getById
);
```

---

**Resumo do fluxo:**
1. `grep`/`rg` para inventário rápido
2. Script Python/jscodeshift para análise precisa
3. Regra Semgrep em `rules/` para CI contínuo
4. Fix com middleware `requireOwnership` reutilizável
5. A regra Semgrep bloqueia regressões automaticamente em todo PR futuro
