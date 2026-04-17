# Changelog

Todas as mudanças notáveis neste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Unreleased]

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
