#!/usr/bin/env node
/**
 * update-index.mjs — Regenerate index.html post list + README index from posts/*.html
 *
 * Used by skill 41 (blog-publisher) after creating a new post. Idempotent.
 *
 * Multi-user: reads ~/.dev-team-kit/blog-config.json (or DEVKIT_BLOG_CONFIG)
 * to derive the title suffix to strip (e.g. " — username's blog").
 *
 * For each HTML in posts/, extracts:
 *   - title (from <title> tag, strips " — {github_user}'s blog" suffix if found)
 *   - date (from filename YYYY-MM-DD-slug.html)
 *   - lang (from <html lang>)
 *   - excerpt (from <meta description>)
 *
 * Then sorts by date DESC and updates:
 *   - index.html: HTML list between <!-- POSTS_START --> and <!-- POSTS_END -->
 *   - README.md: markdown list between <!-- BLOG_INDEX_START --> and <!-- BLOG_INDEX_END -->
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const ROOT      = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const POSTS_DIR = join(ROOT, "posts");
const INDEX     = join(ROOT, "index.html");
const README    = join(ROOT, "README.md");

// ─── Load blog config (multi-user friendly) ──────────────────────────────────
function loadBlogConfig() {
  const configPath = process.env.DEVKIT_BLOG_CONFIG
    || join(homedir(), ".dev-team-kit", "blog-config.json");
  if (!existsSync(configPath)) return { github_user: "user" };
  return JSON.parse(readFileSync(configPath, "utf8"));
}
const config = loadBlogConfig();
// Build a tolerant regex that strips either "{user}'s blog" or any "X's blog"
const titleSuffixRe = new RegExp(` — ${config.github_user}'s blog$|—[^—]*'s blog$`);

function extractPostMeta(filename) {
  const html  = readFileSync(join(POSTS_DIR, filename), "utf8");
  const title = (html.match(/<title>([^<]+)<\/title>/)?.[1] ?? filename)
                   .replace(titleSuffixRe, "");
  const lang  = html.match(/<html lang="([^"]+)"/)?.[1] ?? "en";
  const desc  = html.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? "";
  const date  = filename.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
  // Cover: prefer the body <img> src (relative), fall back to og:image (absolute URL).
  // Body <img> gives a repo-relative path we can reuse as posts/<img> from the index root.
  let cover = "";
  const bodyImg = html.match(/<img[^>]+src="\.\.\/(assets\/images\/[^"]+)"/);
  if (bodyImg) cover = bodyImg[1];
  else {
    const og = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? "";
    // og:image may be an absolute Pages URL — keep only the assets/... tail if present
    const tail = og.match(/(assets\/images\/[^"]+)$/);
    cover = tail ? tail[1] : og;
  }
  return { filename, title, lang, excerpt: desc, date, cover };
}

const posts = readdirSync(POSTS_DIR)
  .filter(f => f.endsWith(".html"))
  .map(extractPostMeta)
  .sort((a, b) => b.date.localeCompare(a.date));

const langLabel = p => (p.lang === "pt-BR" ? "🇧🇷 Português" : "🌎 English");

// Featured = up to 3 newest (1 hero + 2 secondary); rest = compact list with thumbnail.
const featured = posts.slice(0, 3);
const rest     = posts.slice(3);

function heroCard(p) {
  return `      <a class="feat-hero${p.cover ? "" : " no-img"}" href="posts/${p.filename}">
        ${p.cover ? `<div class="feat-hero-img" style="background-image:url('${p.cover}')"></div>` : ""}
        <div class="feat-hero-body">
          <p class="meta">${p.date} · ${langLabel(p)}</p>
          <h2>${escapeHtml(p.title)}</h2>
          ${p.excerpt ? `<p class="excerpt">${escapeHtml(p.excerpt)}</p>` : ""}
        </div>
      </a>`;
}

function secondaryCard(p) {
  return `        <a class="feat-sec${p.cover ? "" : " no-img"}" href="posts/${p.filename}">
          ${p.cover ? `<div class="feat-sec-img" style="background-image:url('${p.cover}')"></div>` : ""}
          <div class="feat-sec-body">
            <p class="meta">${p.date} · ${langLabel(p)}</p>
            <h3>${escapeHtml(p.title)}</h3>
          </div>
        </a>`;
}

function listItem(p) {
  return `      <a class="list-item${p.cover ? "" : " no-img"}" href="posts/${p.filename}">
        ${p.cover ? `<div class="list-thumb" style="background-image:url('${p.cover}')"></div>` : ""}
        <div class="list-body">
          <h3>${escapeHtml(p.title)}</h3>
          <p class="meta">${p.date} · ${langLabel(p)}</p>
          ${p.excerpt ? `<p class="excerpt">${escapeHtml(p.excerpt)}</p>` : ""}
        </div>
      </a>`;
}

const featuredHtml = featured.length
  ? `    <section class="featured">
${featured[0] ? heroCard(featured[0]) : ""}
${featured.length > 1 ? `      <div class="feat-secondary">
${featured.slice(1).map(secondaryCard).join("\n")}
      </div>` : ""}
    </section>`
  : "";

const restHtml = rest.length
  ? `    <section class="post-list">
${rest.map(listItem).join("\n")}
    </section>`
  : "";

const indexHtml = [featuredHtml, restHtml].filter(Boolean).join("\n");

const indexFile = readFileSync(INDEX, "utf8");
const indexUpdated = indexFile.replace(
  /<!-- POSTS_START -->[\s\S]*?<!-- POSTS_END -->/,
  `<!-- POSTS_START -->\n${indexHtml}\n    <!-- POSTS_END -->`,
);
// Remove "no posts" placeholder when we have posts
const indexFinal = posts.length > 0
  ? indexUpdated.replace(/\s*<div class="index-item"[^>]*>\s*No posts yet[^<]*<\/div>/, "")
  : indexUpdated;
writeFileSync(INDEX, indexFinal);

// Build README markdown list
const readmeList = posts.length === 0
  ? "*No posts yet.*"
  : posts.map(p => `- **${p.date}** — [${p.title}](posts/${p.filename}) (${p.lang === "pt-BR" ? "🇧🇷 PT" : "🌎 EN"})`).join("\n");

const readmeFile = readFileSync(README, "utf8");
const readmeUpdated = readmeFile.replace(
  /<!-- BLOG_INDEX_START -->[\s\S]*?<!-- BLOG_INDEX_END -->/,
  `<!-- BLOG_INDEX_START -->\n${readmeList}\n<!-- BLOG_INDEX_END -->`,
);
writeFileSync(README, readmeUpdated);

console.log(`Index updated: ${posts.length} post(s).`);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
