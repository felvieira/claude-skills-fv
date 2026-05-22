---
scenario: 40-parallel-dispatcher
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 620
time_seconds: 18
quality_score: 2.5
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 3
  actionability: 3
  discipline: 2
pass_fail: baseline
delta_vs_baseline: n/a
notes: "Resposta genérica, identifica o problema mas não dá playbook concreto nem estrutura do prompt self-contained"
---

# Baseline — Despacho de 8 Slices Frontend em Paralelo

## O Problema

O anti-padrão descrito acontece quando você passa o nome de uma skill diretamente como `subagent_type`. Skills são carregadores de playbook — não são subagents executáveis. O campo `subagent_type` aceita apenas subagents válidos (nomes kebab-case da lista de agents do kit), não skills numeradas.

```typescript
// ❌ ERRADO — vai gerar InputValidationError
Agent({ subagent_type: "dev-team-kit-fv:04-frontend-integration", ... })
```

## Como Despachar Corretamente

Para 8 slices independentes com `04-frontend-integration` como playbook, o padrão correto é usar `general-purpose` como `subagent_type` e instruir a invocação da skill dentro do prompt de cada subagent.

### Estrutura do Dispatch

Envie **uma única mensagem** com 8 chamadas de `Agent` simultâneas (paralelismo real):

```typescript
// ✅ Correto — 8 chamadas em single message
Agent({
  subagent_type: "general-purpose",
  isolation: "worktree",
  description: "Slice 1 — <nome>",
  prompt: `
    Passo 1: invoque Skill({ skill: "dev-team-kit-fv:04-frontend-integration" })
    Passo 2: implemente <descrição do slice 1>
    Critérios: [...]
  `
})
Agent({
  subagent_type: "general-purpose",
  isolation: "worktree",
  description: "Slice 2 — <nome>",
  prompt: `
    Passo 1: invoque Skill({ skill: "dev-team-kit-fv:04-frontend-integration" })
    Passo 2: implemente <descrição do slice 2>
    Critérios: [...]
  `
})
// ... (repita para slices 3 a 8)
```

### Regras críticas

1. **Single message, 8 tool calls** — se você enviar um Agent por mensagem, a execução é sequencial, não paralela.
2. **`isolation: "worktree"`** — sem isso, os 8 subagents vão escrever no mesmo working tree e gerar conflitos.
3. **Prompt self-contained** — o subagent não vê sua conversa. Inclua repo path, branch, arquivos relevantes, critérios de aceitação.
4. **Skill no prompt, não no subagent_type** — a invocação da skill deve ser a primeira instrução do prompt.

### Prompt mínimo por slice

```
Passo 1 OBRIGATÓRIO: invoque Skill({ skill: "dev-team-kit-fv:04-frontend-integration" })

Contexto:
- Repo: /path/to/repo
- Branch: main  
- Stack: [sua stack]
- Arquivos a tocar: [paths]

Critérios de aceitação:
- [ ] critério 1
- [ ] critério 2

Output:
- Commits atômicos
- Resumo ≤200 palavras
- NÃO abrir PR
```

## Pós-dispatch

Após os 8 subagents retornarem, consolide os diffs manualmente ou via merge dos worktrees, rode a suite de testes e abra um PR único.
