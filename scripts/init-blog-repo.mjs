#!/usr/bin/env node
/**
 * init-blog-repo.mjs — Scaffold a blog repo for any user
 *
 * Usage:
 *   node scripts/init-blog-repo.mjs --path=/path/to/blog --user=githubname [--repo=blog] [--create-github]
 *
 * What it does (idempotent):
 *   1. Creates target directory if missing
 *   2. Copies templates/blog/* into it, substituting {{GITHUB_USER}} and {{BLOG_REPO}}
 *   3. git init (if not already a repo)
 *   4. Writes ~/.dev-team-kit/blog-config.json with { github_user, blog_repo, blog_repo_path, pages_url }
 *   5. (Optional) Creates the GitHub repo via gh CLI and enables Pages
 *   6. Initial commit + push (if remote configured)
 *
 * After this, skill 41 (blog-publisher) knows where to publish posts.
 *
 * Re-running is safe — files already configured are skipped.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT   = join(SCRIPT_DIR, "..");
const TEMPLATES  = join(KIT_ROOT, "templates", "blog");

// ─── Parse args ──────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith("--"))
    .map(a => {
      const [k, ...v] = a.slice(2).split("=");
      return [k, v.length > 0 ? v.join("=") : true];
    }),
);

if (!args.path || !args.user) {
  console.error(`Usage: init-blog-repo.mjs --path=/abs/path --user=githubname [--repo=blog] [--create-github]
  --path           absolute path where the blog repo will live (e.g. D:/Repos/blog)
  --user           your GitHub username (used in URLs and meta tags)
  --repo           repo name on GitHub (default: "blog")
  --create-github  also create the repo on GitHub via gh CLI and enable Pages`);
  process.exit(1);
}

const targetPath  = args.path;
const githubUser  = args.user;
const repoName    = args.repo || "blog";
const createOnGh  = args["create-github"] === true;
const pagesUrl    = `https://${githubUser}.github.io/${repoName}`;

console.log(`\n→ Initializing blog repo`);
console.log(`  path:       ${targetPath}`);
console.log(`  github:     ${githubUser}/${repoName}`);
console.log(`  pages url:  ${pagesUrl}\n`);

// ─── 1. Create target dir + subdirs ──────────────────────────────────────────
mkdirSync(join(targetPath, "posts"), { recursive: true });
mkdirSync(join(targetPath, "assets", "images"), { recursive: true });
mkdirSync(join(targetPath, "assets", "css"), { recursive: true });
mkdirSync(join(targetPath, "scripts"), { recursive: true });

// ─── 2. Copy templates with substitution ─────────────────────────────────────
function substituteAndWrite(srcRelPath, destRelPath) {
  const src  = join(TEMPLATES, srcRelPath);
  const dest = join(targetPath, destRelPath);
  if (!existsSync(src)) {
    console.warn(`  skip (missing template): ${srcRelPath}`);
    return;
  }
  if (existsSync(dest)) {
    console.log(`  exists (skip):  ${destRelPath}`);
    return;
  }
  const content = readFileSync(src, "utf8")
    .replaceAll("{{GITHUB_USER}}", githubUser)
    .replaceAll("{{BLOG_REPO}}", repoName);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, content);
  console.log(`  wrote:          ${destRelPath}`);
}

function copyBinary(srcRelPath, destRelPath) {
  const src  = join(TEMPLATES, srcRelPath);
  const dest = join(targetPath, destRelPath);
  if (existsSync(dest)) {
    console.log(`  exists (skip):  ${destRelPath}`);
    return;
  }
  if (!existsSync(src)) return;
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`  copied:         ${destRelPath}`);
}

// Templated files (text substitution)
substituteAndWrite("TEMPLATE.html",    "TEMPLATE.html");
substituteAndWrite("index.html",       "index.html");
substituteAndWrite("_README.md",       "README.md");
substituteAndWrite("_gitignore",       ".gitignore");

// Verbatim copies (no substitution)
copyBinary("assets/css/post.css",      "assets/css/post.css");
copyBinary("assets/js/share.js",       "assets/js/share.js");
copyBinary("scripts/new-post.mjs",     "scripts/new-post.mjs");
copyBinary("scripts/update-index.mjs", "scripts/update-index.mjs");

// .nojekyll always (empty file)
if (!existsSync(join(targetPath, ".nojekyll"))) {
  writeFileSync(join(targetPath, ".nojekyll"), "");
  console.log(`  wrote:          .nojekyll`);
}

// ─── 3. git init if needed ───────────────────────────────────────────────────
const gitDir = join(targetPath, ".git");
if (!existsSync(gitDir)) {
  execSync(`git init -b main`, { cwd: targetPath, stdio: "inherit" });
  console.log(`  git init:       OK`);
} else {
  console.log(`  git init:       (already a repo)`);
}

// ─── 4. Save user config ─────────────────────────────────────────────────────
const configDir  = join(homedir(), ".dev-team-kit");
const configPath = join(configDir, "blog-config.json");
mkdirSync(configDir, { recursive: true });

const newConfig = {
  github_user:    githubUser,
  blog_repo:      repoName,
  blog_repo_path: targetPath,
  pages_url:      pagesUrl,
  updated_at:     new Date().toISOString(),
};
writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
console.log(`  config saved:   ${configPath}`);

// ─── 5. Optional: gh repo create + enable Pages ──────────────────────────────
if (createOnGh) {
  try {
    execSync("gh --version", { stdio: "ignore" });
  } catch {
    console.warn(`\n⚠ gh CLI not found. Skipping GitHub repo creation. Install via https://cli.github.com/`);
  }

  try {
    execSync(`gh repo view ${githubUser}/${repoName}`, { stdio: "ignore" });
    console.log(`  gh repo:        ${githubUser}/${repoName} (already exists)`);
  } catch {
    console.log(`  gh repo:        creating ${githubUser}/${repoName}...`);
    try {
      execSync(
        `gh repo create ${githubUser}/${repoName} --public --source=. --remote=origin --description="Technical blog auto-generated via Dev Team Kit" --push`,
        { cwd: targetPath, stdio: "inherit" },
      );
    } catch (err) {
      console.warn(`  ⚠ gh repo create failed: ${err.message}`);
    }
  }

  // Enable Pages
  try {
    execSync(
      `gh api -X POST repos/${githubUser}/${repoName}/pages -f "source[branch]=main" -f "source[path]=/"`,
      { stdio: "ignore" },
    );
    console.log(`  pages enabled:  ${pagesUrl}`);
  } catch {
    console.log(`  pages:          (already enabled or insufficient permissions)`);
  }
}

// ─── 6. Initial commit if working tree dirty ─────────────────────────────────
const status = execSync(`git status --porcelain`, { cwd: targetPath, encoding: "utf8" });
if (status.trim()) {
  execSync(`git add -A`, { cwd: targetPath });
  try {
    execSync(`git commit -m "chore: initial scaffold via init-blog-repo.mjs"`, { cwd: targetPath, stdio: "inherit" });
    console.log(`  commit:         OK`);
  } catch (err) {
    console.warn(`  ⚠ commit failed (config user.email/user.name?): ${err.message}`);
  }
} else {
  console.log(`  commit:         (nothing to commit)`);
}

console.log(`\n✅ Blog repo ready at ${targetPath}`);
console.log(`   Config:  ${configPath}`);
console.log(`   Pages:   ${pagesUrl}`);
console.log(`\nNext: invoke skill 41 (blog-publisher) in any Claude Code session — it reads the config automatically.`);
