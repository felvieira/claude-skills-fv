#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

(yes n || true) | bash "$ROOT_DIR/setup/install.sh" "$TMP_DIR"

assert_file() {
  local file_path="$1"
  if [[ ! -f "$file_path" ]]; then
    echo "Missing expected file: $file_path" >&2
    exit 1
  fi
}

assert_dir() {
  local dir_path="$1"
  if [[ ! -d "$dir_path" ]]; then
    echo "Missing expected directory: $dir_path" >&2
    exit 1
  fi
}

assert_file "$TMP_DIR/.bot/setup/install.sh"
assert_dir "$TMP_DIR/.bot/hooks"
assert_dir "$TMP_DIR/.bot/learned-skills"
assert_file "$TMP_DIR/.claude/settings.json"
assert_file "$TMP_DIR/.gitignore"

node -e "
  const fs = require('fs');
  const settings = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  const gitignore = fs.readFileSync(process.argv[2], 'utf8');
  const mcp = settings.mcpServers?.['dev-team-kit'];
  if (!mcp) throw new Error('dev-team-kit MCP missing');
  if (mcp.command !== 'node') throw new Error('dev-team-kit command should be node');
  if (!Array.isArray(mcp.args) || mcp.args[0] !== '.bot/mcp-server/dist/index.js') {
    throw new Error('dev-team-kit args should point to .bot/mcp-server/dist/index.js');
  }
  const hooks = settings.hooks || {};
  if (!hooks.PreToolUse || hooks.PreToolUse.length === 0) {
    throw new Error('Claude hooks were not registered');
  }
  if (!gitignore.includes('.env.local')) {
    throw new Error('.env.local must be gitignored');
  }
" "$TMP_DIR/.claude/settings.json" "$TMP_DIR/.gitignore"

echo "Installer smoke test passed: $TMP_DIR"
