# Changelog

Todas as mudanças notáveis neste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

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
