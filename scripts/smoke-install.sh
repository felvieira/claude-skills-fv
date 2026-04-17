#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

bash "$ROOT_DIR/setup/install.sh" --no-input --profile lean "$TMP_DIR"

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
assert_file "$TMP_DIR/.bot/.env.tools"

# Subagents copied to .claude/agents/
assert_dir "$TMP_DIR/.claude/agents"
for agent in code-reviewer security-auditor test-engineer orchestrator debugger; do
  assert_file "$TMP_DIR/.claude/agents/${agent}.md"
done

# Slash commands copied to .claude/commands/
assert_dir "$TMP_DIR/.claude/commands"

# MCP assertions — pass file content via stdin to avoid Windows POSIX-path issues
node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    const settings = JSON.parse(d);
    const mcp = settings.mcpServers?.['dev-team-kit'];
    if (!mcp) throw new Error('dev-team-kit MCP missing');
    if (mcp.command !== 'node') throw new Error('dev-team-kit command should be node');
    if (!Array.isArray(mcp.args) || mcp.args[0] !== '.bot/mcp-server/dist/index.js') {
      throw new Error('dev-team-kit args should point to .bot/mcp-server/dist/index.js');
    }
    console.log('MCP assertions passed');
  });
" < "$TMP_DIR/.claude/settings.json"

# gitignore — pure bash grep (no node path issues)
grep -q '\.env\.local' "$TMP_DIR/.gitignore" \
  || { echo "FAIL: .env.local must be gitignored" >&2; exit 1; }
echo ".gitignore assertions passed"

# Hooks: check copied scripts exist and hooks.json declares PostToolUse event-logger
# (register_claude_hooks may silently skip in --no-input mode; check the source files directly)
assert_file "$TMP_DIR/.bot/hooks/hooks.json"
assert_file "$TMP_DIR/.bot/hooks/scripts/session-event-logger.mjs"
assert_file "$TMP_DIR/.bot/hooks/scripts/post-tool-verifier.mjs"
assert_file "$TMP_DIR/.bot/hooks/scripts/pre-tool-enforcer.mjs"

node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    const hooksJson = JSON.parse(d);
    const postToolUse = hooksJson.PostToolUse || [];
    const hasEventLogger = postToolUse.some(s => s.includes('session-event-logger'));
    if (!hasEventLogger) {
      throw new Error('hooks.json PostToolUse does not include session-event-logger');
    }
    const preToolUse = hooksJson.PreToolUse || [];
    if (preToolUse.length === 0) {
      throw new Error('hooks.json PreToolUse is empty');
    }
    console.log('hooks.json assertions passed (' + preToolUse.length + ' PreToolUse, ' + postToolUse.length + ' PostToolUse)');
  });
" < "$TMP_DIR/.bot/hooks/hooks.json"

echo "Installer smoke test passed: $TMP_DIR"
