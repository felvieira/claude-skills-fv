#!/usr/bin/env node
/**
 * log-conflict-decision.mjs — telemetry of trade-off resolution (v2.7.1+)
 *
 * Records when the model resolves a conflict between policies/sensors.
 * Data accumulates in .bot/conflict-decisions.jsonl for /savings to report
 * (v2.8.0 will surface "N conflicts resolved" + recurring conflicts as
 * candidates for new Casos Resolvidos in policies/trade-off-resolution.md).
 *
 * Usage:
 *   node scripts/log-conflict-decision.mjs \
 *     --conflict "token-efficiency.md,dense-output-mode.md" \
 *     --resolution "case-1-canonical" \
 *     --outcome "applied"
 *
 *   node scripts/log-conflict-decision.mjs \
 *     --conflict "source-driven.md,senior-dev-override" \
 *     --resolution "ad-hoc" \
 *     --user-consulted true \
 *     --outcome "user_chose_senior_override" \
 *     --context "fix obvio de smell em src/auth.ts:42"
 *
 * Resolution values (one of):
 *   case-N-canonical   — applied a resolved case from trade-off-resolution.md
 *   hierarchy          — used hierarchy alone (constitution > GLOBAL > etc)
 *   ad-hoc             — asked user via AskUserQuestion
 *
 * Outcome values:
 *   applied            — model applied resolution and user did not revert
 *   reverted           — user reverted the resolution in subsequent turn
 *   user_chose_<X>     — user picked X when asked
 *   pending            — too early to tell
 *
 * Best-effort. Fails open. Never blocks the model.
 */

import { appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// ─── CLI parsing ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function findProjectRoot() {
  // Walk up looking for .bot, .git, or package.json
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, ".bot")) ||
        existsSync(join(dir, ".git")) ||
        existsSync(join(dir, "package.json"))) {
      return dir;
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv.slice(2));

if (!args.conflict || !args.resolution || !args.outcome) {
  process.stderr.write(`Usage: log-conflict-decision.mjs --conflict A,B --resolution X --outcome Y [--user-consulted true] [--context "..."]\n`);
  process.exit(1);
}

const conflictParts = String(args.conflict).split(",").map(s => s.trim()).filter(Boolean);
if (conflictParts.length < 2) {
  process.stderr.write(`Conflict must list at least 2 policies/sensors (comma-separated)\n`);
  process.exit(1);
}

const record = {
  ts: new Date().toISOString(),
  conflict: conflictParts,
  resolution: String(args.resolution),
  outcome: String(args.outcome),
};
if (args["user-consulted"]) record.user_consulted = args["user-consulted"] === "true" || args["user-consulted"] === true;
if (args.context) record.context = String(args.context).slice(0, 200);

const root = findProjectRoot();
const botDir = join(root, ".bot");
try {
  mkdirSync(botDir, { recursive: true });
  const path = join(botDir, "conflict-decisions.jsonl");
  appendFileSync(path, JSON.stringify(record) + "\n", "utf-8");
  process.stdout.write(`Logged conflict decision: ${conflictParts.join(" vs ")} → ${record.resolution} (${record.outcome})\n`);
} catch (err) {
  process.stderr.write(`Failed to log conflict (non-fatal): ${err.message}\n`);
  process.exit(0); // fail-open
}
