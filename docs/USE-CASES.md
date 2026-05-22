# Use Cases — "Quero fazer X, qual fluxo uso?"

**Objetivo:** mapear 17 cenários reais de dev no dia-a-dia → comando/program apropriado. Funciona como (1) referência humana e (2) **prompt training** para o LLM classifier do hook `intent-classifier` v2.

**Como ler:** ache seu cenário, veja o comando recomendado. Se você está em modo **Autonomous** (Nível 3), o hook auto-roteia — você só **descreve a task em linguagem natural** e o classifier escolhe pra você.

---

## Categorias de fluxo

Cada cenário cai em uma das 5 categorias:

| Categoria | Quando | Comando padrão |
|---|---|---|
| **A. Autônomo** | Manda e esquece, retorna em PR | `/swarm` ou auto-roteado |
| **B. Pipeline com gates** | Quer controle, gates humanos entre fases | `/run-program <nome>` |
| **C. Direto/leve** | Task simples, sem overhead | `/auto`, skill direta, ou subagent |
| **D. Conversacional** | Q&A, exploração, "como funciona X" | Chat normal, sem command |
| **E. Agendado/contínuo** | Recorrente, manutenção | `/schedule` |

---

## Cenários

### 1. MVP do zero (greenfield)

> "Construir um SaaS de gestão de tarefas, stack React+Node+Postgres"

- **Categoria:** B (pipeline)
- **Comando:** `/run-program adversarial-dev`
- **Por quê:** greenfield precisa **N sprints / N PRs**. Planner cria spec, generator constrói, evaluator ataca. `/swarm` assume PRD existente e 1 PR.
- **Auto-routed em Autonomous?** Sim, pra `adversarial-dev` (não `/swarm`).

### 2. Feature em projeto existente

> "Adicionar autenticação social no app (Google + GitHub)"

- **Categoria:** A (autônomo) ou B (gates)
- **Comando:** `/swarm "..."` (autônomo) ou `/run-program spec-driven-development` (gates)
- **Por quê:** projeto existente tem contexto, constitution opcional. Swarm faz tudo até PR. Spec-driven pausa em checklist + analyze.
- **Auto-routed em Autonomous?** Sim, pra `/swarm`.

### 3. Bug fix isolado

> "Tem um bug onde usuário sem email crasha o login"

- **Categoria:** C (direto)
- **Comando:** `/auto` + subagent debugger
- **Por quê:** bug pequeno não merece worktree + 4-agent review + PR ceremony. `/swarm` é overhead.
- **Auto-routed em Autonomous?** Sim, pra `/auto` (não swarm).

### 4. Fix de bug a partir de issue GitHub

> "fix #142" / "implementa issue 87" / "resolve bug do #N"

- **Categoria:** A (autônomo)
- **Comando:** `/swarm fix #142`
- **Por quê:** issue tem contexto estruturado (title, body, labels). Swarm consome via `gh issue view`, implementa, PR linka com `Closes #142`.
- **Auto-routed em Autonomous?** Sim, pra `/swarm fix #N`.

### 5. Refatorar módulo grande com segurança

> "Refatorar src/auth/ pra extrair em módulos menores, sem quebrar comportamento"

- **Categoria:** B (pipeline)
- **Comando:** `/run-program refactor-safely` (novo v2.1.0)
- **Por quê:** refactor precisa preservar behavior. Pipeline: scan → analyze read-only → plan → execute com hooks de type-check → verify behavior. Skill 23 (migration-refactor) sozinha não tem essas garantias.
- **Auto-routed em Autonomous?** Sim, pra `refactor-safely`.

### 6. Adicionar testes a código existente

> "Criar testes pro módulo X que não tem cobertura"

- **Categoria:** C (direto)
- **Comando:** `/test` ou skill 05 (qa-testing) via trigger natural
- **Por quê:** task focada, skill 05 conhece patterns. `/swarm` é overhead.
- **Auto-routed em Autonomous?** Não — apenas confirma skill 05 está ativa.

### 7. Documentar sistema legacy

> "Documentar essa codebase que herdei, não tem nada"

- **Categoria:** B (pipeline)
- **Comando:** `/detective-spec` ou `/run-program detective-spec`
- **Por quê:** pipeline de 5 fases (recon → módulos → regras → fluxos → ADRs retroativos). Read-only, não modifica código.
- **Auto-routed em Autonomous?** Sim, pra `detective-spec`.

### 8. Code review profundo de PR meu

> "Review meu PR #87 antes de pedir review humano"

- **Categoria:** B (pipeline)
- **Comando:** `/run-program comprehensive-review --input pr_number=87`
- **Por quê:** 5 agents paralelos (code/security/tests/comments/docs) + synthesize + auto-fix CRITICAL/HIGH + post comment.
- **Auto-routed em Autonomous?** Sim, pra `comprehensive-review`.

### 9. Code review de PR de outro dev

> "Olha o PR #142 do João e me dá feedback"

- **Categoria:** B ou C
- **Comando:** `/run-program comprehensive-review --input pr_number=142` (profundo) ou `/review #142` (rápido)
- **Por quê:** review profundo ou rápido depende do PR. PRs críticos = comprehensive.

### 10. Setup CI/CD do zero

> "Criar GitHub Actions pra rodar tests + deploy"

- **Categoria:** B (pipeline)
- **Comando:** `/run-program spec-driven-development` (porque CI/CD é configuração estruturada com gates)
- **Skills envolvidas:** 07 (deploy-docker) + 20 (observability-sre)
- **Auto-routed em Autonomous?** Sim, pra `/swarm` (CI/CD é feature do repo).

### 11. Migração de framework

> "Migrar de React 17 pra 18" / "Vue 2 → Vue 3" / "Express → Fastify"

- **Categoria:** B (pipeline)
- **Comando:** `/run-program spec-driven-development` (com constitution ADR de migração)
- **Skills:** 23 (migration-refactor) + 33 (detective-spec se precisar mapear o existente)
- **Auto-routed em Autonomous?** Sim, pra `/swarm` (migração é feature grande).

### 12. Investigar performance lenta

> "Endpoint /api/users tá lento, descobre o que é"

- **Categoria:** C (direto)
- **Comando:** subagent debugger + skill 20 (observability)
- **Por quê:** investigação é diagnóstico, não implementação. Pode terminar em recomendação, não em PR.
- **Auto-routed em Autonomous?** Não — investigação precisa de iteração humana.

### 13. Spike / Prova de conceito

> "Ver se dá pra integrar com Stripe rapidamente, sem se preocupar com qualidade"

- **Categoria:** C (direto)
- **Comando:** `/auto` com `--no-tdd` ou `/loop --polish=none`
- **Por quê:** spike é descartável. Não merece worktree + tests + PR. Pode até virar branch experimental.
- **Auto-routed em Autonomous?** Não — spike precisa controle humano.

### 14. Gerar assets visuais

> "Preciso de hero image + favicon + OG cards pra landing"

- **Categoria:** C (direto)
- **Comando:** `/web-assets` ou skill 17 (image-generator) / 36 (web-asset-generator)
- **Por quê:** task focada, skills cobrem.
- **Auto-routed em Autonomous?** Não — escolha de prompt/style precisa decisão humana.

### 15. Pergunta informacional

> "O que faz esse código?" / "Como funciona X?" / "Quando usar Y?"

- **Categoria:** D (conversa)
- **Comando:** nenhum — chat normal
- **Por quê:** Q&A, não tarefa.
- **Auto-routed em Autonomous?** Não — hook detecta padrão informacional e skip.

### 16. Setup inicial de projeto com kit

> "Instalar dev-team-kit nesse projeto"

- **Categoria:** Setup
- **Comando:** `/devkit-install-fv`
- **Auto-routed?** Não — setup é decisão explícita.

### 18. Loop autônomo gastando muito token em re-runs

> "/auto está rodando há 2h, já gastei $40 e ele fica rodando `npm test` e `eslint` toda iteração"

- **Categoria:** C (direto) + ajuste de configuração
- **Comando:** ligar **cross-call dedup** (v2.9.0+) — `devkit_compress_output` com `cross_call: true` ou stage 0 no compressor.
- **Por quê:** loops autônomos re-executam comandos idênticos (`npm test`, `eslint`, `tsc --noEmit`, `git status`) dezenas de vezes. Sem cross-call dedup, cada re-run paga o custo de tokens inteiro. Com a janela de 16 chamadas + MinHash + Jaccard ≥0.85, re-runs idênticos ou ≥85% similares (variação só de timestamp/duração) são substituídos por um marker curto. Benchmark inicial: **98% de redução no second-run agregado**.
- **Auditoria:** `devkit_dedup_status` retorna o tamanho atual da janela; `reset: true` zera.
- **Auto-routed em Autonomous?** Não — é configuração, não task. Mas o `/swarm` já roda com cross-call ligado por default desde v2.9.0.

---

### 17. Manutenção contínua / agendada

> "Rodar review semanal" / "atualizar deps mensalmente" / "checar segurança toda quarta"

- **Categoria:** E (agendada)
- **Comando:** `/schedule daily/weekly/monthly <command>`
- **Auto-routed em Autonomous?** Não — agendamento é decisão consciente.

---

## Tabela de decisão rápida

| Sinal no prompt | Categoria | Comando |
|---|---|---|
| "do zero", "from scratch", "MVP", "greenfield" | B | `/run-program adversarial-dev` |
| "criar feature", "adicionar feature", "nova feature" | A | `/swarm` |
| "bug", "crash", "erro", "quebrou" | C | `/auto` + debugger |
| "fix #N", "issue N", "resolve #N" | A | `/swarm fix #N` |
| "refatorar", "extrair", "decompor", "split" | B | `/run-program refactor-safely` |
| "criar testes", "adicionar coverage", "testar X" | C | `/test` |
| "legacy", "sem docs", "herdei", "reverse engineering" | B | `/detective-spec` |
| "review crítico", "5 agentes", "review profundo PR" | B | `/run-program comprehensive-review` |
| "review esse PR", "olha PR" | B/C | `/review` ou `comprehensive-review` |
| "CI/CD", "GitHub Actions", "pipeline deploy" | B | `/swarm` ou spec-driven |
| "migrar", "atualizar framework", "upgrade" | B | spec-driven com ADR |
| "investigar", "por que tá lento", "performance" | C | debugger subagent |
| "spike", "prova de conceito", "ver se dá" | C | `/auto --no-tdd` |
| "hero image", "favicon", "asset" | C | `/web-assets` |
| "o que é", "como funciona", "explica" | D | conversa |
| "instalar kit", "setup projeto" | Setup | `/devkit-install-fv` |
| "rodar semanal", "todo dia", "automatizar" | E | `/schedule` |
| "loop gastando muito token", "re-run", "comando repetido" | C | habilitar `cross_call: true` (v2.9.0+) |

---

## Anti-padrões comuns

- **Usar `/swarm` pra bug pequeno** — worktree + 4 agents + PR pra fix de 3 linhas é desperdício
- **Usar `/auto` pra feature grande** — sem worktree, polui sessão
- **Usar `/run-program adversarial-dev` em projeto existente** — assume greenfield
- **Usar `/run-program detective-spec` em projeto seu** — é pra legacy, não pra próprio code
- **Não usar nada quando deveria** — task estruturada sem program perde gates de qualidade

---

## Como o classifier LLM decide

O hook `intent-classifier` v2 manda o prompt do usuário pra Claude Haiku com:
1. Este documento como contexto (catálogo de cenários)
2. Pergunta: "Classifique este prompt em uma das categorias A/B/C/D/E e recomende comando"
3. Output JSON: `{category, command, args, confidence, reasoning}`

Se `confidence < 0.7`, hook cai pro regex (fallback graceful).

Telemetry em `.swarm/classifier.jsonl` registra cada classificação pra auditoria/retraining manual.

---

## Mantendo este doc

Quando adicionar comando/program novo:
1. Adicionar cenário aqui
2. Atualizar tabela de decisão rápida
3. Re-rodar smoke test do classifier (`scripts/test-classifier.mjs`) pra ver se acerta
