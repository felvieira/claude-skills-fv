#!/usr/bin/env node

const WRITE_TOOLS = ['Edit', 'Write', 'NotebookEdit', 'mcp__Desktop_Commander__write_file', 'mcp__Desktop_Commander__edit_block'];

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

  if (WRITE_TOOLS.includes(toolName)) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        additionalContext: `[PreToolUse] About to write. GLOBAL.md Context Decay Awareness: if this session has 10+ messages, re-read the target file before editing to avoid stale-state regressions.`
      }
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
});
