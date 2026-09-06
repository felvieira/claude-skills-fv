---
name: parallel-dispatcher
description: |
  Skill especializada em paralelizar trabalho via subagents corretamente — sem cair na armadilha
  skill-vs-agent. Use quando precisar despachar N slices verticais, N reviews, ou N tarefas
  independentes em paralelo, e quando reviewers/agentes paralelos discordam sobre o mesmo achado
  e a decisão de arbitrar/bloquear precisa de um critério formal. Trigger em: "paralelize", "N slices",
  "dispatch paralelo", "worktree paralelo", "5 workers", "dispatch em paralelo", "fan-out",
  "scatter-gather", "comprehensive review", "multi-agent parallel", "reviewers discordam",
  "achados divergentes", "arbitragem entre agentes", "quem decide quando os agentes discordam".
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

## Teste de "informação nova"

> Fonte: [bojieli/ai-agent-book](https://github.com/bojieli/ai-agent-book)

Fan-out só compensa se cada braço recebe informação **diferente** — não a mesma entrada N vezes. Se a resposta é "nada" — não paralelize, aumente o orçamento de UM agente.

Falhas MAST: interface ambígua, sobreposição de papel, convergência homogênea.

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
// Note: code-reviewer e security-auditor = "opus" (raciocínio cross-layer)
//       test-engineer e anti-ai-writing = "sonnet" (validação padrão)
Agent({ subagent_type: "dev-team-kit-fv:code-reviewer",    model: "opus",   description: "Review", prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:security-auditor", model: "opus",   description: "Audit",  prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:test-engineer",    model: "sonnet", description: "Tests",  prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:anti-ai-writing",  model: "sonnet", description: "Prose",  prompt: "..." })
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
// SEMPRE passar `model:` — sem isso o subagent herda do parent (geralmente Opus)
// e gasta budget desnecessário. Ver policies/model-routing-real.md.
for (const slice of slices) Agent({
  subagent_type: "general-purpose",
  isolation: "worktree",
  model: tierForSlice(slice),         // → sonnet (impl), opus (arch/security), haiku (rename/format)
  description: `Slice ${slice.id} — ${slice.title}`,
  prompt: buildSliceSelfContainedPrompt(slice)
  // Template: templates/parallel-slice-prompt.md
  // Estrutura: PASSO 1 (Skill tool) + Contexto + Critérios + Output esperado
});

// Helper canônico:
function tierForSlice(slice) {
  if (slice.kind === "security" || slice.kind === "architecture") return "opus";
  if (slice.kind === "rename"   || slice.kind === "format")        return "haiku";
  return "sonnet";  // default: implementação, testes, docs
}
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

### Anti-padrão 5 — Agent() sem `model:` em sessão Opus

```typescript
// ❌ Herda Opus do parent — gasta ~10x mais que o necessário em slice trivial
Agent({ subagent_type: "general-purpose", prompt: "rename 5 variables to camelCase" })

// ✅ Forçar tier apropriado
Agent({ subagent_type: "general-purpose", model: "haiku", prompt: "rename 5 variables to camelCase" })
```

**Por quê isso importa:** Claude Code hooks **não conseguem** forçar troca de model em tempo de dispatch (a API hook não tem `override_model`). O hook `model-routing-hook.mjs` só **sugere** via additionalContext. Enforcement real = passar `model:` explícito. Detalhe em `policies/model-routing-real.md`.

Custo numa sessão típica de `/swarm` com 5 slices: passar `model: "sonnet"` em vez de herdar Opus economiza ~$0.40 por slice × 5 = $2 por sessão. Em 30 sessões/mês = $60. Vale o hábito.

### Anti-padrão 6 — Esquecer `isolation: "worktree"` com slice que muda código

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

## Arbitragem em caso de discordância

Fan-out resolve "N trabalhos independentes rodam ao mesmo tempo". Não resolve o caso onde N reviewers avaliam a **mesma coisa** e chegam a conclusões incompatíveis. Sem etapa explícita, o default é perigoso: reportar os achados lado a lado e seguir, ou ficar com o veredito mais otimista silenciosamente. Detalhamento completo (regras do árbitro, exemplo passo a passo, template de dispatch): `references/arbitration-disagreement.md`.

### Quando aplicar

| Situação | Aplica arbitragem? |
|---|---|
| 2+ agentes avaliam o mesmo achado/decisão e chegam a conclusões incompatíveis (aprova vs bloqueia; CRITICAL vs não-issue) | Sim |
| Divergência é sobre correção, segurança ou risco que afeta o resultado entregue | Sim |
| Divergência é de fraseado/estilo (mesmo comentário, redação diferente) | Não, ruído |
| Divergência de preferência subjetiva sem risco associado | Não |
| Só 1 agente rodou nessa etapa | Não há o que arbitrar |
| Task pequena/trivial | Overhead desnecessário |

Regra prática: se a divergência muda o que acontece depois, arbitra. Se só muda a redação do relatório, não arbitra.

### Papel de árbitro e gate fail-closed (resumo)

Um terceiro agente recebe os vereditos **anonimizados** (Posição A / Posição B, sem dizer qual agente disse o quê) e decide com base na evidência apresentada, nunca por votação ou média. Veredito fundamentado: decisão final, razão que decidiu, o que a posição perdedora não sustentou. Evidência equivalente entre os lados escala pro humano em vez de forçar decisão.

Sem resolução (concordância original ou veredito do árbitro), a etapa seguinte fica bloqueada: nunca segue com o achado mais otimista, nunca faz média de severidade, nunca ignora a divergência silenciosamente. Espelha `policies/quality-gates.md` (hook que bloqueia vence advisory) aplicado a discordância entre agentes, não entre regras do kit (`policies/trade-off-resolution.md`).

Regras completas, exemplo de achado de segurança e template de dispatch: `references/arbitration-disagreement.md`.

---

## Long-horizon compression (50+ tool calls)

Quando o trabalho paralelo gera muitas tool calls (caso típico em `/swarm`, `/auto`, e comprehensive reviews 4-5 agents), o histórico de mensagens vira gargalo de context window antes do trabalho terminar.

Solução: **Mermaid canvas + `node_id` drill-down** — comprime tool outputs verbosos num grafo de alta densidade, mantendo evidência crua em arquivos no disco.

Quando ativar (uma das heurísticas basta):

1. ≥ 30 tool calls na sessão atual
2. Histórico de mensagens > 50% do context window
3. Dentro de `/swarm`, `/auto`, `/loop` longo (>10 iterations)
4. Pedido explícito do usuário

Fluxo:

```bash
# Cada subagent emite linhas em .auto/tool-calls.jsonl ou .swarm/tool-calls.jsonl
#   {"tool":"grep","summary":"search timing-safe cmp","ref":"N3","body":"..."}
# (o body fica em refs/Nk.md; só o summary entra no canvas)

node scripts/mmd-canvas-builder.mjs --session .auto
# → .auto/canvas.mmd  (canvas Mermaid com [Nk] node ids)
# → .auto/refs/Nk.md  (1 arquivo por node, drill-down)
```

O canvas é injetado no próximo turno do orquestrador em vez do histórico cru. Para detalhe de um node específico, o agente lê `refs/Nk.md` sob demanda — não promove o arquivo inteiro de volta pro contexto.

Ver `policies/symbolic-memory.md` para regras completas (formato, anti-padrões, drill-down protocol).

**Não ativar** em sessões curtas (< 30 tool calls) — overhead sem retorno.

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
- `policies/symbolic-memory.md` — Mermaid canvas + drill-down para long-horizon (v2.14.0)
- `scripts/mmd-canvas-builder.mjs` — builder zero-dep do canvas
- `references/arbitration-disagreement.md` — detalhamento completo da arbitragem (papel do árbitro, exemplo, template de dispatch)
- `policies/quality-gates.md` — gate fail-closed como padrão reusável (arbitragem é uma instância dele)
- `policies/trade-off-resolution.md` — hierarquia de conflito entre **regras do kit**; arbitragem acima resolve conflito entre **agentes**, não entre regras
- `commands/multi-plan.md` — divergência entre planos de modelos escalada pro humano; arbitragem acima usa um terceiro agente antes de chegar no humano
