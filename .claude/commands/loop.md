---
description: Loop autônomo idêntico ao Ralph — executa claude --print em subprocess até a task estar pronta, funcional e testada
---

# /loop — Autonomous Loop (Ralph-identical)

Invoca `scripts/auto-loop.mjs` para executar uma task de forma completamente autônoma via subprocess loop.

**Diferença em relação ao `/auto`:**
- `/auto` — prompt-based: Claude lê o protocolo e executa no contexto atual
- `/loop` — process-based: Node.js roda `claude --print` em subprocesso real, iterando até done

## Uso

```bash
# Via script direto (recomendado)
node scripts/auto-loop.mjs "sua task aqui"

# Em repos consumidores (instalado em .bot/)
node .bot/scripts/auto-loop.mjs "sua task aqui"
```

## Opções

| Flag | Descrição | Default |
|------|-----------|---------|
| `--max-iterations N` | Override budget máximo de iterações | auto (8/12/15) |
| `--validate` | Rodar validação completa após cada iteração | false |
| `--no-commit` | Não fazer commit automático ao concluir | false |
| `--model MODEL` | Modelo Claude a usar | claude-sonnet-4-5 |
| `--push` | Push após commit | false |
| `--verbose` | Mostrar output completo de cada iteração | false |

## Exemplos

```bash
# Task simples (budget: 8 iterações)
node scripts/auto-loop.mjs "criar endpoint REST /api/health com teste"

# Task média (budget: 12 iterações)
node scripts/auto-loop.mjs "adicionar autenticação JWT ao módulo users com refresh token"

# Task grande (budget: 15 iterações)
node scripts/auto-loop.mjs "refatorar módulo de pagamentos para eliminar duplicação, adicionar testes e documentação"

# Com validação completa e verbose
node scripts/auto-loop.mjs "corrigir bug de race condition no cache" --validate --verbose

# Sem commit automático
node scripts/auto-loop.mjs "adicionar feature X" --no-commit

# Com modelo diferente
node scripts/auto-loop.mjs "task complexa" --model claude-opus-4-5 --max-iterations 20
```

## Padrões Implementados (Ralph-identical)

| Padrão | Implementação |
|--------|--------------|
| Progress tracking | Checkboxes em `.auto/plan.md` via `countPlanTasks()` |
| Inter-iteration memory | `.auto/progress.md` append-only |
| Context narrowing | 3 níveis: full → focused → minimal por iteração |
| Tiered validation | lint (~5s) → typecheck (~15s) → build (~60s) |
| Error deduplication | MD5 hash de erro normalizado (sem line numbers/timestamps) |
| Completion override | Re-read `.auto/plan.md` antes de parar — tasks `[ ]` = não done |
| Dynamic budget | 8 iter (1-2 tasks) / 12 (3-4 tasks) / 15 (5+) |
| Validation feedback loop | Erro de validação vira contexto da próxima iteração |
| Stall detection | 3 iterações sem `git diff` = stuck |
| Build-fix extension | +2 iterações se build falha na última iteração (uma vez só) |

## Circuit Breaker

Para automaticamente quando:
- Mesmo erro 3x consecutivos (normalizado)
- 3 iterações sem mudanças em `git diff`
- Budget estourado
- Task marcada como bloqueada pelo agente

## Arquivos Gerados

```
.auto/
  plan.md       ← plano com checkboxes [x]/[ ]
  progress.md   ← log append-only por iteração
  env.md        ← ferramentas detectadas (test, lint, typecheck, build)
  session.json  ← estado da sessão atual
```

> `.auto/` está no `.gitignore` — não é commitado.

## Quando usar /loop vs /auto

- **`/auto`** — quando quer que Claude execute autonomamente no contexto atual da conversa
- **`/loop`** — quando quer um processo externo real que roda `claude` como subprocess, com budget fixo, circuit breaker e commit automático ao final
