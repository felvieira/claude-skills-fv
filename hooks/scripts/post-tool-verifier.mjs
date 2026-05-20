#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { isHookDisabled } from './utils.mjs';

function detectDebuggingPattern(input) {
  const toolName = input.tool_name || '';
  const toolInput = JSON.stringify(input.tool_input || {});
  const toolResponse = JSON.stringify(input.tool_response || {});

  const hasDebuggingComment = /o problema era|a causa era|descobri que|the issue was|root cause|found that/i.test(toolResponse + toolInput);
  const isWriteTool = ['Edit', 'Write'].includes(toolName);

  return { hasDebuggingComment, isWriteTool };
}

function getEditHistory() {
  try {
    return JSON.parse(readFileSync('.bot/.edit-history.json', 'utf-8'));
  } catch {
    return {};
  }
}

function saveEditHistory(history) {
  try {
    mkdirSync('.bot', { recursive: true });
    writeFileSync('.bot/.edit-history.json', JSON.stringify(history));
  } catch {}
}

function passesQualityGate(editHistory) {
  const files = Object.keys(editHistory);
  const multipleEditsToOneFile = files.some(f => editHistory[f] >= 3);
  const manyFilesEdited = files.length >= 3;
  return multipleEditsToOneFile || manyFilesEdited;
}

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(_input); } catch {}

  if (isHookDisabled('post-tool-verifier')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const { hasDebuggingComment, isWriteTool } = detectDebuggingPattern(input);

  if (isWriteTool && input.tool_input && input.tool_input.file_path) {
    const history = getEditHistory();
    const filePath = input.tool_input.file_path;
    history[filePath] = (history[filePath] || 0) + 1;
    saveEditHistory(history);
  }

  if (hasDebuggingComment && isWriteTool) {
    const history = getEditHistory();
    if (passesQualityGate(history)) {
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `[LearnedSkills] Debugging pattern detected. If this solution is: (1) not Googleable, (2) specific to this codebase, and (3) required real debugging effort — save it as a learned skill in .bot/learned-skills/ using the format in the kit. Use devkit_learned_skills MCP tool or create the .md file directly.`
        }
      }));
      process.exit(0);
    }
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
