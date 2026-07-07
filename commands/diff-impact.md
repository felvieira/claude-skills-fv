---
name: diff-impact
description: |
  Analisa o ripple effect das mudanças não commitadas (ou de um commit/branch) cruzando o git diff
  com o knowledge graph em graphify-out/graph.json. Lista nós diretamente tocados + dependentes
  em N hops (BFS). Útil antes de mergear: mostra quem mais pode quebrar.
  Trigger em: "diff impact", "diff-impact", "ripple", "ripple effect", "afetado", "blast radius",
  "impacto da mudanca", "quem depende", "mudou o que", "PR review impact".
argument-hint: "[--staged | --ref <branch>] [--depth N] [--json]"
allowed-tools: Bash(node scripts/diff-impact.mjs *), Read, Grep
---

# /diff-impact — Ripple analysis antes do merge

Cruza `git diff` com `graphify-out/graph.json` pra responder: **se eu mergear isso agora, o que mais pode quebrar?**

Inspirado em `/understand-diff` do [Lum1104/Understand-Anything](https://github.com/Lum1104/Understand-Anything) (MIT). Implementação própria — zero-dep Node, usa o `graphify-out/` já existente.

## Quando usar

- Antes de abrir PR — saber se a mudança é local ou cross-cutting
- Durante review final (skill 11) — confirmar que o reviewer olhou todos os pontos afetados
- Após refactor — validar que ripple ficou contido
- Em legacy — antes de tocar um módulo godzilla, ver quem mais depende dele

## Quando NÃO usar

- Repo sem `graphify-out/graph.json` (rode `graphify update .` antes)
- Mudança em arquivo não-código (markdown, JSON, configs) — graphify só indexa código
- Hot-fix urgente que não pode esperar análise

## Modos

```bash
# vs HEAD~1 (último commit)
node scripts/diff-impact.mjs

# vs staged (antes de commit)
node scripts/diff-impact.mjs --staged

# vs branch main
node scripts/diff-impact.mjs --ref main

# ajustar profundidade BFS (default 2)
node scripts/diff-impact.mjs --depth 3

# machine-readable
node scripts/diff-impact.mjs --json
```

## Output esperado

```
Diff Impact Analysis
========================================================================
Changed files: 3 (matched 3 in graph, unmatched 0)
Directly touched nodes: 7
Dependents in 2 hops (the ripple): 18
Dependencies in 2 hops (what changed code calls): 12

Directly touched:
  validateInput()                          src/lib/validators.ts
  parseAuth()                              src/lib/auth.ts
  ...

Ripple — who depends on the touched code (depth 2):
  hop 1: 11 nodes
    - loginHandler                          src/routes/login.ts
    - signupHandler                         src/routes/signup.ts
    ...
  hop 2: 7 nodes
    - resetPasswordRoute                    src/routes/password.ts
    ...
```

## Risk Banding

A partir de `dependents_count` (ripple), 3 faixas qualitativas — ponto de partida a calibrar por projeto, não constantes universais:

| Ripple (dependents_count) | Faixa |
|---|---|
| ≤ 5 | baixo |
| 6-20 | médio |
| > 20 | alto |

**Fora de escopo por ora:** pesagem semântica por tipo de nó (ex: ripple em código de auth/schema/crypto valer mais que em um comentário) fica como trabalho futuro — implementar sem dados reais de calibração adicionaria complexidade sem sinal real.

### Uso como pre-commit hook (exemplo)

```bash
# pre-commit: avisa (não bloqueia) se ripple cruzar o threshold "alto"
RIPPLE=$(node scripts/diff-impact.mjs --staged --json | node -e "
  let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{
    console.log(JSON.parse(d).summary.dependents_count);
  });
")
if [ "$RIPPLE" -gt 20 ]; then
  echo "⚠ diff-impact: ripple de $RIPPLE nós (faixa alta) — revise com atenção antes de commitar."
fi
```

## Como integrar no fluxo

1. **Skill 11 (reviewer)** roda `/diff-impact` antes de aprovar PR e lê a risk band (ver "Risk Banding" acima). Se faixa **alta**, escrutínio extra antes de aprovar.
2. **Skill 23 (migration-refactor)** roda antes de cada step de refactor pra validar escopo.
3. **Pre-commit hook opcional**: bloqueia commit se ripple > threshold (cuidado: pode irritar).

## Limitações conhecidas

- Acurácia depende do graphify-out estar atualizado (use `--auto-update` hook ou `graphify update .` antes)
- Match de arquivo é por path normalizado (Windows backslash → posix slash); paths fora da convenção do graphify não casam
- Edges são "contém / chama / referencia" mas não capturam dependências dinâmicas (eval, reflection, require runtime)
- Não distingue impacto runtime vs build-time vs test-time

## Fontes

Pattern adaptado de [Lum1104/Understand-Anything](https://github.com/Lum1104/Understand-Anything) (MIT, 24.7k stars) `/understand-diff` command. Não adotamos: o pipeline TypeScript próprio do Lum (usamos graphify Python que já temos), o dashboard web (ver `docs/patterns/insights-dashboard-future.md`).
