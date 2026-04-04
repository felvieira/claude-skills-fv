#!/usr/bin/env bash
# ============================================================================
# Dev Team Kit - Installer
# ============================================================================
# Installs the kit into a consumer repo and configures all platforms + MCPs.
#
# Usage:
#   bash setup/install.sh [target-dir]
#
# On Linux/macOS: chmod +x setup/install.sh
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
if [[ -t 1 ]]; then
  GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; RED=$'\033[0;31m'
  CYAN=$'\033[0;36m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  GREEN="" YELLOW="" RED="" CYAN="" BOLD="" RESET=""
fi

ok()   { printf " %s[OK]%s    %s\n" "$GREEN"  "$RESET" "$1"; }
warn() { printf " %s[WARN]%s  %s\n" "$YELLOW" "$RESET" "$1"; }
err()  { printf " %s[ERR]%s   %s\n" "$RED"    "$RESET" "$1"; }
info() { printf " %s[>]%s     %s\n" "$CYAN"   "$RESET" "$1"; }
step() { printf "\n%s==> %s%s\n" "$BOLD" "$1" "$RESET"; }

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------
SOURCE="${BASH_SOURCE[0]}"
while [[ -L "$SOURCE" ]]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")/.." && pwd)"

TARGET_DIR="${1:-.}"
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
BOT_DIR="$TARGET_DIR/.bot"

echo ""
echo "${BOLD}Dev Team Kit - Installer${RESET}"
echo "Kit:    $SCRIPT_DIR"
echo "Target: $TARGET_DIR"

# ---------------------------------------------------------------------------
# Step 1: Prerequisites
# ---------------------------------------------------------------------------
step "Step 1/8: Checking prerequisites"

HAS_NODE=false; HAS_PYTHON=false; HAS_UV=false; HAS_JQ=false
DETECTED_IDES=()

if command -v node &>/dev/null; then
  ok "Node.js $(node --version)"; HAS_NODE=true
else
  err "Node.js not found - required for MCP servers"
  err "Install: https://nodejs.org/"
  exit 1
fi

if command -v python3 &>/dev/null; then
  ok "Python 3 $(python3 --version 2>&1 | cut -d' ' -f2)"; HAS_PYTHON=true
elif command -v python &>/dev/null; then
  ok "Python $(python --version 2>&1 | cut -d' ' -f2)"; HAS_PYTHON=true
else
  warn "Python not found - optional MCPs (fetch, notebooklm) unavailable"
fi

if command -v uv &>/dev/null; then
  ok "uv $(uv --version 2>&1 | head -1)"; HAS_UV=true
else
  [[ "$HAS_PYTHON" == true ]] && warn "uv not found - notebooklm MCP unavailable (install: pip install uv)"
fi

command -v jq &>/dev/null && HAS_JQ=true

command -v claude &>/dev/null      && DETECTED_IDES+=("Claude Code")
command -v code &>/dev/null        && DETECTED_IDES+=("VS Code (Copilot)")
command -v windsurf &>/dev/null    && DETECTED_IDES+=("Windsurf")
command -v gemini &>/dev/null      && DETECTED_IDES+=("Gemini CLI")
command -v antigravity &>/dev/null && DETECTED_IDES+=("Antigravity")
command -v cursor &>/dev/null      && DETECTED_IDES+=("Cursor")

if [[ ${#DETECTED_IDES[@]} -gt 0 ]]; then
  ok "Detected: ${DETECTED_IDES[*]}"
else
  warn "No known IDEs/agents detected in PATH (configs will be generated anyway)"
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
safe_copy_file() {
  local src="$1" dest="$2"
  if [[ -f "$dest" ]]; then
    warn "Exists, skipping: $dest"
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  ok "Created: $dest"
}

safe_copy_dir() {
  local src="$1" dest="$2"
  mkdir -p "$dest"
  cp -r "$src"/. "$dest"/
  ok "Copied: $dest/"
}

register_claude_hooks() {
  local hooks_json="$BOT_DIR/hooks/hooks.json"
  local claude_cfg="$TARGET_DIR/.claude/settings.json"

  if [[ ! -f "$hooks_json" ]]; then
    return 0
  fi

  if [[ ! -f "$claude_cfg" ]]; then
    warn ".claude/settings.json not found - hooks not registered"
    return 0
  fi

  info "Registering hooks in .claude/settings.json..."
  node -e "
    const fs = require('fs');
    const hooksReg = JSON.parse(fs.readFileSync('$hooks_json', 'utf8'));
    const settings = JSON.parse(fs.readFileSync('$claude_cfg', 'utf8'));
    const hooks = settings.hooks || {};
    for (const [event, scripts] of Object.entries(hooksReg)) {
      hooks[event] = hooks[event] || [];
      for (const script of scripts) {
        const cmd = { type: 'command', command: 'node .bot/' + script };
        const exists = hooks[event].some((hook) => hook.command === cmd.command);
        if (!exists) hooks[event].push(cmd);
      }
    }
    settings.hooks = hooks;
    fs.writeFileSync('$claude_cfg', JSON.stringify(settings, null, 2) + '\n');
  " && ok "Hooks registered in .claude/settings.json" || warn "Failed to register hooks - add manually from .bot/hooks/hooks.json"
}

# ---------------------------------------------------------------------------
# Step 2: Copy kit to .bot/
# ---------------------------------------------------------------------------
step "Step 2/8: Copying kit to .bot/"

mkdir -p "$BOT_DIR"

for item in GLOBAL.md README.md VERSION; do
  [[ -f "$SCRIPT_DIR/$item" ]] && safe_copy_file "$SCRIPT_DIR/$item" "$BOT_DIR/$item"
done

for dir in policies templates skills patterns scripts docs commands evals setup mcp-server; do
  if [[ -d "$SCRIPT_DIR/$dir" ]]; then
    safe_copy_dir "$SCRIPT_DIR/$dir" "$BOT_DIR/$dir"
  fi
done

if [[ -d "$BOT_DIR/mcp-server" ]] && [[ -f "$BOT_DIR/mcp-server/package.json" ]]; then
  info "Building MCP server (npm install + tsc)..."
  (cd "$BOT_DIR/mcp-server" && npm install --silent && npm run build --silent) \
    && ok "MCP server built successfully" \
    || warn "MCP build failed - run manually: cd .bot/mcp-server && npm install && npm run build"
fi

# ---------------------------------------------------------------------------
# Step 2b: Install hooks + create learned-skills/
# ---------------------------------------------------------------------------
step "Step 2b/8: Installing hooks"

if [[ -d "$SCRIPT_DIR/hooks" ]]; then
  safe_copy_dir "$SCRIPT_DIR/hooks" "$BOT_DIR/hooks"
  ok "Copied hooks/ to .bot/hooks/"
fi

mkdir -p "$BOT_DIR/learned-skills"
ok "Created .bot/learned-skills/ (project-specific skill memory)"

# ---------------------------------------------------------------------------
# Step 3: Generate entry-point files
# ---------------------------------------------------------------------------
step "Step 3/8: Generating entry points"

for mapping in \
  "templates/CLAUDE-root.md:CLAUDE.md" \
  "templates/AGENTS-root.md:AGENTS.md" \
  "templates/GEMINI-root.md:GEMINI.md"; do
  src_rel="${mapping%%:*}"
  dest_name="${mapping##*:}"
  [[ -f "$SCRIPT_DIR/$src_rel" ]] && safe_copy_file "$SCRIPT_DIR/$src_rel" "$TARGET_DIR/$dest_name"
done

# ---------------------------------------------------------------------------
# Step 4: Generate platform configs
# ---------------------------------------------------------------------------
step "Step 4/8: Generating platform configs"

[[ -f "$SCRIPT_DIR/setup/configs/copilot-instructions.md" ]] && \
  safe_copy_file "$SCRIPT_DIR/setup/configs/copilot-instructions.md" "$TARGET_DIR/.github/copilot-instructions.md"

[[ -f "$SCRIPT_DIR/setup/configs/windsurf-rule.md" ]] && \
  safe_copy_file "$SCRIPT_DIR/setup/configs/windsurf-rule.md" "$TARGET_DIR/.windsurf/rules/dev-team-kit.md"

if [[ -d "$SCRIPT_DIR/skills" ]]; then
  AGENT_DIR="$TARGET_DIR/.agent/skills"
  mkdir -p "$AGENT_DIR"
  for skill_dir in "$SCRIPT_DIR"/skills/*/; do
    [[ -d "$skill_dir" ]] || continue
    skill_name="$(basename "$skill_dir")"
    if [[ ! -d "$AGENT_DIR/$skill_name" ]]; then
      cp -r "$skill_dir" "$AGENT_DIR/$skill_name"
    fi
  done
  ok "Copied skills to .agent/skills/ (Antigravity)"
fi

# ---------------------------------------------------------------------------
# Step 5: Configure MCPs for all platforms
# ---------------------------------------------------------------------------
step "Step 5/8: Configuring MCP servers"

MCP_TEMPLATE="$SCRIPT_DIR/setup/configs/claude-settings.json"

if [[ -f "$MCP_TEMPLATE" ]]; then
  CLAUDE_CFG="$TARGET_DIR/.claude/settings.json"
  mkdir -p "$TARGET_DIR/.claude"

  if [[ -f "$CLAUDE_CFG" ]]; then
    if [[ "$HAS_JQ" == true ]]; then
      MERGED=$(jq -s '.[0] as $e | .[1] as $n | $e * {mcpServers: (($e.mcpServers // {}) + ($n.mcpServers // {}))}' \
        "$CLAUDE_CFG" "$MCP_TEMPLATE")
      printf '%s\n' "$MERGED" > "$CLAUDE_CFG"
      ok "Merged MCPs into .claude/settings.json"
    else
      node -e "
        const fs = require('fs');
        const existing = JSON.parse(fs.readFileSync('$CLAUDE_CFG', 'utf8'));
        const incoming = JSON.parse(fs.readFileSync('$MCP_TEMPLATE', 'utf8'));
        existing.mcpServers = { ...(existing.mcpServers || {}), ...(incoming.mcpServers || {}) };
        fs.writeFileSync('$CLAUDE_CFG', JSON.stringify(existing, null, 2) + '\n');
      "
      ok "Merged MCPs into .claude/settings.json (via Node)"
    fi
  else
    cp "$MCP_TEMPLATE" "$CLAUDE_CFG"
    ok "Created .claude/settings.json"
  fi
fi

register_claude_hooks

WINDSURF_MCP="$TARGET_DIR/.windsurf/mcp.json"
if [[ -f "$MCP_TEMPLATE" ]] && [[ ! -f "$WINDSURF_MCP" ]]; then
  mkdir -p "$TARGET_DIR/.windsurf"
  cp "$MCP_TEMPLATE" "$WINDSURF_MCP"
  ok "Created .windsurf/mcp.json"
elif [[ -f "$WINDSURF_MCP" ]]; then
  warn "Exists, skipping: .windsurf/mcp.json"
fi

GEMINI_CFG="$TARGET_DIR/.gemini/settings.json"
if [[ -f "$MCP_TEMPLATE" ]]; then
  mkdir -p "$TARGET_DIR/.gemini"
  if [[ -f "$GEMINI_CFG" ]]; then
    if [[ "$HAS_JQ" == true ]]; then
      MERGED=$(jq -s '.[0] as $e | .[1] as $n | $e * {mcpServers: (($e.mcpServers // {}) + ($n.mcpServers // {}))}' \
        "$GEMINI_CFG" "$MCP_TEMPLATE")
      printf '%s\n' "$MERGED" > "$GEMINI_CFG"
      ok "Merged MCPs into .gemini/settings.json"
    else
      node -e "
        const fs = require('fs');
        const existing = JSON.parse(fs.readFileSync('$GEMINI_CFG', 'utf8'));
        const incoming = JSON.parse(fs.readFileSync('$MCP_TEMPLATE', 'utf8'));
        existing.mcpServers = { ...(existing.mcpServers || {}), ...(incoming.mcpServers || {}) };
        fs.writeFileSync('$GEMINI_CFG', JSON.stringify(existing, null, 2) + '\n');
      "
      ok "Merged MCPs into .gemini/settings.json (via Node)"
    fi
  else
    cp "$MCP_TEMPLATE" "$GEMINI_CFG"
    ok "Created .gemini/settings.json"
  fi
fi

# ---------------------------------------------------------------------------
# Step 6: Install optional MCP dependencies
# ---------------------------------------------------------------------------
step "Step 6/8: Installing MCP dependencies"

if [[ "$HAS_PYTHON" == true ]]; then
  PIP_CMD="pip"
  command -v pip3 &>/dev/null && PIP_CMD="pip3"

  if $PIP_CMD show mcp-server-fetch &>/dev/null 2>&1; then
    ok "mcp-server-fetch already installed"
  else
    info "Installing mcp-server-fetch..."
    $PIP_CMD install mcp-server-fetch --quiet 2>/dev/null \
      && ok "Installed mcp-server-fetch" \
      || warn "Failed to install mcp-server-fetch (run manually: pip install mcp-server-fetch)"
  fi
fi

if [[ "$HAS_UV" == true ]]; then
  if uv tool list 2>/dev/null | grep -q notebooklm-mcp-cli; then
    ok "notebooklm-mcp-cli already installed"
  else
    info "Installing notebooklm-mcp-cli..."
    uv tool install notebooklm-mcp-cli 2>/dev/null \
      && ok "Installed notebooklm-mcp-cli" \
      || warn "Failed (run manually: uv tool install notebooklm-mcp-cli)"
  fi

  if command -v nlm &>/dev/null; then
    echo ""
    info "NotebookLM MCP requires Google authentication."
    info "A browser window will open. Log in with your Google account."
    echo ""
    read -r -p "  Authenticate NotebookLM now? [Y/n] " NLM_ANSWER
    NLM_ANSWER="${NLM_ANSWER:-Y}"
    if [[ "$NLM_ANSWER" =~ ^[Yy]$ ]]; then
      info "Opening browser for Google login... (waiting for you to finish)"
      nlm login && ok "NotebookLM authenticated!" || warn "nlm login failed - run manually later: nlm login"
    else
      warn "Skipped. Run 'nlm login' later to authenticate NotebookLM."
    fi
  fi
fi

ok "npx MCPs (context7, playwright, fal) auto-install on first use"

# ---------------------------------------------------------------------------
# Step 6b: API Keys setup
# ---------------------------------------------------------------------------
step "Step 6b/8: API Keys"

ENV_FILE="$TARGET_DIR/.env.local"

ask_key() {
  local key_name="$1" description="$2" url="$3" required="$4"
  echo ""
  info "$description"
  info "Obter key em: $url"
  [[ "$required" == "optional" ]] && info "(Opcional - tem fallback gratuito)"
  echo ""
  read -r -p "  Inserir $key_name agora? [Y/n] " KEY_ANSWER
  KEY_ANSWER="${KEY_ANSWER:-Y}"
  if [[ "$KEY_ANSWER" =~ ^[Yy]$ ]]; then
    read -r -p "  $key_name: " KEY_VALUE
    if [[ -n "$KEY_VALUE" ]]; then
      if [[ -f "$ENV_FILE" ]] && grep -q "^${key_name}=" "$ENV_FILE" 2>/dev/null; then
        warn "$key_name already exists in .env.local, skipping"
      else
        echo "${key_name}=${KEY_VALUE}" >> "$ENV_FILE"
        ok "$key_name saved to .env.local"
      fi
    else
      warn "Empty key, skipping. Set $key_name in .env.local later."
    fi
  else
    warn "Skipped. Set $key_name in .env.local when needed."
  fi
}

ask_key "FAL_KEY" \
  "Image Generator (skill 17) e MCP usam fal.ai para gerar imagens e moodboards." \
  "https://fal.ai/dashboard/keys" \
  "recommended"

ask_key "BRAVE_SEARCH_KEY" \
  "Design Intelligence (skill 29) e MCP usam Brave Search para pesquisar concorrentes e tendencias." \
  "https://brave.com/search/api/" \
  "recommended"

ask_key "FIRECRAWL_KEY" \
  "Firecrawl acelera scraping de paginas web (MCP e skill 29). Playwright e o fallback gratuito." \
  "https://firecrawl.dev/" \
  "optional"

GITIGNORE="$TARGET_DIR/.gitignore"
if [[ -f "$GITIGNORE" ]]; then
  if ! grep -q "^\.env\.local$" "$GITIGNORE" 2>/dev/null; then
    echo ".env.local" >> "$GITIGNORE"
  fi
fi

# ---------------------------------------------------------------------------
# Step 7: .gitignore + Summary
# ---------------------------------------------------------------------------
step "Step 7/8: Finishing up"

GITIGNORE="$TARGET_DIR/.gitignore"
if [[ -f "$GITIGNORE" ]]; then
  if ! grep -q "^\.bot/" "$GITIGNORE" 2>/dev/null; then
    echo "" >> "$GITIGNORE"
    echo "# Dev Team Kit (installed via setup)" >> "$GITIGNORE"
    echo ".bot/" >> "$GITIGNORE"
    echo ".agent/skills/" >> "$GITIGNORE"
    ok "Added .bot/ and .agent/skills/ to .gitignore"
  else
    ok ".bot/ already in .gitignore"
  fi

  if ! grep -q "^\.env\.local$" "$GITIGNORE" 2>/dev/null; then
    echo ".env.local" >> "$GITIGNORE"
    ok "Added .env.local to .gitignore"
  fi
else
  cat > "$GITIGNORE" <<'GITEOF'
# Dev Team Kit (installed via setup)
.bot/
.agent/skills/
.env.local
GITEOF
  ok "Created .gitignore with .bot/ exclusion"
fi

# ---------------------------------------------------------------------------
# Step 8: Code Intelligence Tools (optional)
# ---------------------------------------------------------------------------
step "Step 8/8: Code Intelligence Tools (optional)"
echo ""
echo "  Estas ferramentas reduzem drasticamente o uso de tokens na exploracao de codigo."
echo "  Todas sao opcionais. Enter pula."
echo ""

ENV_TOOLS_FILE="$TARGET_DIR/.bot/.env.tools"
cat > "$ENV_TOOLS_FILE" <<'ENVEOF'
# Gerado por setup/install.sh - nao editar manualmente
# Ferramentas de code intelligence detectadas
ENVEOF

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
      if powershell -Command "irm https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.ps1 | iex" 2>/dev/null; then
        CODEBASE_MEMORY_AVAILABLE=1
        ok "codebase-memory-mcp instalado"
      else
        warn "Falha na instalacao. Instale manualmente: https://github.com/DeusData/codebase-memory-mcp"
      fi
    else
      if curl -sSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash 2>/dev/null; then
        CODEBASE_MEMORY_AVAILABLE=1
        ok "codebase-memory-mcp instalado"
      else
        warn "Falha na instalacao. Instale manualmente: https://github.com/DeusData/codebase-memory-mcp"
      fi
    fi
  fi
fi

if [[ "$CODEBASE_MEMORY_AVAILABLE" == 1 ]]; then
  CLAUDE_SETTINGS="$TARGET_DIR/.claude/settings.json"
  if [[ -f "$CLAUDE_SETTINGS" ]]; then
    node -e "
      const fs = require('fs');
      const s = JSON.parse(fs.readFileSync('$CLAUDE_SETTINGS', 'utf-8'));
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

echo "CODEBASE_MEMORY_AVAILABLE=$CODEBASE_MEMORY_AVAILABLE" >> "$ENV_TOOLS_FILE"
echo "CYMBAL_AVAILABLE=$CYMBAL_AVAILABLE" >> "$ENV_TOOLS_FILE"
echo "LUMEN_AVAILABLE=$LUMEN_AVAILABLE" >> "$ENV_TOOLS_FILE"
ok "Disponibilidade registrada em .bot/.env.tools"

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

echo ""
echo "=================================================================="
echo "${BOLD} Installation Complete${RESET}"
echo "=================================================================="
echo ""
echo " ${GREEN}Platform configs:${RESET}"
echo "   CLAUDE.md                       -> Claude Code"
echo "   AGENTS.md                       -> Multi-agent (Copilot, Windsurf)"
echo "   GEMINI.md                       -> Antigravity / Gemini CLI"
echo "   .github/copilot-instructions.md -> GitHub Copilot"
echo "   .windsurf/rules/dev-team-kit.md -> Windsurf"
echo "   .agent/skills/                  -> Antigravity"
echo ""
echo " ${GREEN}MCP servers configured in:${RESET}"
echo "   .claude/settings.json           -> Claude Code"
echo "   .windsurf/mcp.json              -> Windsurf"
echo "   .gemini/settings.json           -> Antigravity / Gemini CLI"
echo ""
echo " ${GREEN}MCPs enabled:${RESET}  dev-team-kit, context7, playwright"
echo " ${YELLOW}MCPs disabled:${RESET} fal, fetch, notebooklm (ativar na config quando precisar)"
echo ""

echo " ${YELLOW}Passos manuais:${RESET}"

MANUAL_STEPS=()
[[ "$HAS_UV" != true ]] && [[ "$HAS_PYTHON" == true ]] && MANUAL_STEPS+=("  - notebooklm: instalar uv (${BOLD}pip install uv${RESET}), depois ${BOLD}uv tool install notebooklm-mcp-cli && nlm login${RESET}")
[[ "$HAS_UV" != true ]] && [[ "$HAS_PYTHON" != true ]] && MANUAL_STEPS+=("  - notebooklm: instalar Python + uv, depois ${BOLD}uv tool install notebooklm-mcp-cli && nlm login${RESET}")
MANUAL_STEPS+=("  - Configurar API keys no .env.local (FAL_KEY, BRAVE_SEARCH_KEY, FIRECRAWL_KEY) - nunca commitar secrets")
MANUAL_STEPS+=("  - Rodar ${BOLD}Repo Auditor${RESET} na primeira sessao com o agente")

for s in "${MANUAL_STEPS[@]}"; do
  echo "$s"
done

echo ""
ok "Kit instalado em $TARGET_DIR/.bot/"
echo ""
