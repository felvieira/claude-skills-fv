#!/usr/bin/env node
/**
 * /swarm — Total Autonomy executor.
 *
 * 7 phases: setup → PRD/stories → ralph loop → quality gates →
 * synthesize → self-fix → PR → report.
 *
 * Este executor é uma camada de PLANEJAMENTO + DETERMINISMO:
 * - Phase 0 e 6 são bash deterministic (worktree, git, gh)
 * - Phases 1-5 são AI — script gera o plano com prompts/contextos
 *   pra o agente Claude executar via Task tool (fresh context)
 *
 * O agente que invoca /swarm é responsável por:
 * 1. Rodar `node scripts/swarm/index.mjs <task>` pra gerar o plano
 * 2. Executar cada phase do plano respeitando context: fresh
 * 3. Reportar progresso de volta
 *
 * Uso:
 *   node scripts/swarm/index.mjs "task description"
 *   node scripts/swarm/index.mjs --resume <run-id>
 *   node scripts/swarm/index.mjs --dry-run "task"
 *   node scripts/swarm/index.mjs fix #142
 */

import fs from "fs/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";
import { routeTask } from "../lib/plugin-catalog.mjs";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");

// ============ Config ============

function loadConfig() {
  const defaults = {
    max_stories_per_run: 10,
    max_iter_per_story: 5,
    circuit_breaker_threshold: 3,
    auto_merge: false,
    auto_cleanup_worktree: false,
    review_agents: ["code-reviewer", "security-auditor", "test-engineer", "anti-ai-writing"],
    self_fix_severity: ["critical", "high"],
    skip_phases: [],
  };

  // Merge: repo config + user override
  const repoConfigPath = path.join(root, "hooks", "config.json");
  let repoConfig = {};
  if (existsSync(repoConfigPath)) {
    try {
      const repoFile = JSON.parse(readFileSync(repoConfigPath, "utf8"));
      repoConfig = repoFile.swarm || {};
    } catch {}
  }

  const userConfigPath = path.join(homedir(), ".claude", "dev-team-kit-config.json");
  let userConfig = {};
  if (existsSync(userConfigPath)) {
    try {
      const userFile = JSON.parse(readFileSync(userConfigPath, "utf8"));
      userConfig = userFile.swarm || {};
    } catch {}
  }

  return { ...defaults, ...repoConfig, ...userConfig };
}

// ============ CLI parsing ============

function parseArgs(argv) {
  const args = {
    task: null,
    issue: null,
    prd: null,
    runId: null,
    dryRun: false,
    autoYes: false,
    autoMerge: false,
    skipReview: false,
    skipSelfFix: false,
    maxStories: null,
    maxIterPerStory: null,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--auto-yes") args.autoYes = true;
    else if (a === "--auto-merge") args.autoMerge = true;
    else if (a === "--skip-review") args.skipReview = true;
    else if (a === "--skip-self-fix") args.skipSelfFix = true;
    else if (a === "--max-stories") args.maxStories = parseInt(argv[++i], 10);
    else if (a === "--max-iter-per-story") args.maxIterPerStory = parseInt(argv[++i], 10);
    else if (a === "--resume") args.runId = argv[++i];
    else if (a === "--prd") args.prd = argv[++i];
    else if (a.startsWith("#")) args.issue = parseInt(a.slice(1), 10);
    else if (a === "fix" && argv[i + 1]?.startsWith("#")) {
      args.issue = parseInt(argv[++i].slice(1), 10);
    } else positional.push(a);
  }

  if (positional.length > 0) args.task = positional.join(" ");
  return args;
}

// ============ Phase 0: Setup ============

function preflight() {
  // Check git worktree clean
  try {
    const status = execSync("git status --porcelain", { cwd: root, encoding: "utf8" });
    if (status.trim()) {
      throw new Error("Working tree has uncommitted changes. Commit or stash before running /swarm.");
    }
  } catch (e) {
    if (e.message.includes("not a git repository")) {
      throw new Error("Not a git repository. /swarm requires git.");
    }
    throw e;
  }

  // Check gh CLI
  try {
    execSync("gh --version", { stdio: "ignore" });
  } catch {
    throw new Error("gh CLI not found. /swarm requires GitHub CLI for PR creation.");
  }

  // Check gh auth
  try {
    execSync("gh auth status", { stdio: "ignore" });
  } catch {
    throw new Error("gh CLI not authenticated. Run `gh auth login` first.");
  }
}

function setupRun(args, config) {
  const runId = args.runId || `${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}-${slugify(args.task || `issue-${args.issue}` || "swarm")}`;
  const runDir = path.join(root, ".swarm", runId);

  if (!args.runId) {
    mkdirSync(runDir, { recursive: true });
    mkdirSync(path.join(runDir, "iterations"), { recursive: true });
    mkdirSync(path.join(runDir, "review"), { recursive: true });
    mkdirSync(path.join(runDir, "fixes"), { recursive: true });

    // Persist input
    writeFileSync(path.join(runDir, "prompt.txt"), args.task || `issue #${args.issue}` || "");
    writeFileSync(path.join(runDir, "config.json"), JSON.stringify(config, null, 2));
  }

  return { runId, runDir };
}

function createWorktree(runDir, slug) {
  const workspacePath = path.join(runDir, "workspace");
  const branchName = `swarm/${slug}`;

  if (existsSync(workspacePath)) {
    return { workspacePath, branchName, existed: true };
  }

  // Create worktree from main (latest)
  try {
    execSync(`git fetch origin main`, { cwd: root, stdio: "ignore" });
    execSync(`git worktree add "${workspacePath}" -b "${branchName}" origin/main`, {
      cwd: root,
      stdio: "ignore",
    });
  } catch (e) {
    throw new Error(`Failed to create worktree: ${e.message}`);
  }

  return { workspacePath, branchName, existed: false };
}

function detectTools(workspacePath) {
  const tools = { test: null, build: null, lint: null };

  if (existsSync(path.join(workspacePath, "package.json"))) {
    const pkg = JSON.parse(readFileSync(path.join(workspacePath, "package.json"), "utf8"));
    if (pkg.scripts?.test) tools.test = "npm test";
    if (pkg.scripts?.build) tools.build = "npm run build";
    if (pkg.scripts?.lint) tools.lint = "npm run lint";
  }
  if (existsSync(path.join(workspacePath, "Cargo.toml"))) {
    tools.test = tools.test || "cargo test";
    tools.build = tools.build || "cargo build";
    tools.lint = tools.lint || "cargo clippy";
  }
  if (existsSync(path.join(workspacePath, "pyproject.toml")) || existsSync(path.join(workspacePath, "setup.py"))) {
    tools.test = tools.test || "pytest";
  }

  return tools;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// ============ Plan generation ============

function routingPrompt(args) {
  if (args.task) return args.task;
  if (args.issue) return `GitHub issue #${args.issue}`;
  if (args.prd) return `Implement the PRD at ${args.prd}`;
  return "Autonomous software delivery";
}

function routingInstructions(route) {
  const composition = route.composition;
  const skills = composition.skills.length ? composition.skills.join(", ") : "none matched; use the orchestrator's minimal pipeline";
  const policies = composition.policies.length ? composition.policies.join(", ") : "standard kit governance";
  const external = composition.external_plugins.length
    ? ` External recommendations (${composition.external_plugins.map((plugin) => plugin.id).join(", ")}) are opt-in and must not be installed automatically.`
    : "";
  return `Routing contract: load bundled skills [${skills}]; follow [${policies}]. Risk=${composition.risk}.${external}`;
}

async function buildPlan(args, config, runId, runDir, workspace, tools) {
  const composition = await routeTask(routingPrompt(args));
  const routing = { source: "swarm-executor", composition };
  return {
    swarm_version: "2.0.0",
    run_id: runId,
    run_dir: runDir,
    workspace_path: workspace.workspacePath,
    branch_name: workspace.branchName,
    config,
    input: {
      task: args.task,
      issue: args.issue,
      prd: args.prd,
    },
    tools,
    routing,
    phases: [
      {
        id: "setup",
        type: "bash",
        status: "completed",
        description: `Worktree created at ${workspace.workspacePath} on branch ${workspace.branchName}`,
      },
      {
        id: "prd-stories",
        type: "ai",
        context: "fresh",
        description: "Generate PRD + parse stories from input",
        instructions: `${routingInstructions(routing)}\n\n${buildPRDInstructions(args, runDir, workspace.workspacePath)}`,
        output: `${runDir}/plan.md + ${runDir}/stories.json`,
      },
      {
        id: "ralph-loop",
        type: "ai-loop",
        context: "fresh-per-story",
        description: "Implement each story with fresh context",
        instructions: `${routingInstructions(routing)}\n\n${buildRalphInstructions(runDir, workspace.workspacePath, tools, config)}`,
        max_iter_per_story: args.maxIterPerStory || config.max_iter_per_story,
        max_stories: args.maxStories || config.max_stories_per_run,
        circuit_breaker_threshold: config.circuit_breaker_threshold,
      },
      ...(args.skipReview || config.skip_phases.includes("review") ? [] : [{
        id: "quality-gates",
        type: "parallel-ai",
        context: "fresh",
        agents: config.review_agents,
        description: `Despachar ${config.review_agents.length} agentes em paralelo`,
        instructions: `${routingInstructions(routing)}\n\n${buildReviewInstructions(runDir, workspace.workspacePath, config.review_agents)}`,
      }, {
        id: "synthesize",
        type: "ai",
        context: "fresh",
        description: "Agregar reviews em decision matrix",
        instructions: buildSynthesizeInstructions(runDir),
      }]),
      ...(args.skipSelfFix || config.skip_phases.includes("self-fix") ? [] : [{
        id: "self-fix",
        type: "ai-per-finding",
        context: "fresh",
        description: `Auto-fix findings ${config.self_fix_severity.join("/")}`,
        instructions: buildSelfFixInstructions(runDir, workspace.workspacePath, config.self_fix_severity, tools),
      }]),
      {
        id: "pr",
        type: "bash",
        description: "Rebase + push + gh pr create + comment synthesis",
        instructions: buildPRInstructions(runDir, workspace.workspacePath, workspace.branchName, args),
      },
      {
        id: "report",
        type: "bash",
        description: "Final summary",
      },
    ],
  };
}

function buildPRDInstructions(args, runDir, workspacePath) {
  if (args.prd) {
    return `Read existing PRD at ${args.prd}. Parse into stories. Save as ${runDir}/plan.md (copy) + ${runDir}/stories.json [{id, title, acceptance_criteria, status: "pending", attempts: 0}].`;
  }
  if (args.issue) {
    return `Run: gh issue view ${args.issue} --json title,body,labels. Classify (bug/feature/refactor). Generate PRD with user stories in ${runDir}/plan.md. Save stories.json. Output Story count.`;
  }
  return `Input: "${args.task}". Explore codebase in ${workspacePath} (Read, Grep, Glob). Generate comprehensive PRD with user stories in ${runDir}/plan.md. Save ${runDir}/stories.json with [{id, title, acceptance_criteria, status: "pending", attempts: 0}]. Each story should be < 1 day work.`;
}

function buildRalphInstructions(runDir, workspacePath, tools, config) {
  return `
RALPH LOOP — implement stories from ${runDir}/stories.json one at a time, FRESH CONTEXT per story.

For each story with status: "pending":
  1. Spawn fresh subagent via Task tool with:
     - prompt = "Implement story \${story.id}: \${story.title}\\nAC: \${story.acceptance_criteria}\\nplan: ${runDir}/plan.md\\nWorkspace: ${workspacePath}"
     - allowed_tools = [Read, Edit, Write, Bash, Grep, Glob]
     - context = fresh
  2. Subagent implements + runs validation: ${tools.test || "echo 'no test command detected'"}
  3. If validation passes: mark story.status = "done"
  4. If fails: increment story.attempts. If attempts >= ${config.max_iter_per_story}: mark "aborted" with reason.
  5. If total aborted >= ${config.circuit_breaker_threshold}: ABORT swarm.

Log each iteration to ${runDir}/iterations/<story-id>-attempt-<N>.json with {prompt, output, validation_result, status}.

When all stories done OR circuit-breaker tripped: emit <result>RALPH_COMPLETE</result>.
`;
}

function buildReviewInstructions(runDir, workspacePath, agents) {
  return `
PARALLEL QUALITY GATES — despachar ${agents.length} subagents em UMA mensagem (multiple Task tool uses).

For each agent in [${agents.join(", ")}]:
  - Spawn via Task with prompt: "Revise diff em ${workspacePath} (git diff main..HEAD). Foque na sua especialidade. Output em ${runDir}/review/<agent>.md com severity (CRITICAL/HIGH/MEDIUM/LOW) + file:line + suggested_fix."
  - context = fresh
  - Each agent gets different role-specific instructions:
    - code-reviewer: clean code, DRY, SOLID
    - security-auditor: OWASP, secrets, auth, injection
    - test-engineer: coverage, edge cases, flaky risks
    - anti-ai-writing: 29 padrões de policies/anti-ai-writing.md em prosa nova (comments, docs)

Wait for ALL agents to finish (trigger_rule: all_done — falha de 1 não bloqueia outros).
`;
}

function buildSynthesizeInstructions(runDir) {
  return `
SYNTHESIZE — fresh context.

Read ${runDir}/review/*.md (todos os agent outputs).
Generate ${runDir}/synthesis.md with:
  - Severity buckets: CRITICAL / HIGH / MEDIUM / LOW
  - Each finding: file:line, agent, summary, suggested_fix, decision (auto_fix | report_only | false_positive)
  - Decision matrix:
    * CRITICAL → auto_fix sempre
    * HIGH → auto_fix se inputs.auto_fix permitir
    * MEDIUM → report_only
    * LOW → report_only
  - Final summary: N CRITICAL, M HIGH, P MEDIUM, Q LOW + recommendation
`;
}

function buildSelfFixInstructions(runDir, workspacePath, severityList, tools) {
  return `
SELF-FIX AGGRESSIVE.

Read ${runDir}/synthesis.md. For each finding marked auto_fix with severity in [${severityList.join(", ")}]:

  1. Spawn fresh subagent via Task with:
     - prompt = "Apply fix for finding: \${finding.summary}\\nFile: \${finding.file}:\${finding.line}\\nSuggested: \${finding.suggested_fix}\\nWorkspace: ${workspacePath}"
     - allowed_tools = [Read, Edit, Bash]
     - context = fresh
  2. Apply fix
  3. Commit: git commit -m "swarm/fix: \${severity} - \${finding.summary}"
  4. Save diff to ${runDir}/fixes/\${finding.id}.diff

After all fixes:
  - Run validation: ${tools.test || "echo 'skipped'"}
  - If validation breaks: rollback last N fixes, mark as "needs-manual-fix" in synthesis.md
  - If passes: update synthesis.md marking applied fixes as "FIXED"
`;
}

function buildPRInstructions(runDir, workspacePath, branchName, args) {
  const issueRef = args.issue ? `Closes #${args.issue}\n\n` : "";
  return `
PR — bash deterministic.

cd ${workspacePath}
git fetch origin main
git rebase origin/main || handle_conflict_manually

# Build PR body from plan.md + synthesis.md + fixes applied
cat > ${runDir}/pr-body.md << 'PRBODY'
${issueRef}## Summary

(extracted from plan.md)

## Stories implemented

(list from stories.json)

## Self-fixes applied

(list from fixes/)

## Quality review

(synthesis.md summary)

---
🤖 Generated by /swarm
PRBODY

git push -u origin ${branchName}

PR_URL=$(gh pr create \\
  --title "feat(swarm): \${title}" \\
  --body-file ${runDir}/pr-body.md \\
  --label "swarm-generated")

# Post synthesis as comment
PR_NUM=$(echo $PR_URL | grep -oE '[0-9]+$')
gh pr comment $PR_NUM --body-file ${runDir}/synthesis.md

echo "PR_URL=$PR_URL" >> ${runDir}/state.env
`;
}

// ============ Main ============

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.log(JSON.stringify({
      usage: "swarm <task> | swarm fix #N | swarm --prd PATH | swarm --resume <run-id>",
      flags: ["--dry-run", "--auto-yes", "--auto-merge", "--skip-review", "--skip-self-fix", "--max-stories N", "--max-iter-per-story N"],
    }, null, 2));
    process.exit(0);
  }

  const args = parseArgs(argv);
  const config = loadConfig();

  // Apply CLI overrides
  if (args.maxStories) config.max_stories_per_run = args.maxStories;
  if (args.maxIterPerStory) config.max_iter_per_story = args.maxIterPerStory;
  if (args.autoMerge) config.auto_merge = true;

  try {
    if (!args.runId && !args.dryRun) {
      // New run — preflight checks (skipped in dry-run mode)
      preflight();
    }

    const { runId, runDir } = setupRun(args, config);

    let slug = args.runId
      ? runId.split("-").slice(-1)[0]
      : slugify(args.task || `issue-${args.issue}` || "swarm");

    const workspace = createWorktree(runDir, slug);
    const tools = detectTools(workspace.workspacePath);

    const plan = await buildPlan(args, config, runId, runDir, workspace, tools);

    if (args.dryRun) {
      console.log(JSON.stringify({ action: "dry-run", plan }, null, 2));
      process.exit(0);
    }

    // Persist plan for agent to execute
    writeFileSync(
      path.join(runDir, "plan-execution.json"),
      JSON.stringify(plan, null, 2),
    );
    writeFileSync(path.join(runDir, "route.json"), `${JSON.stringify(plan.routing, null, 2)}\n`);

    console.log(JSON.stringify({
      action: "plan-ready",
      run_id: runId,
      run_dir: runDir,
      workspace_path: workspace.workspacePath,
      branch_name: workspace.branchName,
      branch_existed: workspace.existed,
      tools,
      total_phases: plan.phases.length,
      next_step: "Agent should execute plan.phases in order. AI phases use Task tool with context=fresh per spec.",
      plan_file: path.join(runDir, "plan-execution.json"),
    }, null, 2));

    process.exit(0);
  } catch (e) {
    console.log(JSON.stringify({ error: e.message, stack: e.stack?.split("\n").slice(0, 5) }, null, 2));
    process.exit(1);
  }
}

main();
