# Plano: Integração de padrões squeez + rtk

**Criado:** 2026-04-17
**Status:** complete
**Escopo:** Trazer para o Dev Team Kit os padrões mais valiosos de [squeez](https://github.com/claudioemmanuel/squeez) e [rtk](https://github.com/rtk-ai/rtk) sem reimplementar compressor Rust.

---

## Objetivos

1. **Subagents nativos** — transformar personas em subagents Claude Code despacháveis via `Task` tool
2. **Event log estruturado** — registrar cada tool call como JSONL para auditoria e queries
3. **Compressão de output** — reduzir contexto consumido por outputs verbosos de bash
4. **Queries sobre histórico** — permitir que o modelo pergunte "que arquivos vi?" / "que erros tive?"
5. **Discover pattern** — sugerir skills que deveriam ter sido usadas mas não foram

## Não-objetivos

- Reimplementar compressor Rust (integrar squeez/rtk externamente é mais barato)
- MinHash fuzzy dedup (nossa dedup MD5 no auto-loop é suficiente)
- SQLite analytics (JSONL é mais simples e portável)
- TOML DSL para filtros (nosso `hooks/config.json` já serve)

---

## Fase 1 — Subagents + Event Log JSONL

### 1.1 Criar diretório `.claude/agents/` com 5 subagents

Cada arquivo segue o formato Claude Code de subagent:

```markdown
---
name: code-reviewer
description: Revisor de código sênior com foco em clean code, DRY, SOLID e segurança
tools: Read, Grep, Glob, Bash
model: sonnet
---

<prompt do subagent baseado na persona existente>
```

**Arquivos a criar:**

| Arquivo | Base | Tools permitidos |
|---------|------|------------------|
| `.claude/agents/code-reviewer.md` | `personas/code-reviewer.md` | Read, Grep, Glob, Bash |
| `.claude/agents/security-auditor.md` | `personas/security-auditor.md` | Read, Grep, Glob, Bash |
| `.claude/agents/test-engineer.md` | `personas/test-engineer.md` | Read, Grep, Glob, Bash, Edit, Write |
| `.claude/agents/orchestrator.md` | `skills/09-orchestrator/SKILL.md` (resumo) | todas |
| `.claude/agents/debugger.md` | novo (inspirado no rtk) | Read, Grep, Glob, Bash, Edit |

### 1.2 Registrar agents no `plugin.json`

Adicionar campo `agents`:

```json
{
  "agents": [
    ".claude/agents/code-reviewer.md",
    ".claude/agents/security-auditor.md",
    ".claude/agents/test-engineer.md",
    ".claude/agents/orchestrator.md",
    ".claude/agents/debugger.md"
  ]
}
```

### 1.3 Atualizar `install.sh` para copiar agents

No bloco que copia `.claude/commands/`, adicionar cópia similar para `.claude/agents/`:

```bash
# Copy .claude/agents/ to consumer repo's .claude/agents/
if [[ -d "$SCRIPT_DIR/.claude/agents" ]]; then
  mkdir -p "$TARGET_DIR/.claude/agents"
  for agent_file in "$SCRIPT_DIR"/.claude/agents/*.md; do
    [[ -f "$agent_file" ]] || continue
    safe_copy_file "$agent_file" "$TARGET_DIR/.claude/agents/$(basename "$agent_file")"
  done
  ok "Copied subagents to .claude/agents/"
fi
```

### 1.4 Hook PostToolUse: `session-event-logger.mjs`

Grava cada tool call em `.auto/events.jsonl` (append-only).

**Localização:** `hooks/scripts/session-event-logger.mjs`

**Formato do evento:**

```json
{"ts":"2026-04-17T14:23:11Z","tool":"Read","args":{"file_path":"src/foo.ts"},"status":"ok","duration_ms":12,"bytes_out":842}
{"ts":"2026-04-17T14:23:15Z","tool":"Bash","args":{"command":"npm test"},"status":"error","duration_ms":3420,"error":"1 test failed"}
```

**Lógica:**
- Ler stdin (payload do hook Claude Code)
- Extrair `tool_name`, `tool_input`, `tool_response.output`, `tool_response.error`
- Normalizar args (hash de paths absolutos, truncar strings > 200 chars)
- Append a `.auto/events.jsonl`
- Rotacionar se > 10 MB (mover para `.auto/events.YYYY-MM-DD.jsonl`)

### 1.5 Registrar hook em `hooks/hooks.json`

```json
{
  "PostToolUse": [
    { "matcher": ".*", "command": "node hooks/scripts/session-event-logger.mjs" }
  ]
}
```

Adicionar ao profile `standard` e `strict`; desabilitado em `minimal`.

### 1.6 Adicionar `.auto/events.jsonl*` ao `.gitignore`

Já coberto pelo `.auto/` existente.

---

## Fase 2 — 3 novas MCP tools

### 2.1 `devkit_compress_output`

**Propósito:** Comprimir output verboso antes de passar ao modelo.

**Input:**
```typescript
{
  text: string,           // texto bruto (output de bash, log, etc.)
  hint?: string,          // "git log" | "npm install" | "generic"
  max_lines?: number,     // default 40
  strategy?: "head" | "tail" | "head_tail"  // default "head_tail"
}
```

**Output:**
```typescript
{
  compressed: string,
  original_bytes: number,
  compressed_bytes: number,
  reduction_pct: number,
  dropped_lines: number
}
```

**Implementação (Node.js, sem deps):**
1. Strip ANSI codes (`\x1b\[[0-9;]*m`)
2. Dedup linhas adjacentes iguais → `[×N]`
3. Colapsar ≥5 linhas de listagem no mesmo diretório → `dir/  N files`
4. Truncar por estratégia:
   - `head`: primeiras N linhas
   - `tail`: últimas N linhas
   - `head_tail`: N/2 do topo + N/2 do final + `[... X lines dropped ...]`
5. Por hint:
   - `git log` → manter linhas com `commit`, `Author`, dropar `diff`
   - `npm install` → dropar linhas `added`/`resolved`, manter `WARN`/`ERR`
   - `test` → manter linhas com `FAIL`, `PASS`, counts, dropar traços de progresso

**Arquivo:** `mcp-server/src/lib/output-compressor.ts`

### 2.2 `devkit_session_events`

**Propósito:** Ler/filtrar eventos do JSONL da sessão atual.

**Input:**
```typescript
{
  project_path?: string,
  filter?: {
    tool?: string,              // ex: "Read" | "Bash"
    status?: "ok" | "error",
    since?: string,             // ISO timestamp
    limit?: number              // default 50
  }
}
```

**Output:**
```typescript
{
  events: Array<{ts, tool, args, status, ...}>,
  total: number,
  session_start: string,
  session_end: string | null
}
```

**Arquivo:** `mcp-server/src/lib/event-log.ts`

### 2.3 `devkit_seen_files` + `devkit_seen_errors`

Dois tools separados, ambos consultando `events.jsonl`:

**`devkit_seen_files`:**
- Lê todos eventos `tool ∈ {Read, Edit, Write, Glob}`
- Dedupa por `file_path`
- Retorna: `[{ path, first_seen_ts, last_seen_ts, access_count, modified: bool }]`

**`devkit_seen_errors`:**
- Lê todos eventos com `status: "error"`
- Agrupa por hash de erro normalizado (mesmo padrão do auto-loop)
- Retorna: `[{ error_hash, sample: string, count, tools: string[], first_seen, last_seen }]`

**Arquivo:** `mcp-server/src/lib/event-log.ts` (mesmas queries, tools separados)

### 2.4 Registrar no `mcp-server/src/index.ts`

Adicionar 3 novos `server.registerTool(...)` blocks seguindo o padrão dos existentes.

### 2.5 Atualizar contagem de tools

- README.md: 32 tools → **35 tools**
- `mcp-server/package.json` description: atualizar
- `scripts/check-consistency.mjs`: atualizar assertions
- CHANGELOG.md: entrada em Unreleased

---

## Fase 3 — Melhorias incrementais

### 3.1 `devkit_smart_suggestions` v2

Adicionar análise de `events.jsonl`:

- Se muitos `Read` em arquivos de `src/auth/` mas nenhum `Edit` em `tests/auth/` → sugerir `test-engineer` subagent
- Se erros repetidos do mesmo tipo → sugerir `debugger` subagent
- Se muitos `Bash` com `git` mas nenhum commit → sugerir `/ship`
- Se arquivos `.md` sendo editados → sugerir `documenter` skill

**Arquivo:** `mcp-server/src/lib/suggestions-engine.ts` (novo)

### 3.2 `devkit_context_guard` v2

Hoje requer `input_tokens` manual. Mudar para:

- Opcional: se `input_tokens` não vier, tenta ler de `.auto/session.json` (gravado pelo hook)
- Adicionar saída `suggested_action`: `["compact_now", "save_context", "spawn_subagent_for_heavy_work"]`

### 3.3 Hook `session-start.mjs` alimenta auto o `context_guard`

No SessionStart, escrever timestamp e reset do counter. PostToolUse incrementa contador de tokens estimados. `devkit_context_guard` lê isso.

---

## Fase 4 — Documentação + CI

### 4.1 Atualizar docs

| Arquivo | Mudança |
|---------|---------|
| `README.md` | Tabela de 35 tools; seção de subagents com exemplos; link para hooks/session-event-logger |
| `AGENTS.md` | Listar subagents disponíveis |
| `docs/skill-guides/skill-discovery.md` | Decision tree inclui `Task ...` → "use subagent X" |
| `CHANGELOG.md` | Entrada Unreleased detalhada |
| `CONTRIBUTING.md` | Seção "Adicionando subagent" |
| `docs/skill-guides/` | Novo: `subagents.md` com quando usar cada um |

### 4.2 Atualizar CI `.github/workflows/validate-plugin.yml`

- Validar que cada arquivo em `agents` array existe
- Validar frontmatter de cada `.claude/agents/*.md` (tem `name`, `description`, `tools`)
- `node --check` para `session-event-logger.mjs` e `output-compressor.ts` compilado

### 4.3 Atualizar `check-consistency.mjs`

- Contagem de tools: 32 → 35
- Contagem de agents: 0 → 5
- Verificar sincronia entre plugin.json e `.claude/agents/*.md`

---

## Fase 5 — Testes

### 5.1 Testes unitários (sem framework, scripts de smoke)

| Teste | Arquivo |
|-------|---------|
| Compressor: ANSI strip, dedup, truncação | `scripts/test-compressor.mjs` |
| Event log: append, filter, rotate | `scripts/test-event-log.mjs` |
| Seen files/errors: dedup por hash | `scripts/test-seen-queries.mjs` |

### 5.2 Smoke test end-to-end

Estender `scripts/smoke-install.sh`:
- Verificar que `.claude/agents/` foi copiado
- Verificar que hook PostToolUse está registrado
- Rodar MCP em modo dry-run e chamar as 3 novas tools

---

## Fase 6 — Opcional (backlog)

### 6.1 Integração com squeez/rtk externamente

Documentar em `patterns/ai-integration/token-optimization.md`:
- Como instalar squeez no repo consumidor
- Como configurar para coexistir com nossos hooks
- Tabela comparativa: quando usar squeez vs nosso compressor

### 6.2 `/worktree` slash command

Baseado no rtk: cria worktree isolado, copia `.env*`, roda lint/test em background.
Arquivo: `.claude/commands/worktree.md`

### 6.3 Hook integrity verification

SHA-256 check dos hooks no `install.sh`. Baseado no `rtk verify`.
Arquivo: `hooks/scripts/verify-integrity.mjs`

---

## Ordem de implementação recomendada

```
Dia 1: Fase 1.1 + 1.2 + 1.3 (subagents + install.sh)       [2h]
Dia 1: Fase 1.4 + 1.5 + 1.6 (event logger hook)             [2h]
Dia 2: Fase 2.1 (compressor)                                 [3h]
Dia 2: Fase 2.2 + 2.3 (event queries + seen_*)               [2h]
Dia 2: Fase 2.4 + 2.5 (registrar + docs básicas)             [1h]
Dia 3: Fase 3 (melhorias incrementais)                       [3h]
Dia 3: Fase 4 (docs + CI)                                    [2h]
Dia 3: Fase 5 (testes)                                       [2h]
```

**Total estimado:** ~17h de implementação.  
**Dividível em PRs:** Fase 1 | Fase 2 | Fase 3+4+5 (3 PRs ou 1 grande)

---

## Métricas de sucesso

- [x] 5 subagents invocáveis via `Task` tool no Claude Code
- [x] `.auto/events.jsonl` gerado automaticamente em cada sessão
- [x] `devkit_compress_output` reduz output de `npm install` em ≥ 70%
- [x] `devkit_seen_files` retorna lista correta após 10+ reads
- [x] `devkit_seen_errors` agrupa erros iguais com dedup MD5
- [x] CI valida estrutura de agents
- [x] `check-consistency.mjs` passa com 36 tools + 5 agents (36 > 35 previsto — 4 tools vs 3 pois context_guard e smart_suggestions também foram atualizados)
- [x] Smoke install copia agents corretamente
- [x] README documenta cada subagent com caso de uso

---

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| PostToolUse hook lento impacta UX | Async write + timeout 100ms + fallback silencioso |
| `events.jsonl` cresce indefinidamente | Rotação diária + cap de 10 MB |
| Compressor pode cortar info crítica | Sempre retornar `dropped_lines` count + flag `--no-squeez` equivalente via hint "raw" |
| Subagents com prompts muito grandes | Cap em 2k chars por agent, referenciar personas/skills em vez de duplicar |
| Breaking change no plugin.json schema | Manter `commands` e adicionar `agents` separadamente (não substituir) |

---

## Arquivos afetados (resumo)

**Criados:**
- `.claude/agents/code-reviewer.md`
- `.claude/agents/security-auditor.md`
- `.claude/agents/test-engineer.md`
- `.claude/agents/orchestrator.md`
- `.claude/agents/debugger.md`
- `hooks/scripts/session-event-logger.mjs`
- `mcp-server/src/lib/output-compressor.ts`
- `mcp-server/src/lib/event-log.ts`
- `mcp-server/src/lib/suggestions-engine.ts`
- `docs/skill-guides/subagents.md`
- `scripts/test-compressor.mjs`
- `scripts/test-event-log.mjs`
- `scripts/test-seen-queries.mjs`

**Modificados:**
- `.claude-plugin/plugin.json` (adicionar `agents`)
- `setup/install.sh` (copiar agents)
- `hooks/hooks.json` (registrar PostToolUse)
- `hooks/config.json` (profiles)
- `mcp-server/src/index.ts` (3 novos tools)
- `mcp-server/package.json` (description)
- `README.md` (tabela de tools + subagents section)
- `AGENTS.md` (lista de subagents)
- `CHANGELOG.md` (Unreleased)
- `CONTRIBUTING.md` (como adicionar subagent)
- `scripts/check-consistency.mjs` (35 tools + 5 agents)
- `.github/workflows/validate-plugin.yml` (validar agents)
- `scripts/smoke-install.sh` (verificar agents)

---

## Decisões de design

1. **Subagents como `.md` com frontmatter** (padrão Claude Code) ao invés de reutilizar personas/ diretamente — permite `tools:` restrictivos por agent
2. **JSONL para event log** ao invés de SQLite — portável, grep-able, sem deps
3. **Compressor em TypeScript** dentro do MCP ao invés de binário externo — zero install, integração direta
4. **Dedup por MD5 normalizado** (reusar lógica do auto-loop.mjs) ao invés de MinHash — suficiente e 10x mais simples
5. **Subagents em `.claude/agents/`** seguindo convenção do rtk ao invés de pasta própria — compatibilidade com Task tool nativa
6. **Não duplicar conteúdo** entre `personas/` e `.claude/agents/` — agents referenciam personas via link relativo
