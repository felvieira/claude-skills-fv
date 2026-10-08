# AGENTS.md

## Objetivo
Este repositorio define um kit de skills e governanca para agentes de coding em Claude, OpenCode e superficies compativeis.

## Uso em Repos Consumidores
- em repos de aplicacao, o modo recomendado e manter `AGENTS.md` na raiz e instalar o kit dentro de `.bot/`
- usar `templates/AGENTS-root.md` como base para o `AGENTS.md` do repo consumidor
- se o repo consumidor nao tiver auditoria valida, iniciar por `Repo Auditor`

## Ordem de Leitura
1. `GLOBAL.md`
2. `policies/`
3. `docs/WIKI.md` — visao panoramica de todo o kit (todas as skills, subagents, commands, policies)
4. `README.md`
5. `skills/*/SKILL.md` — skill especifica conforme task
6. `docs/skill-guides/` somente quando a tarefa exigir exemplos extensos

## Defaults Operacionais
- responder curto por padrao
- agir primeiro quando houver default seguro
- nao repetir contexto desnecessario
- usar tools com minimo privilegio
- pedir aprovacao para acoes destrutivas ou externas de alto risco
- registrar handoff curto e objetivo

## Memoria do Kit (vale para qualquer agente, com ou sem hooks)
Os hooks do kit so rodam onde estao registrados (Claude Code pelo plugin; Codex por `.codex/hooks.json`). Agente sem hook — Grok Build (que ignora hooks do Claude por padrao), Cursor, Gemini CLI, OpenCode — le este arquivo e deve fazer a mao o que o hook faz:
- antes de repetir uma abordagem, procure em `.bot/learned-skills/*.md` pelo campo `triggers` que casa com a tarefa; leia o `state`
- `state: rejected` = **ja tentado e descartado**; o campo `reason` diz por que. Nao repita sem fato novo que invalide o motivo. `superseded` aponta o sucessor em `superseded_by`; `stale` e hipotese
- `files:` + `commit:` dizem de que arquivos a nota depende: se mudaram desde o commit (`git diff <commit>..HEAD -- <arquivo>`), revalide antes de aplicar
- apos uma compactacao, trate qualquer resumo recebido como pista, nao como fato: reconfira o estado do git e rode de novo a verificacao que ele cita
- com o servidor `ai-memory` ligado por MCP, `node scripts/learned-skills-to-ai-memory.mjs --apply` publica as learned-skills nele, e entao `memory_query` as encontra em qualquer agente. Nunca grave valor de chave/token em nota
Detalhe: `policies/learned-skills.md`, `policies/compaction-recovery.md`, `policies/memory-write-rules.md`.

## Guardas sob demanda (/careful, /freeze) em qualquer agente
Sem slash commands (Codex, Grok Build, Cursor...), ligue pelo shell: `node scripts/session-guard-cli.mjs careful on|off` e `freeze <pasta>|off` (`status` mostra). Onde o hook esta registrado (Claude, Codex pelo `.codex/hooks.json`, Grok com `install-memory-hooks.mjs --runtime grok --guards --apply`) o bloqueio e mecanico. **Sem hook, a regra vale por convencao**: com `freeze` ativo, nao edite fora da pasta; com `careful` ativo, nao rode `rm -rf`, `git push --force`, `git reset --hard`, deploy nem SQL destrutivo sem confirmacao explicita da pessoa. Estado em `.auto/session-guards.json` (do projeto, expira em 8 h).

## Mudancas no Repositorio
- prefira mudancas pequenas e revisaveis
- preserve a hierarquia global do kit
- nao reintroduza acoplamento a vendor ou comando especifico sem necessidade
- mova exemplos longos para `docs/skill-guides/` quando uma skill comecar a inflar

## Validacao Minima
- siga `policies/evals.md` para mudancas de skills, prompts e tools
- siga `policies/tool-safety.md` para MCP, rede, escrita e acoes externas

## Slash Commands

Atalhos por fase de desenvolvimento — use em vez de lembrar nomes de skills:

| Command | O que faz |
|---------|-----------|
| `/spec` | Especificar feature com critérios de aceitação |
| `/plan` | Classificar task e montar pipeline |
| `/build` | Implementar com stack do projeto |
| `/test` | Escrever e rodar testes |
| `/review` | Review final + security audit |
| `/simplify` | Simplificar e refatorar código |
| `/ship` | Release e deploy |
| `/pipeline` | Pipeline completo end-to-end |
| `/best` | Auditoria de boas práticas, clean code e DRY |
| `/auto` | Agente autônomo — executa task completa sem intervenção |
| `/loop` | Loop autônomo v2 — multi-agente (claude/codex), worktree paralelo, polishing pass (`node scripts/auto-loop.mjs "task"`) |
| `/worktree` | Cria git worktree isolado, copia `.env*`, valida ambiente em background |
| `/detective-spec` | Engenharia reversa de specs em legado — extrai contratos sem tocar no código (skill 33) |
| `/catalog-project` | Sintetiza repo-audit + detective-spec + narrativa de produto (resumo/planos/FAQ) + histórico de sessões + dados operacionais (envs/endereços/métricas) em `.project-memory/manifest.yaml` versionado no repo consumidor — tudo sempre rastreável a evidência, alimenta o catálogo cross-repo `project-brain` |
| `/grill-me` | Interrogatório relentless de plano até convergência (uma pergunta + resposta sugerida por turno) |
| `/to-prd` | Converte conversa atual em PRD publicado no issue tracker (label `needs-triage`) |
| `/to-issues` | Quebra PRD em N issues independentes (vertical slices) e publica no tracker |
| `/pipeline-discovery` | Pipeline COMPLETO discovery: grill-me → to-prd → to-issues → loop+TDD → ship |
| `/constitution` | Bootstrap/update `memory/constitution.md` com princípios governantes (Code Quality, Testing, UX, Performance, Security) |
| `/checklist` | Checklist contextual por feature ("unit tests for English") — Completeness, Clarity, Consistency, Coverage, Edge Cases |
| `/analyze` | Cross-artifact consistency check (read-only) entre constituição → spec → plan → issues. CRITICAL bloqueia `/build` |
| `/humanize` | Remove os 29 padrões de AI-generated writing de qualquer prosa (docs, PRDs, copy, changelogs) |
| `/consolidate-memory` | Manutenção do vault de memória persistente — merge duplicatas, archive stale, prune índice. Workflow seguro com snapshot |
| `/savings` | **(v2.4.0)** Mostra o que o kit salvou na sessão/janela: tokens economizados, USD, riscos prevenidos, hot files, decisões do gate. Auditoria em `policies/savings-metrics.md`. Mini-resumo automático no Stop hook. |
| `/drift-scan` | **(v2.5.0)** Continuous drift detection contra todo o codebase: dead-code, large-files, stale-todos, dep-staleness, doc-code drift, test-coverage. Inspirado em Birgitta Böckeler — ver `docs/inspiration/harness-engineering.md`. |
| `/context-budget` | **(v2.26.0)** Audita peso de contexto carregado na sessão: skills/agents/MCP/rules/CLAUDE.md — tokens estimados por componente, headroom disponível, alertas de overflow. Distinto do `/savings` (que rastreia completions runtime). |
| `/spec-kit` | **(v2.28.0)** Pipeline SDD unificado: specify → plan → tasks → implement com checkpoints explícitos e Adversarial Verifier inline. Inspirado no GitHub Spec Kit (88k stars). `--phase specify` / `--phase plan` / `--skip-checkpoints` para CI. |
| `/insights` | **(v2.28.0)** Recomendações baseadas em uso real: lê JSONLs de telemetria dos hooks (gate decisions, investigate-first bloqueios, tool repetitions, conflict-resolutions) e recomenda o que calibrar. Similar ao `/Insights` nativo mas lê dados do kit. |
| `/careful` | **(v2.92.0)** Liga sob demanda o `permission-ladder-guard`: `rm -rf`, force-push, `reset --hard`, deploy pedem confirmação; `DROP TABLE`/produção nega. Estado do projeto, expira em 8 h. Limite: regex sobre texto, não parser de shell. |
| `/freeze` | **(v2.92.0)** `/freeze <pasta>` bloqueia Edit/Write fora dela até `/freeze off`. Útil ao depurar. Não cobre `sed -i`/redirecionamento via Bash. |
| `/run-program` | Executa pipeline declarativo YAML (programs/*.yml) com **7 step types** (command/prompt/bash/gate/loop/parallel/conditional), `context: fresh` per step, `provider`/`model` routing, `trigger_rule` para parallel. 6 programs: pipeline-discovery, spec-driven-development, loop-polishing, detective-spec, **adversarial-dev** (GAN), **comprehensive-review** (5-agent parallel) |
| _(auto)_ | **Auto-orchestration** (v1.8.0): hook `intent-classifier` sugere program adequado baseado em intent do prompt. Skill 39 (program-router) confirma. 4 níveis de autonomia em `policies/auto-orchestration.md` |
| `/swarm` | **TOTAL AUTONOMY** (v2.0.0): do prompt ao PR mergeable. Worktree isolado + Ralph loop (fresh context per story) + 4-agent parallel review + self-fix CRITICAL/HIGH + auto PR. Em modo Autonomous (Nível 3), o hook auto-roteia features pra `/swarm`. Inspirado em Ralph/fix-issue/comprehensive-review do archon. |
| _(via /run-program)_ | **`refactor-safely`** (v2.1.0): pipeline com behavior preservation — baseline tests + analyze read-only + atomic plan + execute com type-check hooks + verify + PR. Use pra refactor de módulos grandes. |
| _(doc)_ | **`docs/USE-CASES.md`** (v2.1.0): mapeia 17 cenários de dev no dia-a-dia → comando apropriado. Hook intent-classifier v2 roteia auto baseado nesses cenários. |

Navegação de skills: `docs/skill-guides/skill-discovery.md`

## Modos de execução autônomos

- `/auto` — prompt-based, executa no contexto atual da conversa
- `/loop` — process-based (auto-loop v2), roda o agente como subprocess com:
  - **multi-agente** via `--agent claude|codex`
  - **worktree integrado** via `--worktree` (paralelo via `--parallel N`, até 8)
  - **polishing pass** configurável via `--polish none|light|standard|full`
  - exit codes determinísticos para uso em CI (ver `.claude/commands/loop.md`)

## Image Generation (v2.16.0 — regra canônica do kit)

Quando o agente precisar gerar ou adaptar imagem (hero, ícone, ilustração, OG card, mascote, favicon):

1. **Despachar skill 17 (`17-image-generator`)** — nunca chamar API FAL.AI direto, nunca instalar SDK extra.
2. **Skill 17 aplica regra default automaticamente:**
   - text-to-image (sem `referenceImages`) → **grok-imagine** ($0.020/img)
   - edit/refine (com `referenceImages`) → **gemini-25-flash** ($0.039/img)
   - Override (`--model gemini-3-pro` etc.) só com justificativa documentada
3. **Execução:** `node scripts/generate-image.mjs --prompt "..." [--ref ./img.jpg] --out path` (zero-dep, lê `models/image-models.json`).
4. **`/swarm` invoca automaticamente** em Phase 2.5 quando PRD/stories mencionam landing/sistema/UI novo.
5. **Fonte única de models:** `models/image-models.json` — atualizar lá quando preços mudarem, propaga pra skill + template stack-default.

Detalhes em `skills/17-image-generator/SKILL.md → Regra Default`.

## Template `stack-default` (v2.15.x)

Pra projeto novo (greenfield), em vez de scaffoldar do zero (Write × 130):

```bash
cp -r templates/stack-default/ ../meu-projeto/
cd ../meu-projeto/ && cp .env.example .env && make dev
```

Stack já decidida (não reabrir): Docker Compose + Postgres 16 + Redis 7 + MinIO + Traefik + Next.js 15 + Better Auth + Drizzle + OpenRouter (LLM) + FAL.AI (image). Decisões em `templates/stack-default/README-stack.md`.

## Artefatos Principais
- `GLOBAL.md` = regras universais
- `policies/` = regras compartilhadas (inclui `context-engineering.md` para hierarquia de contexto e `rules-system.md` para os rules path-scoped)
- `rules/` = padrões de codificação path-scoped (`common/` sempre aplica; `<linguagem>/` anexa via `paths:` glob). Copiados para `.claude/rules/dev-team-kit/` no install. Ver `policies/rules-system.md`.
- `templates/` = formatos curtos padronizados
- `skills/` = especialidades
- `personas/` = personas estruturadas para review (code-reviewer, security-auditor, test-engineer)
- `docs/repo-audit/` = auditoria reutilizavel do repositorio
- `docs/skill-guides/` = anexos sob demanda (inclui `skill-discovery.md` e `context-engineering.md`)
- `evals/` = casos de avaliacao do sistema
- `docs/setup-bot-folder.md` = modo recomendado de instalacao em `.bot/`
- `patterns/ai-integration/` = padroes reutilizaveis para integrar IA em apps
- `.claude/commands/` = slash commands por fase de desenvolvimento
- `.claude/agents/` = subagents despachaveis via Task tool

## Ferramentas de mídia e conduta dos subagentes (qualquer agente)

As skills 84 (vídeo com IA), 85 (ilustração) e 86 (filme em código) trazem ferramentas em **Node puro** (Node 20+), sem depender de slash command nem de hook: funcionam igual em
Claude Code, Codex, Grok Build, Cursor, Gemini CLI, OpenCode e outros, em Windows, macOS e Linux. Em repo consumidor, prefixe os caminhos com `.bot/`.

```bash
node skills/86-code-motion-film/scripts/doctor.mjs --install    # verifica e instala ffmpeg, Playwright e Chromium (winget/choco, brew ou apt) e prova com um render
node skills/86-code-motion-film/scripts/check-film.mjs film/index.html   # o filme é função pura do tempo? (fonte limpa, mesmo quadro em qualquer ordem, loop fechado)
node skills/86-code-motion-film/scripts/beats.mjs analyze trilha.mp3     # andamento, compasso 1, drops; `cut` corta compassos inteiros
node skills/84-ai-video-direction/scripts/briefing-qa.mjs briefing.json  # reprova número, preço ou depoimento sem fonte no briefing de vídeo
node scripts/svg-icon-lint.mjs <pasta-ou-arquivo.svg>                    # linter de ícones e ilustrações (skill 85)
```

- As ações que variam por agente (planejar, perguntar, olhar uma imagem, delegar, rodar em segundo plano, enviar arquivo) estão numa tabela em `skills/86-code-motion-film/references/AGENTES.md`.
  Onde o seu agente não tem uma delas, o fluxo diz o que fazer no lugar; nunca finja que viu uma imagem que não abriu.
- **Subagentes sem despacho** (agentes que não têm `Agent`/`Task`): os arquivos de `agents/*.md` servem como **prompt de papel**. Leia o arquivo inteiro, inclusive o bloco "Conduta" no fim
  (investigar antes de afirmar, declarar o que não foi verificado, escopo é o pedido; os que escrevem também confirmam antes de ação destrutiva e nunca enfraquecem teste). A fonte desse bloco é
  `policies/subagent-conduct.md`; `node scripts/sync-agent-conduct.mjs` confere que nenhum agente divergiu.
- Texto de terceiros (galerias de prompts, por exemplo) fica fora do repositório: a biblioteca local de `prompt-motion.mjs` vive em `~/.dev-team-kit/prompt-motion/`.

## Subagents Despacháveis (`agents/`) vs Skills (`skills/NN-*/`)

⚠ **REGRA CRÍTICA — ler antes de despachar qualquer trabalho paralelo.**

O kit tem **dois universos** que compartilham o prefixo `dev-team-kit-fv:`:

| Universo | Localização | Invocação | Convenção de nome |
|---|---|---|---|
| **Skills** (85 itens) | `skills/NN-name/SKILL.md` | `Skill(skill: "dev-team-kit-fv:NN-name")` | numerado `01-`...`86-` (o 16 é reservado) |
| **Subagents** (16 itens) | `agents/name.md` | `Agent(subagent_type: "dev-team-kit-fv:name")` | semântico kebab-case |

**Apenas estes 16 nomes** são `subagent_type` válidos. Qualquer outro nome com prefixo `dev-team-kit-fv:` é skill, não subagent.

Detalhes completos: `policies/skills-vs-agents.md`. Hook fail-fast: `hooks/scripts/agent-dispatch-validator.mjs`.

### Tabela de Subagents (todos os 16 válidos)

| Subagent | Especialidade | Espelho-skill (carregar playbook) | Tools |
|----------|---------------|------------------------------------|-------|
| `code-reviewer` | Review senior: correctness, design, readability, performance, security | `11-reviewer` | Read, Grep, Glob, Bash |
| `security-auditor` | Audit de segurança: OWASP, auth, injeção, CORS, deps | `06-security-review` | Read, Grep, Glob, Bash |
| `test-engineer` | QA Prove-It: happy path, error, edge case, regression, performance | `05-qa-testing` | Read, Grep, Glob, Bash, Edit, Write |
| `orchestrator` | Tech Lead: classifica task, define pipeline mínimo, coordena skills | `09-orchestrator` | todas |
| `debugger` | Root cause sistemático: hipótese → evidência → fix mínimo | — | Read, Grep, Glob, Bash, Edit |
| `detective-contracts` | Detetive de contratos de módulo (legado) — read-only | `33-detective-spec` (fase) | Read, Grep, Glob, Bash |
| `detective-business-rules` | Detetive de regras de negócio escondidas (legado) — read-only | `33-detective-spec` (fase) | Read, Grep, Glob, Bash |
| `detective-flows` | Detetive de fluxos end-to-end (legado) — read-only | `33-detective-spec` (fase) | Read, Grep, Glob, Bash |
| `detective-adrs` | Detetive de decisões arquiteturais retroativas (legado) — read-only | `33-detective-spec` (fase) | Read, Grep, Glob, Bash |
| `semgrep-scanner` | Scans Semgrep em paralelo por linguagem, agrega SARIF | `34-static-analysis` (fase) | Read, Grep, Glob, Bash |
| `semgrep-triager` | Triagem TP/FP/needs-investigation lendo contexto fonte | `34-static-analysis` (fase) | Read, Grep, Glob, Write |
| `codeql-runner` | Orquestra build de database CodeQL + queries (taint tracking interprocedural) | `34-static-analysis` (fase) | Read, Grep, Glob, Bash |
| `sarif-parsing` | Parse, dedup e agrega múltiplos SARIF (Semgrep + CodeQL) | `34-static-analysis` (fase) | Read, Glob, Bash, Write |
| `variant-analysis` | Caça variantes de bug confirmado e gera custom rule reusável | `34-static-analysis` (fase) | Read, Grep, Glob, Bash, Write |
| `anti-ai-writing` | Review de prosa: detecta os 29 padrões de AI-generated writing em docs/PRDs/copy | `41-blog-publisher` / `/humanize` | Read, Grep, Glob, Write |
| `silent-failure-hunter` | Review-only: caça falhas silenciosas — `catch{}` vazio, `.catch(()=>[])`, stack trace perdido, fallback que esconde falha, rollback faltando | `06-security-review` (lente estreita) | Read, Grep, Glob, Bash |

### Como invocar (CORRETO)

**Subagent isolado** (turno separado, contexto novo):

```typescript
Agent({
  subagent_type: "dev-team-kit-fv:code-reviewer",
  description: "Review changes in src/auth",
  prompt: "Review the diff in src/auth/. Focus on token handling and CSRF."
})
```

**Skill no contexto atual** (carregar playbook):

```typescript
Skill({ skill: "dev-team-kit-fv:11-reviewer" })  // carrega playbook de review
Skill({ skill: "dev-team-kit-fv:04-frontend-integration" })  // carrega playbook frontend
```

**Paralelizar N slices** (cada subagent invoca skill internamente):

```typescript
// 1 message, N tool calls em paralelo
for (const slice of slices) Agent({
  subagent_type: "general-purpose",
  isolation: "worktree",
  description: `Slice ${slice.id}`,
  prompt: `
    PRIMEIRO PASSO OBRIGATÓRIO: invoque Skill({ skill: "dev-team-kit-fv:04-frontend-integration" }).
    Depois implemente: ${slice.description}
    Critérios: ${slice.acceptance.join("; ")}
  `
})
```

Ver `templates/parallel-slice-prompt.md` para template canônico. Ver `skills/40-parallel-dispatcher/SKILL.md` para skill especializada em paralelização.

### Anti-padrão (não fazer)

```typescript
// ❌ TODOS quebram com InputValidationError — esses nomes são SKILLS, não agents
Agent({ subagent_type: "dev-team-kit-fv:04-frontend-integration", ... })
Agent({ subagent_type: "dev-team-kit-fv:05-qa-testing", ... })
Agent({ subagent_type: "dev-team-kit-fv:09-orchestrator", ... })
```

O hook `agent-dispatch-validator` (v2.2.0+) bloqueia esses casos e devolve mensagem acionável.
