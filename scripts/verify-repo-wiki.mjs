#!/usr/bin/env node

import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = { docs: "docs/repo-wiki", site: "", json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--docs") args.docs = argv[++i];
    else if (argv[i] === "--site") args.site = argv[++i];
    else if (argv[i] === "--json") args.json = true;
  }
  return args;
}

async function walk(dir) {
  const output = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return output;
  }
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...await walk(target));
    else output.push(target);
  }
  return output;
}

function posix(value) {
  return value.split(path.sep).join("/");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const docs = path.resolve(args.docs);
  const site = path.resolve(args.site || path.join(docs, "site"));
  const errors = [];
  const warnings = [];
  const reportPath = path.join(docs, "report.json");

  let report;
  try {
    report = JSON.parse(await readFile(reportPath, "utf8"));
  } catch (error) {
    errors.push(`report.json inválido ou ausente: ${error.message}`);
  }

  const files = await walk(site);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  const required = [
    "index.html",
    "assets/site.css",
    "assets/site.js",
    "assets/search-index.js",
  ];
  for (const relative of required) {
    try {
      const info = await stat(path.join(site, relative));
      if (!info.isFile()) errors.push(`artefato não é arquivo: ${relative}`);
    } catch {
      errors.push(`artefato ausente: ${relative}`);
    }
  }

  const siteSet = new Set(files.map((file) => posix(path.relative(site, file))));
  for (const file of htmlFiles) {
    const content = await readFile(file, "utf8");
    const relative = posix(path.relative(site, file));
    if (!/<main\b/i.test(content)) warnings.push(`${relative}: sem <main>`);
    if (!/<meta\s+name=["']viewport["']/i.test(content)) warnings.push(`${relative}: sem viewport`);
    for (const match of content.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
      const target = match[1];
      if (target.startsWith("#") || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(target)) continue;
      const clean = decodeURIComponent(target.split("#")[0]);
      const resolved = posix(path.normalize(path.join(path.dirname(relative), clean)));
      if (!siteSet.has(resolved)) errors.push(`${relative}: link local quebrado -> ${target}`);
    }
    if (/<(?:script\b[^>]+src|link\b[^>]+href)=["']https?:/i.test(content)) {
      errors.push(`${relative}: dependência externa de script/stylesheet`);
    }
  }

  const jsPath = path.join(site, "assets", "site.js");
  try {
    const js = await readFile(jsPath, "utf8");
    if (/\bfetch\s*\(/.test(js)) errors.push("site.js usa fetch; o site deve funcionar offline");
  } catch { /* required-artifact check already reports the missing file */ }

  try {
    const search = await readFile(path.join(site, "assets", "search-index.js"), "utf8");
    if (!/window\.REPO_WIKI_INDEX\s*=/.test(search)) errors.push("índice de busca não inicializa REPO_WIKI_INDEX");
  } catch { /* required-artifact check already reports the missing file */ }

  if (report) {
    if (report.html?.status !== "built") errors.push("report.html.status não é built");
    if (report.html?.external_requests !== 0) errors.push("o build HTML registrou requests externos");
    const expectedHtml = (report.html?.pages || 0) + (report.html?.evidence_pages || 0);
    if (expectedHtml !== htmlFiles.length) {
      errors.push(`contagem HTML divergente: report=${expectedHtml}, disco=${htmlFiles.length}`);
    }
    if (report.html?.evidence_pages > 0 && !files.some((file) => posix(path.relative(site, file)).startsWith("evidence/"))) {
      errors.push("report indica páginas de evidência, mas evidence/ está ausente");
    }
  }

  const result = {
    docs,
    site,
    html_files: htmlFiles.length,
    errors,
    warnings,
    status: errors.length ? "fail" : "pass",
  };
  if (report) {
    report.verification = { ...(report.verification || {}), html: result.status, html_details: { html_files: htmlFiles.length, errors: errors.length, warnings: warnings.length } };
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = errors.length ? 1 : 0;
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
