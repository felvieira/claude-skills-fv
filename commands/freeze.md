---
description: "Congela as edicoes numa pasta: Edit/Write fora dela sao bloqueados ate /freeze off (evita o conserto acidental de codigo nao relacionado)"
argument-hint: "<pasta> | off | status"
allowed-tools: Bash(node scripts/session-guard-cli.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/session-guard-cli.mjs *)
---

# /freeze

Util ao depurar: limita onde o agente pode escrever, para ele nao "arrumar" outra parte do repo no caminho.

```bash
node "${CLAUDE_PLUGIN_ROOT:-.}/scripts/session-guard-cli.mjs" freeze ${ARGUMENTS:-status}
```

- `/freeze src/billing` — Edit, Write, MultiEdit e NotebookEdit so passam dentro de `src/billing`.
- `/freeze off` — libera. `status` mostra o que esta ativo.
- Estado do **projeto**, expira em 8 h.
- **Limite:** so enxerga as ferramentas de edicao. `sed -i`, redirecionamento ou `mv` via Bash escapam. E protecao contra descuido, nao contra evasao.
