#!/usr/bin/env bash
# ============================================================================
# Dev Team Kit — Installer
# ============================================================================
# Installs the kit into a consumer repo and configures ALL platforms + MCPs.
#
# Usage:
#   bash setup/install.sh [target-dir]
#
# On Linux/macOS:  chmod +x setup/install.sh
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

echo ""
echo "${BOLD}Dev Team Kit — Installer${RESET}"
echo "Kit:    $SCRIPT_DIR"
echo "Target: $TARGET_DIR"

# ---------------------------------------------------------------------------
# Step 1: Prerequisites
# ---------------------------------------------------------------------------
step "Step 1/7: Checking prerequisites"

HAS_NODE=false; HAS_PYTHON=false; HAS_UV=false; HAS_JQ=false
DETECTED_IDES=()

if command -v node &>/dev/null; then
  ok "Node.js $(node --version)"; HAS_NODE=true
else
  err "Node.js not found — REQUIRED for MCP servers"
  err "Install: https://nodejs.org/"
  exit 1
fi

if command -v python3 &>/dev/null; then
  ok "Python 3 $(python3 --version 2>&1 | cut -d' ' -f2)"; HAS_PYTHON=true
elif command -v python &>/dev/null; then
  ok "Python $(python --version 2>&1 | cut -d' ' -f2)"; HAS_PYTHON=true
else
  warn "Python not found — optional MCPs (fetch, notebooklm) unavailable"
fi

if command -v uv &>/dev/null; then
  ok "uv $(uv --version 2>&1 | head -1)"; HAS_UV=true
else
  [[ "$HAS_PYTHON" == true ]] && warn "uv not found — notebooklm MCP unavailable (install: pip install uv)"
fi

command -v jq &>/dev/null && HAS_JQ=true

# Detect installed IDEs
command -v claude &>/dev/null   && DETECTED_IDES+=("Claude Code")
command -v code &>/dev/null     && DETECTED_IDES+=("VS Code (Copilot)")
command -v windsurf &>/dev/null && DETECTED_IDES+=("Windsurf")
command -v gemini &>/dev/null   && DETECTED_IDES+=("Gemini CLI")
command -v antigravity &>/dev/null && DETECTED_IDES+=("Antigravity")
command -v cursor &>/dev/null   && DETECTED_IDES+=("Cursor")

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

# ---------------------------------------------------------------------------
# Step 2: Copy kit to .bot/ (excluding setup/ to avoid redundancy)
# ---------------------------------------------------------------------------
step "Step 2/7: Copying kit to .bot/"

BOT_DIR="$TARGET_DIR/.bot"
mkdir -p "$BOT_DIR"

for item in GLOBAL.md README.md VERSION; do
  [[ -f "$SCRIPT_DIR/$item" ]] && safe_copy_file "$SCRIPT_DIR/$item" "$BOT_DIR/$item"
done

for dir in policies templates skills patterns scripts docs commands evals; do
  if [[ -d "$SCRIPT_DIR/$dir" ]]; then
    safe_copy_dir "$SCRIPT_DIR/$dir" "$BOT_DIR/$dir"
  fi
done

# ---------------------------------------------------------------------------
# Step 3: Generate entry-point files
# ---------------------------------------------------------------------------
step "Step 3/7: Generating entry points"

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
step "Step 4/7: Generating platform configs"

# GitHub Copilot
[[ -f "$SCRIPT_DIR/setup/configs/copilot-instructions.md" ]] && \
  safe_copy_file "$SCRIPT_DIR/setup/configs/copilot-instructions.md" "$TARGET_DIR/.github/copilot-instructions.md"

# Windsurf rule
[[ -f "$SCRIPT_DIR/setup/configs/windsurf-rule.md" ]] && \
  safe_copy_file "$SCRIPT_DIR/setup/configs/windsurf-rule.md" "$TARGET_DIR/.windsurf/rules/dev-team-kit.md"

# Antigravity skills (copy, not symlink — Windows compat)
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
# Step 5: Configure MCPs for ALL platforms
# ---------------------------------------------------------------------------
step "Step 5/7: Configuring MCP servers"

MCP_TEMPLATE="$SCRIPT_DIR/setup/configs/claude-settings.json"

# --- Claude Code: .claude/settings.json ---
if [[ -f "$MCP_TEMPLATE" ]]; then
  CLAUDE_CFG="$TARGET_DIR/.claude/settings.json"
  mkdir -p "$TARGET_DIR/.claude"

  if [[ -f "$CLAUDE_CFG" ]]; then
    # Merge — preserve existing, add new MCPs
    if [[ "$HAS_JQ" == true ]]; then
      MERGED=$(jq -s '.[0] as $e | .[1] as $n | $e * {mcpServers: (($e.mcpServers // {}) + ($n.mcpServers // {}))}' \
        "$CLAUDE_CFG" "$MCP_TEMPLATE")
      printf '%s\n' "$MERGED" > "$CLAUDE_CFG"
      ok "Merged MCPs into .claude/settings.json"
    else
      node -e "
        const fs=require('fs');
        const e=JSON.parse(fs.readFileSync('$CLAUDE_CFG','utf8'));
        const n=JSON.parse(fs.readFileSync('$MCP_TEMPLATE','utf8'));
        e.mcpServers={...(e.mcpServers||{}),...(n.mcpServers||{})};
        fs.writeFileSync('$CLAUDE_CFG',JSON.stringify(e,null,2)+'\n');
      "
      ok "Merged MCPs into .claude/settings.json (via Node)"
    fi
  else
    cp "$MCP_TEMPLATE" "$CLAUDE_CFG"
    ok "Created .claude/settings.json"
  fi
fi

# --- Windsurf: .windsurf/mcp.json ---
WINDSURF_MCP="$TARGET_DIR/.windsurf/mcp.json"
if [[ -f "$MCP_TEMPLATE" ]] && [[ ! -f "$WINDSURF_MCP" ]]; then
  mkdir -p "$TARGET_DIR/.windsurf"
  cp "$MCP_TEMPLATE" "$WINDSURF_MCP"
  ok "Created .windsurf/mcp.json"
elif [[ -f "$WINDSURF_MCP" ]]; then
  warn "Exists, skipping: .windsurf/mcp.json"
fi

# --- Antigravity/Gemini CLI: .gemini/settings.json ---
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
        const fs=require('fs');
        const e=JSON.parse(fs.readFileSync('$GEMINI_CFG','utf8'));
        const n=JSON.parse(fs.readFileSync('$MCP_TEMPLATE','utf8'));
        e.mcpServers={...(e.mcpServers||{}),...(n.mcpServers||{})};
        fs.writeFileSync('$GEMINI_CFG',JSON.stringify(e,null,2)+'\n');
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
step "Step 6/7: Installing MCP dependencies"

# pip-based MCPs (only if Python available)
if [[ "$HAS_PYTHON" == true ]]; then
  PIP_CMD="pip"
  command -v pip3 &>/dev/null && PIP_CMD="pip3"

  if $PIP_CMD show mcp-server-fetch &>/dev/null 2>&1; then
    ok "mcp-server-fetch already installed"
  else
    info "Installing mcp-server-fetch..."
    $PIP_CMD install mcp-server-fetch --quiet 2>/dev/null && ok "Installed mcp-server-fetch" || warn "Failed to install mcp-server-fetch (run manually: pip install mcp-server-fetch)"
  fi
fi

# uv-based MCPs
if [[ "$HAS_UV" == true ]]; then
  if uv tool list 2>/dev/null | grep -q notebooklm-mcp-cli; then
    ok "notebooklm-mcp-cli already installed"
  else
    info "Installing notebooklm-mcp-cli..."
    uv tool install notebooklm-mcp-cli 2>/dev/null && ok "Installed notebooklm-mcp-cli" || warn "Failed (run manually: uv tool install notebooklm-mcp-cli)"
  fi

  # NotebookLM authentication — needs browser login
  if command -v nlm &>/dev/null; then
    echo ""
    info "NotebookLM MCP requires Google authentication."
    info "A browser window will open. Log in with your Google account."
    echo ""
    read -r -p "  Authenticate NotebookLM now? [Y/n] " NLM_ANSWER
    NLM_ANSWER="${NLM_ANSWER:-Y}"
    if [[ "$NLM_ANSWER" =~ ^[Yy]$ ]]; then
      info "Opening browser for Google login... (waiting for you to finish)"
      nlm login && ok "NotebookLM authenticated!" || warn "nlm login failed — run manually later: nlm login"
    else
      warn "Skipped. Run 'nlm login' later to authenticate NotebookLM."
    fi
  fi
fi

# npx-based MCPs are auto-resolved on first use — no install needed
ok "npx MCPs (context7, playwright, fal) auto-install on first use"

# ---------------------------------------------------------------------------
# Step 6b: API Keys setup
# ---------------------------------------------------------------------------
step "Step 6b/7: API Keys"

ENV_FILE="$TARGET_DIR/.env.local"

# FAL_KEY — needed for Image Generator (skill 17)
echo ""
info "O Image Generator (skill 17) usa fal.ai para gerar imagens."
info "Voce pode obter uma key em: https://fal.ai/dashboard/keys"
echo ""
read -r -p "  Inserir FAL_KEY agora? [Y/n] " FAL_ANSWER
FAL_ANSWER="${FAL_ANSWER:-Y}"
if [[ "$FAL_ANSWER" =~ ^[Yy]$ ]]; then
  read -r -p "  FAL_KEY: " FAL_KEY_VALUE
  if [[ -n "$FAL_KEY_VALUE" ]]; then
    # Append to .env.local (create if needed, never overwrite existing keys)
    if [[ -f "$ENV_FILE" ]] && grep -q "^FAL_KEY=" "$ENV_FILE" 2>/dev/null; then
      warn "FAL_KEY already exists in .env.local, skipping"
    else
      echo "FAL_KEY=$FAL_KEY_VALUE" >> "$ENV_FILE"
      ok "FAL_KEY saved to .env.local"
    fi
  else
    warn "Empty key, skipping. Set FAL_KEY in .env.local later."
  fi
else
  warn "Skipped. Set FAL_KEY in .env.local when needed."
fi

# Ensure .env.local is in .gitignore
GITIGNORE="$TARGET_DIR/.gitignore"
if [[ -f "$GITIGNORE" ]]; then
  if ! grep -q "\.env\.local" "$GITIGNORE" 2>/dev/null; then
    echo ".env.local" >> "$GITIGNORE"
  fi
fi

# ---------------------------------------------------------------------------
# Step 7: .gitignore + Summary
# ---------------------------------------------------------------------------
step "Step 7/7: Finishing up"

# Add .bot/ to .gitignore if not already there
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
else
  cat > "$GITIGNORE" <<'GITEOF'
# Dev Team Kit (installed via setup)
.bot/
.agent/skills/
GITEOF
  ok "Created .gitignore with .bot/ exclusion"
fi

# --- Summary ---
echo ""
echo "=================================================================="
echo "${BOLD} Installation Complete${RESET}"
echo "=================================================================="
echo ""
echo " ${GREEN}Platform configs:${RESET}"
echo "   CLAUDE.md                       → Claude Code"
echo "   AGENTS.md                       → Multi-agent (Copilot, Windsurf)"
echo "   GEMINI.md                       → Antigravity / Gemini CLI"
echo "   .github/copilot-instructions.md → GitHub Copilot"
echo "   .windsurf/rules/dev-team-kit.md → Windsurf"
echo "   .agent/skills/                  → Antigravity"
echo ""
echo " ${GREEN}MCP servers configured in:${RESET}"
echo "   .claude/settings.json           → Claude Code"
echo "   .windsurf/mcp.json              → Windsurf"
echo "   .gemini/settings.json           → Antigravity / Gemini CLI"
echo ""
echo " ${GREEN}MCPs enabled:${RESET}  context7, playwright"
echo " ${YELLOW}MCPs disabled:${RESET} fal, fetch, notebooklm (ativar na config quando precisar)"
echo ""

# Manual steps
echo " ${YELLOW}Passos manuais:${RESET}"

MANUAL_STEPS=()
[[ "$HAS_UV" != true ]] && [[ "$HAS_PYTHON" == true ]] && MANUAL_STEPS+=("  - notebooklm: instalar uv (${BOLD}pip install uv${RESET}), depois ${BOLD}uv tool install notebooklm-mcp-cli && nlm login${RESET}")
[[ "$HAS_UV" != true ]] && [[ "$HAS_PYTHON" != true ]] && MANUAL_STEPS+=("  - notebooklm: instalar Python + uv, depois ${BOLD}uv tool install notebooklm-mcp-cli && nlm login${RESET}")
MANUAL_STEPS+=("  - Configurar API keys no .env (FAL_KEY, etc.) — NUNCA commitar secrets")
MANUAL_STEPS+=("  - Rodar ${BOLD}Repo Auditor${RESET} na primeira sessao com o agente")

for s in "${MANUAL_STEPS[@]}"; do
  echo "$s"
done

echo ""
ok "Kit instalado em $TARGET_DIR/.bot/"
echo ""
