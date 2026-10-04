---
description: "Liga/desliga o modo cuidadoso desta sessao de trabalho: rm -rf, force-push, reset --hard, DROP TABLE e deploy passam a pedir confirmacao"
argument-hint: "on | off | status"
allowed-tools: Bash(node scripts/session-guard-cli.mjs *), Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/session-guard-cli.mjs *)
---

# /careful

Ativa sob demanda o `permission-ladder-guard` (sem precisar editar `hooks/config.json`), para quando o trabalho mexe em algo que nao se desfaz: producao, migracao, limpeza de pasta, historico do git.

```bash
node "${CLAUDE_PLUGIN_ROOT:-.}/scripts/session-guard-cli.mjs" careful ${ARGUMENTS:-status}
```

- **Lane "gated"** (`rm -rf`, `git push --force`, `git reset --hard`, `git branch -D`, `terraform apply`, `npm publish`...): o hook pede confirmacao. Depois de confirmar com a pessoa, repita o comando com o sufixo ` # permission-ladder: allow`.
- **Lane "closed"** (`DROP TABLE`, `TRUNCATE`, banco de producao): nega e nao abre. A pessoa roda.
- Estado do **projeto** (nao da sessao), expira em 8 h. `off` apaga na hora.
- E um backstop sobre texto de comando, nao um parser de shell: comando ofuscado de proposito passa. Detalhes e limites em `policies/tool-safety.md`.
