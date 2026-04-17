/**
 * suggestions-engine.ts — Smart suggestions logic for devkit_smart_suggestions.
 *
 * Combines project-state heuristics (repo audit, CLAUDE.md, tests, git log)
 * with event-log heuristics (seen_files, seen_errors, tool patterns).
 *
 * Exported as a pure function so it can be unit-tested and kept out of
 * the monolithic mcp-server/src/index.ts handler.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
  querySeenFiles,
  querySeenErrors,
  querySessionEvents,
} from "./event-log.js";

export type Priority = "high" | "medium" | "low";

export interface Suggestion {
  action: string;
  skill_number: string;
  skill_name: string;
  reason: string;
  priority: Priority;
}

export interface SuggestOptions {
  /** Consumer project root. */
  base: string;
  /** Free-form description of what the user is working on. */
  current_context?: string | null;
  /** Max number of suggestions returned. Defaults to 5. */
  cap?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function pathExists(p: string): Promise<boolean> {
  try { await fs.promises.access(p); return true; } catch { return false; }
}

// ─── Individual heuristics (small, testable) ────────────────────────────────

async function suggestIfNoAudit(base: string): Promise<Suggestion | null> {
  const hasAudit =
    (await pathExists(path.join(base, ".bot", "docs", "repo-audit", "current.md"))) ||
    (await pathExists(path.join(base, "docs", "repo-audit", "current.md")));
  if (hasAudit) return null;
  return {
    action: "Run Repo Auditor to map the project structure",
    skill_number: "18",
    skill_name: "repo-auditor",
    reason: "No repo audit found. This is the foundation for all other skills.",
    priority: "high",
  };
}

async function suggestIfClaudeMdWeak(base: string): Promise<Suggestion | null> {
  try {
    const c = await fs.promises.readFile(path.join(base, "CLAUDE.md"), "utf-8");
    if (c.length >= 200) return null;
  } catch { /* missing entirely */ }
  return {
    action: "Generate CLAUDE.md with project-specific instructions",
    skill_number: "28",
    skill_name: "claude-md-generator",
    reason: "CLAUDE.md is missing or too generic. A proper CLAUDE.md improves all agent interactions.",
    priority: "high",
  };
}

async function suggestIfNoTests(base: string): Promise<Suggestion | null> {
  const dirs = ["tests", "test", "__tests__", "spec", "e2e"];
  for (const d of dirs) if (await pathExists(path.join(base, d))) return null;
  return {
    action: "Create a test strategy and initial test suite",
    skill_number: "05",
    skill_name: "qa-testing",
    reason: "No tests directory found. A test strategy ensures code quality.",
    priority: "medium",
  };
}

function suggestIfUiContext(ctx: string): Suggestion | null {
  const c = ctx.toLowerCase();
  if (!(c.includes("ui") || c.includes("design") || c.includes("frontend") ||
        c.includes("layout") || c.includes("css"))) return null;
  return {
    action: "Run Design Intelligence for competitive analysis and design recommendations",
    skill_number: "29",
    skill_name: "design-intelligence",
    reason: "UI improvement context detected. Design Intelligence provides data-driven design decisions.",
    priority: "medium",
  };
}

function suggestIfRecentCommits(base: string): Suggestion | null {
  try {
    const recent = execSync("git log --oneline -5 --since='24 hours ago'", {
      cwd: base, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!recent) return null;
    return {
      action: "Run Security Review and Code Reviewer on recent changes",
      skill_number: "06, 11",
      skill_name: "security-review + reviewer",
      reason: "Recent code changes detected in the last 24h without review.",
      priority: "medium",
    };
  } catch { return null; }
}

// Event-log heuristics — return array because one source yields many signals
function eventLogSuggestions(base: string): Suggestion[] {
  const out: Suggestion[] = [];
  let seenFiles, seenErrors, allEvents;
  try {
    seenFiles  = querySeenFiles(base);
    seenErrors = querySeenErrors(base);
    allEvents  = querySessionEvents(base, { limit: 500 });
  } catch {
    return out; // events.jsonl unavailable
  }

  // Heuristic 1: auth reads without test edits → test-engineer
  const authReads = seenFiles.filter(f => /src[/\\]auth/i.test(f.path) && !f.modified);
  const testAuthEdits = seenFiles.filter(f => /tests?[/\\]auth/i.test(f.path) && f.modified);
  if (authReads.length >= 2 && testAuthEdits.length === 0) {
    out.push({
      action: "Dispatch test-engineer subagent to write auth tests",
      skill_number: "agent",
      skill_name: "test-engineer",
      reason: `Read ${authReads.length} auth file(s) but no test edits detected. Use: Task test-engineer`,
      priority: "high",
    });
  }

  // Heuristic 2: repeated errors → debugger
  const repeated = seenErrors.filter(e => e.count >= 2);
  if (repeated.length > 0) {
    out.push({
      action: `Dispatch debugger subagent — ${repeated[0].count}× repeated error: "${repeated[0].sample.slice(0, 80)}"`,
      skill_number: "agent",
      skill_name: "debugger",
      reason: `${repeated.length} repeated error pattern(s) detected in session. Use: Task debugger`,
      priority: "high",
    });
  }

  // Heuristic 3: many git commands but no commit → /ship
  const gitBash = allEvents.events.filter(e =>
    e.tool === "Bash" && typeof e.args?.command === "string" &&
    (e.args.command as string).startsWith("git") &&
    !(e.args.command as string).includes("commit"));
  const commitBash = allEvents.events.filter(e =>
    e.tool === "Bash" && typeof e.args?.command === "string" &&
    (e.args.command as string).includes("commit"));
  if (gitBash.length >= 3 && commitBash.length === 0) {
    out.push({
      action: "Run /ship to commit, tag and deploy your changes",
      skill_number: "07",
      skill_name: "deploy-docker",
      reason: `${gitBash.length} git commands run this session but no commit detected.`,
      priority: "medium",
    });
  }

  // Heuristic 4: .md files edited → documenter
  const mdEdits = seenFiles.filter(f => f.path.endsWith(".md") && f.modified);
  if (mdEdits.length >= 2) {
    out.push({
      action: "Run Documenter skill to keep docs consistent and complete",
      skill_number: "10",
      skill_name: "documenter",
      reason: `${mdEdits.length} .md files modified this session. Documenter ensures structure and completeness.`,
      priority: "low",
    });
  }

  return out;
}

// ─── Public entry point ─────────────────────────────────────────────────────

export async function buildSuggestions(opts: SuggestOptions): Promise<Suggestion[]> {
  const { base, current_context, cap = 5 } = opts;
  const out: Suggestion[] = [];

  // Project state
  const audit    = await suggestIfNoAudit(base);       if (audit)    out.push(audit);
  const claudeMd = await suggestIfClaudeMdWeak(base);  if (claudeMd) out.push(claudeMd);
  const tests    = await suggestIfNoTests(base);       if (tests)    out.push(tests);
  const ui       = suggestIfUiContext(current_context || ""); if (ui) out.push(ui);
  const recent   = suggestIfRecentCommits(base);       if (recent)   out.push(recent);

  // Event log
  for (const s of eventLogSuggestions(base)) out.push(s);

  // Default fallback
  if (out.length < 3) {
    out.push({
      action: "Run the Orchestrator to plan your next development cycle",
      skill_number: "09",
      skill_name: "orchestrator",
      reason: "The Orchestrator analyzes your project and builds a tailored pipeline of skills.",
      priority: "low",
    });
  }

  return out.slice(0, cap);
}
