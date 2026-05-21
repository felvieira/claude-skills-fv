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
      const fileName = (input.tool_input.file_path || "").split(/[\\/]/).pop() || "<file>";
      const skillStem = fileName.replace(/\.[^.]+$/, "").replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "fix";
      const template = [
        `[post-tool-verifier] ⚠ Debugging pattern detected (multi-file or multi-edit session)`,
        ``,
        `Where: ${fileName} (recent Edit/Write with debugging evidence in comments/response)`,
        ``,
        `Why this matters: real debugging discoveries vanish when context is compacted.`,
        `Capturing as a learned skill prevents re-deriving the same fix next session.`,
        `(see policies/self-correcting-sensors.md + policies/learned-skills.md)`,
        ``,
        `Decide first (the gate):`,
        `  Save ONLY if all 3 are true:`,
        `    1. Not Googleable (no public docs/SO answer covers it)`,
        `    2. Specific to THIS codebase (not generic JS/Python advice)`,
        `    3. Required real debugging effort (>15 min, hypothesis-driven)`,
        `  If any is false → skip. Generic fixes do not earn a slot.`,
        ``,
        `Fix (template ready to paste):`,
        `  Create file: .bot/learned-skills/${skillStem}.md`,
        ``,
        `  ---`,
        `  name: ${skillStem}`,
        `  trigger: ["<keyword-from-symptom>", "<keyword-from-root-cause>"]`,
        `  created: ${new Date().toISOString().slice(0, 10)}`,
        `  source_file: ${fileName}`,
        `  ---`,
        ``,
        `  # When you see this pattern again`,
        ``,
        `  ## Symptom`,
        `  <1-2 lines: what the user/log/test reports>`,
        ``,
        `  ## Root cause`,
        `  <why this happens in this codebase specifically>`,
        ``,
        `  ## Fix`,
        `  1. <concrete step>`,
        `  2. <concrete step>`,
        ``,
        `  ## How NOT to fix it`,
        `  <the wrong path you tried first, so future-you skips it>`,
        ``,
        `Alternative: if you use the MCP, run \`devkit_learned_skills.save\` with the same fields.`,
        ``,
        `References: policies/learned-skills.md, policies/self-correcting-sensors.md`,
      ].join("\n");

      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: template
        }
      }));
      process.exit(0);
    }
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
