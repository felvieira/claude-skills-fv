# Auto-Loop v2 — Gap Fixes Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement this plan task-by-task.

**Goal:** Close 6 known gaps in auto-loop v2 so it ships production-ready: codex CLI E2E, polish skill loading verification, worktree+runner integration smoke, parallel summary populated, git hygiene, and one real-task E2E run.

**Architecture:** Each gap maps to a self-contained task with concrete files and acceptance criteria. Most are testable without invoking real LLMs (mock or local fixture). The single token-burning task (E2E with real claude/codex) is gated behind explicit user approval at run time.

**Tech Stack:** Node 18+, native test runner pattern (smoke tests in `scripts/tests/auto-loop/test-*.mjs`), git worktree, Windows + macOS + Linux.

---

## Gap inventory & fix strategy

| # | Gap | Fix strategy | Cost |
|---|-----|--------------|------|
| 1 | Codex adapter never called real `codex exec` | E2E test with **fake codex** binary (CLI shim) — proves spawn/parse path without burning tokens | low |
| 2 | Polish pass not E2E with real agent | Verify `loadSkillPrompt` finds every referenced skill on disk; add fixture test exercising full polish loop with mockAgent that simulates real output shape | low |
| 3 | Worktree mode not integrated with runner | Add E2E smoke that runs `runOnce` with `_testAgent` + `--worktree`, asserts worktree created, branch `auto/<slug>` exists, cleanup happens | low |
| 4 | Parallel summary shows `-` for iters/commits/path | Add status JSON write at runner end → parallel parent reads it → table populated | medium |
| 5 | `--push` not done; branch fingerprint orphan | Document cleanup path in CHANGELOG + add `npm run clean:branches` helper or just doc | trivial |
| 6 | No real task ever run end-to-end | One smoke run with the smallest possible task (`--polish=none --max-iterations 2`) against real claude CLI | tokens (~$0.10) |

---

## Task 1: Codex adapter E2E with fake binary

**Files:**
- Create: `scripts/tests/auto-loop/fixtures/fake-codex.mjs` (executable shim that mimics `codex exec --full-auto`)
- Create: `scripts/tests/auto-loop/test-agents-codex-e2e.mjs`

**Why:** Codex adapter `invoke()` was never executed. ENOENT will surface only at first real run. A fake codex CLI proves the spawn → parse → token-extract pipeline.

### Step 1: Write the fake codex binary

```js
#!/usr/bin/env node
// fixtures/fake-codex.mjs — minimal shim, behaves like `codex exec --full-auto <prompt>`
// Args layout: ['exec', '--full-auto', '<prompt>']
const args = process.argv.slice(2);
if (args[0] !== 'exec' || args[1] !== '--full-auto') {
  console.error('fake-codex: expected `exec --full-auto <prompt>`');
  process.exit(2);
}
const prompt = args[2] || '';

// Echo a deterministic response with a trailing JSON usage line.
process.stdout.write(`fake-codex received: ${prompt.slice(0, 60)}\n`);
process.stdout.write(`Implementation complete\n`);
process.stdout.write(JSON.stringify({
  usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 0 }
}) + '\n');
process.exit(0);
```

Make executable: `chmod +x scripts/tests/auto-loop/fixtures/fake-codex.mjs`

### Step 2: Write the E2E test

```js
#!/usr/bin/env node
// test-agents-codex-e2e.mjs — exercises codex.mjs via PATH override pointing at fake-codex.

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(__dirname, 'fixtures');

// Wrap the fake binary so PATH-based `codex` lookup finds it.
// Strategy: prepend fixture dir to PATH; fake-codex.mjs must be named `codex` (or `codex.cmd` on Win).

// On Windows we need a .cmd shim. Create one inline if missing.
import { existsSync, writeFileSync, chmodSync } from 'fs';
import { platform } from 'os';

function ensureShim() {
  if (platform() === 'win32') {
    const cmdPath = resolve(fixtureDir, 'codex.cmd');
    if (!existsSync(cmdPath)) {
      writeFileSync(cmdPath, `@echo off\r\nnode "${resolve(fixtureDir, 'fake-codex.mjs')}" %*\r\n`);
    }
  } else {
    const linkPath = resolve(fixtureDir, 'codex');
    if (!existsSync(linkPath)) {
      // Symlink or wrapper script.
      writeFileSync(linkPath, `#!/bin/sh\nexec node "${resolve(fixtureDir, 'fake-codex.mjs')}" "$@"\n`);
      chmodSync(linkPath, 0o755);
    }
  }
}

ensureShim();

// Now invoke the real codex adapter with PATH overridden.
process.env.PATH = `${fixtureDir}${platform() === 'win32' ? ';' : ':'}${process.env.PATH}`;

const codex = (await import('../../auto-loop/agents/codex.mjs')).default;

let passed = 0, failed = 0;
function assert(label, cond) {
  if (cond) { console.log(`  ✓ ${label}`); passed++; }
  else { console.log(`  ✗ ${label}`); failed++; }
}

console.log('Test: codex.invoke spawns fake codex and parses output');
const result = await codex.invoke({ prompt: 'hello world', timeout: 5000 });
assert('output non-empty', result.output && result.output.length > 0);
assert('output contains echo', result.output.includes('fake-codex received'));
assert('output contains completion marker', result.output.includes('Implementation complete'));
assert('status is 0', result.status === 0);
assert('tokens parsed', result.tokens && result.tokens.input === 100 && result.tokens.output === 50);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

### Step 3: Run

```
node scripts/tests/auto-loop/test-agents-codex-e2e.mjs
```

Expected: `5 passed, 0 failed`, exit 0.

### Step 4: Commit

```bash
git add scripts/tests/auto-loop/fixtures/ scripts/tests/auto-loop/test-agents-codex-e2e.mjs
git commit -m "test(auto-loop): codex adapter E2E with fake CLI shim"
```

---

## Task 2: Polish pass skill-loading verification

**Files:**
- Create: `scripts/tests/auto-loop/test-polish-skill-paths.mjs`
- Create: `scripts/tests/auto-loop/test-polish-e2e.mjs`

**Why:** `loadSkillPrompt` reads `skills/<dir>/SKILL.md`. If a referenced skill dir was renamed or its `SKILL.md` is missing, polish silently logs `'skill not found'` and marks `polishIncomplete: true`. Catch that now.

### Step 1: Verify all 4 referenced skill paths exist on disk

```js
#!/usr/bin/env node
// test-polish-skill-paths.mjs

import { existsSync, readFileSync } from 'fs';
import { SKILL_PATHS } from '../../auto-loop/polish.mjs';

let passed = 0, failed = 0;
function assert(label, cond) {
  if (cond) { console.log(`  ✓ ${label}`); passed++; }
  else { console.log(`  ✗ ${label}`); failed++; }
}

for (const [skillName, path] of Object.entries(SKILL_PATHS)) {
  const candidates = [`${path}/SKILL.md`, `${path}/skill.md`, `${path}/README.md`];
  const found = candidates.find(p => existsSync(p));
  assert(`skill '${skillName}' resolvable at ${path}`, !!found);
  if (found) {
    const body = readFileSync(found, 'utf-8');
    assert(`  '${skillName}' SKILL has non-empty body`, body.trim().length > 50);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

Run: `node scripts/tests/auto-loop/test-polish-skill-paths.mjs`. If any skill fails, fix `SKILL_PATHS` in `polish.mjs` to point at the right dir.

### Step 2: E2E with mockAgent that simulates real review output shape

```js
// test-polish-e2e.mjs

import { runPolishPass } from '../../auto-loop/polish.mjs';

// Mock that returns BLOCKING on first call, clean on retry.
let calls = 0;
const mockAgent = {
  name: 'mock',
  async invoke({ prompt }) {
    calls++;
    if (calls === 1) {
      return {
        output: `Reviewed code.\n\nBLOCKING: missing null check on user.id\nNON_BLOCKING: variable name could be clearer\n`,
        error: '', status: 0, tokens: null,
      };
    }
    return { output: 'Reviewed retry — looks clean.', error: '', status: 0, tokens: null };
  },
  isPermanentError: () => false,
  isRetryableError: () => false,
};

// Use 'standard' (simplify + review, 1 retry).
const result = await runPolishPass('standard', mockAgent, ['src/users.js']);

let passed = 0, failed = 0;
function assert(l, c) { if (c) { console.log(`  ✓ ${l}`); passed++; } else { console.log(`  ✗ ${l}`); failed++; } }

assert('result.complete is true (retry succeeded)', result.complete === true);
assert('polishIncomplete false', result.polishIncomplete === false);
assert('agent called more than once for retry', calls > 1);
assert('results array has both skills', result.results.length >= 2);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

### Step 3: Commit

```bash
git add scripts/tests/auto-loop/test-polish-skill-paths.mjs scripts/tests/auto-loop/test-polish-e2e.mjs
git commit -m "test(auto-loop): verify polish skill paths + E2E retry path"
```

---

## Task 3: Worktree+runner integration smoke

**Files:**
- Create: `scripts/tests/auto-loop/test-runner-worktree.mjs`

**Why:** runner.mjs imports `worktree.mjs` dynamically. The happy path (worktree created → runner runs inside it → cleanup) was never exercised.

### Step 1: Write integration test

```js
#!/usr/bin/env node
// test-runner-worktree.mjs — runs runOnce({worktree:true}) with mock agent in a temp git repo.

import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { join, resolve } from 'path';

const tmp = mkdtempSync(join(tmpdir(), 'al-rwt-'));
const repo = resolve(tmp, 'repo');
mkdirSync(repo);
const cwd0 = process.cwd();

try {
  // Init a fresh git repo with one commit.
  execSync('git init -q', { cwd: repo });
  execSync('git config user.email t@t', { cwd: repo });
  execSync('git config user.name t', { cwd: repo });
  execSync('git commit --allow-empty -q -m init', { cwd: repo });

  process.chdir(repo);

  const { runOnce } = await import('../../auto-loop/runner.mjs');

  const mockAgent = {
    name: 'mock',
    async invoke() {
      return { output: 'Implementation complete\nEXIT_SIGNAL: true', error: '', status: 0, tokens: null };
    },
    isPermanentError: () => false,
    isRetryableError: () => false,
  };

  const code = await runOnce({
    task: 'add a comment to README',
    agent: 'claude', model: 'x', maxIterations: 1, maxTokens: 0,
    stopWhen: '', polish: 'none', validate: false, noCommit: true,
    push: false, verbose: false, worktree: true, preventSleep: false,
  }, mockAgent);

  let passed = 0, failed = 0;
  function assert(l, c) { if (c) { console.log(`  ✓ ${l}`); passed++; } else { console.log(`  ✗ ${l}`); failed++; } }

  assert('runOnce returned 0', code === 0);

  // The worktree dir lives next to the repo.
  const wtRoot = resolve(tmp, 'repo-auto-worktrees');
  assert('worktree root created', existsSync(wtRoot));

  // Branch should exist on main repo.
  const branches = execSync('git branch --list "auto/*"', { cwd: repo, encoding: 'utf-8' });
  assert('auto/<slug> branch created', branches.includes('auto/'));

  console.log(`\n${passed} passed, ${failed} failed`);
  process.chdir(cwd0);
  process.exit(failed > 0 ? 1 : 0);
} catch (err) {
  console.error('Test failed:', err);
  process.chdir(cwd0);
  process.exit(1);
} finally {
  try { rmSync(tmp, { recursive: true, force: true }); } catch {}
}
```

### Step 2: Run, fix bugs surfaced

```
node scripts/tests/auto-loop/test-runner-worktree.mjs
```

Expected: 3/3 pass. If runner.mjs has a bug in the worktree happy path, this is where it surfaces.

### Step 3: Commit

```bash
git add scripts/tests/auto-loop/test-runner-worktree.mjs
git commit -m "test(auto-loop): runner+worktree happy path integration"
```

---

## Task 4: Parallel summary populated with iterations/commits/path

**Files:**
- Modify: `scripts/auto-loop/runner.mjs` — write `.auto/runs/<runId>/status.json` at end of run with `{iterations, commits, taskDone, taskBlocked, exitCode, worktreePath}`.
- Modify: `scripts/auto-loop/parallel.mjs` — after each child closes, find the most recent `status.json` in the child's worktree, parse it, populate the summary row.
- Modify: `scripts/tests/auto-loop/test-parallel.mjs` — add a case where the mock spawn writes a status.json and assert it's read.

### Step 1: runner writes status.json

In `runner.mjs`, just before final cleanup, add:

```js
// Write structured status for parallel parent / external tooling.
try {
  const statusPath = join(AUTO_DIR, 'runs', runId, 'status.json');
  writeFileSync(statusPath, JSON.stringify({
    runId,
    task: opts.task,
    iterations: iteration,
    commits: commitHash ? 1 : 0,
    commitHash,
    taskDone,
    taskBlocked,
    exitCode: finalCode, // already computed
    worktreePath,
    polishIncomplete,
    endedAt: new Date().toISOString(),
  }, null, 2));
} catch {}
```

### Step 2: parallel reads it

In `parallel.mjs` `runOne`, after `child.on('close', ...)`:

```js
child.on('close', async (code) => {
  let status = null;
  try {
    // Locate worktree dir: <baseRepo>-auto-worktrees/<slug>
    const wtBase = resolve(dirname(resolve(process.cwd())), `${basename(resolve(process.cwd()))}-auto-worktrees`);
    const wtPath = resolve(wtBase, slug);
    // Find most recent .auto/runs/*/status.json
    const runsDir = resolve(wtPath, '.auto', 'runs');
    if (existsSync(runsDir)) {
      const dirs = readdirSync(runsDir).sort().reverse();
      for (const d of dirs) {
        const sp = resolve(runsDir, d, 'status.json');
        if (existsSync(sp)) { status = JSON.parse(readFileSync(sp, 'utf-8')); break; }
      }
    }
  } catch {}

  resolvePromise({
    slug, task,
    exitCode: code ?? 0,
    iterations: status?.iterations ?? null,
    commits: status?.commits ?? null,
    path: status?.worktreePath ?? null,
  });
});
```

Add imports: `readdirSync`, `readFileSync`, `basename`, `dirname` from existing `fs`/`path`.

### Step 3: Update test

In `test-parallel.mjs`, in the runParallel-with-mock-spawn test, have the mock child write a fake status.json before close. Assert the summary row picks it up.

### Step 4: Run all tests

```
node scripts/tests/auto-loop/run-all.mjs
```

Expected: still all green, including the updated parallel test.

### Step 5: Commit

```bash
git add scripts/auto-loop/runner.mjs scripts/auto-loop/parallel.mjs scripts/tests/auto-loop/test-parallel.mjs
git commit -m "feat(auto-loop): runner emits status.json for parallel summary"
```

---

## Task 5: Branch hygiene + cleanup helper

**Files:**
- Modify: `CHANGELOG.md` — add Migration note about pre-merge branch + worktree cleanup.
- Modify: `.claude/commands/loop.md` — add "Cleanup" section.

**Why:** Local merged branches (e.g. `claude/affectionate-liskov-a8281d`) hang around because git refuses `-d` if not merged to remote tracking. Document the safe `-D` path.

### Step 1: Add to CHANGELOG.md under [2.0.0-auto-loop] → Migration

```markdown
- After merging an auto-loop branch locally, git may refuse `branch -d` because remote tracking is unaware of the merge. Use `git branch -D <branch>` once you've confirmed it's merged to main (`git log main --oneline | grep <branch>`).
- Worktrees created by `--worktree` are preserved if they have commits. Cleanup with the printed `git worktree remove ...` command, or `git worktree prune` to drop stale references after manual deletion.
```

### Step 2: Add to commands/loop.md (new section before "Referências")

```markdown
## Limpeza

Após uma run com `--worktree`, se você mergear a branch e quiser remover o worktree:

\`\`\`bash
# Remover worktree (preserve está no path impresso pelo runner)
git worktree remove "<path printed by runner>" --force

# Após delete manual ou merge, prune refs órfãos
git worktree prune

# Branch local merged em main mas remote ainda não sabe — force delete:
git branch -D auto/<slug>
\`\`\`
```

### Step 3: Commit

```bash
git add CHANGELOG.md .claude/commands/loop.md
git commit -m "docs(auto-loop): document branch + worktree cleanup paths"
```

---

## Task 6: Real-task E2E smoke (gated, costs tokens)

**Files:**
- Create: `scripts/tests/auto-loop/smoke-real.mjs` (manual / opt-in only)

**Why:** The pipeline never ran against a real LLM. This task does one tiny run to surface integration bugs.

### Step 1: Write the smoke script

```js
#!/usr/bin/env node
// smoke-real.mjs — opt-in real-LLM smoke test. Costs ~$0.05–0.20 in tokens.
// Usage: node scripts/tests/auto-loop/smoke-real.mjs

import { execSync, spawnSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const tmp = mkdtempSync(join(tmpdir(), 'al-smoke-'));
console.log(`Smoke test sandbox: ${tmp}`);

try {
  execSync('git init -q', { cwd: tmp });
  execSync('git config user.email s@s', { cwd: tmp });
  execSync('git config user.name smoke', { cwd: tmp });
  writeFileSync(join(tmp, 'README.md'), '# smoke\n\nTODO: add description here.\n');
  execSync('git add . && git commit -q -m init', { cwd: tmp });

  // Resolve auto-loop relative to this script.
  const repoRoot = resolve(import.meta.url.replace('file:///', '').replace(/\\/g, '/'), '../../../..');
  const autoLoop = resolve(repoRoot, 'scripts/auto-loop.mjs');

  console.log('\nRunning auto-loop with --polish=none --max-iterations=2 --no-commit...');
  const result = spawnSync('node', [
    autoLoop,
    'replace TODO with a one-sentence description in README.md',
    '--polish=none',
    '--max-iterations', '2',
    '--no-commit',
    '--no-prevent-sleep',
  ], { cwd: tmp, encoding: 'utf-8', timeout: 600_000, stdio: 'inherit' });

  console.log(`\nExit code: ${result.status}`);
  if (result.status === 0) {
    console.log('✓ Smoke pass: pipeline ran end-to-end without crashing.');
    process.exit(0);
  } else {
    console.log('✗ Smoke fail: non-zero exit. Investigate output above.');
    process.exit(1);
  }
} finally {
  // Don't auto-rm — leave sandbox for inspection.
  console.log(`\nSandbox left at ${tmp} for inspection. Remove manually when done.`);
}
```

### Step 2: Run (manual, only when ready)

```
node scripts/tests/auto-loop/smoke-real.mjs
```

Expected: exits 0, sandbox dir contains a `.auto/` with progress, plan, env, runs/<id>/debug.jsonl. README.md should have been edited.

### Step 3: If failures surface — fix in follow-up commits

Document each fix with its own commit. Re-run smoke until clean.

### Step 4: Commit script (success or not)

```bash
git add scripts/tests/auto-loop/smoke-real.mjs
git commit -m "test(auto-loop): real-LLM smoke test (opt-in, manual)"
```

---

## Execution order

Tasks 1, 2, 3 are **independent** — dispatch in parallel via subagents.
Task 4 modifies runner+parallel — needs sequential, after the parallel subagents land.
Task 5 is doc-only — sequential, fast.
Task 6 is **gated**: only run after asking the user to confirm token spend.

```
parallel (subagents):
  ├── Task 1 (codex E2E)
  ├── Task 2 (polish skill paths + E2E)
  └── Task 3 (worktree+runner)
       ↓
sequential (me):
  ├── Task 4 (status.json + parallel summary)
  ├── Task 5 (cleanup docs)
  └── Task 6 (smoke real, gated by user)
       ↓
final: run-all green, commit, summarize
```

## Acceptance (final)

- All 17 existing tests still green.
- 4 new test files added, all green: `test-agents-codex-e2e.mjs`, `test-polish-skill-paths.mjs`, `test-polish-e2e.mjs`, `test-runner-worktree.mjs`.
- Status JSON written by every successful run; parallel summary populates iters/commits/path.
- CHANGELOG + loop.md document branch and worktree cleanup.
- Smoke real ran at least once (or explicitly skipped by user).
