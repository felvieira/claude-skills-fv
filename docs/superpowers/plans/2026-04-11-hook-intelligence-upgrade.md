# Hook Intelligence Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hook profiles (env var control), confidence scoring for learned-skills, search-first policy, iterative retrieval policy, and strategic compact with proactive warnings.

**Architecture:** Task 1 lays the foundation (utils.mjs + config.json) that all subsequent hook tasks depend on. Tasks 2–4 evolve existing hooks. Tasks 5–6 add new policy documents and update the orchestrator skill. Task 7 updates README and cross-references.

**Tech Stack:** Node.js ESM (hooks), Markdown (policies/skills), JSON (config/session state)

---

## File Map

| File | Action | Task |
|---|---|---|
| `hooks/scripts/utils.mjs` | Modify — add 3 new exports, evolve readHookConfig | 1 |
| `hooks/config.json` | Modify — add hook_profiles + learned_skills_scoring + update context_guard | 1 |
| `hooks/scripts/pre-execution-gate.mjs` | Modify — add guard + save last_prompt | 2, 3 |
| `hooks/scripts/keyword-detector.mjs` | Modify — add guard + full confidence scoring rewrite | 2, 4 |
| `hooks/scripts/context-guard-stop.mjs` | Rewrite — strategic compact with proactive warning | 2, 3 |
| `hooks/scripts/persistent-mode.mjs` | Modify — add guard | 2 |
| `hooks/scripts/pre-tool-enforcer.mjs` | Modify — add guard | 2 |
| `hooks/scripts/session-start.mjs` | Modify — add guard | 2 |
| `hooks/scripts/post-tool-verifier.mjs` | Modify — add guard | 2 |
| `hooks/scripts/model-routing-hook.mjs` | Modify — add guard | 2 |
| `policies/search-first.md` | Create new | 5 |
| `skills/09-orchestrator/SKILL.md` | Modify — add search step in execution protocol | 5 |
| `policies/iterative-retrieval.md` | Create new | 6 |
| `policies/cost-optimization.md` | Modify — add cross-references | 7 |
| `README.md` | Modify — hook system table, governance section, timestamp | 7 |

---

## Task 1: Hook Profiles Infrastructure — utils.mjs + config.json

**Files:**
- Modify: `hooks/scripts/utils.mjs`
- Modify: `hooks/config.json`

- [ ] **Step 1: Write failing test for getActiveProfile**

```bash
# Create temp test file
cat > /tmp/test-utils.mjs << 'EOF'
import { getActiveProfile, isHookDisabled, getProfileOverrides, readHookConfig } from './hooks/scripts/utils.mjs';

// Test 1: getActiveProfile reads env var
process.env.DEVKIT_HOOK_PROFILE = 'minimal';
const p = getActiveProfile();
console.assert(p === 'minimal', `Expected 'minimal', got '${p}'`);

// Test 2: isHookDisabled respects env var list
process.env.DEVKIT_HOOK_PROFILE = 'standard';
process.env.DEVKIT_DISABLED_HOOKS = 'keyword-detector,post-tool-verifier';
const disabled = isHookDisabled('keyword-detector');
const enabled = isHookDisabled('context-guard-stop');
console.assert(disabled === true, `Expected keyword-detector to be disabled`);
console.assert(enabled === false, `Expected context-guard-stop to be enabled`);

// Test 3: isHookDisabled respects profile disabled list (minimal)
delete process.env.DEVKIT_DISABLED_HOOKS;
process.env.DEVKIT_HOOK_PROFILE = 'minimal';
const disabledByProfile = isHookDisabled('pre-execution-gate');
console.assert(disabledByProfile === true, `Expected pre-execution-gate disabled in minimal`);

// Test 4: getProfileOverrides returns overrides for strict
process.env.DEVKIT_HOOK_PROFILE = 'strict';
const overrides = getProfileOverrides('context_guard');
console.assert(overrides.warn_threshold === 0.40, `Expected warn_threshold 0.40, got ${overrides.warn_threshold}`);

// Test 5: readHookConfig merges profile overrides
process.env.DEVKIT_HOOK_PROFILE = 'strict';
const cfg = readHookConfig('context_guard', { warn_threshold: 0.50, block_threshold: 0.75 });
console.assert(cfg.block_threshold === 0.60, `Expected strict block_threshold 0.60, got ${cfg.block_threshold}`);

console.log('All utils tests passed');
EOF
node /tmp/test-utils.mjs 2>&1 | head -5
```

Expected: `ReferenceError: getActiveProfile is not a function` (functions don't exist yet)

- [ ] **Step 2: Rewrite hooks/scripts/utils.mjs**

```js
#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";
import { join } from "path";

export function resolveHookConfigPath() {
  const candidates = [".bot/hooks/config.json", "hooks/config.json"];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function loadFullConfig() {
  const configPath = resolveHookConfigPath();
  if (!configPath) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return {};
  }
}

export function getActiveProfile() {
  const envProfile = process.env.DEVKIT_HOOK_PROFILE;
  if (envProfile) return envProfile;
  const cfg = loadFullConfig();
  return cfg.hook_profiles?.active || "standard";
}

export function isHookDisabled(hookId) {
  // Env var list (comma-separated) union profile disabled list — both apply
  const envDisabled = (process.env.DEVKIT_DISABLED_HOOKS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (envDisabled.includes(hookId)) return true;

  const cfg = loadFullConfig();
  const profile = getActiveProfile();
  const profileDisabled = cfg.hook_profiles?.profiles?.[profile]?.disabled || [];
  return profileDisabled.includes(hookId);
}

export function getProfileOverrides(section) {
  const cfg = loadFullConfig();
  const profile = getActiveProfile();
  return cfg.hook_profiles?.profiles?.[profile]?.overrides?.[section] || {};
}

export function readHookConfig(section, defaults = {}) {
  const cfg = loadFullConfig();
  const sectionData = section ? cfg[section] || {} : cfg;
  const overrides = getProfileOverrides(section);
  return { ...defaults, ...sectionData, ...overrides };
}

export function resolveBotPath(...parts) {
  return join(".bot", ...parts);
}
```

- [ ] **Step 3: Update hooks/config.json — add hook_profiles, learned_skills_scoring, update context_guard**

Replace the full file content:

```json
{
  "context_guard": {
    "warn_threshold": 0.50,
    "block_threshold": 0.75,
    "max_blocks_per_session": 2,
    "strategic_compact": true
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
  },
  "model_routing": {
    "suggest_on_plan_mode": true,
    "suggest_on_agent_spawn": true,
    "min_suggestion_interval_ms": 60000,
    "plan_model": "opus",
    "exec_model": "sonnet",
    "fast_model": "haiku"
  },
  "learned_skills_scoring": {
    "initial_score": 0.7,
    "boost_on_use": 0.1,
    "decay_per_week": 0.1,
    "archive_threshold": 0.3,
    "archive_dir": ".archive"
  },
  "hook_profiles": {
    "active": "standard",
    "disabled": [],
    "profiles": {
      "minimal": {
        "disabled": ["pre-execution-gate", "keyword-detector", "post-tool-verifier", "model-routing-hook"]
      },
      "standard": {
        "disabled": []
      },
      "strict": {
        "disabled": [],
        "overrides": {
          "context_guard": { "warn_threshold": 0.40, "block_threshold": 0.60 },
          "pre_execution_gate": { "block_threshold": 0.50 }
        }
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
node /tmp/test-utils.mjs
```

Expected: `All utils tests passed`

- [ ] **Step 5: Commit**

```bash
git add hooks/scripts/utils.mjs hooks/config.json
git commit -m "feat: add hook profiles infrastructure to utils.mjs and config.json

getActiveProfile, isHookDisabled, getProfileOverrides — env var override
over config.json. DEVKIT_HOOK_PROFILE and DEVKIT_DISABLED_HOOKS supported.
Three profiles: minimal, standard, strict."
```

---

## Task 2: Add isHookDisabled Guard to All 8 Hooks

**Files:**
- Modify: `hooks/scripts/pre-execution-gate.mjs`
- Modify: `hooks/scripts/keyword-detector.mjs`
- Modify: `hooks/scripts/context-guard-stop.mjs`
- Modify: `hooks/scripts/persistent-mode.mjs`
- Modify: `hooks/scripts/pre-tool-enforcer.mjs`
- Modify: `hooks/scripts/session-start.mjs`
- Modify: `hooks/scripts/post-tool-verifier.mjs`
- Modify: `hooks/scripts/model-routing-hook.mjs`

The guard pattern for every hook is identical: add `isHookDisabled` to the import from utils, then check at the top of the stdin `end` handler before any other logic.

- [ ] **Step 1: Verify test — guard should short-circuit disabled hook**

```bash
DEVKIT_DISABLED_HOOKS=context-guard-stop \
  echo '{"input_tokens": 200000, "context_window": 200000}' | \
  node hooks/scripts/context-guard-stop.mjs
```

Expected: something other than `{"continue":true}` (guard doesn't exist yet, so the block will fire)

- [ ] **Step 2: Add guard to pre-execution-gate.mjs**

Add `isHookDisabled` to the import line (line 2):
```js
import { readFileSync, existsSync } from 'fs';
import { readHookConfig, isHookDisabled } from './utils.mjs';
```

Add guard as first statement inside the `stdin 'end'` handler (after `let input = {}; try {...} catch {}`):
```js
  if (isHookDisabled('pre-execution-gate')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
```

- [ ] **Step 3: Add guard to keyword-detector.mjs**

Change the import line:
```js
import { readHookConfig, resolveBotPath, isHookDisabled } from "./utils.mjs";
```

Add guard as the first statement inside `stdin 'end'` handler (before `const cfg = readHookConfig(...)`):
```js
  if (isHookDisabled('keyword-detector')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
```

- [ ] **Step 4: Add guard to context-guard-stop.mjs**

Change the import line:
```js
import { readHookConfig, resolveBotPath, isHookDisabled } from './utils.mjs';
```

Add guard as the first statement inside `stdin 'end'` handler (before the `context_limit` check):
```js
  if (isHookDisabled('context-guard-stop')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
```

- [ ] **Step 5: Add guard to persistent-mode.mjs**

Add import line after existing imports:
```js
import { readFileSync, existsSync } from 'fs';
import { isHookDisabled } from './utils.mjs';
```

Add guard as first statement inside `stdin 'end'` handler:
```js
  if (isHookDisabled('persistent-mode')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
```

- [ ] **Step 6: Add guard to pre-tool-enforcer.mjs**

Change the import line:
```js
import { resolveBotPath, isHookDisabled } from "./utils.mjs";
```

Add guard as first statement inside `stdin 'end'` handler (before `let input = {}`):
```js
  if (isHookDisabled('pre-tool-enforcer')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
```

- [ ] **Step 7: Add guard to session-start.mjs**

Add import line after existing imports:
```js
import { readFileSync, existsSync } from 'fs';
import { isHookDisabled } from './utils.mjs';
```

Add guard as first statement inside `stdin 'end'` handler:
```js
  if (isHookDisabled('session-start')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
```

- [ ] **Step 8: Add guard to post-tool-verifier.mjs**

Add import line after existing imports:
```js
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { isHookDisabled } from './utils.mjs';
```

Add guard as first statement inside `stdin 'end'` handler (before `let input = {}`):
```js
  if (isHookDisabled('post-tool-verifier')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
```

- [ ] **Step 9: Add guard to model-routing-hook.mjs**

Change the import line:
```js
import { readHookConfig, resolveBotPath, isHookDisabled } from "./utils.mjs";
```

Add guard as first statement inside `stdin 'end'` handler (before `let input = {}`):
```js
  if (isHookDisabled('model-routing-hook')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }
```

- [ ] **Step 10: Verify guard works end-to-end**

```bash
# Should pass through immediately when disabled — no block message
DEVKIT_DISABLED_HOOKS=context-guard-stop \
  node -e "process.stdin.resume(); require('child_process').execSync(
    'echo \\'{\\"input_tokens\\": 200000, \\"context_window\\": 200000}\\' | node hooks/scripts/context-guard-stop.mjs',
    {stdio: 'inherit'}
  )"
```

Simpler version:
```bash
echo '{"input_tokens": 200000, "context_window": 200000}' | \
  DEVKIT_DISABLED_HOOKS=context-guard-stop node hooks/scripts/context-guard-stop.mjs
```

Expected: `{"continue":true}` (guard fires, no block message)

- [ ] **Step 11: Commit**

```bash
git add hooks/scripts/
git commit -m "feat: add isHookDisabled guard to all 8 hooks

Each hook checks DEVKIT_DISABLED_HOOKS env var and profile disabled list
before executing. Returns {continue: true} immediately if disabled."
```

---

## Task 3: Strategic Compact — context-guard-stop.mjs + last_prompt

**Files:**
- Rewrite: `hooks/scripts/context-guard-stop.mjs`
- Modify: `hooks/scripts/pre-execution-gate.mjs` (save last_prompt)

- [ ] **Step 1: Verify current behavior before rewrite**

```bash
echo '{"input_tokens": 160000, "context_window": 200000}' | node hooks/scripts/context-guard-stop.mjs
```

Expected: `{"continue":true,...}` with fallback reminder (80% usage → should block, but no `.bot/` dir so skipped — observe actual output)

- [ ] **Step 2: Rewrite hooks/scripts/context-guard-stop.mjs**

Full replacement:

```js
#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { readHookConfig, resolveBotPath, isHookDisabled } from './utils.mjs';

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  if (isHookDisabled('context-guard-stop')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try { input = JSON.parse(_input); } catch {}

  // Never block context-limit stops (prevents compaction deadlock)
  if (input.reason === 'context_limit' || input.stop_reason === 'context_limit') {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const cfg = readHookConfig('context_guard', {
    warn_threshold: 0.50,
    block_threshold: 0.75,
    max_blocks_per_session: 2,
    strategic_compact: true,
  });

  // Track blocks this session
  const blockFile = resolveBotPath('.context-guard-blocks.json');
  let blocks = 0;
  try { blocks = JSON.parse(readFileSync(blockFile, 'utf-8')).count || 0; } catch {}

  if (blocks >= cfg.max_blocks_per_session) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const inputTokens = input.input_tokens;
  const contextWindow = input.context_window;

  if (inputTokens && contextWindow) {
    const usage = inputTokens / contextWindow;
    const pct = Math.round(usage * 100);

    if (usage >= cfg.block_threshold) {
      let message = `\u{1F6D1} Contexto em ${pct}%. Rode /compact antes de continuar.\n`;

      if (cfg.strategic_compact) {
        message += '\nO que preservar:\n';

        // Task hint from session state (saved by pre-execution-gate / keyword-detector)
        try {
          const session = JSON.parse(readFileSync(resolveBotPath('.hook-session.json'), 'utf-8'));
          if (session.last_prompt) {
            message += `- Task atual: "${session.last_prompt}"\n`;
          }
        } catch {}

        // Files edited this session
        try {
          const diff = execSync('git diff --name-only HEAD', { encoding: 'utf-8', timeout: 3000 }).trim();
          if (diff) {
            const files = diff.split('\n').slice(0, 5).join(', ');
            message += `- Arquivos editados: ${files}\n`;
          }
        } catch {}

        // Working set decisions
        try {
          const ws = JSON.parse(readFileSync(resolveBotPath('.working-set.json'), 'utf-8'));
          if (ws.decisions && ws.decisions.length > 0) {
            message += `- Decisoes pendentes: ${ws.decisions.slice(0, 2).join('; ')}\n`;
          }
        } catch {}

        message += '\nO que pode ser descartado:\n';
        message += '- Exploracao de codigo ja concluida\n';
        message += '- Outputs de ferramentas ja processados\n';
        message += `- Block ${blocks + 1}/${cfg.max_blocks_per_session} desta sessao`;
      }

      try {
        mkdirSync('.bot', { recursive: true });
        writeFileSync(blockFile, JSON.stringify({ count: blocks + 1 }));
      } catch {}

      process.stdout.write(JSON.stringify({
        continue: false,
        hookSpecificOutput: { additionalContext: message }
      }));
      process.exit(0);
    }

    // Proactive warning: non-blocking, fires between warn_threshold and block_threshold
    if (cfg.strategic_compact && usage >= cfg.warn_threshold) {
      let taskHint = '';
      try {
        const session = JSON.parse(readFileSync(resolveBotPath('.hook-session.json'), 'utf-8'));
        if (session.last_prompt) taskHint = ` Foco atual: "${session.last_prompt}".`;
      } catch {}

      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          additionalContext: `\u26A0 Contexto em ${pct}%. Considere /compact em breve.${taskHint} Preserve o foco atual e descarte exploracao anterior.`
        }
      }));
      process.exit(0);
    }
  }

  // Fallback reminder when stopping without token data
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      additionalContext: `[ContextGuard] Stopping. If context feels high (10+ messages since last /compact), consider /compact first. If pipeline is active, complete current stage.`
    }
  }));
});
```

- [ ] **Step 3: Add last_prompt saving to pre-execution-gate.mjs**

After the existing imports, add `writeFileSync` and `mkdirSync` to the fs import:

```js
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { readHookConfig, isHookDisabled } from './utils.mjs';
```

Inside the `stdin 'end'` handler, after `const prompt = (input.prompt || '').trim();`, add:

```js
  // Save last_prompt for context-guard-stop strategic compact
  try {
    const sessionPath = '.bot/.hook-session.json';
    let session = {};
    try { session = JSON.parse(readFileSync(sessionPath, 'utf-8')); } catch {}
    session.last_prompt = prompt.slice(0, 80).replace(/\s+/g, ' ').trim();
    mkdirSync('.bot', { recursive: true });
    writeFileSync(sessionPath, JSON.stringify(session));
  } catch {}
```

- [ ] **Step 4: Test proactive warning (50-74%)**

```bash
echo '{"input_tokens": 110000, "context_window": 200000}' | node hooks/scripts/context-guard-stop.mjs
```

Expected: `{"continue":true,...}` with `⚠ Contexto em 55%. Considere /compact em breve.`

- [ ] **Step 5: Test block with strategic message (≥75%)**

```bash
echo '{"input_tokens": 160000, "context_window": 200000}' | node hooks/scripts/context-guard-stop.mjs
```

Expected: `{"continue":false,...}` with `🛑 Contexto em 80%. Rode /compact antes de continuar.` and preservation hints

- [ ] **Step 6: Test that context_limit reason is never blocked**

```bash
echo '{"input_tokens": 200000, "context_window": 200000, "reason": "context_limit"}' | node hooks/scripts/context-guard-stop.mjs
```

Expected: `{"continue":true}` (no block even at 100%)

- [ ] **Step 7: Commit**

```bash
git add hooks/scripts/context-guard-stop.mjs hooks/scripts/pre-execution-gate.mjs
git commit -m "feat: strategic compact — proactive warning at 50%, intelligent block at 75%

context-guard-stop now shows task hint, edited files, and working set at
block. Pre-execution-gate saves last_prompt to session state for context
hint in stop messages."
```

---

## Task 4: Confidence Scoring — keyword-detector.mjs

**Files:**
- Rewrite: `hooks/scripts/keyword-detector.mjs`

- [ ] **Step 1: Verify current behavior before rewrite**

Create a dummy learned skill to test with:
```bash
mkdir -p .bot/learned-skills
cat > .bot/learned-skills/test-prisma.md << 'EOF'
---
name: test-prisma-fix
triggers: [prisma, migration]
description: fix prisma migration issues
---
Run prisma migrate reset when migrations are out of sync.
EOF
echo '{"prompt": "fix prisma migration"}' | node hooks/scripts/keyword-detector.mjs
```

Expected: JSON with `additionalContext` containing `[LearnedSkill: test-prisma-fix]`

- [ ] **Step 2: Rewrite hooks/scripts/keyword-detector.mjs**

Full replacement:

```js
#!/usr/bin/env node
import {
  readFileSync, existsSync, readdirSync,
  writeFileSync, mkdirSync, renameSync
} from "fs";
import { join } from "path";
import { readHookConfig, resolveBotPath, isHookDisabled } from "./utils.mjs";

function sanitize(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/(?:[A-Za-z]:)?(?:\/|\\)[\w./\\-]+\.\w+/g, "")
    .replace(/\s+at\s+\w[\w.<>]+\s*\([^)]*\)/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\{[\s\S]{0,500}?\}/g, "");
}

const INFORMATIONAL_PATTERNS = [
  /o que [eé]/i, /como funciona/i, /explica/i, /explain/i,
  /what is/i, /how does/i, /what does/i, /tell me about/i,
  /what\s+(?:is|are|does)/i, /como usar/i, /para que serve/i,
];

function isInformational(text, keyword, windowSize = 80) {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return false;
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(text.length, idx + keyword.length + windowSize);
  const window = text.slice(start, end);
  return INFORMATIONAL_PATTERNS.some((p) => p.test(window));
}

function loadSkillTriggers() {
  const skills = [];
  const skillsDir = existsSync(resolveBotPath("skills"))
    ? resolveBotPath("skills")
    : "skills";
  if (!existsSync(skillsDir)) return skills;

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    try {
      const content = readFileSync(skillFile, "utf-8");
      const triggerMatch = content.match(/Trigger em:\s*"([^"]+)"/);
      if (!triggerMatch) continue;
      const triggers = triggerMatch[1].split(",").map((t) => t.trim().toLowerCase());
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : entry.name;
      skills.push({ id: entry.name, name, triggers });
    } catch {}
  }
  return skills;
}

function summarizeLearnedSkill(content) {
  const body = content
    .replace(/^---[\s\S]*?---\n?/, "")
    .trim();
  const bullets = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- ") || l.startsWith("* "))
    .slice(0, 3);
  if (bullets.length > 0) return bullets.join("\n");
  return body
    .split(/\n\s*\n/)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");
}

function parseFrontmatter(content) {
  if (!content.startsWith("---\n")) return null;
  const endIdx = content.indexOf("\n---", 4);
  if (endIdx === -1) return null;
  return content.slice(4, endIdx);
}

function updateFrontmatter(content, updates) {
  if (!content.startsWith("---\n")) return content;
  const endIdx = content.indexOf("\n---", 4);
  if (endIdx === -1) return content;
  let fm = content.slice(4, endIdx);
  const body = content.slice(endIdx + 4);
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}:.*$`, "m");
    if (regex.test(fm)) {
      fm = fm.replace(regex, `${key}: ${value}`);
    } else {
      fm += `\n${key}: ${value}`;
    }
  }
  return `---\n${fm}\n---${body}`;
}

function weeksAgo(dateStr) {
  if (!dateStr) return 0;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return 0;
  return Math.max(0, (Date.now() - then.getTime()) / (1000 * 60 * 60 * 24 * 7));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadLearnedSkills(learnedDir, scoringCfg) {
  const learned = [];
  if (!existsSync(learnedDir)) return learned;

  const archiveDir = join(learnedDir, scoringCfg.archive_dir || ".archive");
  const initialScore = scoringCfg.initial_score ?? 0.7;
  const decayPerWeek = scoringCfg.decay_per_week ?? 0.1;
  const archiveThreshold = scoringCfg.archive_threshold ?? 0.3;

  let files;
  try { files = readdirSync(learnedDir); } catch { return learned; }

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const filePath = join(learnedDir, file);

    try {
      let content = readFileSync(filePath, "utf-8");
      const triggersMatch = content.match(/^triggers:\s*\[([^\]]+)\]/m);
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*(.+)$/m);
      if (!triggersMatch || !nameMatch) continue;

      // Parse score fields with migration for missing ones
      const scoreMatch = content.match(/^score:\s*([\d.]+)/m);
      const lastUsedMatch = content.match(/^last_used:\s*(.+)$/m);
      const createdMatch = content.match(/^created:\s*(.+)$/m);
      const usesMatch = content.match(/^uses:\s*(\d+)/m);

      const needsMigration = !scoreMatch;
      if (needsMigration) {
        // Add scoring fields to frontmatter
        content = updateFrontmatter(content, {
          score: initialScore,
          last_used: today(),
          created: today(),
          uses: 0,
        });
        try { writeFileSync(filePath, content); } catch {}
      }

      const score = scoreMatch ? parseFloat(scoreMatch[1]) : initialScore;
      const lastUsed = lastUsedMatch ? lastUsedMatch[1].trim() : today();
      const uses = usesMatch ? parseInt(usesMatch[1], 10) : 0;

      // Calculate effective score with temporal decay
      const effectiveScore = score - weeksAgo(lastUsed) * decayPerWeek;

      // Auto-archive if below threshold
      if (effectiveScore < archiveThreshold) {
        try {
          mkdirSync(archiveDir, { recursive: true });
          renameSync(filePath, join(archiveDir, file));
        } catch {}
        continue;
      }

      const triggers = triggersMatch[1]
        .split(",")
        .map((t) => t.replace(/['"]/g, "").trim().toLowerCase());

      learned.push({
        name: nameMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : "",
        triggers,
        summary: summarizeLearnedSkill(content),
        effectiveScore,
        score,
        lastUsed,
        uses,
        filePath,
      });
    } catch {}
  }

  // Sort by effective score descending — highest confidence first
  return learned.sort((a, b) => b.effectiveScore - a.effectiveScore);
}

function getSessionState() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8"));
  } catch {
    return {};
  }
}

function saveSessionState(state) {
  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    writeFileSync(resolveBotPath(".hook-session.json"), JSON.stringify(state));
  } catch {}
}

function updateSkillOnUse(filePath, skill, boostOnUse) {
  try {
    const content = readFileSync(filePath, "utf-8");
    const newScore = Math.min(1.0, skill.score + boostOnUse);
    const updated = updateFrontmatter(content, {
      score: newScore.toFixed(2),
      last_used: today(),
      uses: skill.uses + 1,
    });
    writeFileSync(filePath, updated);
  } catch {}
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { inputBuffer += chunk; });

process.stdin.on("end", () => {
  if (isHookDisabled("keyword-detector")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try { input = JSON.parse(inputBuffer); } catch {}

  const cfg = readHookConfig("keyword_detector", {
    max_learned_skills_per_session: 3,
    informational_context_window: 80,
  });
  const scoringCfg = readHookConfig("learned_skills_scoring", {
    initial_score: 0.7,
    boost_on_use: 0.1,
    decay_per_week: 0.1,
    archive_threshold: 0.3,
    archive_dir: ".archive",
  });

  const prompt = input.prompt || "";
  const clean = sanitize(prompt);

  // Save last_prompt for context-guard-stop strategic compact
  const session = getSessionState();
  session.last_prompt = prompt.slice(0, 80).replace(/\s+/g, " ").trim();
  const injectedThisSession = session.injected || [];
  const additionalContextParts = [];

  const learnedDir = existsSync(resolveBotPath("learned-skills"))
    ? resolveBotPath("learned-skills")
    : null;
  const learnedSkills = learnedDir ? loadLearnedSkills(learnedDir, scoringCfg) : [];

  let learnedCount = injectedThisSession.filter((n) => n.startsWith("learned:")).length;
  const maxLearned = cfg.max_learned_skills_per_session || 3;
  const infoWindow = cfg.informational_context_window || 80;

  for (const learnedSkill of learnedSkills) {
    if (learnedCount >= maxLearned) break;
    const key = `learned:${learnedSkill.name}`;
    if (injectedThisSession.includes(key)) continue;

    const matched = learnedSkill.triggers.some((trigger) => {
      if (!clean.toLowerCase().includes(trigger)) return false;
      return !isInformational(clean, trigger, infoWindow);
    });
    if (!matched) continue;

    additionalContextParts.push(
      `[LearnedSkill: ${learnedSkill.name}] ${learnedSkill.description}\n${learnedSkill.summary}`
    );
    injectedThisSession.push(key);
    learnedCount++;

    // Boost score on successful injection
    if (learnedSkill.filePath) {
      updateSkillOnUse(learnedSkill.filePath, learnedSkill, scoringCfg.boost_on_use ?? 0.1);
    }
  }

  const skills = loadSkillTriggers();
  for (const skill of skills) {
    const matched = skill.triggers.some((trigger) => {
      if (!clean.toLowerCase().includes(trigger)) return false;
      return !isInformational(clean, trigger, infoWindow);
    });
    if (!matched) continue;
    additionalContextParts.push(
      `[SkillDetected: ${skill.id}] Trigger matched for "${skill.name}". Use this skill for the current task.`
    );
    break;
  }

  session.injected = injectedThisSession;
  saveSessionState(session);

  if (additionalContextParts.length > 0) {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          additionalContext: additionalContextParts.join("\n\n---\n\n"),
        },
      })
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
```

- [ ] **Step 3: Test learned skill injection with existing skill (no score — migration path)**

```bash
echo '{"prompt": "fix prisma migration"}' | node hooks/scripts/keyword-detector.mjs
```

Expected: JSON with `[LearnedSkill: test-prisma-fix]` + the skill file at `.bot/learned-skills/test-prisma.md` now has `score: 0.8` (initial 0.7 + boost 0.1) and `uses: 1`

- [ ] **Step 4: Verify score is in the migrated file**

```bash
head -10 .bot/learned-skills/test-prisma.md
```

Expected: frontmatter with `score: 0.8`, `last_used: 2026-04-11`, `uses: 1`

- [ ] **Step 5: Test auto-archive by setting score below threshold**

```bash
# Set score to 0.2 and last_used to 4 weeks ago to force archive
cat > .bot/learned-skills/test-stale.md << 'EOF'
---
name: stale-skill
triggers: [prisma]
description: old skill
score: 0.2
last_used: 2026-03-01
created: 2026-02-01
uses: 0
---
This is a stale skill.
EOF
echo '{"prompt": "prisma query"}' | node hooks/scripts/keyword-detector.mjs
ls .bot/learned-skills/.archive/ 2>/dev/null && echo "archived" || echo "not archived"
```

Expected: `test-stale.md` moved to `.bot/learned-skills/.archive/`, output only contains `test-prisma-fix` (or nothing if already processed)

- [ ] **Step 6: Clean up test artifacts**

```bash
rm -f .bot/learned-skills/test-prisma.md
rm -f .bot/learned-skills/.archive/test-stale.md
rm -rf .bot/
```

- [ ] **Step 7: Commit**

```bash
git add hooks/scripts/keyword-detector.mjs
git commit -m "feat: confidence scoring for learned-skills in keyword-detector

Score tracking with boost on use (0.1), temporal decay (0.1/week),
auto-archive below 0.3. Skills sorted by effective score before
injection. Migrates existing skills without score to initial_score 0.7.
Also saves last_prompt to session state for strategic compact."
```

---

## Task 5: Search-First Policy + Orchestrator Integration

**Files:**
- Create: `policies/search-first.md`
- Modify: `skills/09-orchestrator/SKILL.md`

- [ ] **Step 1: Create policies/search-first.md**

```markdown
# Search-First Policy

Antes de implementar, pesquise.

## A Regra

Toda task de implementacao, integracao ou refactor exige pelo menos uma etapa de pesquisa antes de escrever codigo. O objetivo e entender o estado atual antes de mudar qualquer coisa.

## Pesquisa Minima por Tipo de Task

| Tipo | Pesquisa obrigatoria |
|---|---|
| Nova feature | `docs/repo-audit/current.md` + patterns similares no codigo + docs da lib (Context7) |
| Bug fix | logs/stack trace + ocorrencias do pattern (Grep) + fluxo de execucao antes de mudar |
| Integracao | docs da API/lib (Context7 ou web) + versao instalada + exemplos de uso |
| Refactor | mapear dependencias (Grep usages) + entender impacto em tests + surface de API |
| Migracao | `docs/repo-audit/current.md` + mapeamento completo de referencias + risco de rollback |

## Como Executar a Pesquisa

**Fontes internas (preferencia):**

1. `docs/repo-audit/current.md` — estado atual do repo, stack, convencoes
2. `docs/repo-audit/assets.md` — assets visuais e tokens
3. `docs/context/` — foco atual, working set, decisoes recentes
4. Glob + Grep no codigo — patterns existentes, convencoes, dependencias

**Fontes externas (quando necessario):**

1. Context7 MCP — documentacao atualizada de libs (`mcp__context7__resolve-library-id` + `mcp__context7__query-docs`)
2. Web search — APIs externas, breaking changes, exemplos da comunidade
3. Playwright MCP — inspecionar UI em producao ou staging antes de mudar comportamento visual

## Output da Pesquisa

Nao e necessario criar documento formal. O resultado e contexto acumulado usado na task.

Se a pesquisa revelar algo nao-obvio e reutilizavel (padroes do projeto, gotchas de libs, decisoes de arquitetura), persistir em `docs/context/` ou salvar como learned skill.

## Excecoes

- Hotfixes criticos com fix trivial e isolado (ex: typo, config errada, valor hardcoded)
- Tasks puramente mecanicas sem dependencias (renomear variavel, atualizar microcopy)

## Integracao com Orchestrator

O Orchestrator (skill 09) executa pesquisa como etapa obrigatoria do protocolo de execucao para tasks de implementacao, integracao e refactor. Ver `skills/09-orchestrator/SKILL.md`.

## Relacao com Outras Policies

- `policies/iterative-retrieval.md` — como estruturar a pesquisa em rounds progressivos quando o escopo e grande
- `policies/cost-optimization.md` — reutilizar repo-audit e working set evita releitura desnecessaria
```

- [ ] **Step 2: Add search step to skills/09-orchestrator/SKILL.md Protocolo de Execucao**

Read the current `## Protocolo de Execucao` section (lines 170-185 approximately) and add the search step after `classificar tipo e complexidade`:

Find the block:
```
Ao iniciar uma task:

- classificar tipo e complexidade
- mapear artefatos e dependencias existentes
- definir pipeline minimo suficiente
```

Replace with:
```
Ao iniciar uma task:

- classificar tipo e complexidade
- **pesquisar antes de implementar** (obrigatorio para implementacao, integracao, refactor — ver `policies/search-first.md`):
  - reutilizar `docs/repo-audit/current.md` se existir
  - buscar patterns similares no codigo (Glob/Grep)
  - consultar docs externas via Context7 MCP para libs envolvidas
  - hotfixes triviais e tasks mecanicas sao excecao
- mapear artefatos e dependencias existentes
- definir pipeline minimo suficiente
```

- [ ] **Step 3: Verify the edit looks correct**

```bash
grep -n "pesquisar antes" skills/09-orchestrator/SKILL.md
```

Expected: line number with `pesquisar antes de implementar`

- [ ] **Step 4: Commit**

```bash
git add policies/search-first.md skills/09-orchestrator/SKILL.md
git commit -m "feat: search-first policy + orchestrator integration

New policy/search-first.md defines mandatory research step per task type.
Orchestrator protocol updated to include search before implementation,
integration, and refactor tasks. Hotfixes and mechanical tasks are exempt."
```

---

## Task 6: Iterative Retrieval Policy

**Files:**
- Create: `policies/iterative-retrieval.md`

- [ ] **Step 1: Create policies/iterative-retrieval.md**

```markdown
# Iterative Retrieval Policy

Contexto em rounds progressivos — nao em dump completo.

## O Problema

Subagents e skills delegadas tendem a receber contexto de dois modos ruins:
- **Dump completo**: tudo de uma vez, consome tokens, polui contexto
- **Contexto insuficiente**: o agent fica cego e toma decisoes erradas

O pattern iterativo resolve: cada round pede o minimo necessario para o objetivo daquele round.

## O Pattern — 3 Rounds

### Round 1 — Orientacao (obrigatorio)

Objetivo: entender onde estou e o que e relevante.

- Ler `docs/repo-audit/current.md` (se existir) — estado do repo, stack, convencoes
- Glob para mapear estrutura de diretorios relevante para a task
- Identificar 3-5 arquivos-chave que precisam ser lidos

**Output**: lista dos arquivos-chave + gaps identificados.

### Round 2 — Foco (quando Round 1 identificar arquivos-chave)

Objetivo: entender o codigo relevante.

- Read dos arquivos-chave identificados no Round 1
- Grep por patterns especificos da task (dependencias, usages, interfaces)
- Mapear dependencias diretas que afetam a task

**Output**: contexto necessario para implementar OU nova lista de gaps.

### Round 3 — Profundidade (apenas se Round 2 tiver gaps)

Objetivo: resolver dependencias nao-obvias.

- Read de arquivos de dependencia identificados no Round 2
- Busca de tests relacionados para entender comportamento esperado
- Consulta de docs externas (Context7 MCP, web search) se lib envolvida

**Output**: contexto completo OU escalar para orchestrator se ainda insuficiente.

## Regras

1. **Maximo 3 rounds** — se apos 3 rounds o contexto ainda e insuficiente, escalar para o orchestrator com lista de gaps
2. **Cada round tem objetivo declarado** — diga qual e o objetivo antes de comecar o round
3. **Nao repetir reads** — arquivo ja lido nao e relido (a menos que tenha sido editado entre rounds)
4. **Handoff entre rounds** — termine cada round com gap list explicita
5. **Round 1 e sempre necessario** — mesmo para tasks "simples", o round de orientacao e obrigatorio
6. **Rounds 2 e 3 sao condicionais** — execute apenas se Round 1 identificou gaps reais

## Quando Aplicar

**Aplicavel a:**
- Subagents recebendo tasks de implementacao
- Skills delegadas pelo Orchestrator
- Qualquer operacao que precise de contexto de multiplos arquivos

**Nao aplicavel a:**
- Tasks triviais com 1 arquivo e scope totalmente claro
- Hotfixes isolados onde o arquivo a editar ja e conhecido
- Rounds adicionais quando o contexto ja e suficiente para agir

## Formato de Handoff Entre Rounds

Ao final de cada round, declare:

```
Round N completo.
Objetivo: [objetivo do round]
Contexto obtido: [lista do que foi lido/descoberto]
Gaps restantes: [lista do que ainda falta — ou "nenhum"]
Proximo round necessario: sim/nao
```

## Relacao com Outras Policies

- `policies/search-first.md` — define quando pesquisar; iterative-retrieval define como estruturar a pesquisa
- `policies/cost-optimization.md` — rounds progressivos evitam leitura desnecessaria de arquivos nao-relevantes
```

- [ ] **Step 2: Verify the file was created correctly**

```bash
head -5 policies/iterative-retrieval.md
```

Expected: `# Iterative Retrieval Policy`

- [ ] **Step 3: Commit**

```bash
git add policies/iterative-retrieval.md
git commit -m "feat: iterative retrieval policy for subagents and delegated skills

Defines 3-round progressive context pattern: orientation, focus, depth.
Maximum 3 rounds before escalating. Handoff format between rounds.
Complements search-first and cost-optimization policies."
```

---

## Task 7: README + Cross-references + Timestamp

**Files:**
- Modify: `README.md`
- Modify: `policies/cost-optimization.md`

- [ ] **Step 1: Read current README Hook System section**

```bash
grep -n "Hook System\|hook_profiles\|DEVKIT\|Learned Skills" README.md | head -20
```

- [ ] **Step 2: Update README — Hook System table add Profile column**

Find the hook table in README.md and replace it with the version that includes a Profile column. The current table is:

```markdown
| Hook | Evento | O que faz |
|------|--------|-----------|
| `pre-execution-gate` | UserPromptSubmit | detecta prompt vago e confirma antes de agir |
| `keyword-detector` | UserPromptSubmit | injeta skill ou learned skill relevante automaticamente |
| `context-guard-stop` | Stop | bloqueia stop quando contexto > 75%, sugere /compact |
| `persistent-mode` | Stop | bloqueia stop quando pipeline está ativo |
| `pre-tool-enforcer` | PreToolUse | re-lê antes de editar, sugere code intelligence tools |
| `session-start` | SessionStart | restaura estado da sessão anterior |
| `post-tool-verifier` | PostToolUse | detecta debugging patterns, sugere extração de learned skill |
| `model-routing-hook` | PreToolUse | sugere troca de modelo em plan mode e valida subagent spawns |
```

Replace with:

```markdown
| Hook | Evento | O que faz | Profile |
|------|--------|-----------|---------|
| `pre-execution-gate` | UserPromptSubmit | detecta prompt vago e confirma antes de agir | standard, strict |
| `keyword-detector` | UserPromptSubmit | injeta skill ou learned skill por keyword; confidence scoring e auto-archive | standard, strict |
| `context-guard-stop` | Stop | warning proativo em 50%, bloqueia stop em 75% com orientação inteligente | standard, strict |
| `persistent-mode` | Stop | bloqueia stop quando pipeline está ativo | standard, strict |
| `pre-tool-enforcer` | PreToolUse | re-lê antes de editar, sugere code intelligence tools | standard, strict |
| `session-start` | SessionStart | restaura estado da sessão anterior | standard, strict |
| `post-tool-verifier` | PostToolUse | detecta debugging patterns, sugere extração de learned skill | standard, strict |
| `model-routing-hook` | PreToolUse | sugere troca de modelo em plan mode e valida subagent spawns | standard, strict |

**Controle de profiles:**

```bash
# Perfil silencioso — desliga hooks de sugestão
export DEVKIT_HOOK_PROFILE=minimal

# Perfil agressivo — thresholds mais baixos
export DEVKIT_HOOK_PROFILE=strict

# Desligar hooks específicos sem mudar profile
export DEVKIT_DISABLED_HOOKS=keyword-detector,model-routing-hook
```

Profiles: `minimal` (desliga pre-execution-gate, keyword-detector, post-tool-verifier, model-routing-hook) | `standard` (padrão — todos ativos) | `strict` (todos ativos + thresholds mais baixos). Configurável em `hooks/config.json → hook_profiles`.
```

- [ ] **Step 3: Update README — Governance section add new policies**

Find the line `- \`policies/model-routing.md\`` in the Governance section and add below it:

```markdown
- `policies/search-first.md` — pesquisa obrigatória antes de implementar, integrar ou refatorar
- `policies/iterative-retrieval.md` — retrieval progressivo em rounds para subagents e skills delegadas
```

- [ ] **Step 4: Update README — Learned Skills section mention scoring**

Find the `**Learned Skills:**` paragraph and update it to:

```markdown
**Learned Skills:** `.bot/learned-skills/` acumula conhecimento específico do projeto — insights não-Googleáveis descobertos durante debugging. Injetados automaticamente em sessões futuras via keyword matching, ordenados por **confidence score** (boost ao ser usado, decay por semana sem uso, auto-archive abaixo de 0.3).
```

- [ ] **Step 5: Update README — Timestamp Log**

Add new entry at the end of the Timestamp Log section:

```markdown
### 2026-04-11

- adicionados hook profiles com controle por env var (`DEVKIT_HOOK_PROFILE`, `DEVKIT_DISABLED_HOOKS`) e config.json
- adicionado confidence scoring nos learned-skills: boost on use, decay temporal, auto-archive abaixo de threshold
- adicionada policy search-first com integração no orchestrator como etapa obrigatória
- adicionada policy iterative-retrieval para retrieval progressivo em subagents
- evoluído strategic compact: warning proativo em 50%, mensagem inteligente em 75% com task hint, arquivos editados e working set
```

- [ ] **Step 6: Update policies/cost-optimization.md — add cross-references**

Find the section about token reduction strategies and add after the last bullet:

```markdown
- seguir `policies/search-first.md` antes de implementar — evita retrabalho por contexto insuficiente
- usar `policies/iterative-retrieval.md` em subagents — retrieval em rounds evita dump desnecessario de contexto
```

- [ ] **Step 7: Verify README renders correctly**

```bash
grep -c "search-first\|iterative-retrieval\|DEVKIT_HOOK_PROFILE\|confidence score" README.md
```

Expected: 4 (each term appears at least once)

- [ ] **Step 8: Commit**

```bash
git add README.md policies/cost-optimization.md
git commit -m "docs: update README with hook profiles, confidence scoring, new policies, timestamp

Hook system table gains Profile column. Governance section lists
search-first and iterative-retrieval policies. Learned Skills section
mentions confidence scoring. Timestamp log entry for 2026-04-11."
```

---

## Self-Review Checklist

Before considering the plan complete, verify:

- [ ] Task 1 (utils.mjs): `getActiveProfile`, `isHookDisabled`, `getProfileOverrides` are all exported and `readHookConfig` is updated to apply profile overrides
- [ ] Task 2 (guards): all 8 hooks import `isHookDisabled` and check it at the top of the stdin handler
- [ ] Task 3 (strategic compact): warn fires between `warn_threshold` and `block_threshold`; block fires at `block_threshold`; `context_limit` reason always passes through
- [ ] Task 4 (confidence scoring): `loadLearnedSkills` sorts by `effectiveScore`, migrates missing frontmatter, auto-archives below threshold, updates frontmatter on use
- [ ] Task 5 (search-first): policy file created, orchestrator skill updated
- [ ] Task 6 (iterative retrieval): policy file created
- [ ] Task 7 (README): hook table has Profile column, new policies in Governance, timestamp entry present
