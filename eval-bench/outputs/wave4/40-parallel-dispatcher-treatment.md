---
scenario: 40-parallel-dispatcher
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2800
tokens_out_approx: 980
time_seconds: 35
quality_score: 4.8
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.3
notes: "Skill carregou decision tree, 5 anti-padrões nomeados, tabela de raciocínio por elemento, telemetria e pós-dispatch — nada disso aparece no baseline"
---

# Treatment — Despacho de 8 Slices Frontend em Paralelo (com Skill 40)

**Caminho correto: Caminho B** — `general-purpose` + `isolation: "worktree"` + Skill invocada **dentro do prompt**.

Você tem 8 slices de frontend autônomas, cada uma precisando do playbook de `04-frontend-integration`. O dispatch correto é uma **single message com 8 chamadas Agent simultâneas**:

```typescript
// ✅ CORRETO — single message, 8 tool calls em paralelo
Agent({
  subagent_type: "general-purpose",       // ← NUNCA "dev-team-kit-fv:04-frontend-integration"
  isolation: "worktree",                  // ← OBRIGATÓRIO para 8 agentes tocando código
  description: "Slice 1 — <título>",
  prompt: `
# Slice 1: <título>

## Passo 1 OBRIGATÓRIO (antes de qualquer ação)
Invoque: Skill({ skill: "dev-team-kit-fv:04-frontend-integration" })

## Contexto (você não vê a conversa principal)
- Repo: /path/absoluto/ao/repo
- Branch base: main
- Worktree: você já está isolado — mudanças ficam aqui
- Stack: [React/Next.js/Tailwind/etc.]
- Arquivos a tocar: [src/features/X/...]
- Padrões: policies/vertical-slices.md

## Critérios de aceitação
- [ ] <critério mensurável 1>
- [ ] <critério mensurável 2>

## Não fazer
- Não tocar em slices 2-8 (outros worktrees)
- Não abrir PR

## Output esperado
- Commits atômicos neste worktree
- Resumo ≤200 palavras (arquivos tocados, decisões, próximo passo)
  `
})

Agent({ subagent_type: "general-purpose", isolation: "worktree", description: "Slice 2 — ...", prompt: "..." })
Agent({ subagent_type: "general-purpose", isolation: "worktree", description: "Slice 3 — ...", prompt: "..." })
// ... slices 4-8 idem
```

---

## Por que cada elemento é obrigatório

| Elemento | Sem ele | Com ele |
|---|---|---|
| `subagent_type: "general-purpose"` | `InputValidationError` — skills não são subagents | Subagent executa |
| `isolation: "worktree"` | 8 agentes no mesmo working tree → race conditions, conflitos de arquivo | Cada agente tem worktree isolado |
| `Skill({...})` explícito no prompt | Subagent **não** carrega a skill — só vê seu prompt | Playbook de frontend carregado antes da implementação |
| "PASSO 1 OBRIGATÓRIO" | Agente pode ignorar ou adiar a invocação | Garante que o playbook é carregado antes de qualquer ação |
| Prompt self-contained | Subagent não vê sua conversa — fica sem contexto | Subagent tem tudo que precisa para executar autonomamente |
| Single message (8 tool calls) | Se em mensagens separadas → execução sequencial | Paralelismo real |

---

## Os 5 anti-padrões (nomenclatura canônica da skill 40)

**Anti-padrão 1 — Skill como subagent_type (o que você quer evitar):**
```typescript
// ❌ InputValidationError garantido — hook agent-dispatch-validator.mjs bloqueia
Agent({ subagent_type: "dev-team-kit-fv:04-frontend-integration", ... })
```

**Anti-padrão 2 — Mencionar skill no prompt sem invocar:**
```typescript
// ❌ Subagent não vai carregar a skill automaticamente
prompt: "use a skill 04-frontend-integration para implementar o slice"
// ✅ Correto — instrução explícita com Skill tool
prompt: "PASSO 1 OBRIGATÓRIO: Skill({ skill: \"dev-team-kit-fv:04-frontend-integration\" })"
```

**Anti-padrão 3 — Layer-first em vez de vertical slice:**
```typescript
// ❌ Worker A faz todo o CSS, Worker B faz todos os hooks → integração quebra
// ✅ Cada slice é feature ponta-a-ponta (componente + hook + teste)
// Ver: policies/vertical-slices.md
```

**Anti-padrão 4 — 8 mensagens separadas em vez de 1:**
```typescript
// ❌ Sequencial — slice 2 só começa quando slice 1 terminar
Message 1: Agent({slice 1})
Message 2: Agent({slice 2})

// ✅ Paralelo real — single message, 8 tool calls simultâneos
Message: [Agent({slice 1}), Agent({slice 2}), ..., Agent({slice 8})]
```

**Anti-padrão 5 — Esquecer `isolation: "worktree"`:**
```typescript
// ❌ Race condition em src/components/ com 8 escritores simultâneos
Agent({ subagent_type: "general-purpose", prompt: "..." })

// ✅ Isolamento via worktree
Agent({ subagent_type: "general-purpose", isolation: "worktree", prompt: "..." })
```

---

## Pós-dispatch (após os 8 subagents retornarem)

1. Verificar status de cada slice (sucesso/falha/parcial)
2. Coletar diffs dos 8 worktrees
3. Merge num branch único (recomendado para feature coesa) ou 8 PRs separados
4. Suite completa de testes no branch consolidado
5. Despachar review paralelo — Caminho A com 4 subagents:
   `code-reviewer`, `security-auditor`, `test-engineer`, `anti-ai-writing`
6. Self-fix CRITICAL/HIGH (loop até verde) — ver `policies/swarm-protocol.md` Phase 5
7. Abrir PR com synthesis report

---

## Telemetria

Se o hook `agent-dispatch-validator.mjs` estiver ativo, qualquer tentativa de passar skill como `subagent_type` é bloqueada e logada:

```bash
cat .bot/agent-dispatch-errors.jsonl | jq '.subagent_type' | sort | uniq -c
```

Log de exemplo:
```jsonl
{"ts":"2026-05-22T10:00:00Z","hook":"agent-dispatch-validator","blocked":true,"subagent_type":"dev-team-kit-fv:04-frontend-integration","detected_as":"skill","description":"Slice 2 — Mirror redesign"}
```

---

## Referências

- `templates/parallel-slice-prompt.md` — template self-contained completo com exemplo
- `policies/skills-vs-agents.md` — policy canônica (autoridade)
- `policies/vertical-slices.md` — vertical slicing, anti-padrão 3
- `hooks/scripts/agent-dispatch-validator.mjs` — hook fail-fast
- `AGENTS.md` — lista dos 15 subagents válidos do kit
