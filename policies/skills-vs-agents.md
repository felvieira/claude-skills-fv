# Skills vs Agents — Policy Canônica

> **Status:** mandatória. Esta policy resolve a confusão semântica entre `Skill` e `Agent` no dev-team-kit-fv. Ver também `GLOBAL.md` seção "Skills vs Agents (regra crítica)".

## TL;DR

| Pergunta | Resposta |
|---|---|
| Quero carregar um playbook/contexto na sessão atual? | Use `Skill` tool. |
| Quero delegar trabalho num turno isolado (subagent)? | Use `Agent` tool. |
| Vi `dev-team-kit-fv:NN-name` (com número)? | **Skill.** `Skill(skill: "dev-team-kit-fv:NN-name")` |
| Vi `dev-team-kit-fv:name` (sem número, kebab-case)? | **Agent.** `Agent(subagent_type: "dev-team-kit-fv:name")` |
| Quero paralelizar 5 slices de frontend? | `general-purpose` × 5 com `isolation: "worktree"`, cada um invoca a skill internamente. **Nunca** passe skill como `subagent_type`. |

---

## Mental Model

**Skill = como pensar.** Um playbook estruturado carregado no contexto atual. Vê o que você vê. Não consome turno isolado.

**Agent = quem executa.** Um turno isolado com contexto novo, tools próprias, prompt self-contained. Não vê sua conversa.

Eles **não são intercambiáveis**:
- Pedir "skill 11-reviewer" via `Agent` quebra com `InputValidationError` (skill não é subagent_type válido).
- Pedir "general-purpose" via `Skill` quebra (general-purpose não é skill).
- Pedir "skill no prompt" pra um `general-purpose` **não invoca a skill** — só sinaliza intenção. O subagent precisa rodar `Skill` tool internamente.

---

## Matriz de Invocação

### Skills numeradas (`skills/NN-name/SKILL.md`)

38 skills hoje. Sempre prefixo numérico `01-` a `39-` (+ futuras).

```typescript
// CORRETO
Skill({ skill: "dev-team-kit-fv:04-frontend-integration" })
Skill({ skill: "dev-team-kit-fv:09-orchestrator" })
Skill({ skill: "dev-team-kit-fv:37-tdd-engineer" })

// ERRADO — InputValidationError
Agent({ subagent_type: "dev-team-kit-fv:04-frontend-integration", ... })
```

### Subagents (`agents/name.md`)

14 subagents hoje. Sempre nome semântico kebab-case (sem número).

```typescript
// CORRETO
Agent({ subagent_type: "dev-team-kit-fv:code-reviewer", description: "...", prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:debugger", ... })
Agent({ subagent_type: "dev-team-kit-fv:orchestrator", ... })

// ERRADO
Skill({ skill: "dev-team-kit-fv:code-reviewer" })  // não é skill
```

### Lista canônica de subagents válidos

Apenas estes nomes são `subagent_type` válidos para o kit:

```
dev-team-kit-fv:code-reviewer
dev-team-kit-fv:codeql-runner
dev-team-kit-fv:debugger
dev-team-kit-fv:detective-adrs
dev-team-kit-fv:detective-business-rules
dev-team-kit-fv:detective-contracts
dev-team-kit-fv:detective-flows
dev-team-kit-fv:orchestrator
dev-team-kit-fv:sarif-parsing
dev-team-kit-fv:security-auditor
dev-team-kit-fv:semgrep-scanner
dev-team-kit-fv:semgrep-triager
dev-team-kit-fv:test-engineer
dev-team-kit-fv:variant-analysis
```

Qualquer outro nome com prefixo `dev-team-kit-fv:` → é **skill**, não subagent.

---

## Matriz de Espelhos (Skill ↔ Agent)

Alguns conceitos têm **ambos** — skill (playbook) E agent (executor). Use cada um pra coisa diferente:

| Conceito | Skill (playbook) | Agent (executor isolado) | Quando usar skill | Quando usar agent |
|---|---|---|---|---|
| Orchestrator | `09-orchestrator` | `orchestrator` | Quero o playbook de pipeline na sessão atual | Quero delegar classificação de task num turno isolado |
| Code Review | `11-reviewer` | `code-reviewer` | Quero o playbook de review na sessão | Quero review isolado de um PR/diff |
| QA Testing | `05-qa-testing` | `test-engineer` | Quero o playbook de QA na sessão | Quero geração isolada de testes |
| Security | `06-security-review` | `security-auditor` | Quero o playbook de security na sessão | Quero audit isolado |
| Detective Spec | `33-detective-spec` | `detective-contracts`, `detective-business-rules`, `detective-flows`, `detective-adrs` | Quero entender o playbook completo de detective | Quero rodar **uma fase** específica (contracts, business-rules, etc) em paralelo |
| Static Analysis | `34-static-analysis` | `semgrep-scanner`, `semgrep-triager`, `codeql-runner`, `sarif-parsing`, `variant-analysis` | Quero o playbook de análise estática | Quero rodar **uma etapa** específica do pipeline |

**Regra mnemônica:** skill carrega o playbook; agent **roda** uma fase isolada do playbook em turno separado. Em pipelines grandes, a skill define o que fazer e os agents fazem em paralelo.

---

## Anti-Padrões (Registrados)

### Anti-padrão 1 — "Passar skill numerada como subagent_type"

**Erro real observado:** usuário pediu paralelizar 5 slices de frontend. Modelo disparou:

```typescript
Agent({ subagent_type: "dev-team-kit-fv:04-frontend-integration", ... })  // ❌
```

**Resultado:** `InputValidationError` em todos os 5 dispatches. Modelo fez fallback errado (`general-purpose` mencionando a skill no prompt sem invocá-la), resultando em subagent que "fingia" conhecer a skill.

**Correção:**

```typescript
// 5 dispatches paralelos, cada um carrega a skill DENTRO do subagent
for (const slice of slices) {
  Agent({
    subagent_type: "general-purpose",
    isolation: "worktree",
    description: `Slice ${slice.id} — ${slice.title}`,
    prompt: `
# Slice ${slice.id}: ${slice.title}

## Primeiro passo OBRIGATÓRIO
Antes de qualquer ação, invoque:
\`Skill({ skill: "dev-team-kit-fv:04-frontend-integration" })\`
Isso carrega o playbook de Frontend Integration no seu contexto.

## Contexto (você não vê a conversa principal)
- Repo: ${repoPath}
- Branch base: ${baseBranch}
- Arquivos relevantes: ${slice.files.join(", ")}
- Padrões: policies/vertical-slices.md, policies/source-driven.md

## Critérios de aceitação
${slice.acceptance.map((a, i) => `${i + 1}. ${a}`).join("\n")}

## Output esperado
- Commit(s) atômicos no worktree
- Resumo final ≤200 palavras com lista de arquivos tocados
`
  });
}
```

### Anti-padrão 2 — "Mencionar skill no prompt sem invocar"

**Errado:** mandar `general-purpose` com prompt "use a skill `04-frontend-integration` para implementar". O subagent **não vai** carregar a skill automaticamente — ele só recebe o texto. Pra carregar de fato, o prompt precisa instruir explicitamente a invocação via `Skill` tool (anti-padrão 1 mostra como).

### Anti-padrão 3 — "Tentar `Skill` num agent name"

```typescript
Skill({ skill: "dev-team-kit-fv:code-reviewer" })  // ❌ code-reviewer é agent, não skill
```

**Correção:** Use `Agent({ subagent_type: "dev-team-kit-fv:code-reviewer", ... })`. Se quer o **playbook** de review (não execução isolada), use `Skill({ skill: "dev-team-kit-fv:11-reviewer" })`.

### Anti-padrão 4 — "Paralelizar passando skill numerada"

Variação do anti-padrão 1, comum em vertical slicing:

```typescript
// ❌ TODOS quebram
Agent({ subagent_type: "dev-team-kit-fv:03-backend-api", ... })
Agent({ subagent_type: "dev-team-kit-fv:05-qa-testing", ... })
Agent({ subagent_type: "dev-team-kit-fv:22-accessibility-specialist", ... })
```

**Correção:** vide anti-padrão 1.

---

## Paralelização Correta (3 caminhos)

### Caminho A — Worktree + general-purpose (paralelização real)

Use quando: N slices verticais independentes, quer PRs separados, controle granular.

```typescript
const slices = [/* ... 5 slices ... */];
const dispatches = slices.map(slice => ({
  subagent_type: "general-purpose",
  isolation: "worktree",
  description: `Slice ${slice.id}`,
  prompt: buildSliceSelfContainedPrompt(slice)  // ver templates/parallel-slice-prompt.md
}));
// Dispatch em paralelo: single message com N tool calls
```

### Caminho B — `/loop --worktree --parallel N` (process-based)

Use quando: feature completa, quer Ralph loop com circuit breaker e telemetria.

```bash
node scripts/auto-loop.mjs --worktree --parallel 5 "implementar feature X em 5 slices"
```

Cada worker é um processo Claude independente com `cwd` próprio (worktree isolado).

### Caminho C — `/swarm` (autonomia total)

Use quando: do prompt ao PR mergeable, sem intervenção.

```
/swarm "implementar feature X"
```

Internamente faz: PRD → stories → Ralph loop → 4-agent parallel review → self-fix → PR.

---

## Decision Tree

```
Pedido envolve "dev-team-kit-fv:X"?
├── X tem número (NN-name)? → SKILL
│   ├── Quero carregar playbook na sessão atual? → Skill(skill: ...)
│   └── Quero N execuções paralelas com esse playbook?
│       ├── Independentes? → Agent × N com isolation:worktree + prompt instrui Skill internamente
│       └── Sequenciais com fresh context? → /loop ou /swarm
└── X é kebab-case sem número? → AGENT
    ├── 1 execução isolada? → Agent(subagent_type: ...)
    └── N execuções paralelas? → N x Agent(subagent_type: ..., isolation: "worktree")
```

---

## Fail-Fast (hook PreToolUse)

O hook `hooks/scripts/agent-dispatch-validator.mjs` (v2.2.0+) intercepta `Agent` calls com `subagent_type` começando com `dev-team-kit-fv:`. Se o nome **não** existe em `agents/` mas existe em `skills/`, bloqueia com mensagem acionável.

Telemetria em `.bot/agent-dispatch-errors.jsonl` (timestamp, intent, suggested fix).

Pra desativar (não recomendado): `DEVKIT_DISABLED_HOOKS=agent-dispatch-validator` ou em `config.json`.

---

## Anti-pattern: paralelizar agents no mesmo working tree

3 agents que tocam arquivos comuns (ex: `src/index.js`) sobrescrevem uns aos outros quando rodam em paralelo no mesmo working tree. Caso real: durante eval-bench, 3 agents reescreveram `src/index.js` do devkit-sandbox em paralelo, perdendo mudanças sucessivas.

Regra: SEMPRE usar `isolation: "worktree"` ou `/loop --worktree --parallel N` quando despachar 2+ agents simultâneos que podem tocar os mesmos arquivos. Sem worktree, paralelize apenas tasks read-only (eval, audit, search).

---

## Eval cases

Ver `evals/policies/skills-vs-agents/golden.json`:

1. "paralelize 5 slices de frontend" → worktree × 5 + Skill interna, **não** passa skill como subagent_type
2. "review este PR isolado" → `Agent(subagent_type: code-reviewer)`
3. "carregar contexto QA antes de implementar" → `Skill(skill: 05-qa-testing)`
4. Prompt vago "use o frontend agent" → clarifica (frontend tem skill 04, não agent)
5. Regression: dispatch direto de skill numerada → hook bloqueia + sugere fix

---

## Referências

- `GLOBAL.md` — bloco "Skills vs Agents (regra crítica)"
- `AGENTS.md` — tabela de subagents válidos
- `templates/parallel-slice-prompt.md` — template de prompt self-contained para subagent
- `skills/40-parallel-dispatcher/SKILL.md` — skill especializada em paralelização
- `docs/skill-guides/skills-vs-agents-disambiguation.md` — guia longo com 15 cenários
- `hooks/scripts/agent-dispatch-validator.mjs` — hook fail-fast
