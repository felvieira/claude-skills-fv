# Token Efficiency Tooling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate 3 external code intelligence tools (codebase-memory-mcp, cymbal, ory/lumen) with automatic detection and enforcement via hooks, plus split repo-audit into dynamic focused files.

**Architecture:** Lightweight detection via `.bot/.env.tools` file read by expanded `pre-tool-enforcer.mjs`. New `policies/code-exploration.md` defines 4-level hierarchy. Repo Auditor skill 18 gains output split logic for dynamic file generation. Install.sh gains optional Step 8.

**Tech Stack:** Node.js (.mjs hooks), Bash (install.sh), Markdown (policies/skills)

**Spec:** `docs/superpowers/specs/2026-04-03-token-efficiency-tooling-design.md`

---

### Task 1: Create policies/code-exploration.md

**Files:**
- Create: `policies/code-exploration.md`

- [ ] **Step 1: Create the policy file**

```markdown
# Code Exploration Policy

## Objetivo
Reduzir consumo de tokens na exploracao de codigo priorizando ferramentas de code intelligence sobre leitura bruta de arquivos.

## Hierarquia de Preferencia

Sempre tente o nivel mais alto disponivel primeiro. So descer de nivel quando o anterior nao esta disponivel ou nao resolveu.

### Nivel 1 — Graph (estrutural)
Ferramenta: **codebase-memory-mcp**
- `search_graph`: busca por funcoes, classes, tipos no grafo AST
- `trace_call_path`: quem chama X e o que X chama (call chain)
- `get_architecture`: visao geral — linguagens, pacotes, entry points, rotas, hotspots

Quando usar: entender estrutura do repo, call paths, impacto de mudancas, dependencias entre modulos.

### Nivel 2 — Symbol (tatico)
Ferramenta: **cymbal**
- `cymbal investigate <symbol>`: source + callers + impacto (substitui 15-20 tool calls)
- `cymbal structure`: entry points, hotspots, pacotes mais importados
- `cymbal impact <symbol>`: o que quebra se X mudar
- `cymbal trace <symbol>`: call graph descendente

Quando usar: lookup rapido de simbolo especifico, analise de impacto pontual, diff scoped.

### Nivel 3 — Semantic (por intent)
Ferramenta: **ory/lumen**
- `semantic_search`: busca por significado, nao por texto literal

Quando usar: encontrar codigo por descricao ("authentication flow", "rate limiting logic"), quando nao se sabe o nome exato do simbolo.

### Nivel 4 — Bruto (fallback)
Ferramentas nativas: **Grep, Glob, Read**

Quando usar: apenas quando niveis 1-3 nao estao disponíveis ou nao resolveram.

## Regras

1. Nunca ler arquivo inteiro para entender estrutura — use `get_architecture` ou `cymbal structure`
2. Nunca grep por nome de funcao para achar callers — use `trace_call_path` ou `cymbal impact`
3. Nunca varrer diretorio inteiro para mapear componentes — use `search_graph` com filtro de tipo
4. Se nenhuma ferramenta externa esta instalada, esta policy nao muda nada — fallback normal
5. Em caso de duvida sobre qual nivel usar, comece pelo mais alto disponivel

## Exemplos

| Tarefa | Sem policy | Com policy |
|---|---|---|
| Quem chama essa funcao? | Grep → Read 5 arquivos → Grep | `trace_call_path` (1 call) |
| Como o repo esta organizado? | Glob → Read 10 arquivos | `get_architecture` (1 call) |
| Onde implementa autenticacao? | Grep "auth" → Read 8 matches | `semantic_search("authentication flow")` |
| Impacto de mudar X? | Manual, incompleto | `cymbal impact X` (1 call) |
| Achar funcao mas nao sabe o nome? | Grep tentativa-e-erro | `semantic_search("description")` |

## Deteccao de Disponibilidade

O arquivo `.bot/.env.tools` indica quais ferramentas estao instaladas. Gerado pelo `setup/install.sh`.

Em Claude Code, o hook `pre-tool-enforcer.mjs` detecta automaticamente e sugere a ferramenta correta quando o agente tenta usar Grep/Read/Glob.
```

- [ ] **Step 2: Commit**

```bash
git add policies/code-exploration.md
git commit -m "feat: add code exploration policy — 4-level tool hierarchy"
```

---

### Task 2: Expand hooks/config.json with code_exploration section

**Files:**
- Modify: `hooks/config.json`

- [ ] **Step 1: Add code_exploration section to config.json**

The current file has 3 sections (context_guard, pre_execution_gate, keyword_detector). Add `code_exploration` as 4th section.

Replace the entire file with:

```json
{
  "context_guard": {
    "warn_threshold": 0.60,
    "block_threshold": 0.75,
    "max_blocks_per_session": 2
  },
  "pre_execution_gate": {
    "enrich_threshold": 0.40,
    "block_threshold": 0.70,
    "max_guided_questions": 2
  },
  "keyword_detector": {
    "max_learned_skills_per_session": 3,
    "informational_context_window": 80
  },
  "code_exploration": {
    "suggest_on_tools": ["Read", "Grep", "Glob"],
    "min_suggestions_interval_ms": 30000,
    "env_file": ".bot/.env.tools"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/config.json
git commit -m "feat: add code_exploration section to hooks config"
```

---

### Task 3: Expand pre-tool-enforcer.mjs with code intelligence detection

**Files:**
- Modify: `hooks/scripts/pre-tool-enforcer.mjs`

- [ ] **Step 1: Rewrite pre-tool-enforcer.mjs with tool detection**

Replace the entire file with:

```javascript
#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const WRITE_TOOLS = ['Edit', 'Write', 'NotebookEdit', 'mcp__Desktop_Commander__write_file', 'mcp__Desktop_Commander__edit_block'];
const EXPLORE_TOOLS = ['Read', 'Grep', 'Glob'];

// --- Tool availability detection (cached per invocation) ---
let _toolsEnv = null;
function getAvailableTools() {
  if (_toolsEnv !== null) return _toolsEnv;
  _toolsEnv = {};
  try {
    const envPath = join(process.cwd(), '.bot', '.env.tools');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, val] = trimmed.split('=');
      if (key && val) _toolsEnv[key.trim()] = val.trim();
    }
  } catch {
    // .env.tools not found — no external tools available
  }
  return _toolsEnv;
}

// --- Suggestion anti-spam ---
let _lastSuggestionFile = null;
function getLastSuggestionTime() {
  if (_lastSuggestionFile !== null) return _lastSuggestionFile;
  try {
    const statePath = join(process.cwd(), '.bot', '.hook-session.json');
    const session = JSON.parse(readFileSync(statePath, 'utf-8'));
    _lastSuggestionFile = session.last_explore_suggestion_ms || 0;
  } catch {
    _lastSuggestionFile = 0;
  }
  return _lastSuggestionFile;
}

// --- Config ---
let _config = null;
function getConfig() {
  if (_config !== null) return _config;
  try {
    const configPath = join(process.cwd(), '.bot', 'hooks', 'config.json');
    const full = JSON.parse(readFileSync(configPath, 'utf-8'));
    _config = full.code_exploration || {};
  } catch {
    _config = {};
  }
  return _config;
}

// --- Build suggestion message ---
function buildSuggestion() {
  const env = getAvailableTools();
  const lines = [];

  if (env.CODEBASE_MEMORY_AVAILABLE === '1') {
    lines.push('- search_graph / trace_call_path / get_architecture (codebase-memory): busca estrutural no grafo AST');
  }
  if (env.CYMBAL_AVAILABLE === '1') {
    lines.push('- cymbal investigate <symbol> / cymbal structure / cymbal impact <symbol>: symbol navigation rapido');
  }
  if (env.LUMEN_AVAILABLE === '1') {
    lines.push('- semantic_search (lumen): busca por significado, nao por texto literal');
  }

  if (lines.length === 0) return null;

  return `[Code Exploration] Prefira ferramentas de code intelligence antes de Grep/Read bruto:\n${lines.join('\n')}\nUse Grep/Read apenas como fallback. Ver policies/code-exploration.md.`;
}

// --- Main ---
let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(_input);
  } catch {
    if (!_input.trim()) {
      process.stderr.write('[PreToolUse] Empty stdin received — passing through\n');
    }
  }
  const toolName = input.tool_name || '';

  // --- Write tool: Context Decay Awareness ---
  if (WRITE_TOOLS.includes(toolName)) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        additionalContext: `[PreToolUse] About to write. GLOBAL.md Context Decay Awareness: if this session has 10+ messages, re-read the target file before editing to avoid stale-state regressions.`
      }
    }));
    return;
  }

  // --- Explore tool: Code Intelligence suggestion ---
  const config = getConfig();
  const suggestTools = config.suggest_on_tools || EXPLORE_TOOLS;

  if (suggestTools.includes(toolName)) {
    const interval = config.min_suggestions_interval_ms || 30000;
    const lastTime = getLastSuggestionTime();
    const now = Date.now();

    if (now - lastTime >= interval) {
      const suggestion = buildSuggestion();
      if (suggestion) {
        // Update last suggestion time in session file
        try {
          const statePath = join(process.cwd(), '.bot', '.hook-session.json');
          let session = {};
          try { session = JSON.parse(readFileSync(statePath, 'utf-8')); } catch { /* new file */ }
          session.last_explore_suggestion_ms = now;
          writeFileSync(statePath, JSON.stringify(session, null, 2));
        } catch (err) {
          process.stderr.write(`[PreToolUse] Failed to update session: ${err.message}\n`);
        }

        process.stdout.write(JSON.stringify({
          continue: true,
          hookSpecificOutput: { additionalContext: suggestion }
        }));
        return;
      }
    }
  }

  // --- Default: pass through ---
  process.stdout.write(JSON.stringify({ continue: true }));
});
```

**Note:** This script uses ESM imports. The `.mjs` extension ensures Node.js runs it as ESM natively.

- [ ] **Step 2: Verify script runs without error**

```bash
echo '{"tool_name":"Grep"}' | node hooks/scripts/pre-tool-enforcer.mjs
```

Expected: `{"continue":true}` (no .env.tools yet, so no suggestion)

- [ ] **Step 3: Commit**

```bash
git add hooks/scripts/pre-tool-enforcer.mjs
git commit -m "feat: expand pre-tool-enforcer with code intelligence detection and anti-spam"
```

---

### Task 4: Expand setup/install.sh with Step 8 (optional tools)

**Files:**
- Modify: `setup/install.sh`

- [ ] **Step 1: Add Step 8 before the summary section**

Insert the following block between the `.gitignore` step and the `--- Summary ---` section (after line 425, before line 427):

```bash

# ---------------------------------------------------------------------------
# Step 8: Code Intelligence Tools (optional)
# ---------------------------------------------------------------------------
step "Step 8: Code Intelligence Tools (optional)"
echo ""
echo "  Estas ferramentas reduzem drasticamente o uso de tokens na exploracao de codigo."
echo "  Todas sao opcionais. Enter pula."
echo ""

ENV_TOOLS_FILE="$TARGET_DIR/.bot/.env.tools"
cat > "$ENV_TOOLS_FILE" <<'ENVEOF'
# Gerado por setup/install.sh — nao editar manualmente
# Ferramentas de code intelligence detectadas
ENVEOF

# --- 1/3: codebase-memory-mcp ---
CODEBASE_MEMORY_AVAILABLE=0
if command -v codebase-memory-mcp &>/dev/null; then
  ok "codebase-memory-mcp ja instalado"
  CODEBASE_MEMORY_AVAILABLE=1
else
  printf "  [1/3] codebase-memory-mcp (knowledge graph AST, 66 linguagens)\n"
  printf "        Instalar? [s/N] "
  read -r INSTALL_CBM
  if [[ "$INSTALL_CBM" =~ ^[sS]$ ]]; then
    echo "  Instalando codebase-memory-mcp..."
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
      # Windows: PowerShell install
      if powershell -Command "irm https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.ps1 | iex" 2>/dev/null; then
        CODEBASE_MEMORY_AVAILABLE=1
        ok "codebase-memory-mcp instalado"
      else
        warn "Falha na instalacao. Instale manualmente: https://github.com/DeusData/codebase-memory-mcp"
      fi
    else
      # Linux/Mac: bash install
      if curl -sSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash 2>/dev/null; then
        CODEBASE_MEMORY_AVAILABLE=1
        ok "codebase-memory-mcp instalado"
      else
        warn "Falha na instalacao. Instale manualmente: https://github.com/DeusData/codebase-memory-mcp"
      fi
    fi
  fi
fi

# Register codebase-memory-mcp as MCP server if installed
if [[ "$CODEBASE_MEMORY_AVAILABLE" == 1 ]]; then
  # Register in .claude/settings.json
  CLAUDE_SETTINGS="$TARGET_DIR/.claude/settings.json"
  if [[ -f "$CLAUDE_SETTINGS" ]]; then
    node -e "
      const fs = require('fs');
      const s = JSON.parse(fs.readFileSync('$CLAUDE_SETTINGS','utf-8'));
      if (!s.mcpServers) s.mcpServers = {};
      if (!s.mcpServers['codebase-memory']) {
        s.mcpServers['codebase-memory'] = {
          command: 'codebase-memory-mcp',
          args: ['--project-root', '.']
        };
      }
      fs.writeFileSync('$CLAUDE_SETTINGS', JSON.stringify(s, null, 2));
    " 2>/dev/null && ok "codebase-memory registrado em .claude/settings.json"
  fi
fi

# --- 2/3: cymbal ---
CYMBAL_AVAILABLE=0
if command -v cymbal &>/dev/null; then
  ok "cymbal ja instalado"
  CYMBAL_AVAILABLE=1
elif command -v docker &>/dev/null && docker image inspect 1broseidon/cymbal &>/dev/null 2>&1; then
  ok "cymbal (Docker) ja disponivel"
  CYMBAL_AVAILABLE=1
else
  printf "  [2/3] cymbal (symbol navigator CLI, 24 linguagens)\n"
  printf "        Instalar via Docker? [s/N] "
  read -r INSTALL_CYMBAL
  if [[ "$INSTALL_CYMBAL" =~ ^[sS]$ ]]; then
    if command -v docker &>/dev/null; then
      echo "  Baixando cymbal via Docker..."
      if docker pull 1broseidon/cymbal 2>/dev/null; then
        CYMBAL_AVAILABLE=1
        ok "cymbal instalado via Docker"
        echo "  Uso: docker run --rm -v \"\$(pwd):/repo\" 1broseidon/cymbal investigate <symbol>"
      else
        warn "Falha no docker pull. Instale manualmente: https://github.com/1broseidon/cymbal"
      fi
    elif command -v go &>/dev/null; then
      echo "  Docker nao encontrado. Tentando go install..."
      if go install github.com/1broseidon/cymbal@latest 2>/dev/null; then
        CYMBAL_AVAILABLE=1
        ok "cymbal instalado via go install"
      else
        warn "Falha no go install. Instale manualmente: https://github.com/1broseidon/cymbal"
      fi
    else
      warn "Docker e Go nao encontrados. Instale manualmente: https://github.com/1broseidon/cymbal"
    fi
  fi
fi

# --- 3/3: ory/lumen ---
LUMEN_AVAILABLE=0
if claude plugin list 2>/dev/null | grep -q "lumen"; then
  ok "ory/lumen ja instalado"
  LUMEN_AVAILABLE=1
else
  printf "  [3/3] ory/lumen (busca semantica local, requer Ollama)\n"
  printf "        Instalar como Claude plugin? [s/N] "
  read -r INSTALL_LUMEN
  if [[ "$INSTALL_LUMEN" =~ ^[sS]$ ]]; then
    if command -v claude &>/dev/null; then
      echo "  Instalando lumen plugin..."
      if claude plugin add ory/lumen 2>/dev/null; then
        LUMEN_AVAILABLE=1
        ok "ory/lumen instalado"
      else
        warn "Falha na instalacao. Instale manualmente: claude plugin add ory/lumen"
      fi
    else
      warn "Claude CLI nao encontrado. Instale manualmente: claude plugin add ory/lumen"
    fi
  fi
fi

# --- Write .env.tools ---
echo "CODEBASE_MEMORY_AVAILABLE=$CODEBASE_MEMORY_AVAILABLE" >> "$ENV_TOOLS_FILE"
echo "CYMBAL_AVAILABLE=$CYMBAL_AVAILABLE" >> "$ENV_TOOLS_FILE"
echo "LUMEN_AVAILABLE=$LUMEN_AVAILABLE" >> "$ENV_TOOLS_FILE"
ok "Disponibilidade registrada em .bot/.env.tools"

# Show tool summary
TOOLS_INSTALLED=0
[[ "$CODEBASE_MEMORY_AVAILABLE" == 1 ]] && ((TOOLS_INSTALLED++))
[[ "$CYMBAL_AVAILABLE" == 1 ]] && ((TOOLS_INSTALLED++))
[[ "$LUMEN_AVAILABLE" == 1 ]] && ((TOOLS_INSTALLED++))

if [[ "$TOOLS_INSTALLED" -gt 0 ]]; then
  echo ""
  echo "  ${GREEN}$TOOLS_INSTALLED ferramenta(s) de code intelligence ativa(s).${RESET}"
  echo "  O hook pre-tool-enforcer vai sugerir automaticamente quando apropriado."
else
  echo ""
  echo "  Nenhuma ferramenta instalada. O kit funciona normalmente sem elas."
fi
echo ""
```

- [ ] **Step 2: Update the step counter in the summary**

Change `"Step 7/7: Finishing up"` to `"Step 7/8: Finishing up"` and add the Step 8 reference. Also update any `step` call counts if they exist as numbered references.

- [ ] **Step 3: Commit**

```bash
git add setup/install.sh
git commit -m "feat: add Step 8 to install.sh — optional code intelligence tools"
```

---

### Task 5: Expand policies/hooks.md with Code Exploration section

**Files:**
- Modify: `policies/hooks.md`

- [ ] **Step 1: Append Code Exploration section**

Add at the end of `policies/hooks.md` (after line 65):

```markdown

## Code Exploration

Quando ferramentas de code intelligence estiverem disponiveis, preferir na seguinte ordem:

1. **Graph** (codebase-memory): `search_graph`, `trace_call_path`, `get_architecture`
2. **Symbol** (cymbal): `investigate`, `structure`, `impact`, `trace`
3. **Semantic** (lumen): `semantic_search`
4. **Bruto** (Grep/Glob/Read): apenas como fallback

Nunca ler arquivo inteiro para entender estrutura. Nunca grep por nome de funcao para achar callers.

Se nenhuma ferramenta externa esta instalada, explorar normalmente com Grep/Glob/Read.

Ver `policies/code-exploration.md` para regras completas e exemplos.

Em Claude Code: `pre-tool-enforcer.mjs` sugere a ferramenta correta automaticamente.
```

- [ ] **Step 2: Commit**

```bash
git add policies/hooks.md
git commit -m "feat: add Code Exploration section to hooks policy"
```

---

### Task 6: Add reference in GLOBAL.md

**Files:**
- Modify: `GLOBAL.md`

- [ ] **Step 1: Add code exploration line to Defaults Globais**

In `GLOBAL.md`, after line 15 (`- Seguir policies/cost-optimization.md...`), add:

```
- Preferir ferramentas de code intelligence (graph, symbol, semantic) sobre Grep/Read bruto — ver `policies/code-exploration.md`
```

- [ ] **Step 2: Commit**

```bash
git add GLOBAL.md
git commit -m "feat: add code exploration reference to GLOBAL.md defaults"
```

---

### Task 7: Expand skills/18-repo-auditor/SKILL.md with Output Split

**Files:**
- Modify: `skills/18-repo-auditor/SKILL.md`

- [ ] **Step 1: Add Output Split section**

Insert after "## Arquivo de Persistencia" section (after line 60), before "## Quando Reauditar":

```markdown

## Output Split

Ao auditar, gerar arquivos focados por tipo alem do `current.md`. Decidir quais gerar baseado no que o repo contem — nao gerar arquivos vazios.

### Catalogo de Splits

| Arquivo | Gerar quando detectar | Conteudo |
|---|---|---|
| `current.md` | **sempre** | Indice enxuto: stack, convencoes, riscos, gaps. Aponta para splits: `Ver routes.md para endpoints` |
| `routes.md` | API routes (Express, Fastify, Next API, Django urls, Flask, etc.) | Endpoints por recurso, metodos HTTP, middlewares, auth |
| `schema.md` | ORM/schema (Prisma, Drizzle, TypeORM, Sequelize, migrations) | Models, campos-chave, relacoes FK, enums |
| `components.md` | Framework de componentes (React, Vue, Svelte, Angular) | Arvore por feature, props, client/server, lazy |
| `services.md` | Camada de servicos/usecases (classes com patterns service/usecase) | Servicos, dependencias, metodos publicos |
| `infra.md` | Docker, CI/CD, Terraform, k8s, serverless | Containers, pipelines, environments, secrets ref |

### Regras do Split

1. **current.md nunca duplica conteudo dos splits** — apenas referencia com ponteiro
2. **Cada split cabe em ~200 linhas** — se passar, resumir mais agressivamente
3. **Notacao compacta** — usar `fn nome(args): tipo`, `[auth,db]` pra tags, `(c)` pra client components
4. **Geracao incremental** — so re-gerar split se arquivos relevantes mudaram (verificar via git diff)
5. **Path dos splits** — mesmo diretorio do `current.md` (`docs/repo-audit/` ou `.bot/docs/repo-audit/`)

### Deteccao

Para decidir quais splits gerar, verificar:
- `routes.md`: existencia de `app.get/post/put/delete`, `router.`, `@Get/@Post`, `urlpatterns`, `api/` dir com handlers
- `schema.md`: existencia de `schema.prisma`, `*.entity.ts`, `models.py`, diretorio `migrations/`
- `components.md`: existencia de `.tsx`/`.vue`/`.svelte` em `src/components/` ou `app/`
- `services.md`: existencia de `*Service.ts`, `*UseCase.ts`, `services/` dir, `usecases/` dir
- `infra.md`: existencia de `Dockerfile`, `.github/workflows/`, `terraform/`, `k8s/`, `docker-compose`
```

- [ ] **Step 2: Update Arquivo de Persistencia section**

Replace lines 54-60 with:

```markdown
## Arquivo de Persistencia

Persistir em `docs/repo-audit/current.md` (indice) e splits dinamicos no mesmo diretorio.

Se o kit estiver instalado em `.bot/`, persistir em `.bot/docs/repo-audit/`.

Se houver reauditoria relevante, arquivar snapshots curtos em `docs/repo-audit/history/`.
```

- [ ] **Step 3: Update Evidencia de Conclusao section**

Replace lines 88-93 with:

```markdown
## Evidencia de Conclusao

- `docs/repo-audit/current.md` criado ou atualizado (indice enxuto)
- splits relevantes gerados (`routes.md`, `schema.md`, etc.) conforme deteccao
- stack e convencoes reais mapeadas
- riscos e gaps principais registrados
```

- [ ] **Step 4: Commit**

```bash
git add skills/18-repo-auditor/SKILL.md
git commit -m "feat: add output split to repo auditor — dynamic focused files"
```

---

### Task 8: Update README.md with Code Intelligence section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add new section after Hook System**

Insert after line 75 (end of Hook System section), before "## O Que o Sistema Faz":

```markdown

## Ferramentas de Code Intelligence (Opcionais)

O kit detecta e recomenda automaticamente ferramentas que reduzem drasticamente o consumo de tokens na exploracao de codigo. O hook `pre-tool-enforcer` sugere a ferramenta correta quando o agente tenta usar Grep/Read/Glob.

| Ferramenta | Tipo | O que faz | Token savings | Licenca |
|---|---|---|---|---|
| [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | MCP server | Knowledge graph AST — call paths, architecture, 66 linguagens | ~120x | MIT |
| [cymbal](https://github.com/1broseidon/cymbal) | CLI | Symbol navigator — investigate, impact, structure, 24 linguagens | ~62-100% | MIT |
| [ory/lumen](https://github.com/ory/lumen) | Claude plugin | Busca semantica local via embeddings | ~26-39% | Apache 2.0 |

**Instalacao:** `setup/install.sh` Step 8 (opcional) ou manual.
**Hierarquia:** Graph > Symbol > Semantic > Grep/Read — ver `policies/code-exploration.md`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "feat: add Code Intelligence tools section to README"
```

---

### Task 9: Final push

**Files:** None (git only)

- [ ] **Step 1: Verify all files are committed**

```bash
git status
```

Expected: `nothing to commit, working tree clean`

- [ ] **Step 2: Push**

```bash
git push
```

- [ ] **Step 3: Verify MCP server still builds**

```bash
cd mcp-server && npm run build && cd ..
```

Expected: zero errors (no MCP changes in this plan)
