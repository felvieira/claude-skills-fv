import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { glob } from "glob";

const STOPWORDS = new Set([
  "para", "com", "sem", "uma", "umas", "uns", "esse", "essa", "isso", "todo", "toda",
  "depois", "antes", "sobre", "entre", "onde", "quando", "como", "that", "this", "from",
  "with", "have", "there", "would", "could", "should", "about", "into", "while", "using",
  "need", "precisa", "fazer", "build", "make", "task", "feature", "improve", "corrigir",
  "melhorar", "implementar", "create", "update", "problem", "issue", "coisa", "outra",
]);

export interface WorkingSetEntry {
  files: string[];
  focus?: string;
  decisions?: string[];
  next_steps?: string[];
  updated_at: string;
}

export interface ToolUsageState {
  reads?: Record<string, number>;
  searches?: Record<string, number>;
  writes?: Record<string, number>;
  total_calls?: number;
  repeated_signals?: string[];
  bytes_read?: number;
  large_reads?: string[];
}

export function getBotDir(base: string): string {
  return path.join(base, ".bot");
}

export function getWorkingSetPath(base: string): string {
  return path.join(getBotDir(base), "docs", "context", "working-set.json");
}

export function getToolUsagePath(base: string): string {
  return path.join(getBotDir(base), ".tool-usage.json");
}

export async function loadWorkingSet(base: string): Promise<WorkingSetEntry> {
  try {
    const raw = await fs.readFile(getWorkingSetPath(base), "utf-8");
    const parsed = JSON.parse(raw);
    return {
      files: Array.isArray(parsed.files) ? parsed.files : [],
      focus: parsed.focus,
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps : [],
      updated_at: parsed.updated_at || new Date(0).toISOString(),
    };
  } catch {
    return {
      files: [],
      decisions: [],
      next_steps: [],
      updated_at: new Date(0).toISOString(),
    };
  }
}

export async function saveWorkingSet(base: string, entry: WorkingSetEntry): Promise<string> {
  const workingSetPath = getWorkingSetPath(base);
  await fs.mkdir(path.dirname(workingSetPath), { recursive: true });
  await fs.writeFile(workingSetPath, JSON.stringify(entry, null, 2), "utf-8");
  return workingSetPath;
}

export async function loadToolUsage(base: string): Promise<ToolUsageState> {
  try {
    const raw = await fs.readFile(getToolUsagePath(base), "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function safeExec(command: string, cwd: string): string {
  try {
    return execSync(command, { cwd, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

export function extractKeywords(description: string): string[] {
  return Array.from(
    new Set(
      description
        .toLowerCase()
        .split(/[^a-z0-9._/-]+/i)
        .map((token) => token.trim())
        .filter((token) => token.length >= 4 && !STOPWORDS.has(token)),
    ),
  ).slice(0, 8);
}

export async function findRelevantFiles(base: string, description: string, maxFiles: number = 5): Promise<string[]> {
  const keywords = extractKeywords(description);
  const changedFiles = safeExec("git status --short", base)
    .split("\n")
    .map((line) => line.trim().slice(3))
    .filter(Boolean);
  const workingSet = await loadWorkingSet(base);
  const allFiles = await glob("**/*", {
    cwd: base,
    nodir: true,
    ignore: ["**/node_modules/**", "**/.git/**", "**/.next/**", "**/dist/**", "**/.bot/mcp-server/node_modules/**"],
  });

  const scored = new Map<string, number>();
  const bump = (file: string, amount: number) => {
    if (!file) return;
    scored.set(file, (scored.get(file) || 0) + amount);
  };

  for (const file of changedFiles) bump(file, 4);
  for (const file of workingSet.files || []) bump(file, 5);

  for (const file of allFiles) {
    const lower = file.toLowerCase();
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        bump(file, 2);
      }
    }
  }

  return [...scored.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([file]) => file)
    .slice(0, maxFiles);
}

export async function readFilePreview(base: string, relativePath: string, maxChars: number = 1200): Promise<string | null> {
  const fullPath = path.join(base, relativePath);
  try {
    const raw = await fs.readFile(fullPath, "utf-8");
    return raw.slice(0, maxChars);
  } catch {
    return null;
  }
}

export async function buildContextPack(base: string, taskDescription: string, maxFiles: number = 5) {
  const relevantFiles = await findRelevantFiles(base, taskDescription, maxFiles);
  const previews = await Promise.all(
    relevantFiles.map(async (file) => ({
      path: file,
      preview: await readFilePreview(base, file),
    })),
  );

  const repoAuditCandidates = [
    path.join(base, ".bot", "docs", "repo-audit", "current.md"),
    path.join(base, "docs", "repo-audit", "current.md"),
  ];
  const currentFocusCandidates = [
    path.join(base, ".bot", "docs", "context", "current-focus.md"),
    path.join(base, "docs", "context", "current-focus.md"),
  ];
  const workingSet = await loadWorkingSet(base);

  let repoAudit: string | null = null;
  let currentFocus: string | null = null;
  for (const candidate of repoAuditCandidates) {
    try {
      repoAudit = (await fs.readFile(candidate, "utf-8")).slice(0, 1200);
      break;
    } catch {}
  }
  for (const candidate of currentFocusCandidates) {
    try {
      currentFocus = (await fs.readFile(candidate, "utf-8")).slice(0, 800);
      break;
    } catch {}
  }

  return {
    project_path: base,
    task_description: taskDescription,
    repo_audit: repoAudit,
    current_focus: currentFocus,
    working_set: workingSet,
    relevant_files: previews,
    git_status: safeExec("git status --short", base).split("\n").filter(Boolean).slice(0, 20),
  };
}

export function buildDiffBrief(base: string, maxFiles: number = 10) {
  const status = safeExec("git status --short", base).split("\n").filter(Boolean);
  const stagedStat = safeExec("git diff --cached --stat", base);
  const unstagedStat = safeExec("git diff --stat", base);
  const changedFiles = safeExec("git diff --name-only HEAD", base).split("\n").filter(Boolean).slice(0, maxFiles);
  const recentCommits = safeExec("git log --oneline -5", base).split("\n").filter(Boolean);

  return {
    project_path: base,
    changed_files: changedFiles,
    status,
    staged_stat: stagedStat || null,
    unstaged_stat: unstagedStat || null,
    recent_commits: recentCommits,
  };
}

export async function buildCostTelemetry(base: string, explicitTelemetry?: Record<string, unknown>) {
  const usage = await loadToolUsage(base);
  const readCount = Object.values(usage.reads || {}).reduce((acc, count) => acc + count, 0);
  const searchCount = Object.values(usage.searches || {}).reduce((acc, count) => acc + count, 0);
  const writeCount = Object.values(usage.writes || {}).reduce((acc, count) => acc + count, 0);
  const repeatedSignals = usage.repeated_signals || [];
  const bytesRead = usage.bytes_read || 0;
  const largeReads = usage.large_reads || [];
  const gitStatusCount = safeExec("git status --short", base).split("\n").filter(Boolean).length;

  return {
    read_count: readCount,
    search_count: searchCount,
    write_count: writeCount,
    bytes_read: bytesRead,
    large_read_count: largeReads.length,
    large_reads: largeReads,
    total_tool_calls: usage.total_calls || readCount + searchCount + writeCount,
    repeated_signals: repeatedSignals,
    changed_files: gitStatusCount,
    ...explicitTelemetry,
  };
}
