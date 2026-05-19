# Program: refactor-safely

## Intent
Refatorar código com **behavior preservation garantida**: scan → baseline tests → analyze read-only → plan → execute atômico com type-check hooks → full suite validation → behavior verification → PR.

## Sequence

```
scan-scope (bash, identifica candidatos)
→ baseline-tests (bash, snapshot do estado ATUAL)
→ gate-baseline (humano confirma — se baseline já falha, abort)
→ analyze (AI fresh, READ-ONLY, gera analysis.md)
→ plan (AI fresh, gera refactor-plan.md atômico)
→ gate-plan (humano revisa o plano)
→ execute-loop (loop fresh-per-step, max 30, type-check após cada Edit)
→ full-test-suite (bash, suite completa)
→ verify-behavior (AI fresh, READ-ONLY, compara baseline vs atual)
→ gate-verify (humano aceita PRESERVED ou pede rollback)
→ create-pr (bash, gh pr create com behavior verification no body)
```

## Inputs

```yaml
input:
  target: string                # path/módulo (ex: src/auth/)
  preserve_api: boolean = true  # mantém exports/APIs públicas?
  max_files_per_iter: number = 3  # atomicidade
```

## Princípios

1. **Read-only análise** — phases 1, 2 (parcial), 3, 7 NÃO modificam código
2. **Baseline obrigatório** — sem snapshot do estado atual, não dá pra verificar preservation
3. **Steps atômicos** — cada step ≤ `max_files_per_iter` arquivos + commit isolado
4. **Type-check entre edits** — quebra de tipo = undo automático
5. **Behavior verification objetiva** — compara test outputs antes/depois, não opinião
6. **3 gates humanos** — baseline OK? plano OK? behavior preservation OK?

## Quando usar

**Sim:**
- Refactor de arquivo/módulo grande (> 500 linhas)
- Extrair classes/funções pra outros arquivos
- Splitting de god class
- Renomear API com cuidado de não quebrar consumers
- Decompor monolito em módulos

**Não:**
- Bug fix → `/auto`
- Feature nova → `/swarm` ou spec-driven
- Refactor de 5 linhas → faz direto via Edit
- Refactor + adicionar feature ao mesmo tempo → separa em 2 runs (refactor primeiro, feature depois)

## Diff vs `/simplify` (skill 23)

| Aspecto | `/simplify` | `refactor-safely` |
|---|---|---|
| Escopo | arquivo único ou local | módulo/diretório |
| Baseline snapshot | não | sim |
| Behavior verification | não | sim (compara test outputs) |
| Plano explícito | informal | gerado, aprovado, executado step-by-step |
| Rollback | manual | atômico por step |
| PR auto | não | sim |
| Gates humanos | 0 | 3 |

Use `/simplify` pra cleanup local. Use `refactor-safely` pra mudança estrutural.

## Anti-padrões

- **Pular `gate-baseline`** — se tests já falham antes, refactor pode esconder o bug original
- **`max_files_per_iter > 5`** — perde atomicidade, rollback fica caro
- **`preserve_api: false` sem comunicar consumers** — quebra apps de outros
- **Aceitar `gate-verify` com tests falhando** — refactor por definição não pode quebrar comportamento

## Inspiração

[coleam00/archon `archon-refactor-safely.yaml`](https://github.com/coleam00/archon/blob/main/.archon/workflows/defaults/archon-refactor-safely.yaml) — PreToolUse/PostToolUse hooks pra forçar type-check entre edits, separação clara entre analyze (read-only) e execute.

## Notes

- v1.0.0 (v2.1.0 do kit): MVP com 8 phases + 3 gates
- Possíveis v1.1+: hooks de type-check automatizados durante execute (não esperando AI lembrar)
- Cobrir cenário "migração de framework" (React 17→18) também — pode usar refactor-safely com `preserve_api: false`
