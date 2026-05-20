---
name: parallel-dispatcher
description: |
  Skill especializada em paralelizar trabalho via subagents corretamente — sem cair na armadilha
  skill-vs-agent. Use quando precisar despachar N slices verticais, N reviews, ou N tarefas
  independentes em paralelo. Trigger em: "paralelize", "N slices", "dispatch paralelo",
  "worktree paralelo", "5 workers", "dispatch em paralelo", "fan-out", "scatter-gather",
  "comprehensive review", "multi-agent parallel".
---

# Parallel Dispatcher — Como Paralelizar sem Quebrar (SKILL 40)

> **Esta skill existe porque o kit tem dois universos (skills numeradas + subagents kebab-case) com o mesmo prefixo `dev-team-kit-fv:`, e isso historicamente confunde modelos. Esta skill é o playbook canônico de paralelização que resolve a confusão de uma vez.**

Ler primeiro: `policies/skills-vs-agents.md`.

## Princípio fundamental

> **Skills carregam playbook. Agents executam turnos isolados. Paralelizar uma skill = N agents `general-purpose` (cada um com worktree) onde cada prompt instrui invocar a skill internamente.**

Nunca passe nome de skill como `subagent_type`. Sempre.

---

## Quando usar esta skill

- Vertical slicing de feature em N slices independentes
- Comprehensive review (4-5 agents simultâneos: code/security/test/anti-ai-writing)
- Static analysis pipeline (semgrep + codeql em paralelo)
- Detective spec (4 detectives em paralelo: contracts/business-rules/flows/adrs)
- Qualquer cenário "scatter-gather" onde N trabalhos independentes podem rodar em paralelo

## Quando NÃO usar

- 1 só dispatch isolado — use `Agent({ subagent_type: "..." })` direto
- Tarefas com dependência sequencial — use `/loop` ou pipeline
- Carregar playbook na sessão atual — use `Skill` tool diretamente

---

## Decision Tree

```
Tenho N coisas pra fazer em paralelo?
│
├── Sim, N tarefas independentes
│   │
│   ├── Cada uma usa um SUBAGENT diferente (agents/*.md)?
│   │   └── ✅ Single message, N x Agent({ subagent_type: "dev-team-kit-fv:<nome>" })
│   │
│   ├── Cada uma precisa de SKILL numerada como playbook?
│   │   └── ✅ Single message, N x Agent({
│   │             subagent_type: "general-purpose",
│   │             isolation: "worktree",
│   │             prompt: "PASSO 1: Skill({...}); PASSO 2: ..."
│   │           })
│   │
│   └── Cada uma é uma story de feature completa?
│       └── ✅ Use /swarm "feature X" (Ralph loop com fresh context)
│
└── Não, tem dependência entre elas
    └── Sequenciar via /loop ou pipeline (skill 09 orchestrator)
```

---

## Os 3 caminhos canônicos

### Caminho A — Subagents nativos do kit

Use quando os subagents `agents/*.md` cobrem o trabalho **sem precisar de skill numerada**.

```typescript
// Comprehensive PR review: 4 subagents em paralelo
// SINGLE message, 4 tool calls — paralelização real
Agent({ subagent_type: "dev-team-kit-fv:code-reviewer",   description: "Review", prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:security-auditor", description: "Audit",  prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:test-engineer",    description: "Tests",  prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:anti-ai-writing",  description: "Prose",  prompt: "..." })
```

Lista canônica dos 15 subagents válidos: ver `AGENTS.md` tabela.

### Caminho B — Worktree + general-purpose (skill no prompt)

Use quando precisa carregar **skill numerada** como playbook do trabalho paralelo.

```typescript
const slices = [
  { id: 1, title: "Auth backend",  skill: "03-backend-api",          ... },
  { id: 2, title: "Auth UI",       skill: "04-frontend-integration", ... },
  { id: 3, title: "Auth tests",    skill: "05-qa-testing",           ... },
];

// SINGLE message, 3 tool calls — paralelização real com isolamento
for (const slice of slices) Agent({
  subagent_type: "general-purpose",
  isolation: "worktree",
  description: `Slice ${slice.id} — ${slice.title}`,
  prompt: buildSliceSelfContainedPrompt(slice)
  // Template: templates/parallel-slice-prompt.md
  // Estrutura: PASSO 1 (Skill tool) + Contexto + Critérios + Output esperado
});
```

### Caminho C — `/swarm` (autonomia total)

Use quando: "do prompt ao PR mergeable, sem intervenção".

```
/swarm "implementar feature X"
```

Internamente: PRD → stories → Ralph loop (fresh context per story) → 4-agent review paralelo → self-fix → PR.

---

## Template de prompt self-contained

Ver `templates/parallel-slice-prompt.md` para template completo.

Estrutura mínima:

```markdown
# Slice <N>: <título>

## Passo 1 OBRIGATÓRIO
Invoque: `Skill({ skill: "dev-team-kit-fv:<NN-name>" })`

## Contexto (você não vê a conversa)
- Repo, branch, stack, arquivos relevantes, padrões

## Critérios de aceitação
- [ ] Mensuráveis, verificáveis

## Output esperado
- Commits atômicos, testes, resumo ≤200 palavras
- Não abrir PR (orquestrador consolida)
```

**Cada slice/dispatch precisa ser self-contained** — o subagent não vê a conversa principal.

---

## Anti-padrões registrados

### Anti-padrão 1 — Passar skill numerada como subagent_type

```typescript
// ❌ InputValidationError — skill não é subagent
Agent({ subagent_type: "dev-team-kit-fv:04-frontend-integration", ... })
```

**Correção:** Caminho B (worktree + general-purpose + Skill no prompt). Hook `agent-dispatch-validator.mjs` bloqueia automaticamente.

### Anti-padrão 2 — Mencionar skill no prompt sem invocar

```typescript
// ❌ Subagent não vai carregar a skill automaticamente
Agent({
  subagent_type: "general-purpose",
  prompt: "use a skill 04-frontend-integration para implementar"
})
```

**Correção:** prompt explícito com "PASSO 1 OBRIGATÓRIO: invoque Skill({...})".

### Anti-padrão 3 — Layer-first paralelizado

```typescript
// ❌ Worker A faz todo o backend, Worker B faz todo o frontend → integração quebra
Agent({ ..., prompt: "implemente TODO o backend de auth" })
Agent({ ..., prompt: "implemente TODO o frontend de auth" })
```

**Correção:** vertical slicing (`policies/vertical-slices.md`) — cada slice é feature ponta-a-ponta (DB + back + front + teste).

### Anti-padrão 4 — Multiple messages quando deveria ser single

```typescript
// ❌ Sequencial — cada Agent espera o anterior terminar
Message 1: Agent({...slice 1...})
Message 2: Agent({...slice 2...})
Message 3: Agent({...slice 3...})

// ✅ Paralelo — single message, N tool calls simultâneos
Message: [
  Agent({...slice 1...}),
  Agent({...slice 2...}),
  Agent({...slice 3...}),
]
```

### Anti-padrão 5 — Esquecer `isolation: "worktree"` com slice que muda código

Sem worktree, N subagents tocam o **mesmo working tree** = race conditions, conflitos, lock contention.

```typescript
// ❌ Race condition garantida se mais de um modificar arquivos
Agent({ subagent_type: "general-purpose", prompt: "..." })

// ✅ Isolamento via worktree
Agent({ subagent_type: "general-purpose", isolation: "worktree", prompt: "..." })
```

---

## Pós-dispatch: consolidação

Após os N subagents retornarem:

1. **Verificar status** de cada um (sucesso/falha/parcial)
2. **Coletar diffs** dos worktrees
3. **Estratégia de merge:**
   - **Merge num branch único** (recomendado para feature unificada): cherry-pick ou merge dos N worktrees
   - **N PRs separados** (recomendado para slices verdadeiramente independentes): cada worktree vira PR próprio
4. **Suite completa de testes** no branch consolidado
5. **Despachar review paralelo** (Caminho A com os 4 review subagents)
6. **Self-fix CRITICAL/HIGH** (loop até verde) — ver `policies/swarm-protocol.md` Phase 5
7. **Abrir PR(s)** com synthesis report

---

## Telemetria

Cada bloqueio do hook `agent-dispatch-validator` loga em `.bot/agent-dispatch-errors.jsonl`:

```jsonl
{"ts":"2026-05-19T22:00:00Z","hook":"agent-dispatch-validator","blocked":true,"subagent_type":"dev-team-kit-fv:04-frontend-integration","detected_as":"skill","description":"Slice 2 — Mirror redesign"}
```

Use pra audit: `cat .bot/agent-dispatch-errors.jsonl | jq '.subagent_type' | sort | uniq -c`.

---

## Referências

- `policies/skills-vs-agents.md` — policy canônica (autoridade)
- `templates/parallel-slice-prompt.md` — template self-contained
- `hooks/scripts/agent-dispatch-validator.mjs` — hook fail-fast
- `policies/vertical-slices.md` — vertical slicing (anti-padrões adicionais)
- `policies/swarm-protocol.md` — swarm completo com Ralph + review paralelo
- `AGENTS.md` seção "Subagents Despacháveis" — lista de 15 nomes válidos
- `skills/09-orchestrator/SKILL.md` seção "Como paralelizar slices" — entrypoint do orquestrador
