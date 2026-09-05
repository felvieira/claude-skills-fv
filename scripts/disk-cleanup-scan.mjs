#!/usr/bin/env node
/**
 * disk-cleanup-scan.mjs — scanner de sujeira em disco (worktrees mergeados,
 * node_modules órfãos, caches antigos), inspirado em github.com/4ndreello/toupeira
 * mas com um guard que aquele projeto não tem: nenhum diretório entra na lista
 * de "seguro remover" sem antes ser escaneado por arquivos de segredo não
 * versionados (.env, chaves, credenciais) — o toupeira decide só por
 * `git status`, que nunca vê um arquivo gitignored, então um worktree "limpo"
 * pode conter a única cópia de um .env que ninguém mais tem.
 *
 * Nunca deleta nada — só reporta candidatos. A remoção é uma chamada
 * separada e explícita (dashboard-server.mjs's /api/cleanup/delete).
 *
 * Uso: node scripts/disk-cleanup-scan.mjs [--format json] [--roots a,b,c] [--days 14]
 *
 * Com --format json, emite uma linha NDJSON por evento em stdout, pra quem
 * chama (o dashboard, via child_process.spawn + readline) mostrar progresso
 * ao vivo em vez de esperar o processo inteiro terminar:
 *   {"type":"scanning","path":"..."}
 *   {"type":"found","category":"worktree-merged"|"node_modules-orphan"|"cache-stale","path":"...","reason":"...","ageDays":N}
 *   {"type":"secret-guard","path":"...","files":["..."]}
 *   {"type":"done","summary":{"candidates":N,"secretGuarded":N}}
 */
import { readdir, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, dirname, basename } from "node:path";
import { homedir } from "node:os";
import { existsSync } from "node:fs";

const execFileAsync = promisify(execFile);

// Same ignore/depth limits as the dashboard's file-tree browser
// (scripts/dashboard-server.mjs) — a scanner walking a repo's own
// node_modules while looking FOR orphaned node_modules would be absurd.
const WALK_IGNORE = new Set([
  "node_modules", ".git", "dist", "build", ".next", "target", "__pycache__",
  ".venv", "venv", ".cache", ".dashboard-cache", "graphify-out",
]);
const WALK_MAX_DEPTH = 3;

// Filenames that indicate a secret might be sitting unversioned in a
// directory we're about to suggest deleting. Name-only match — the content
// is never read, only listed, so this never risks leaking a secret value.
const SECRET_PATTERNS = [
  /^\.env(\..+)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /^id_rsa$/i,
  /^id_ed25519$/i,
  /credentials/i,
  /secret/i,
  /token/i,
];

function parseArgs(argv) {
  const args = { format: "text", roots: [], days: 14 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--format") args.format = argv[++i];
    else if (a === "--roots") args.roots = argv[++i].split(",").filter(Boolean);
    else if (a === "--days") args.days = Number(argv[++i]) || 14;
  }
  return args;
}

function emit(format, event) {
  if (format === "json") {
    process.stdout.write(JSON.stringify(event) + "\n");
  } else if (event.type === "found") {
    console.log(`[${event.category}] ${event.path} — ${event.reason}`);
  } else if (event.type === "secret-guard") {
    console.log(`[SECRET GUARD] ${event.path} — contém: ${event.files.join(", ")}`);
  } else if (event.type === "done") {
    console.log(`\nDone. ${event.summary.candidates} candidato(s), ${event.summary.secretGuarded} com guard de segredo.`);
  }
}

async function git(args, cwd) {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd });
    return stdout.trim();
  } catch {
    return null;
  }
}

async function scanForSecrets(rootPath) {
  const found = [];
  // rootPath may come from `git worktree list` (always forward slashes,
  // even on Windows) while `join()` below always produces the platform's
  // native separator — normalize both to backslash-free comparison so the
  // relative path actually strips correctly instead of leaving the full
  // absolute path in the report.
  const normalizedRoot = rootPath.replace(/\\/g, "/");
  async function walk(dirPath, depth) {
    if (depth > WALK_MAX_DEPTH) return;
    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (WALK_IGNORE.has(entry.name)) continue;
      const full = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else if (SECRET_PATTERNS.some((re) => re.test(entry.name))) {
        found.push(full.replace(/\\/g, "/").replace(normalizedRoot, "").replace(/^\//, ""));
      }
    }
  }
  await walk(rootPath, 0);
  return found;
}

async function dirAgeDays(dirPath) {
  // "Age" = how long since the most recently modified file anywhere inside —
  // a directory isn't stale just because its own mtime is old; someone could
  // still be actively writing files inside it.
  let newest = 0;
  async function walk(p, depth) {
    if (depth > WALK_MAX_DEPTH) return;
    let entries;
    try {
      entries = await readdir(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(p, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else {
        try {
          const s = await stat(full);
          if (s.mtimeMs > newest) newest = s.mtimeMs;
        } catch {
          // file vanished mid-scan, or a permissions issue — skip
        }
      }
    }
  }
  await walk(dirPath, 0);
  if (newest === 0) return null;
  return (Date.now() - newest) / 86_400_000;
}

async function reportCandidate(format, category, path, reason, ageDays) {
  const secretFiles = await scanForSecrets(path);
  if (secretFiles.length > 0) {
    emit(format, { type: "secret-guard", path, files: secretFiles });
    return { path, category, reason, ageDays, secretGuarded: true, secretFiles };
  }
  emit(format, { type: "found", category, path, reason, ageDays: ageDays ?? null });
  return { path, category, reason, ageDays: ageDays ?? null, secretGuarded: false };
}

// ─── Category 1: merged git worktrees ───────────────────────────────────────
async function scanWorktrees(root, format, candidates) {
  const worktreesDir = join(root, ".worktrees");
  if (!existsSync(worktreesDir)) return;
  emit(format, { type: "scanning", path: worktreesDir });

  const list = await git(["worktree", "list", "--porcelain"], root);
  if (!list) return;
  const entries = list.split("\n\n").map((block) => {
    const pathMatch = block.match(/^worktree (.+)$/m);
    const branchMatch = block.match(/^branch refs\/heads\/(.+)$/m);
    return pathMatch ? { path: pathMatch[1], branch: branchMatch?.[1] } : null;
  }).filter(Boolean);

  const baseBranch = (await git(["symbolic-ref", "--short", "HEAD"], root)) || "main";

  for (const { path, branch } of entries) {
    // git worktree list --porcelain always prints forward slashes, even on
    // Windows — normalize both sides before comparing, or every worktree is
    // silently skipped on Windows.
    const normalizedPath = path.replace(/\//g, "\\");
    const normalizedWorktreesDir = worktreesDir.replace(/\//g, "\\");
    if (!normalizedPath.startsWith(normalizedWorktreesDir) || !branch) continue;
    const merged = await git(["branch", "--merged", baseBranch], root);
    // `git branch --merged` prefixes the checked-out-here branch with "*"
    // and any branch checked out in ANOTHER worktree with "+" — both must
    // be stripped, not just "*", or every worktree branch (which is always
    // "+" from the main repo's perspective) is missed.
    if (!merged || !merged.split("\n").some((l) => l.trim().replace(/^[*+]\s*/, "") === branch)) continue;

    // Merged into the local base branch is enough on its own — the work is
    // already preserved there regardless of whether it was ever pushed.
    // (An earlier version also required an upstream with zero unpushed
    // commits, which silently skipped every worktree in a repo with no
    // remote configured — the common case for a quick local experiment.)
    candidates.push(await reportCandidate(format, "worktree-merged", path, `branch "${branch}" já mergeada em ${baseBranch}`, null));
  }
}

// ─── Category 2: orphaned/stale node_modules ────────────────────────────────
async function scanNodeModules(root, format, days, candidates) {
  async function walk(dirPath, depth) {
    if (depth > WALK_MAX_DEPTH + 2) return; // node_modules can be nested a bit deeper than source trees
    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = join(dirPath, entry.name);
      if (entry.name === "node_modules") {
        emit(format, { type: "scanning", path: full });
        const parentPkg = join(dirPath, "package.json");
        const orphaned = !existsSync(parentPkg);
        const age = await dirAgeDays(full);
        if (orphaned) {
          candidates.push(await reportCandidate(format, "node_modules-orphan", full, "pasta pai não tem mais package.json", age));
        } else if (age !== null && age > days) {
          candidates.push(await reportCandidate(format, "node_modules-stale", full, `sem alteração há ${Math.floor(age)} dias`, age));
        }
        continue; // don't descend into node_modules itself
      }
      if (WALK_IGNORE.has(entry.name)) continue;
      await walk(full, depth + 1);
    }
  }
  await walk(root, 0);
}

// ─── Category 3: stale build/cache dirs ─────────────────────────────────────
const CACHE_DIR_NAMES = new Set([".cache", "dist", "build", ".next"]);
async function scanCaches(root, format, days, candidates) {
  async function walk(dirPath, depth) {
    if (depth > WALK_MAX_DEPTH) return;
    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = join(dirPath, entry.name);
      if (CACHE_DIR_NAMES.has(entry.name)) {
        emit(format, { type: "scanning", path: full });
        const age = await dirAgeDays(full);
        if (age !== null && age > days) {
          candidates.push(await reportCandidate(format, "cache-stale", full, `sem alteração há ${Math.floor(age)} dias`, age));
        }
        continue;
      }
      if (WALK_IGNORE.has(entry.name) || entry.name === "node_modules") continue;
      await walk(full, depth + 1);
    }
  }
  await walk(root, 0);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const roots = args.roots.length > 0 ? args.roots : [process.cwd()];
  const candidates = [];

  for (const root of roots) {
    if (!existsSync(root)) continue;
    await scanWorktrees(root, args.format, candidates);
    await scanNodeModules(root, args.format, args.days, candidates);
    await scanCaches(root, args.format, args.days, candidates);
  }

  const secretGuarded = candidates.filter((c) => c.secretGuarded).length;
  emit(args.format, { type: "done", summary: { candidates: candidates.length, secretGuarded }, candidates });
}

main();
