#!/usr/bin/env node
/**
 * new-post.mjs — Scaffolds a new post from TEMPLATE.html
 *
 * Usage:
 *   node scripts/new-post.mjs --slug=my-post-title --title="My Post Title" \
 *     --lang=en --excerpt="Short description" --cover=assets/images/my-cover.png \
 *     --body=path/to/body.html
 *
 * The body file should be HTML fragments (no <html>, <head>, <body> wrappers).
 *
 * Output: posts/YYYY-MM-DD-slug.html
 * Then runs update-index.mjs automatically.
 *
 * Configuration:
 *   The script reads ~/.dev-team-kit/blog-config.json (or path via DEVKIT_BLOG_CONFIG env)
 *   for { github_user, blog_repo, pages_url } needed to compute absolute URLs.
 *   If missing, falls back to local-only paths (cover will use a relative URL).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const ROOT     = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const TEMPLATE = join(ROOT, "TEMPLATE.html");

// ─── Load blog config (multi-user friendly) ──────────────────────────────────
function loadBlogConfig() {
  const configPath = process.env.DEVKIT_BLOG_CONFIG
    || join(homedir(), ".dev-team-kit", "blog-config.json");
  if (!existsSync(configPath)) {
    // Best-effort fallback so the script doesn't break a user who hasn't
    // configured the kit yet. URLs end up relative — Pages still serves them.
    return { github_user: "user", blog_repo: "blog", pages_url: "" };
  }
  return JSON.parse(readFileSync(configPath, "utf8"));
}

const config = loadBlogConfig();
const pagesBase = config.pages_url
  || (config.github_user && config.blog_repo
        ? `https://${config.github_user}.github.io/${config.blog_repo}`
        : "");

// ─── Parse args ──────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith("--"))
    .map(a => { const [k, ...v] = a.slice(2).split("="); return [k, v.join("=")]; }),
);

const required = ["slug", "title", "lang", "excerpt", "body"];
for (const k of required) {
  if (!args[k]) { console.error(`Missing --${k}`); process.exit(1); }
}

// ─── Build post ──────────────────────────────────────────────────────────────
const today    = new Date().toISOString().slice(0, 10);
const filename = `${today}-${args.slug}.html`;
const outPath  = join(ROOT, "posts", filename);

if (existsSync(outPath)) {
  console.error(`Already exists: ${outPath}`);
  process.exit(1);
}

if (!existsSync(args.body)) {
  console.error(`Body file not found: ${args.body}`);
  process.exit(1);
}

const bodyHtml = readFileSync(args.body, "utf8");
const tmpl     = readFileSync(TEMPLATE, "utf8");

const readingTime = Math.max(1, Math.round(bodyHtml.split(/\s+/).length / 220));
const dateHuman   = new Date(today).toLocaleDateString(args.lang === "pt-BR" ? "pt-BR" : "en-US", {
  year: "numeric", month: "long", day: "numeric",
});

const langLabel = args.lang === "pt-BR" ? "🇧🇷 Português" : "🌎 English";
const coverUrl  = args.cover && pagesBase
  ? `${pagesBase}/${args.cover}`
  : (config.github_user && config.blog_repo
        ? `https://opengraph.githubassets.com/1/${config.github_user}/${config.blog_repo}`
        : "");

const sourceUrl = config.github_user && config.blog_repo
  ? `https://github.com/${config.github_user}/${config.blog_repo}/blob/main/posts/${filename}`
  : "";

// Cover image visible in body (not just og:meta). Required for posts that
// have a --cover argument — falls back to empty string when absent.
const coverImgTag = args.cover
  ? `<img src="../${args.cover}" alt="${(args.title || "").replace(/"/g, "&quot;")} — cover" style="width:100%; height:auto; border-radius:8px; margin: 24px 0 32px; border: 1px solid var(--border)">`
  : "";

const html = tmpl
  .replaceAll("{{LANG}}", args.lang)
  .replaceAll("{{TITLE}}", args.title)
  .replaceAll("{{EXCERPT}}", args.excerpt)
  .replaceAll("{{COVER_IMAGE_URL}}", coverUrl)
  .replaceAll("{{COVER_IMG_TAG}}", coverImgTag)
  .replaceAll("{{DATE_HUMAN}}", dateHuman)
  .replaceAll("{{DATE_ISO}}", today)
  .replaceAll("{{LANG_LABEL}}", langLabel)
  .replaceAll("{{READING_TIME}}", String(readingTime))
  .replaceAll("{{FILENAME}}", filename)
  .replaceAll("{{SOURCE_URL}}", sourceUrl)
  .replaceAll("{{GITHUB_USER}}", config.github_user ?? "user")
  .replaceAll("{{BLOG_REPO}}", config.blog_repo ?? "blog")
  .replace("{{BODY_HTML}}", bodyHtml);

writeFileSync(outPath, html);
console.log(`Created: posts/${filename}`);

// ─── Update index ────────────────────────────────────────────────────────────
execSync(`node ${join(ROOT, "scripts", "update-index.mjs")}`, { stdio: "inherit" });

console.log(`\nNext steps:`);
console.log(`  cd ${ROOT}`);
console.log(`  git add . && git commit -m "post: ${args.title}" && git push`);
if (pagesBase) {
  console.log(`\nURL after push: ${pagesBase}/posts/${filename}`);
} else {
  console.log(`\nConfigure ~/.dev-team-kit/blog-config.json to get the public URL printed here.`);
}
