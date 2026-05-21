#!/usr/bin/env node
/**
 * evals/policies/self-correcting-sensors/run-eval.mjs
 *
 * Runs the self-correcting sensors eval suite against actual hook scripts.
 *
 * For each case in golden.json:
 *   1. Load the matching fixture payload
 *   2. Pipe it into the hook script via stdin
 *   3. Check stdout for expected substrings (Where/Why/Fix/References + case-specific)
 *
 * Exit code 0 = all pass. Exit code 1 = any case failed.
 *
 * Run from repo root:
 *   node evals/policies/self-correcting-sensors/run-eval.mjs
 *
 * Output: markdown report on stdout. Detail per case in stderr.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, unlinkSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "../../..");
const FIXTURES_DIR = join(__dirname, "fixtures");
const GOLDEN_PATH = join(__dirname, "golden.json");

function loadGolden() {
  return JSON.parse(readFileSync(GOLDEN_PATH, "utf-8"));
}

function loadFixture(relPath) {
  const full = join(__dirname, relPath);
  if (!existsSync(full)) return null;
  return readFileSync(full, "utf-8");
}

function runHook(hookName, fixturePayload) {
  const hookPath = join(REPO_ROOT, "hooks", "scripts", `${hookName}.mjs`);
  if (!existsSync(hookPath)) {
    return { ok: false, stdout: "", stderr: `hook script not found: ${hookPath}` };
  }

  // Some hooks check enabled flag in hooks/config.json. We force-enable via env.
  const env = {
    ...process.env,
    DEVKIT_DISABLED_HOOKS: "",
    DEVKIT_HOOK_PROFILE: "standard",
  };

  const result = spawnSync("node", [hookPath], {
    input: fixturePayload,
    cwd: REPO_ROOT,
    env,
    encoding: "utf-8",
    timeout: 5000,
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    status: result.status,
  };
}

/**
 * Per-hook side-state setup. Returns a cleanup function (callback) that the
 * caller MUST call in a finally{} regardless of test outcome, to leave the
 * repo in the original state.
 *
 * Why: some hooks only fire if external state exists (e.g., persistent-mode
 * reads .bot/docs/context/pipeline-active.json; ai-writing-detector reads
 * hooks/config.json for the `enabled` flag).
 */
function setupTestSideState(hookName) {
  const cleanupActions = [];

  if (hookName === "persistent-mode") {
    const stateDir = join(REPO_ROOT, ".bot", "docs", "context");
    const stateFile = join(stateDir, "pipeline-active.json");
    const existed = existsSync(stateFile);
    const backupPath = stateFile + ".eval-backup";
    if (existed) copyFileSync(stateFile, backupPath);

    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      stateFile,
      JSON.stringify({
        active: true,
        pipeline: "eval-fixture-pipeline",
        current_step: 3,
        total_steps: 7,
        next_step: "validate",
      })
    );

    cleanupActions.push(() => {
      try {
        if (existed) {
          copyFileSync(backupPath, stateFile);
          unlinkSync(backupPath);
        } else {
          if (existsSync(stateFile)) unlinkSync(stateFile);
        }
      } catch {}
    });
  }

  if (hookName === "ai-writing-detector") {
    // Patch the actual config path that utils.mjs resolves to. The resolver
    // prefers .bot/hooks/config.json over hooks/config.json — patch both
    // candidates to cover the case.
    const candidatePaths = [
      join(REPO_ROOT, ".bot", "hooks", "config.json"),
      join(REPO_ROOT, "hooks", "config.json"),
    ];
    for (const cfgPath of candidatePaths) {
      if (!existsSync(cfgPath)) continue;
      const original = readFileSync(cfgPath, "utf-8");
      try {
        const cfg = JSON.parse(original);
        cfg.ai_writing_detector = { ...(cfg.ai_writing_detector || {}), enabled: true };
        writeFileSync(cfgPath, JSON.stringify(cfg));
        cleanupActions.push(() => {
          try { writeFileSync(cfgPath, original); } catch {}
        });
      } catch {
        // bad config — leave alone
      }
    }
  }

  if (hookName === "conflict-resolution-reminder") {
    // Throttle file may cause subsequent runs to be silenced. Reset it.
    const throttle = join(REPO_ROOT, ".bot", ".conflict-reminder.json");
    if (existsSync(throttle)) {
      try { unlinkSync(throttle); } catch {}
    }
    cleanupActions.push(() => {
      try {
        if (existsSync(throttle)) unlinkSync(throttle);
      } catch {}
    });
  }

  if (hookName === "context-guard-stop") {
    // context-guard-stop limits to max_blocks_per_session=2. Eval reruns hit
    // this ceiling. Reset the counter before each run.
    const blockFile = join(REPO_ROOT, ".bot", ".context-guard-blocks.json");
    if (existsSync(blockFile)) {
      try { unlinkSync(blockFile); } catch {}
    }
    cleanupActions.push(() => {
      try {
        if (existsSync(blockFile)) unlinkSync(blockFile);
      } catch {}
    });
  }

  return () => cleanupActions.forEach((fn) => fn());
}

function checkExpectations(stdout, expect) {
  const errors = [];

  if (Array.isArray(expect.stdout_contains_all)) {
    for (const needle of expect.stdout_contains_all) {
      if (!stdout.includes(needle)) {
        errors.push(`missing substring: "${needle}"`);
      }
    }
  }

  if (expect.stdout_decision_block) {
    try {
      const parsed = JSON.parse(stdout);
      if (parsed.decision !== "block") {
        errors.push(`expected decision="block", got decision="${parsed.decision || "<none>"}"`);
      }
    } catch {
      errors.push(`stdout is not valid JSON (required for decision_block check)`);
    }
  }

  return errors;
}

function main() {
  const golden = loadGolden();
  const results = [];

  for (const tc of golden.cases) {
    const payload = loadFixture(tc.fixture);
    if (payload === null) {
      results.push({
        id: tc.id,
        hook: tc.hook,
        pass: false,
        skipped: true,
        reason: `fixture missing: ${tc.fixture}`,
      });
      continue;
    }

    // Some hooks require side-state to fire properly. Set up + tear down per case.
    const isOptInHook = ["ai-writing-detector", "conflict-resolution-reminder"].includes(tc.hook);
    const setupCleanup = setupTestSideState(tc.hook);

    let run;
    try {
      run = runHook(tc.hook, payload);
    } finally {
      setupCleanup();
    }
    if (!run.ok) {
      results.push({
        id: tc.id,
        hook: tc.hook,
        pass: false,
        reason: `hook exited with status ${run.status}: ${run.stderr.slice(0, 200)}`,
      });
      continue;
    }

    const errors = checkExpectations(run.stdout, tc.expect);

    if (errors.length === 0) {
      results.push({ id: tc.id, hook: tc.hook, pass: true });
    } else {
      results.push({
        id: tc.id,
        hook: tc.hook,
        pass: false,
        errors,
        stdout_excerpt: run.stdout.slice(0, 300),
        opt_in: isOptInHook,
      });
    }
  }

  // Report
  const passed = results.filter((r) => r.pass).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.length - passed - skipped;

  process.stdout.write(`# Self-Correcting Sensors Eval\n\n`);
  process.stdout.write(`**${passed}/${results.length} passed** (${failed} failed, ${skipped} skipped)\n\n`);
  process.stdout.write(`| Case | Hook | Result | Notes |\n`);
  process.stdout.write(`|---|---|---|---|\n`);
  for (const r of results) {
    const icon = r.skipped ? "⏭" : r.pass ? "✅" : "❌";
    const notes = r.skipped
      ? r.reason
      : r.pass
      ? "all expectations met"
      : (r.opt_in ? "(opt-in hook — may require config.enabled=true) " : "") + (r.errors || []).join("; ");
    process.stdout.write(`| ${r.id} | ${r.hook} | ${icon} | ${notes} |\n`);
  }
  process.stdout.write(`\n`);

  if (failed > 0) {
    process.stderr.write(`\n--- Detail per failed case ---\n`);
    for (const r of results.filter((x) => !x.pass && !x.skipped)) {
      process.stderr.write(`\n[${r.id}] ${r.hook}\n`);
      process.stderr.write(`  errors: ${(r.errors || []).join(", ")}\n`);
      process.stderr.write(`  stdout (first 300): ${r.stdout_excerpt || "(empty)"}\n`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
