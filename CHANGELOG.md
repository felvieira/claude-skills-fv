# Changelog

Todas as mudanças notáveis neste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [2.2.0-skills-vs-agents-disambiguation] - 2026-05-19

Fecha gap estrutural identificado quando o modelo passou skill numerada como `subagent_type` do tool `Agent`, gerando `InputValidationError` em 5 dispatches paralelos (case real). A v2.2.0 elimina a ambiguidade entre o universo das **skills** (`skills/NN-*/`, invocadas via `Skill` tool) e o universo dos **subagents** (`agents/*.md`, invocados via `Agent` tool) que compartilham o prefixo `dev-team-kit-fv:`.

### Added

- **`policies/skills-vs-agents.md`** (new) — policy canônica que define a regra normativa: skills numeradas (`NN-name`) só via `Skill` tool; subagents kebab-case só via `Agent` tool. Inclui matriz de espelhos (conceitos com skill + agent), 4 anti-padrões registrados e os 3 caminhos canônicos de paralelização (worktree+general-purpose, `/loop`, `/swarm`).
- **`hooks/scripts/agent-dispatch-validator.mjs`** (new) — PreToolUse hook que intercepta `Agent` calls com `subagent_type` começando em `dev-team-kit-fv:`. Bloqueia (decision="block") quando o nome é skill ou inexistente, devolvendo mensagem acionável com fix sugerido (Skill tool direto ou worktree+general-purpose+Skill no prompt). Telemetria em `.bot/agent-dispatch-errors.jsonl`. Desativável via `DEVKIT_DISABLED_HOOKS=agent-dispatch-validator` ou profile.
- **`skills/40-parallel-dispatcher/SKILL.md`** (new) — skill especializada em paralelização. Decision tree, 3 caminhos canônicos (A: subagents nativos, B: worktree+general-purpose, C: `/swarm`), 5 anti-padrões e playbook de consolidação pós-dispatch. Trigger em "paralelize", "N slices", "dispatch paralelo", "comprehensive review", "multi-agent parallel".
- **`templates/parallel-slice-prompt.md`** (new) — template canônico de prompt self-contained para subagent paralelo (PASSO 1 Skill obrigatório + contexto + critérios + output esperado). Inclui exemplo concreto e anti-padrões.
- **`agents/anti-ai-writing.md`** (new) — subagent fantasma que era referenciado em `swarm-protocol.md` mas não existia. Implementado com protocol shell e regra de operação: flag os 29 padrões de `policies/anti-ai-writing.md` sem reescrever (default report-only).
- **`docs/skill-guides/skills-vs-agents-disambiguation.md`** (new) — guia longo com 15 cenários reais lado-a-lado (prompt → raciocínio → invocação correta). Inclui decision tree visual, FAQ, queries de audit de telemetria.
- **`evals/policies/skills-vs-agents/golden.json`** (new) — 8 cases incluindo regression do erro original (5 slices), comprehensive review (4 agents paralelos), prompt ambíguo "use o frontend agent" e cenários sintéticos para o hook.
- **`evals/policies/skills-vs-agents/test-hook.mjs`** (new) — smoke test executável (5 cases) que valida bloqueio, pass-through e mensagens do hook. `node evals/.../test-hook.mjs` → exit 0 = green.

### Changed

- **`GLOBAL.md`** — bloco "Skills vs Agents (regra crítica)" adicionado nos defaults globais. Inclui regra mnemônica: prefixo + número → skill; prefixo + kebab-case → agent.
- **`AGENTS.md`** — seção "Subagents (`.claude/agents/`)" reescrita como "Subagents Despacháveis (`agents/`) vs Skills (`skills/NN-*/`)". Inclui tabela canônica dos 15 nomes válidos, coluna de "Espelho-skill" e seção "Anti-padrão (não fazer)".
- **`skills/09-orchestrator/SKILL.md`** — disclaimer no topo (esta é skill, não agent). Seção "Como paralelizar slices (sem cair em armadilha skill-vs-agent)" adicionada após vertical slicing com os 3 caminhos canônicos.
- **`skills/05-qa-testing/SKILL.md`, `skills/06-security-review/SKILL.md`, `skills/11-reviewer/SKILL.md`** — disclaimer no topo apontando para o agent espelho correspondente.
- **`agents/code-reviewer.md`, `agents/orchestrator.md`, `agents/security-auditor.md`, `agents/test-engineer.md`** — disclaimer no topo apontando para a skill espelho.
- **`policies/swarm-protocol.md`** Phase 3 — substituído pseudo-código por invocação correta com `Agent({ subagent_type: "dev-team-kit-fv:..." })` para os 4 review agents, incluindo o novo `anti-ai-writing` (subagent que finalmente existe).
- **`hooks/hooks.json`** — `agent-dispatch-validator.mjs` adicionado como **primeiro** hook PreToolUse (precede os outros para falhar fast).
- **VERSION**: `1.2.0` → `2.2.0`.

### Why

Causa raiz: o kit tem dois universos com prefixo `dev-team-kit-fv:` (38 skills numeradas + 14 subagents kebab-case), mas não tinha disambiguation explícita. Modelos confundiam ao despachar trabalho paralelo, especialmente para skills sem agent espelho (`04-frontend-integration`, `03-backend-api`, etc).

Solução em 3 frentes simultâneas:
1. **Doc**: policy normativa + GLOBAL.md/AGENTS.md atualizados + 15-cenário guide
2. **Instrução**: disclaimers em todas as skills/agents espelhados
3. **Runtime**: hook bloqueador com mensagem acionável + telemetria

Hook validado por smoke test (5/5 green) cobrindo bloqueio, pass-through legítimo, pass-through não-kit, nomes inexistentes e tools não-Agent. Eval golden cases cobrem o erro original (regression) + 7 cenários adicionais.

### How it works

```
Você: "paralelize 5 slices de frontend"
  ↓
Modelo tenta: Agent({ subagent_type: "dev-team-kit-fv:04-frontend-integration", ... })
  ↓
Hook agent-dispatch-validator detecta: 04-frontend-integration está em skills/, não em agents/
  ↓
Hook bloqueia com: "❌ ... este nome é uma SKILL ... Correções: 1) Skill tool ... 2) general-purpose + worktree + Skill no prompt"
  ↓
Modelo aplica fallback correto: Agent × 5 com isolation:worktree, cada prompt instrui Skill internamente
  ↓
Dispatch funciona. 5 worktrees isolados, 5 PRs (ou consolidação no orquestrador).
```

### Migration

Nenhuma ação requerida para usuários existentes — todos os disclaimers e o hook são aditivos. O hook é fail-open: se desativado ou se utils.mjs não resolver, ele passa.

Para desativar (não recomendado):
```bash
DEVKIT_DISABLED_HOOKS=agent-dispatch-validator <comando>
```

ou em `~/.claude/dev-team-kit-config.json`:
```jsonc
{ "hook_profiles": { "profiles": { "minimal": { "disabled": ["agent-dispatch-validator"] } } } }
```

---

## [2.1.1-refactor-safely-docs] - 2026-05-20

### Changed
- **`programs/README.md`** — `refactor-safely` adicionado na tabela Index (estava faltando).
- **`docs/WIKI.md` + `docs/WIKI.pt-BR.md`** — entrada `/run-program` atualizada: "6 programs" → "7 programs", menção explícita a `refactor-safely`.
- **`docs/SKILLS-OVERVIEW.md`** — nova entrada `refactor-safely (program v2.1.0)` + entrada `Use Cases reference (v2.1.0)` apontando pra `docs/USE-CASES.md`.
- **`AGENTS.md`** — `refactor-safely` e `USE-CASES.md` adicionados na tabela.

### Why
Patch fechando gaps de documentação do v2.1.0. O program `refactor-safely` foi criado mas faltou registrar em 4 lugares canônicos (programs index, WIKI EN+PT, SKILLS-OVERVIEW, AGENTS).

---

## [2.1.0-smart-routing] - 2026-05-20

Fecha gaps reais identificados na auditoria dos modos autônomos. Hook intent-classifier v2: opcional LLM, regex fallback ampliado pra cobrir 9 categorias de intent.

### Added
- **`docs/USE-CASES.md`** (new) — 17 cenários de dev no dia-a-dia mapeados pra comando apropriado. Tabela de decisão rápida. Serve como referência humana E prompt training pro LLM classifier.
- **`programs/refactor-safely.{yml,md}`** (new) — pipeline com behavior preservation: scan → baseline tests → analyze read-only → plan → execute loop atomic → full suite → verify → PR. 11 phases. Fecha gap pra refactor seguro (inspirado em archon-refactor-safely).
- **`hooks/scripts/llm-classifier.mjs`** (new) — módulo standalone que chama Claude Haiku CLI pra classificar prompts. Output JSON `{category, command, args, confidence, reasoning}`. Categorias A-E. Timeout configurável. Retorna `{error, fallback: true}` se CLI indisponível/timeout.

### Changed
- **`hooks/scripts/intent-classifier.mjs` v2** — arquitetura LLM-first com regex fallback:
  - `use_llm: false` (default) pra latência zero; `true` ativa LLM (~$0.0001 + ~10s)
  - 9 novos patterns regex cobrindo: bug fix → `/auto`, issue `fix #N` → `/swarm fix #N` (com extração de número), refactor → `refactor-safely`, criar tests → `/test`, investigar/performance → `/auto`, spike/PoC → `/auto --no-tdd`, assets visuais → `/web-assets`, agendado → `/schedule`
  - 5 categorias: A (autônomo), B (pipeline), C (direto/leve), D (conversa, skip), E (agendado)
  - Telemetry estruturada em `.swarm/classifier.jsonl` (cada classificação loga prompt, command, confidence, used_llm, reasoning)
  - Threshold de confidence configurável (default 0.7)
  - Skip automático em prompts informacionais, triviais, slash commands
- **Output do hook** — mais descritivo, mostra "Smart routing v2", source (LLM/regex fallback), categoria, reasoning, confidence, ação esperada por nível.

### How it works (v2.1.0 routing matrix)

```
Você diz: "fix bug do email vazio"
   ↓ intent-classifier v2 (regex)
   → Match: pattern "bug" → category C → /auto
   → Reasoning: "Bug fix isolado merece /auto (não swarm)"
   ↓
Em Autonomous Nível 3: Claude executa /auto direto
Em Active Nível 2: Claude executa /auto (sem dry-run pra task leve)
Em Passive Nível 1: Claude sugere /auto, espera você
```

Outros exemplos:
- "refatorar src/auth" → `/run-program refactor-safely`
- "fix #142" → `/swarm fix #142` (autonomous) ou sugestão (outros níveis)
- "criar testes pra módulo X" → `/test`
- "investigar por que /users tá lento" → `/auto` + debugger
- "spike pra ver se Stripe integra" → `/auto --no-tdd`
- "rodar review semanal" → `/schedule`
- "o que é constitution?" → skip (conversa)

### Telemetry

Cada classificação loga em `.swarm/classifier.jsonl`:
```json
{"ts":"...","prompt":"...","result":"suggested","used_llm":false,"category":"A","command":"/swarm fix #142","confidence":0.85,"level":3,"reasoning":"..."}
```

Use pra auditar/melhorar patterns.

### Migration

Backwards compat total. Hook v1.x continua funcionando — agora com mais patterns regex.

Pra ativar LLM classifier (mais inteligente, mas ~10s latência):
```jsonc
// hooks/config.json ou ~/.claude/dev-team-kit-config.json
{
  "intent_classifier": { "use_llm": true }
}
```

### Why
Auditoria mostrou 5 gaps reais — hook v1.x não classificava bug/issue/refactor/test/investigation. v2 expande regex de 6 → 15 patterns + opcional LLM pra contexto complexo. `refactor-safely` fecha o único gap real de program faltante.

---

## [2.0.0-swarm] - 2026-05-20

**MAJOR.** Novo modo `/swarm` — total autonomy: do prompt ao PR mergeable sem intervenção humana.

### Added — `/swarm` mode
- **`commands/swarm.md`** (new) — slash command com docs completas, flags (`--dry-run`, `--auto-yes`, `--auto-merge`, `--skip-review`, `--skip-self-fix`, `--max-stories`, `--max-iter-per-story`, `--resume`, `--prd`), modos (manual, autonomous, com issue, com PRD).
- **`scripts/swarm/index.mjs`** (new) — executor: preflight (worktree clean, gh auth) + setup (creates `.swarm/<run-id>/workspace` worktree) + buildPlan (7 phases com prompts/instruções para o agente executar via Task com `context: fresh`).
- **`policies/swarm-protocol.md`** (new) — protocolo canônico: 7 princípios invioláveis, 7 phases detalhadas, anti-padrões, configuração user-wide, diff vs alternativas, roadmap, inspirações.
- **`hooks/scripts/intent-classifier.mjs`** — em modo Autonomous (Nível 3), intent de "feature nova" / "ideia vaga" agora rota pra `/swarm` em vez de `/run-program <X> --auto-yes`. Programs eligíveis: `spec-driven-development`, `pipeline-discovery`. Outros intents (review/legacy/loop) continuam roteando pros programs específicos.
- **`.gitignore`** — adicionado `.swarm/` (workspace e logs locais, não vão pro git).

### Changed
- **`docs/WIKI.md` + `docs/WIKI.pt-BR.md`** — entrada `/swarm` no formato aihero antes da seção Auto-orchestration.
- **`docs/SKILLS-OVERVIEW.md`** — entrada curta `/swarm`.
- **`AGENTS.md`** — linha `/swarm` na tabela de slash commands.
- **`README.md` + `README.pt-BR.md`** — bloco dedicado `## /swarm — Total Autonomy` com tabela comparativa vs `/auto`/`/loop`/`/run-program`, inputs, autonomous+swarm flow, cleanup instructions. Linha `/swarm` na tabela principal de commands.
- **`.claude-plugin/plugin.json`** — description atualizada: 28 → 29 slash commands, menção a v2.0.0 e /swarm.

### Why
Auditoria mostrou que dos 3 modos "autônomos" que tínhamos (`/auto`, `/loop`, intent-classifier Nível 3), **nenhum era 100% autônomo do prompt ao PR**:
- `/auto`: prompt-based na sessão atual, sem worktree, sem PR
- `/loop`: subprocess robusto mas sem fresh context per story, sem multi-agent review, sem PR
- Intent-classifier Nível 3: sugeria programs mas programs paravam em gates

`/swarm` é a peça que faltava — único caminho garantido prompt → PR sem intervenção. Combina Ralph loop + comprehensive review + self-fix + auto-PR num pipeline coerente.

### Inspiração
- Ralph loop pattern: [coleam00/archon `archon-ralph-dag.yaml`](https://github.com/coleam00/archon/blob/main/.archon/workflows/defaults/archon-ralph-dag.yaml)
- Fix-github-issue + aggressive self-fix: [coleam00/archon `archon-fix-github-issue.yaml`](https://github.com/coleam00/archon/blob/main/.archon/workflows/defaults/archon-fix-github-issue.yaml)
- Comprehensive review (5 agents): nosso program `comprehensive-review` (v1.7.0)
- Worktree integration: nosso `/loop` v1.0.0
- Circuit-breaker / backoff: nosso `scripts/auto-loop/` v1.0.0

### Migration
Não precisa — `/swarm` é additive. Outros commands seguem funcionando.

Quem quiser autonomia total em modo Autonomous (Nível 3):
```jsonc
// ~/.claude/dev-team-kit-config.json
{
  "intent_classifier": { "autonomous": true, "suppress": ["adversarial-dev", "comprehensive-review"] }
}
```

Hook agora vai sugerir `/swarm` (não programs separados) quando detectar intent de feature.

### Backwards compat
- ✅ Programs antigos continuam funcionando
- ✅ Hook intent-classifier respeita o que estava antes em modos Passive/Active
- ✅ Apenas em modo Autonomous Nível 3 + intent SWARM_ELIGIBLE há reroute pra /swarm

---

## [1.9.1-user-config-override] - 2026-05-20

### Added
- **User-wide config override** em `~/.claude/dev-team-kit-config.json`. Sobrescreve seções de `hooks/config.json` do repo. Permite ativar Autonomous (ou outro nível) **só na sua máquina** sem alterar o default do repo.

### Changed
- **`hooks/scripts/utils.mjs`** — `loadFullConfig()` agora faz merge `repo config + user override` (user override sobrescreve seção-a-seção, shallow merge). Nova função `resolveUserConfigPath()` localiza `~/.claude/dev-team-kit-config.json`.
- **`policies/auto-orchestration.md`** — documenta os 2 paths de config (repo vs user-wide) com merge order explícita. Caminho 1 "User-wide" marcado como **RECOMENDADO**.
- **`README.md`** + **`README.pt-BR.md`** — bloco "Set up Autonomous" atualizado: arquivo agora é `~/.claude/dev-team-kit-config.json` (user-wide), não settings.json. Nota explícita: "doesn't affect the repo — other users keep the safe default (Active)".

### Migration (não tem — backwards compat)
- Repos existentes continuam funcionando: se não há user override, config do repo é usada
- Quem já tinha `intent_classifier` em `settings.json` precisa mover pra `~/.claude/dev-team-kit-config.json` (settings.json não é lido pelo hook)

### Why
v1.9.0 fez Active default, mas usuário queria ativar Autonomous na **própria máquina** sem alterar o repo. Faltava mecanismo de user-wide override. Agora: repo permanece Active (default seguro), user-wide override permite personalização sem afetar quem clona.

---

## [1.9.0-active-default] - 2026-05-20

**Breaking-ish:** Default mudou de Passive (Nível 1) → **Active (Nível 2)**. Gates humanos no program continuam pausando — segurança preservada. Quem quiser comportamento antigo deve setar `auto_dry_run: false`.

### Changed
- **`hooks/scripts/intent-classifier.mjs`** — defaults agora: `enabled: true, auto_dry_run: true, autonomous: false`. Output do hook adapta mensagem ao nível efetivo (Passive/Active/Autonomous) com ação esperada explícita.
- **`policies/auto-orchestration.md`** — Nível 2 (Active) marcado como DEFAULT. Adicionado tutorial passo-a-passo "Como mudar de nível" com 3 caminhos (settings.json edit, /update-config, env var). Adicionado checklist pré-voo para Autonomous + recomendação de suppress list.
- **`README.md`** + **`README.pt-BR.md`** — tabela atualizada (Active marcado como DEFAULT), config JSON com novo default, **bloco "Set up Level 3 (Autonomous) — CI/cron only"** completo com checklist + bloco "Level 0 (Manual)" + override via env var.

### Why
Usuário pediu Active como default. Faz sentido — reduz fricção (Claude já mostra plano sem você pedir) sem sacrificar segurança (gates humanos no program continuam pausando). Autonomous (Nível 3) continua opt-in pra CI/cron.

### Migration
Quem prefere o comportamento antigo (Passive — só sugere, espera você decidir tudo):
```jsonc
// ~/.claude/settings.json
{
  "intent_classifier": {
    "auto_dry_run": false
  }
}
```

---

## [1.8.1-autonomy-docs] - 2026-05-20

### Changed
- **`README.md`** + **`README.pt-BR.md`** — nova seção dedicada "Auto-Orchestration (v1.8.0+)" com:
  - Diagrama do flow completo (hook → skill 39 → execução)
  - Tabela explicativa dos **4 níveis de autonomia** (Manual / Passive [DEFAULT] / Active / Autonomous)
  - Diferença explícita **Active vs Autonomous**: Active = "auto dry-run mas gates pausam"; Autonomous = "executa tudo sem perguntar" (só CI)
  - Configuração via hook config (JSON com `enabled`, `auto_dry_run`, `autonomous`, `suppress`)
  - Tabela dos 6 intent patterns mapeados a programs
  - Skip rules (informacional, trivial, slash)

### Why
v1.8.0 mencionou "4 níveis" mas a tabela completa só estava em `policies/auto-orchestration.md`. Usuário perguntou qual é o default e diff Active/Autonomous — agora tudo no README. Default = **Passive (Nível 1)** — sugere e espera você decidir.

---

## [1.8.0-auto-orchestration] - 2026-05-20

Fecha o loop: agora o kit **detecta intent** do prompt e **sugere program apropriado automaticamente** — sem usuário precisar invocar `/run-program` manualmente.

### Added
- **`hooks/scripts/intent-classifier.mjs`** (new) — hook UserPromptSubmit que classifica intent do prompt e emite `additionalContext` sugerindo program. NÃO bloqueia execução. Detecta 6 intent types mapeados pra programs (spec-driven-development, pipeline-discovery, comprehensive-review, adversarial-dev, detective-spec, loop-polishing). Skip automático em prompts informacionais/triviais/slash commands.
- **`policies/auto-orchestration.md`** (new) — define 4 níveis de autonomia (manual / sugestão passiva / sugestão ativa / autônomo), regras anti-padrão, mapeamento intent → program.
- **`skills/39-program-router/SKILL.md`** (new) — Skill 39: decide qual program rodar (com `AskUserQuestion` para confirmar). Trabalha em par com hook intent-classifier (sugere) e skill 09 (monta pipeline ad-hoc quando nenhum program serve).

### Changed
- **`hooks/hooks.json`** — `intent-classifier.mjs` registrado em UserPromptSubmit (junto com pre-execution-gate e keyword-detector).
- **`skills/09-orchestrator/SKILL.md`** — seção "Canonical Program Definitions" expandida (6 programs com referência `.yml + .md`), nova seção "Auto-orchestration (v1.8.0)" descrevendo as 3 camadas (hook + skill 39 + skill 09).
- **`.claude-plugin/plugin.json`** — description menciona auto-orchestration e program-router; skill count 37 → 38.

### How it works (v1.8.0 flow)

```
Você diz: "preciso criar feature de auth social"
              ↓
[hook intent-classifier]
  → detecta "criar feature" + "auth"
  → match: spec-driven-development (high confidence)
  → emite additionalContext: "💡 Sugestão: /run-program spec-driven-development"
              ↓
[Claude lê additionalContext + seu prompt]
  → invoca skill 39 (program-router)
  → skill 39 confirma com AskUserQuestion: dry-run / direto / ad-hoc / cancelar
              ↓
Você escolhe → program executa (com gates humanos onde definido)
```

### Níveis de autonomia (configuráveis)

| Nível | Comportamento | Hook config |
|---|---|---|
| **0 — Manual** | Hook desabilitado, só `/run-program` manual | `intent_classifier.enabled: false` |
| **1 — Sugestão passiva** (default) | Hook sugere, Claude apresenta, usuário decide | `intent_classifier.enabled: true` |
| **2 — Sugestão ativa** | Hook sugere + Claude auto-roda dry-run | `intent_classifier.auto_dry_run: true` |
| **3 — Autônomo** | Auto-yes em gates (CI/cron only) | `intent_classifier.autonomous: true` |

### Why
v1.7.0 deu engine profissional de programs, mas usuário ainda precisava invocar `/run-program` manual. Sem `policy de auto-orchestration`, usuário tinha que **lembrar** quando rodar program vs pipeline informal. v1.8.0 fecha esse loop — o kit detecta e sugere, usuário confirma.

---

## [1.7.1-engine-v2-docs] - 2026-05-20

### Changed
- **`docs/SKILLS-OVERVIEW.md`** — entrada `/run-program` atualizada com 7 step types, programs novos (adversarial-dev, comprehensive-review), crédito Archon.
- **`AGENTS.md`** — entrada `/run-program` na tabela expandida com 7 step types + 6 programs.
- **`.claude-plugin/plugin.json`** — description detalha 7 step types + 6 programs + crédito archon.

---

## [1.7.0-program-engine-v2] - 2026-05-20

Absorve 6 primitives + 2 patterns avançados de [coleam00/archon](https://github.com/coleam00/archon) (21k stars, "harness builder for AI coding"). Engine de programs sobe pra nível profissional.

### Added — 6 step primitives novos
- **`type: prompt`** — step ad-hoc com prompt inline, sem precisar criar slash command próprio. Suporta `$ARGUMENTS`, `$ARTIFACTS_DIR`, `allowed_tools`.
- **`type: bash`** — step deterministic shell, sem AI. Útil pra build/test/lint/git ops. Captura output via `${steps.X.output}`. `timeout` configurável.
- **`type: loop`** — primitive Ralph-style: roda `prompt`/`command` até output conter `until: TOKEN`, com `max_iterations`, `fresh_context: true` (sessão limpa por iteração), `interactive`, `on_max_reached`.
- **`context: fresh`** — per-step. Força sessão isolada (zero contexto da conversa anterior). Combina perfeitamente com `parallel:` ou steps adversariais.
- **`provider:` + `model:`** — model routing declarativo per step. Override do `policies/model-routing.md` para steps caros (`opus[1m]`) ou rotineiros (`haiku`).
- **`trigger_rule:`** — para `type: parallel`: `all_success` (default, igual antes) / `one_success` (segue com primeiro OK) / `all_done` (espera todos terminarem, sucesso ou falha — útil para review agents).

### Added — 2 programs novos
- **`programs/adversarial-dev.{yml,md}`** (new) — **GAN-inspired**. Planner cria spec com sprints (Opus 1M) → loop alterna Generator (constrói) e Evaluator (ATACA, scores 0-10 em 5 critérios) → sprint só passa quando todos >= threshold; senão retry com feedback adversarial. `fresh_context: true` evita contaminação entre roles. Inspirado no [archon-adversarial-dev](https://github.com/coleam00/archon/blob/main/.archon/workflows/defaults/archon-adversarial-dev.yaml).
- **`programs/comprehensive-review.{yml,md}`** (new) — **5-agent parallel PR review** (code/error-handling/test-coverage/comment-quality/docs-impact, cada um `context: fresh` com `provider`/`model` específico — sonnet pra profundos, haiku pra rotineiros) + security review + synthesize com decision matrix + auto-fix CRITICAL/HIGH configurável + post comment no GitHub via `gh pr comment`. Usa `trigger_rule: all_done` (falha de 1 agent não bloqueia os outros).

### Changed
- **`policies/programs-schema.md`** — expandido com 6 novos step types, seção dedicada para cada (Bash/Prompt/Loop/Context/Model routing), tabela summary de step types, novos anti-padrões (loop sem max_iterations, bash destrutivo sem gate, prompt > 5k chars, context fresh sem args explícitos).
- **`scripts/validate-program.mjs`** — suporta novos step types; inferência automática de `type` quando ausente; valida `loop.max_iterations` obrigatório; flag warning em bash destrutivo (`rm -rf`, `git push --force`, `chmod 777`, `sudo`); flag prompt > 5k chars; valida `trigger_rule` enum.
- **`scripts/run-program.mjs`** — `inferType()` helper para steps sem `type:` explícito; describe/dry-run expõem todos os novos campos (`prompt_preview`, `bash_preview`, `context`, `provider`, `model`, `trigger_rule`, `loop`).
- **`programs/loop-polishing.yml`** — refinado usando novos primitives: pre-flight-tests via `bash:`, parallel com `trigger_rule: all_success` no standard e `all_done` no full, novo step `anti-ai-pass` (haiku) que aplica `policies/anti-ai-writing.md` em prosa nova.
- **`programs/spec-driven-development.yml`** — quality-gates agora tem `trigger_rule: all_success` + `context: fresh` per agent + novo step `build-check` via `bash:` (deterministic build validation).
- **`programs/README.md`** — index atualizado com 6 programs.
- **`docs/WIKI.md` + `docs/WIKI.pt-BR.md`** — entrada `/run-program` atualizada destacando 6 step types e 6 programs.

### Validated
- `node scripts/validate-program.mjs`: 6/6 programs válidos com novos primitives
- Backwards compat: programs antigos (sem novos primitives) continuam passando

### Sources
- [coleam00/archon](https://github.com/coleam00/archon) — workflow engine YAML deterministic. Absorvemos primitives (bash/prompt/loop/context/provider/trigger_rule) + 2 patterns (adversarial-dev, comprehensive-review). NÃO absorvemos: Web UI, Slack/Telegram/GitHub adapters, server backend Bun+SQLite, runtime Bun.

### Why
v1.6.0 dava skeleton de programs (command/gate/parallel/conditional). v1.7.0 dá **expressividade profissional**: pode misturar AI + bash deterministic, isolar steps via fresh context, rotear model por step, loop até convergência. Agora dá pra escrever programs equivalentes em poder ao archon-idea-to-pr.yaml flagship do Archon.

---

## [1.6.1-programs-gaps] - 2026-05-18

### Changed
- **`README.md`** + **`README.pt-BR.md`** — tabela de versões atualizada com v1.5.1, v1.5.2, v1.6.0 (estavam parando em v1.5.0).
- **`CONTRIBUTING.md`** — nova seção "Adicionando um program (pipeline declarativo YAML)" com 6-step checklist + validador + eval coverage opcional.
- **`.claude-plugin/plugin.json`** — description atualizada: "27 slash commands" → "28 slash commands" + menção a `/run-program` e executable YAML pipelines.

---

## [1.6.0-executable-programs] - 2026-05-18

### Added — Executable YAML pipeline programs
- **`policies/programs-schema.md`** (new) — schema canônico do formato declarativo `programs/*.yml`. Define inputs, steps (command/gate/parallel/conditional), variable substitution (`${inputs.X}`, `${steps.X.output}`, `${date}`, `${env.X}`), conditional expressions (subset seguro: `==`, `!=`, `contains`, `file_exists`, `and`, `or`, `not`), validador, executor, anti-padrões.
- **`programs/pipeline-discovery.yml`** (new) — 9 steps com gates entre discovery/PRD/dispatch.
- **`programs/spec-driven-development.yml`** (new) — 14 steps constitution-anchored com gates de checklist + analyze, paralelo de quality gates (tests + review + security), final-analyze antes de ship.
- **`programs/loop-polishing.yml`** (new) — auto-loop + polishing pass condicional por `polish_level`.
- **`programs/detective-spec.yml`** (new) — 5 fases reverse-engineering com `resume_from_phase` para retomar.
- **`commands/run-program.md`** (new) — `/run-program` slash command com flags `--list`, `--describe`, `--dry-run`, `--auto-yes`, `--from`, `--input`.
- **`scripts/run-program.mjs`** (new) — parser YAML + resolver de variables + planner. Devolve plano estruturado JSON pro agente executar via Task/AskUserQuestion.
- **`scripts/validate-program.mjs`** (new) — valida `programs/*.yml` contra schema: campos obrigatórios, IDs únicos, referências `${steps.X}` apontam pra step existente, conditional expressions parseáveis.
- **`evals/commands/run-program/golden.json`** (new) — 7 golden cases (list/describe/dry-run/missing input/invalid program/duplicate ids/non-existent step ref).

### Changed
- **`programs/README.md`** — documenta coexistência `.md` (descritivo) + `.yml` (executável). Index links para ambos.
- **`docs/WIKI.md`** + **`docs/WIKI.pt-BR.md`** — entrada `/run-program` no formato aihero.
- **`docs/SKILLS-OVERVIEW.md`** — entrada `/run-program`.
- **`AGENTS.md`** — comando registrado na tabela.
- **`README.md`** + **`README.pt-BR.md`** — tabela de commands + bump badge 1.6.0.
- **`scripts/check-consistency.mjs`** — assert `/run-program` registrado + `programs/*.yml` válidos + cada `.yml` tem `.md` correspondente.

### Extensions sobre spec-kit original
Nosso schema estende o `workflows/speckit/workflow.yml` do github/spec-kit com:
- **`when:`** — conditional execution por step (não tinha no original)
- **`parallel:`** — dispatch paralelo via Task tool (não tinha)
- **`type: conditional`** com `if/then/else` — branching condicional declarativo
- **Variable substitution** com `${steps.X.capture.Y}` para captura explícita de output
- **`from:`** — retomar execução após falha em step específico

### Sources
- [github/spec-kit `workflows/`](https://github.com/github/spec-kit/tree/main/workflows) — formato YAML declarativo com review gates entre steps; extensões nossas conforme acima

### Why
`programs/*.md` eram **descritivos** — explicavam o pipeline mas precisavam o agente executar de cabeça (inconsistente entre sessões/agentes). Formato `.yml` é **executável** — máquina parseia, agente segue o plano, gates pausam pra humano. Mesmo pipeline rodado igual por agentes diferentes = consistência operacional.

---

## [1.5.2-plugin-layout] - 2026-05-16

Reorganização de layout para que **Claude Code 2.x autodiscovery** detecte todos os componentes via `claude plugin install`.

### Changed
- **`.claude/commands/*.md` → `commands/`** — 22 slash commands movidos para o diretório autodescoberto pelo plugin loader. Conflito de nome (`detective-spec.md` duplicado entre `commands/` legacy e `.claude/commands/` novo) resolvido mantendo versão com frontmatter.
- **`.claude/agents/*.md` → `agents/`** — 14 subagents movidos para autodiscovery.
- **`hooks/hooks.json`** — convertido para formato Claude Code 2.x: estrutura `{ hooks: { Event: [{ hooks: [{ type, command }] }] } }` com `${CLAUDE_PLUGIN_ROOT}` em vez de paths relativos.
- **`.mcp.json`** (new) — registra `dev-team-kit` MCP server para autodiscovery do plugin.
- **`setup/install.sh`** — atualizado para copiar de `commands/` e `agents/` (root) para `.claude/commands/` e `.claude/agents/` do repo consumidor.
- **`.claude-plugin/plugin.json`** — simplificado (removidos arrays manuais de skills/commands/agents/hooks — autodiscovery faz o trabalho).
- **`scripts/check-consistency.mjs`** — asserts adaptados para layout 2.x (verifica diretórios + presença de `marketplace.json` + formato correto de `hooks/hooks.json`).

### Fixed
- Plugin instalável via `claude plugin marketplace add felvieira/claude-skills-fv` + `claude plugin install dev-team-kit-fv@claude-skills-fv` — agora detecta 37 skills + 27 slash commands + 14 subagents + hooks + MCP server.

### Why
v1.5.1 instalava parcialmente — só 43 skills detectadas, 0 agents/hooks/MCP. Causa: layout antigo (`.claude/commands/`, `.claude/agents/`, hooks.json formato legacy) não compatível com autodiscovery do Claude Code 2.x. Esta release reorganiza para layout canônico.

---

## [1.5.1-absorb-gaps] - 2026-05-15

### Changed
- **`README.md`** + **`README.pt-BR.md`** — version table updated with v1.5.0 entry; Acknowledgements section updated with 5 new sources (Anthropic Skills, Superpowers, Claude Code Setup, Claude MD Management, blader/humanizer).
- **`CONTRIBUTING.md`** — added "Adicionando uma nova policy" section (5-step checklist with example references to v1.5.0 policies).

---

## [1.5.0-absorb-skills] - 2026-05-15

Absorve 6 padrões valiosos de skills externas (Anthropic Skills, Superpowers, Claude Code Setup, Claude MD Management) **integrando ao kit** — não citando.

### Added
- **`policies/mcp-builder-patterns.md`** (new) — padrões para criar MCP servers de qualidade (Python FastMCP / Node MCP SDK): naming, descriptions, schemas, idempotência, auth, tests, distribution, anti-padrões. Absorvido de `anthropic-skills:mcp-builder` + `document-skills:mcp-builder`.
- **`policies/verification-before-completion.md`** (new) — princípio "evidence before assertions". Tabela de claims → evidência exigida; workflow padrão; commit message pattern; integração com skills 05/11/24/37. Absorvido de `superpowers:verification-before-completion`.
- **`policies/receiving-code-review.md`** (new) — rigor técnico vs concordância performativa ao receber feedback. Workflow categorize → verify → push back ou aceitar. Combate sycofância em reviews. Absorvido de `superpowers:receiving-code-review`.
- **`policies/memory-consolidation.md`** (new) — rotina periódica de manutenção do vault: merge duplicatas, archive stale, prune índice. Workflow seguro snapshot-first. Absorvido de `anthropic-skills:consolidate-memory`.
- **`.claude/commands/consolidate-memory.md`** (new) — `/consolidate-memory` slash command implementando o workflow da policy. Snapshot → dry-run → confirmação seletiva → apply → verify → report.
- **`evals/commands/consolidate-memory/golden.json`** (new) — 5 golden cases (clean vault, multi-categoria, apply seletivo, blocking sem snapshot, auto-yes refusado).

### Changed
- **`skills/18-repo-auditor`** — adicionado modo `--recommend-automation`: após auditoria, sugere hooks, subagents, skills do kit, MCP servers e slash commands relevantes ao codebase. Absorvido de `claude-code-setup:claude-automation-recommender`.
- **`skills/28-claude-md-generator`** — adicionado modo `audit` (vs `generate`): em vez de regenerar do zero, audita CLAUDE.md existente contra repo audit + sugere patches incrementais. Absorvido de `claude-md-management:claude-md-improver`.
- **`skills/05-qa-testing`** — referencia `verification-before-completion.md` como gate.
- **`skills/11-reviewer`** — referencia `verification-before-completion.md` + `receiving-code-review.md` (informa quem recebe feedback). Removida duplicata da linha de `constitution.md`.
- **`skills/24-release-manager`** — referencia `verification-before-completion.md` (claims de "deployed/passing" precisam output).
- **`skills/25-ai-integration-architect`** — referencia `mcp-builder-patterns.md` quando recomendar/criar MCP server.
- **`skills/30-cost-tracker`** — referencia `memory-consolidation.md`; sugere `/consolidate-memory` quando vault crescer demais.
- **`skills/35-skill-author`** — referencia `verification-before-completion.md` + `mcp-builder-patterns.md`.
- **`skills/37-tdd-engineer`** — referencia `verification-before-completion.md` (cada passo red→green→refactor).
- **`policies/execution.md`** — nova seção "Paralelização" (dispatching-parallel-agents pattern) + nota sobre verificação. Absorvido de `superpowers:dispatching-parallel-agents`.
- **`policies/writing-clarity.md`** — integração cruzada com `anti-ai-writing.md` e `verification-before-completion.md`.
- **`.claude-plugin/plugin.json`**, **`AGENTS.md`**, **`docs/WIKI.md`**, **`docs/WIKI.pt-BR.md`**, **`docs/SKILLS-OVERVIEW.md`**, **`README.md`**, **`README.pt-BR.md`** — `/consolidate-memory` registrado em todos os pontos canônicos.
- **`scripts/check-consistency.mjs`** — assert para `consolidate-memory` no plugin commands.

### Sources
Padrões absorvidos das seguintes skills externas (integradas ao kit, não dependem de instalação):
- `anthropic-skills:mcp-builder` — MCP server design patterns
- `anthropic-skills:consolidate-memory` — vault maintenance
- `superpowers:verification-before-completion` — evidence before assertions
- `superpowers:receiving-code-review` — technical rigor on feedback
- `superpowers:dispatching-parallel-agents` — parallel dispatch pattern
- `claude-code-setup:claude-automation-recommender` — automation recommendations from codebase
- `claude-md-management:claude-md-improver` — CLAUDE.md audit mode

### Why
O usuário está consolidando o stack de skills no nosso pacote — vai remover skills externas e usar só o nosso. Esta release absorve os padrões de valor que essas skills traziam, integrando como policies/skills do kit.

---

## [1.4.2-humanize-gaps] - 2026-05-15

### Added
- **`evals/commands/humanize/golden.json`** — 5 golden cases: full AI pattern removal, file path input, voice calibration, quick depth, clean-but-soulless detection.

### Changed
- **`scripts/check-consistency.mjs`** — added `humanize` to the commands array assertion.
- **`policies/quality-gates.md`** — added "Gate de prosa" section: any human-readable prose must pass `policies/anti-ai-writing.md` before delivery.
- **`skills/35-skill-author/SKILL.md`** — added note: if skill produces prose, reference `anti-ai-writing.md` and offer `/humanize` as final pass.

---

## [1.4.1-humanizer] - 2026-05-15

### Added
- **`policies/anti-ai-writing.md`** (new) — catálogo de 29 padrões de AI-generated writing organizados em 5 categorias (Content, Language/Grammar, Style, Communication, Filler), cada um com example Before/After e palavras-gatilho. Inclui checklist final anti-IA e seção "personalidade e alma".
- **`.claude/commands/humanize.md`** (new) — `/humanize` slash command. Detecta input (file path ou inline), suporta voice calibration por amostra, aplica os 29 padrões, executa auto-auditoria ("O que ainda parece IA?") e entrega versão final revisada.
- **`hooks/scripts/ai-writing-detector.mjs`** (new) — PostToolUse hook opt-in (desabilitado por default, ativar via `"ai_writing_detector": {"enabled": true}`). Monitora Write/Edit em paths de prosa (`docs/specs/`, `docs/prd/`, `README*.md`, etc.) e emite advisory com padrões AI detectados + sugestão de `/humanize`.

### Changed
- **`skills/10-documenter/SKILL.md`** — referencia `policies/anti-ai-writing.md` como gate antes de finalizar docs de usuário.
- **`skills/13-marketing-copy/SKILL.md`** — referencia `policies/anti-ai-writing.md` como gate obrigatório antes de publicar copy.
- **`skills/14-seo-specialist/SKILL.md`** — referencia `policies/anti-ai-writing.md`; nota que tells AI em conteúdo publicado afetam E-E-A-T.
- **`hooks/hooks.json`** — `ai-writing-detector.mjs` registrado em PostToolUse.
- **`.claude-plugin/plugin.json`** — `/humanize` registrado; version 1.4.1.
- **`AGENTS.md`**, **`docs/WIKI.md`**, **`docs/WIKI.pt-BR.md`**, **`docs/SKILLS-OVERVIEW.md`**, **`README.md`**, **`README.pt-BR.md`** — `/humanize` adicionado em todos os pontos canônicos.

### Sources
- [blader/humanizer](https://github.com/blader/humanizer) (18.9k stars) — taxonomia dos 29 padrões, estrutura do processo (draft → auditoria → final), voice calibration, concept "personality & soul"
- [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) — fonte primária dos padrões (WikiProject AI Cleanup)

---

## [1.4.0-release-hygiene] - 2026-05-15

### Added
- **`hooks/scripts/constitution-watcher.mjs`** (new) — PostToolUse hook that detects edits to `memory/constitution.md` and emits advisory recommending `/analyze --strict` to find invalidated artifacts. Registered in `hooks/hooks.json`.
- **`evals/commands/README.md`** (new) — schema and conventions for command-level golden cases (separate from `evals/protocol-shells/` which is for subagents).
- **`mcp-server/README.md`** — `## Design decision: slash commands vs MCP tools` section explaining why the 3 spec-driven commands are NOT exposed as MCP tools.
- **`README.md`** + **`README.pt-BR.md`** — `## Acknowledgements` section crediting all external repos that contributed ideas (spec-kit, optillm, prd-taskmaster, mattpocock/skills, Context-Engineering, agentmemory, ClickUp, reversa, aihero).

### Changed
- **`docs/SKILLS-OVERVIEW.md`** — added entries for `/constitution`, `/checklist`, `/analyze`; bumped header to "26 slash commands, 24 policies" and version 1.4.0.
- **`AGENTS.md`** — added 3 new commands to the Slash Commands table.
- **`CONTRIBUTING.md`** — expanded "Adicionando slash commands" with 8-step checklist covering plugin.json, all docs (README/AGENTS/WIKI/SKILLS-OVERVIEW), programs/, handoffs.md, evals, consistency check, semver, and git tags + GitHub Releases.
- **`policies/quality-gates.md`** — constitution conformance added as obligatory gate; mapping table from constitution axes to concrete release gates.
- **`skills/35-skill-author/SKILL.md`** — Fase 4 (Registrar) expanded with full 7-point doc registration checklist, evals coverage, consistency check, semver bumps, and release hygiene (tags + GitHub Releases).

### Migrated
- **`evals/protocol-shells/{constitution,analyze,checklist}/`** → **`evals/commands/{constitution,analyze,checklist}/`** — commands aren't subagents with protocol shells; correct directory.

### Release hygiene
- Created retroactive git tags for v1.2.1, v1.3.0, v1.3.1, v1.3.2, v1.4.0
- Created GitHub Releases for all tagged versions with release notes derived from CHANGELOG

### Why
Closes all remaining gaps from the spec-driven development series (1.3.0–1.3.2): documentation alignment, contribution checklist, release tags/notes, evals layout, hook for constitution changes, and credit where due. No silent gaps remain.

---

## [1.3.2-spec-kit-polish] - 2026-05-15

### Added
- **`programs/spec-driven-development.md`** (new) — declarative pipeline program with constitution authority + `/checklist` + `/analyze` gates. Documents differences vs `pipeline-discovery`. Registered in `programs/README.md` index.

### Changed
- **`scripts/check-consistency.mjs`** — added checks that plugin.json registers constitution/analyze/checklist commands and that orchestrator + reviewer skills reference `constitution`.
- **`.claude/commands/spec.md`** — references `policies/prd-validation.md` + `policies/constitution.md`; recommends `/checklist` after spec and `/analyze` before `/build`.
- **`.claude/commands/plan.md`** — references constitution as architectural anchor; recommends `/analyze` before `/build` when 3+ artifacts exist.
- **`.claude/commands/ship.md`** — constitution gate (Security/Performance/Testing axes). CRITICAL unsatisfied = block; exception requires ADR.
- **`skills/18-repo-auditor/SKILL.md`** — detects `memory/constitution.md` absence in mature projects and suggests `/constitution`.
- **`skills/28-claude-md-generator/SKILL.md`** — generated CLAUDE.md includes Governance block referencing constitution + canonical pipeline; suggests `/constitution` if absent in mature project.
- **`skills/32-smart-suggestions/SKILL.md`** — new heuristics table mapping context patterns to spec-driven suggestions (`/constitution`, `/checklist`, `/analyze`).

### Verified
- `setup/install.sh` already copies the new files (loops over `policies/`, `.claude/commands/*.md`, `patterns/`, `templates/`) — no change needed.
- `node scripts/check-consistency.mjs` passes with new assertions.

### Why
Closes polish gaps from 1.3.1: spec-kit ideas now wired into the **internal kit commands** (spec/plan/ship), advisory skills (repo-auditor, claude-md-generator, smart-suggestions), and declarative `programs/` layer. End-to-end coverage of the spec-driven pipeline.

---

## [1.3.1-spec-kit-integration] - 2026-05-15

### Changed
- **`skills/09-orchestrator/SKILL.md`** — added `policies/constitution.md` as hierarchical authority and explicit guidance: pipeline must include `/analyze` before `/build` when there are 3+ artifacts (spec + plan + issues).
- **`skills/11-reviewer/SKILL.md`** — constitution is **primary rubric** for review. Implementation ↔ constitution conflict triggers automatic rejection. Recommend `/analyze` before human review.
- **`skills/01-po-feature-spec/SKILL.md`** — every spec must respect the 5 constitution axes. Recommend `/checklist` after spec, `/analyze` before `/build`.
- **`skills/24-release-manager/SKILL.md`** — ship gate validates security/performance/testing axes of constitution. CRITICAL principle unsatisfied = no release (exception requires ADR).
- **`policies/handoffs.md`** — added "Pipeline Canônico (Spec-Driven Development)" section with full chain (constitution → grill-me → spec → checklist → plan → to-issues → analyze → build → ship) and skip rules.
- **`docs/WIKI.md`** + **`docs/WIKI.pt-BR.md`** — registered `/constitution`, `/checklist`, `/analyze` commands with full "what does / when / problem / example / takeaway" entries.
- **`README.md`** + **`README.pt-BR.md`** — added 3 new commands to the commands table; version badge 1.3.1.
- **`.claude-plugin/plugin.json`** — registered 3 new commands; version 1.3.1.
- **`mcp-server/package.json`** — bumped to 1.3.1; description mentions new commands.

### Added (evals)
- **`evals/protocol-shells/constitution/golden.json`** — 3 golden cases (bootstrap, update with version bump, reject vague principle).
- **`evals/protocol-shells/analyze/golden.json`** — 4 golden cases (clean, CRITICAL constitution conflict, HIGH duplication, MEDIUM orphan issue).
- **`evals/protocol-shells/checklist/golden.json`** — 4 golden cases (UI feature, reject generic checks, quick depth, no constitution).

### Why
This patch closes integration gaps from 1.3.0: the new commands existed but skills didn't reference them, WIKI didn't list them, plugin didn't register them, no eval coverage. Now they are first-class citizens of the pipeline.

---

## [1.3.0-spec-kit-ideas] - 2026-05-15

### Added
- **`policies/constitution.md`** (new) — project governing principles (Code Quality, Testing, UX, Performance, Security) with hierarchical authority over PRD/plan/ADRs. Conflict resolution: constitution wins.
- **`templates/constitution-template.md`** (new) — 5-axis template with semver, owners, history log.
- **`.claude/commands/constitution.md`** (new) — `/constitution` slash command. Bootstraps or updates `memory/constitution.md` via 5 mini-interviews. Validates anti-patterns (vague principles, missing owners, contradictions).
- **`.claude/commands/analyze.md`** (new) — `/analyze` slash command. **Cross-artifact consistency check** (read-only) between constitution → specs → plan/ADRs → issues. Findings classified CRITICAL/HIGH/MEDIUM/LOW; produces traceability matrix; saves report to `docs/analysis/`.
- **`.claude/commands/checklist.md`** (new) — `/checklist` slash command. Generates **contextual checklist per feature** ("unit tests for English") covering Completeness, Clarity, Consistency, Coverage, Edge Cases. Cross-references constitution. Complements (does not replace) the fixed 13-check `prd-validation.md`.
- **`patterns/ai-integration/inference-time-compute.md`** (new) — multi-agent / multi-sample patterns (MoA, Self-Consistency, BoN, PlanSearch, SPL, RTO) with cost/ROI guidance, integration map per skill, and rationale for what NOT to adopt from optillm.

### Changed
- **`patterns/ai-integration/README.md`** — registered new `inference-time-compute.md` block.

### Sources
- [github/spec-kit](https://github.com/github/spec-kit) — constitution / analyze / checklist patterns (no CLI Python adoption, no `.specify/` dir; integrated into our `memory/`, `docs/`, slash commands)
- [algorithmicsuperintelligence/optillm](https://github.com/algorithmicsuperintelligence/optillm) — inference-time compute taxonomy (proxy infra intentionally not adopted; patterns reused in skill-orchestration model)

---

## [1.2.1-prd-validation] - 2026-05-13

### Added
- **`policies/prd-validation.md`** (new) — 13-check PRD quality checklist (structure, testability, language, technical) with EXCELLENT/GOOD/ACCEPTABLE/NEEDS_WORK grading and 3-option auto-fix flow. Inspired by [anombyte93/prd-taskmaster](https://github.com/anombyte93/prd-taskmaster) `script.py validate-prd`, decoupled from Taskmaster.

### Changed
- **`.claude/commands/grill-me.md`**: added "Checklist de cobertura mínima (13 áreas)" — essential (5) + technical (4) + scope/execution (3) + open (1). Convergence criterion reinforced: 2 turns without new branching **AND** all 13 areas covered.
- **`.claude/commands/to-prd.md`**: added step 0 (preflight — detects existing PRD in `docs/prd/`, `.taskmaster/docs/prd.md`, or tracker; offers Execute/Update/Replace/Review via `AskUserQuestion`) and step 4 (validation against `policies/prd-validation.md` before publishing; blocks if NEEDS_WORK).

### Sources
- [anombyte93/prd-taskmaster](https://github.com/anombyte93/prd-taskmaster) — 13-check validation, preflight pattern, discovery question structure (Taskmaster dependency intentionally not adopted)

---

## [1.2.0-agent-prompting] - 2026-05-13

### Added
- **`templates/agent-spec.md`** (new) — standalone spec-drafting template for new agents/subagents. Covers Job, Inputs/Outputs tables, Constraints (min 3), Fallback rules, Layering A→B→C, multi-shot example, YAML output schema, skill/protocol-shell refs. Inspired by ClickUp Agent Prompting Guide Five Building Block framework.
- **`policies/memory-tiers.md`** (new) — complete 4-tier memory hierarchy (Working → Episodic → Semantic → Procedural), promotion rules, score/decay table, privacy guardrails, per-tier token budgets. Inspired by rohitg00/agentmemory 4-tier consolidation model.

### Changed
- **`templates/prompt-spec.md`**: expanded from 6 flat fields to structured template with `Constraints` (reliability guardrails), `Fallback` (default text for missing input), `Examples (multi-shot)` Input/Output slots, and `Notas de iteração`.
- **`policies/protocol-shells.md`**: added `## No structural drift` — prohibits adding/renaming/reordering output fields without semver bump. "Stability is a contract."
- **`skills/26-prompt-engineer/SKILL.md`**: added `## Layering — Construção Incremental de Prompts` — mandatory A (core) → B (structure) → C (advanced logic) build order with test gate between each layer.
- **`policies/persistence.md`**: added `Segurança` (what never to persist: API keys, PII, secrets), `Memory Tiers` (4-tier table + promotion rules + score decay), `Token Budget` (2000 token default, `DEVKIT_SESSION_INJECT_TOKENS` override, trim priority order).
- **`hooks/scripts/session-start.mjs`**: added token budget guard — trims low-priority inject parts when estimated tokens exceed `DEVKIT_SESSION_INJECT_TOKENS` (default 2000). `current-focus` is never trimmed.
- **`skills/30-cost-tracker/SKILL.md`**: added `Memory Tiers e Decay` section — monitors learned-skills for archival candidates (score < 0.3) and promotion candidates (score ≥ 0.8).

### Sources
- [ClickUp Agent Prompting Guide](https://clickup.com/blog/agent-prompting-guide/) — Five Building Block framework, layering A→B→C, constraints-as-infrastructure, schema no-drift
- [rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) — 4-tier memory consolidation, token budget injection, privacy filter, confidence decay

---

## [1.1.0-context-engineering] - 2026-05-09

### Added
- **Protocol Shells (Pareto-lang):** `templates/protocol-shell.md` + `policies/protocol-shells.md` — formal typed I/O format for subagents, inspired by [davidkimai/Context-Engineering](https://github.com/davidkimai/Context-Engineering). Authoring guide at `docs/skill-guides/protocol-shells.md`.
- **Skill I/O Schemas:** `schemas/skill-io/` with JSON Schema draft-07 definitions for `detective-contracts`, `semgrep-triager`, `code-reviewer`. Zero-dep validator: `scripts/validate-schema.mjs`.
- **Pilot subagents migrated:** `detective-contracts`, `semgrep-triager`, `code-reviewer` — protocol shell prepended (existing instructions preserved), I/O schema created.
- **Iteration Scoring:** `scripts/auto-loop/scoring.mjs` — `iterationScore()` + `shouldStall()` wired into circuit breaker as complementary signal alongside existing stall detection. 5 unit tests in `scripts/tests/auto-loop/scoring.test.mjs`.
- **Programs Layer:** `programs/` with declarative cognitive program definitions for `pipeline-discovery`, `detective-spec`, `loop-polishing`. Orchestrator (skill 09) updated to reference `programs/` as canonical pipeline source.
- **Eval golden cases:** `evals/protocol-shells/` with golden.json per piloted subagent (8 cases total).
- **Context Engineering Stack docs:** `docs/WIKI.md`, `docs/skill-guides/context-engineering.md`, `README.md`, `README.pt-BR.md` — atom→field taxonomy mapping and Kimai reference added.
- **Baseline audit:** `docs/context-engineering-adoption/baseline.md` — full handoff audit of all 14 subagents before migration.

### Changed
- `scripts/auto-loop/circuit-breaker.mjs`: scoring integrated as complementary signal (AND with existing stall; graceful degradation when `iterResult` absent).
- `skills/09-orchestrator/SKILL.md`: references `programs/` as canonical source for multi-step pipeline composition.
- `.github/workflows/validate.yml`: added `node scripts/validate-schema.mjs --all schemas/skill-io/` step.
- `mcp-server/package.json`: corrected skill count from 31 → 37.
- `scripts/check-consistency.mjs`: stale string assertions corrected; agent count check made dynamic.
- `.claude/agents/semgrep-triager.md`: YAML frontmatter moved to file top (was misplaced after protocol shell block).

### Tests
- 5 new scoring tests: `scripts/tests/auto-loop/scoring.test.mjs`.
- 8 new eval golden cases: `evals/protocol-shells/`.
- Total auto-loop smoke tests: 21 → 26. All passing.

---

## [2.0.0-auto-loop] - 2026-04-30

### Added
- Auto-loop v2: multi-agent (claude + codex), integrated worktree, parallel mode (`--worktree --parallel N`).
- Polishing pass configurable via `--polish=none|light|standard|full` (default `standard`).
- gnhf-inspired: `--max-tokens`, `--stop-when "<condition>"`, prevent-sleep cross-OS, JSONL debug log with `error.cause`, exponential backoff classified by error kind (permanent / retryable / transient), graceful interrupt 2-stage (Ctrl+C 1x = graceful stop, 2x = force).
- Robust resume with prompt-conflict detection.
- Bilingual docs: `README.md` (English, canonical) + `README.pt-BR.md`.

### Changed
- `scripts/auto-loop.mjs` is now a shim → `scripts/auto-loop/index.mjs`.
- Code split into 17 modules under `scripts/auto-loop/` (legacy single file kept as `_legacy.mjs` for reference).

### Migration
- Existing `node scripts/auto-loop.mjs "task"` commands continue to work unchanged.
- New flags are opt-in. Default behavior matches v1 except `--polish=standard` is now applied by default (use `--polish=none` to disable).
- After merging an auto-loop branch locally, git may refuse `branch -d` because remote-tracking is unaware of the merge. Use `git branch -D <branch>` once you've confirmed it's merged to main (`git log main --oneline | grep <branch>`).
- Worktrees created by `--worktree` are preserved if they have commits. Cleanup with the printed `git worktree remove ...` command, or `git worktree prune` to drop stale references after manual deletion.

### Gap fixes (post-merge follow-up)
- Cross-platform: `gitDiffSinceBaseline` in `runner.mjs` and `circuit-breaker.mjs` now uses separate `spawnSync` calls instead of POSIX-only shell syntax (`;`, `2>/dev/null`).
- Windows: `claude.mjs` and `codex.mjs` adapters now use `shell: true` with manual arg quoting on Windows so `.cmd`/`.bat` launchers (npm-installed CLIs) resolve correctly.
- Runner now writes `.auto/runs/<runId>/status.json` at end of every run; `parallel.mjs` reads it to populate the summary table with real iterations/commits/path.
- New tests: codex adapter E2E with fake CLI shim, polish skill-path resolution, polish retry path, runner+worktree integration, parallel status-json read.

---

## [Unreleased]

### Added — Wiki completa (2026-05-04)
- **`docs/WIKI.md` (NOVO, ~700 linhas):** wiki única do kit no formato do post [aihero.dev "5 Agent Skills I Use Every Day"](https://www.aihero.dev/5-agent-skills-i-use-every-day). Cobertura completa: 11 seções com **todos** os 37 skills + 14 subagents + 23 commands + 22 policies + plugin (3 modos de instalação) + MCP server (36 tools) + árvore de decisão "quando usar o quê" + atribuições. Cada item segue formato consistente: nome, o que faz, quando usar, problema que resolve, exemplo concreto, takeaway.
- Diferença vs `docs/SKILLS-OVERVIEW.md`: overview é resumo de 5min (top items por categoria); WIKI é o detalhe item-por-item.
- README.md + README.pt-BR.md: callout no topo apontando para WIKI como "ponto de partida recomendado".
- `docs/SKILLS-OVERVIEW.md`: header agora aponta para WIKI ("procurando wiki completa? → WIKI.md").
- AGENTS.md: ordem de leitura inclui WIKI como item 3 (entre policies e README).

### Changed — Skill 17 (Image Generator) — modelos fal.ai concretos (2026-05-04)
- **`skills/17-image-generator/SKILL.md`:** seção "Selecao de Modelo" passou de descrição abstrata ("modelo barato", "modelo equilibrado") para **tabela concreta com 5 modelos fal.ai** (gpt-image-1-mini, Gemini 2.5 Flash, Gemini 3 Pro, gpt-image-1.5, Grok Imagine) com preço, quando usar e endpoints. Preserva princípio vendor-agnostic: tabela é "implementação recomendada", não obrigação. Adiciona árvore de decisão rápida + pipeline multi-modelo (iteração → validação → final).
- **`skills/17-image-generator/SKILL.md`:** tabela "Tipos de Asset" agora declara explicitamente quais tipos vão para skill 36 (Web Asset Generator): favicon, social-card (OG/Twitter), pwa-icon. Skill 17 fica para assets criativos (hero, mascote, illustration, background, layout, icon). Skill 36 para derivações operacionais a partir de logo.
- **`skills/17-image-generator/SKILL.md`:** seção "Integração com Outras Skills" agora menciona handoff direto para skill 36 (logo → favicons/PWA/OG) e skill 30 (Cost Tracker — registrar custo por modelo+asset).
- **`docs/skill-guides/image-generator-models.md` (NOVO, 350+ linhas):** schemas completos de input/output de cada modelo (campos, defaults, ranges), exemplos cURL/Python/JS por modelo, tabela comparativa cross-modelo (preço/velocidade/tipografia/composição), padrões de prompt por modelo, troubleshooting de erros comuns (`quality: auto` cobrança alta, `input_fidelity: high` triplica custo, default JPEG do Grok perde transparência, etc.).

### Added — Aihero skills batch (2026-05-03)
Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills) e [aihero.dev](https://www.aihero.dev/5-agent-skills-i-use-every-day) — integrado ao workflow do kit.

**Novas skills:**
- **Skill 37 — TDD Engineer** (`skills/37-tdd-engineer/SKILL.md`): red-green-refactor enforced, anti horizontal-slicing, 1 teste → 1 impl → repete. Tabela anti-rationalization com 9 falácias comuns. Pareia com skill 38 (Architecture Deepener) para identificar deep modules antes do RED.
- **Skill 38 — Architecture Deepener** (`skills/38-architecture-deepener/SKILL.md`): glossário arquitetural (Module/Interface/Implementation/Depth/Seam/Adapter/Leverage/Locality), deletion test, deepening opportunities. Não modifica código — propõe candidatos. Skill 23 (Migration & Refactor) executa.

**Novos commands (4 totais):**

3 commands de fase do fluxo de discovery:
- **`/grill-me`** (`.claude/commands/grill-me.md`): interrogatório relentless, uma pergunta + resposta sugerida por turno.
- **`/to-prd`** (`.claude/commands/to-prd.md`): conversa → PRD publicado no issue tracker (label `needs-triage`). Sintetiza, não entrevista.
- **`/to-issues`** (`.claude/commands/to-issues.md`): PRD → N issues independentes (vertical slices/tracer bullets). HITL/AFK por slice. Publica em ordem de dependência.

1 command orquestrador top-level:
- **`/pipeline-discovery`** (`.claude/commands/pipeline-discovery.md`): orquestra os 3 acima em sequência: `grill-me → to-prd → to-issues → loop+TDD → ship`. Coexiste com `/pipeline` clássico. Use para feature grande/nova/ambígua, paralelização 2+ workers, código crítico.

**Wiring:**
- Orchestrator (skill 09): nova seção "Dois Fluxos de Pipeline" — escolher entre Modo A (`/pipeline` clássico) e Modo B (`/pipeline-discovery`) por contexto.
- `/pipeline` clarificado como variante "clássico" + ponteiro para `/pipeline-discovery`.
- `docs/SKILLS-OVERVIEW.md`: nova seção "Os 2 fluxos: clássico vs discovery" no topo + comparativo + 4 novos commands no formato aihero.
- README.md/README.pt-BR.md: skills 37/38 nas tabelas, 4 novos commands na slash command table, log entry detalhado.
- AGENTS.md: 4 novos commands na tabela.
- plugin.json: 35 → 37 skills, 18 → 22 commands, description atualizada.

**Decisão de design:** os 2 fluxos coexistem. `/pipeline` clássico mantido para compatibilidade e simplicidade; `/pipeline-discovery` introduzido para casos avançados sem forçar mudança de hábito.

### Added — Vertical Slicing policy (2026-05-03)
- **`policies/vertical-slices.md`** — regra obrigatória para toda feature multi-camada: entrega por fatia vertical (DB + back + front + teste e2e por feature), nunca por camada horizontal. Anti-padrão "front primeiro, back depois" agora explicitamente proibido. Inclui heurísticas de tamanho (1-3 dias, <10 arquivos, demo-able), 5 anti-padrões nomeados, evidência de conformidade (tabela de slices obrigatória).
- **Orchestrator (skill 09) atualizado:** seção "Vertical Slicing" inserida antes da Pipeline Base. Pipeline base agora descrito como "fluxo padrão **dentro de UM slice vertical**". Recusa de plano layer-first é explícita.
- **PO (skill 01) atualizado:** specs multi-camada devem organizar user stories como vertical slices, com exemplos bom/ruim.
- **`/plan` e `/pipeline` atualizados:** output esperado agora inclui tabela de slices para feature multi-camada; pipeline base roda dentro de cada slice (paralelo se independentes).
- **`docs/SKILLS-OVERVIEW.md` atualizado:** nova seção "Princípio fundamental: Vertical Slicing" no topo + decision tree atualizada + nova policy nas top 5.

### Added — Items 2-3-4 batch (2026-05-03)
- **5 new dispatchable subagents** for skill 34 (Static Analysis) pipeline:
  - `semgrep-scanner` — parallel Semgrep scans by language category, SARIF aggregation
  - `semgrep-triager` — TP/FP/needs-investigation classification reading source context
  - `codeql-runner` — CodeQL database build + queries with interprocedural taint tracking
  - `sarif-parsing` — multi-tool SARIF dedup and aggregation
  - `variant-analysis` — bug variant hunting + reusable custom rule generation
- Skill 34 updated: removed "planejados" notice, integrated subagents into pipeline
- Naming convention change: subagents now use bare names (`semgrep-scanner`) instead of the namespaced form (`static-analysis:semgrep-scanner`) used in the original roadmap text. Namespaces only apply to Anthropic-published skill packages, not local kit subagents
- `.claude-plugin/plugin.json`: 9 → 14 dispatchable subagents
- `README.md`/`README.pt-BR.md`: subagent table reorganized into 3 categories (Core, Detective Spec, Static Analysis)
- `AGENTS.md`: subagent table updated with the 5 new ones
- `evals/skill-audit-2026-05-03.md`: complete audit of skills 01-32 against the scorecard from skill 35. Result: 22 PASS, 6 NEEDS-REVIEW, 4 NEEDS-REWRITE. Top weakness: 75% of skills miss `allowed-tools` field. Tier-1 rewrite priority: skills 21, 22, 24, 27.
- Cleanup: removed merged worktrees (`busy-tesla-e51016`, `cool-pascal-f3482a`, `top5-skills`) and their branches. Worktrees `items-2-3-4` (active) and 1 leftover dir kept.

### Added — Top 5 skills batch (2026-05-02 afternoon)
- **Skill 34 — Static Analysis** (`skills/34-static-analysis/SKILL.md`): Semgrep + CodeQL automated scan with SARIF output, severity triage, FP suppression and CI integration. Feeds findings into skill 06 (Security Review).
- **Skill 35 — Skill Author** (`skills/35-skill-author/SKILL.md`): meta-skill defining the kit's own SKILL.md template, eval scorecard (10 criteria, threshold 22/30), and pipelines for create/edit/eval/optimize. Sustains kit consistency as it grows.
- **Skill 36 — Web Asset Generator** (`skills/36-web-asset-generator/SKILL.md`): favicons (multi-size), PWA icons (incl. maskable), Open Graph/Twitter card images, web manifest, browserconfig and ready-to-paste HTML snippet — derived from logo or brand text. Three tooling options: realfavicongenerator CLI, ImageMagick, Sharp.
- **`policies/writing-clarity.md`**: 10 Strunk rules adapted for agent output (commits, error messages, handoffs, slash command output, generated docs). Lists banned filler words, output patterns per type, and 5-test conformance checklist.
- **`.claude/agents/debugger.md` upgraded**: explicit Evidence Ledger table, 10-row anti-rationalization table, heuristics by bug class (race condition, memory leak, perf regression, auth/permission, off-by-one, encoding), confidence scoring, escalation rules.
- README.md/README.pt-BR.md/plugin.json updated to reflect 35 skills (was 32). Plugin description and badges bumped. AGENTS.md unchanged (none of the new skills introduces a new slash command).

### Added
- **Skill 33 — Detective Spec** (`skills/33-detective-spec/SKILL.md`): engenharia reversa de specs para sistemas legados, inspirada no [Reversa](https://github.com/sandeco/reversa) e adaptada ao kit (Graphify + repo-audit + memória persistente).
  - Pipeline de 5 fases (reconhecimento → módulos → regras → fluxos → ADRs) com checkpoint/resume em `.detective/state.json`
  - Output em `_detective_sdd/` (overview, contratos de módulo, regras de negócio, fluxos end-to-end, ADRs retroativos, traceability)
  - Toda spec rastreável até `file:line` ou `commit-sha` com confidence scoring (high/medium/low)
- **4 personas detetives** (`personas/detective-*.md`): contracts, business-rules, flows, adrs — todas read-only
- **`policies/detective-write-guardrails.md`**: hard guardrail para writes restritos a `.detective/` e `_detective_sdd/` (zero modificação no projeto legado)
- **`/detective-spec`** slash command (`commands/detective-spec.md`) com suporte a escopo (`--module=`, `--feature=`), fase única (`--phase=N`) e resume
- Integração com Graphify (god nodes viram módulos prioritários) e repo-auditor (splits alimentam fases)

### Added
- **`scripts/auto-loop.mjs`** — loop autônomo idêntico ao ralph-starter: roda `claude --print` em subprocess Node.js com todos os 10 padrões de produção:
  - Progress tracking via checkboxes em `.auto/plan.md`
  - Inter-iteration memory em `.auto/progress.md` (append-only)
  - Context narrowing progressivo (3 níveis por iteração)
  - Tiered validation: lint → typecheck → build
  - Error deduplication (MD5 hash de erro normalizado)
  - Completion override (reler plan antes de parar)
  - Dynamic budget (8/12/15 por complexidade da task)
  - Validation feedback loop (erro vira contexto)
  - Stall detection (3 iter sem `git diff` = stuck)
  - Build-fix extension (+2 iterações uma vez se build falha)
  - CLI: `node scripts/auto-loop.mjs "task" [--max-iterations N] [--validate] [--no-commit] [--model M] [--push] [--verbose]`
- **`.claude/commands/loop.md`** — slash command `/loop` documentando como invocar `auto-loop.mjs`
- **plugin.json**: comando `/loop` registrado
- **README.md**: seção `/loop` com tabela de 10 padrões e exemplos de uso
- **README.md**: `.claude/` tree atualizado para incluir `/loop`

- **5 subagents Claude Code** em `.claude/agents/`: `code-reviewer`, `security-auditor`, `test-engineer`, `orchestrator`, `debugger` — despacháveis via `Task` tool
- **`hooks/scripts/session-event-logger.mjs`** — PostToolUse hook: registra cada tool call como JSONL em `.auto/events.jsonl` (rotação em 10 MB, async, fallback silencioso)
- **`mcp-server/src/lib/output-compressor.ts`** — compressor de output: 4 estágios (ANSI strip, dedup [×N], colapso de diretórios, truncação por estratégia), hints para git log/npm install/test
- **`mcp-server/src/lib/event-log.ts`** — queries sobre `.auto/events.jsonl`: session_events, seen_files, seen_errors com dedup por MD5 normalizado
- **`devkit_compress_output`** — nova MCP tool: comprime output verboso antes de passar ao modelo
- **`devkit_session_events`** — nova MCP tool: lê e filtra log JSONL da sessão
- **`devkit_seen_files`** — nova MCP tool: lista arquivos acessados na sessão (Read/Edit/Write/Glob)
- **`devkit_seen_errors`** — nova MCP tool: lista erros agrupados por hash normalizado
- MCP tool count: 32 → **36 tools**
- `setup/install.sh`: copia `.claude/agents/` para repo consumidor
- `plugin.json`: campo `agents` com 5 subagents registrados
- `hooks/hooks.json`: `session-event-logger.mjs` registrado em PostToolUse
- `hooks/config.json`: `session-event-logger` adicionado ao perfil `minimal.disabled`
- `AGENTS.md`: tabela de subagents + como invocar
- `CONTRIBUTING.md`: seção "Adicionando subagent"
- `mcp-server/README.md`: seção `### Session Intelligence (4)` + header `## Tools (36)`
- `scripts/check-consistency.mjs`: soma seção Session Intelligence ao total de tools
- **`.claude/commands/worktree.md`** — slash command `/worktree [branch|--list|--clean]`: cria git worktree isolado, copia `.env*`, instala deps e roda lint/typecheck em background, relatório final com path e branch ativo
- **`hooks/scripts/verify-integrity.mjs`** — verifica SHA-256 dos hook scripts contra manifesto `.bot/hooks/.integrity.json`; modos: `--write` (gera manifesto), check (padrão, sai 0/1/2), `--silent` (sem output em sucesso)
- `setup/install.sh`: chama `verify-integrity.mjs --write` após copiar hooks — manifesto gerado automaticamente em cada `devkit-install-fv`
- `hooks/scripts/session-start.mjs`: spawn detached de `verify-integrity.mjs --silent` a cada SessionStart — drift de hooks é detectado sem bloquear start
- `hooks/scripts/session-event-logger.mjs`: prune automático de arquivos `events.YYYY-MM-DD*.jsonl` mais antigos que 14 dias (throttled: ~1 em 200 writes)
- **`scripts/worktree.mjs`** — companion executável do `/worktree`: mesma semântica (create/list/clean) invocável diretamente, sem precisar do agente; flags `--existing`, `--no-install`, `--no-validate`
- **`mcp-server/src/lib/suggestions-engine.ts`** — lógica de `devkit_smart_suggestions` extraída de `index.ts` em módulo testável com 6 heurísticas puras (repo-audit, CLAUDE.md, tests, UI context, git log, event-log)
- **`scripts/test-suggestions-engine.mjs`** — 8 testes unitários para `buildSuggestions()` (empty project, UI context, errors, md edits, cap)
- `.github/workflows/validate-plugin.yml`: roda `scripts/test-*.mjs` e `check-consistency.mjs` no CI — tests de compressor, event-log, seen-queries e suggestions-engine agora são parte do validate pipeline
- `plugin.json`: comando `/worktree` registrado no array `commands`
- `README.md`, `AGENTS.md`, `docs/skill-guides/skill-discovery.md`: `/worktree` adicionado às tabelas de slash commands e decision tree

### Fixed
- README.md: MCP tool count corrigido de 31 para 32 em todas as ocorrências (badge, tabela, header, tree)
- README.md: Persistence block corrigido de 11 para 12 na tabela do MCP
- README.md: hook `session-start` perfil corrigido de `todos` para `standard, strict`
- README.md: perfil `minimal` não listava session-start como ativo — corrigido
- README.md: `.claude/` tree incluía apenas 9 commands — adicionado `/auto`
- README.md: `Estrutura Instalada` tree incompleta — adicionados todos os diretórios copiados pelo install.sh
- `mcp-server/package.json`: description dizia "32 skills", corrigido para "31 skills" (o MCP tem 32 tools, não skills)
- `.claude/commands/auto.md`: Fase 0 não mencionava criação de `.auto/env.md` — corrigido
- `docs/skill-guides/skill-discovery.md`: Decision Tree não tinha entrada para task autônoma — adicionado `/auto`
- `docs/README.md`: skill-guides index só mencionava 2 guias — atualizado para incluir autonomous-loop e ideation-frameworks

---

## [1.3.0] — 2026-04-13 — Agent Intelligence v3

### Added
- **10 slash commands** em `.claude/commands/`: `/spec`, `/plan`, `/build`, `/test`, `/review`, `/simplify`, `/ship`, `/pipeline`, `/best`, `/auto`
- **`/auto` — Agente Autônomo**: loop plan-build-test-validate-review-commit com 10 patterns de produção:
  - Progress tracking via checkboxes em `.auto/plan.md`
  - Inter-iteration memory em `.auto/progress.md` (append-only)
  - Context narrowing progressivo (3 níveis por iteração)
  - Tiered validation: lint (~5s) → typecheck (~15s) → build (~60s)
  - Error deduplication (normaliza line numbers/timestamps antes de comparar)
  - Completion override (reler plan antes de commit — tasks `[ ]` = não done)
  - Dynamic iteration budget (escala com quantidade de tasks)
  - Validation feedback loop (erro vira contexto da próxima tentativa)
  - Stall detection (3 iterações sem `git diff` = stuck)
  - Build-fix extension (+2 iterações se build falha na iteração final)
- **Meta-skill de descoberta** (`docs/skill-guides/skill-discovery.md`): decision tree task→skill, 6 core operating behaviors, 10 failure modes
- **Session-start bootstrap**: `session-start.mjs` injeta `skill-discovery.md` automaticamente a cada sessão (controlado por `config.json`)
- **3 Agent Personas** com output estruturado e severity labels:
  - `personas/code-reviewer.md` — 5 eixos de review
  - `personas/security-auditor.md` — 5 scopes com PoC obrigatório para criticals
  - `personas/test-engineer.md` — 5 tipos de cenário + coverage template
- **Context Engineering** (`policies/context-engineering.md`): hierarquia de 5 níveis, 3 trust levels, regras de conflito
- **Context Engineering Guide** (`docs/skill-guides/context-engineering.md`): exemplos, packing strategies, sinais de context decay
- **Autonomous Loop Guide** (`docs/skill-guides/autonomous-loop.md`): protocolo completo do `/auto` com arquitetura e patterns documentados
- **Plugin Validation CI** (`.github/workflows/validate-plugin.yml`): valida JSON, referências de scripts e sintaxe dos `.mjs`
- `CHANGELOG.md` — este arquivo

### Changed
- `hooks/scripts/session-start.mjs` — expandido com bootstrap de meta-skill
- `hooks/config.json` — nova seção `session_bootstrap`; minimal profile agora desabilita `session-start`
- `skills/11-reviewer/SKILL.md` — referência à persona `personas/code-reviewer.md`
- `skills/06-security-review/SKILL.md` — referência à persona `personas/security-auditor.md`
- `skills/05-qa-testing/SKILL.md` — referência à persona `personas/test-engineer.md`
- `.claude-plugin/plugin.json` — 10 slash commands registrados
- `setup/install.sh` — copia `personas/` e `.claude/commands/` para consumer repos
- `AGENTS.md` — seção slash commands + artefatos v3
- `GLOBAL.md` — referência a `policies/context-engineering.md`
- `templates/CLAUDE-root.md` — seções slash commands e personas para consumer repos
- `templates/AGENTS-root.md` — slash commands + skill discovery para consumer repos
- `templates/GEMINI-root.md` — slash commands + context engineering
- `setup/configs/copilot-instructions.md` — slash commands; count 27→31
- `setup/configs/windsurf-rule.md` — slash commands + discovery
- `docs/README.md` — guides skill-discovery e context-engineering indexados
- `.gitignore` — ignora `.auto/` (diretório de tracking do /auto)
- `README.md` — seção slash commands, personas, context engineering, estrutura, timestamp

---

## [1.2.0] — 2026-04-13 — Agent Intelligence v2

### Added
- **Anti-rationalization policy** (`policies/anti-rationalization.md`): tabelas de racionalizações comuns + rebuttals para skills críticas
- **Anti-rationalization tables** nas skills: orchestrator (09), QA (05), reviewer (11), security (06), backend (03)
- **Confusion management protocol** (`policies/confusion-management.md`): STOP-NAME-OPTIONS-WAIT para confusão detectada
- **Source-driven development policy** (`policies/source-driven.md`): hierarquia de fontes para decisões de framework/lib; integração no orchestrator
- **Ideation frameworks guide** (`docs/skill-guides/ideation-frameworks.md`): SCAMPER, HMW, First Principles, JTBD
- **Fase Divergente** na skill 01 (PO) — ideação estruturada antes da spec
- **Simplify-ignore hook** (`hooks/scripts/simplify-ignore.mjs`): protege blocos `simplify-ignore-start/end` de simplificação automática via PreToolUse/PostToolUse
- `CONTRIBUTING.md` — guia de contribuição com quality bar e formatos
- `LICENSE` — MIT

### Changed
- `hooks/hooks.json` — simplify-ignore registrado em PreToolUse e PostToolUse
- `hooks/config.json` — seção `simplify_ignore`
- `README.md` — v2 features, governança atualizada

---

## [1.1.0] — 2026-04-11 — Hook Intelligence v1

### Added
- **Hook Profiles** (`minimal`/`standard`/`strict`) com env vars `DEVKIT_HOOK_PROFILE` e `DEVKIT_DISABLED_HOOKS`
- **Confidence Scoring** em learned skills: score 0-1, decay semanal, boost por uso, auto-arquivo abaixo de 0.3
- **`search-first.md` policy**: pesquisa obrigatória antes de implementar
- **`iterative-retrieval.md` policy**: retrieval progressivo em 3 rounds para subagents
- **`utils.mjs`**: `isHookDisabled`, `readHookConfig`, `getActiveProfile`, `getProfileOverrides`, `resolveBotPath`
- Strategic compact em `context-guard-stop`: aviso proativo em 50%, bloqueio inteligente em 75%

### Changed
- Todos os 8 hooks usam `isHookDisabled` via utils.mjs
- `config.json` — seção `hook_profiles` com perfis e overrides

---

## [1.0.0] — 2026-04-09 — Release Inicial

### Added
- **31 specialist skills** cobrindo todo o ciclo de desenvolvimento
- **Plugin manifest** (`.claude-plugin/plugin.json`) com 31 skills, hooks e commands
- **`/devkit-install-fv`** slash command para instalação full `.bot/`
- **MCP server** com 32 tools (Knowledge 14, Execution 6, Persistence 12)
- **Lifecycle hooks**: pre-execution-gate, keyword-detector, context-guard-stop, persistent-mode, pre-tool-enforcer, session-start, post-tool-verifier, model-routing-hook
- **Model routing policy** unificada — absorve skill 16 (llm-selector)
- **Multi-platform support**: Claude Code, Cursor, Windsurf, Copilot, Gemini CLI, OpenCode, Antigravity
- **`setup/install.sh`** multi-plataforma
- Policies: execution, handoffs, quality-gates, token-efficiency, tool-safety, evals, cost-optimization, model-routing, persistence, stack-flexibility, code-exploration, hooks
