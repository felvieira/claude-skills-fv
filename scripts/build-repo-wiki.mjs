#!/usr/bin/env node

/** Build a self-contained, searchable HTML site from a Repo-Wiki Markdown tree. */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { readSource, redactSecrets } from "./repo-wiki-sources.mjs";


function parseArgs(argv) {
  const args = { repo: process.cwd(), docs: "docs/repo-wiki", site: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--repo") args.repo = argv[++index];
    else if (value === "--docs") args.docs = argv[++index];
    else if (value === "--site") args.site = argv[++index];
    else if (value === "--help" || value === "-h") {
      console.log("Usage: node scripts/build-repo-wiki.mjs [--repo path] [--docs path] [--site path]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

const toPosix = (value) => value.split(path.sep).join("/");
const htmlEscape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const slugify = (value) => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page";
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

async function walk(root, skip) {
  const files = [];
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      if (absolute === skip || absolute.startsWith(`${skip}${path.sep}`)) continue;
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  }
  await visit(root);
  return files.sort();
}

function docHtmlPath(relativeMarkdown) {
  const normalized = toPosix(relativeMarkdown);
  return normalized.toLowerCase() === "readme.md" ? "index.html" : normalized.replace(/\.md$/i, ".html");
}

function relativeUrl(fromHtml, toPath) {
  const value = toPosix(path.relative(path.dirname(fromHtml), toPath));
  return value || path.basename(toPath);
}

function localEvidenceName(sourcePath) {
  return `${slugify(sourcePath)}-${sha256(sourcePath).slice(0, 8)}.html`;
}

function parseEvidence(markdown) {
  const results = [];
  const pattern = /\[evidence:\s*([^:\]]+?):(\d+)(?:-(\d+))?\]/g;
  for (const match of markdown.matchAll(pattern)) results.push({ source: match[1].trim().replaceAll("\\", "/"), start: Number(match[2]), end: Number(match[3] || match[2]) });
  return results;
}

function plainText(markdown) {
  return markdown
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTitle(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+?)\s*#*\s*$/m);
  return match ? plainText(match[1]) : fallback;
}

function parseTrack(relativeMarkdown) {
  const value = toPosix(relativeMarkdown).toLowerCase();
  if (value.includes("security")) return "security";
  if (value.includes("business-rules")) return "business-rules";
  if (value.includes("rpa") || value.includes("automation")) return "automation";
  if (value.includes("improvement")) return "improvements";
  if (value.includes("workflow")) return "workflows";
  if (value.includes("boundary") || value.includes("contract")) return "boundaries";
  if (value.includes("database") || value.includes("schema")) return "database";
  if (value.includes("verification")) return "verification";
  if (value.includes("modules/") || value.includes("module")) return "modules";
  if (value.includes("architecture")) return "architecture";
  return "overview";
}

function safeLocalTarget(target) {
  return target && !/^(?:https?:|mailto:|tel:|javascript:|data:|#)/i.test(target);
}

function renderInline(value, context) {
  let text = htmlEscape(value);
  const slots = [];
  const slot = (html) => {
    const id = `\u0000${slots.length}\u0000`;
    slots.push(html);
    return id;
  };
  text = text.replace(/`([^`\n]+)`/g, (_, code) => slot(`<code>${code}</code>`));
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, rawTarget) => {
    const target = rawTarget.trim();
    const [withoutFragment] = target.split(/[?#]/, 1);
    if (/^(?:javascript:|data:|\/\/)/i.test(target) || (/^[a-z][a-z0-9+.-]*:/i.test(target) && !/^(https?:|mailto:|tel:)/i.test(target))) return label;
    if (!safeLocalTarget(withoutFragment)) return slot(`<a href="${htmlEscape(target)}" target="_blank" rel="noopener noreferrer">${label}</a>`);
    if (/\.md$/i.test(withoutFragment)) {
      const source = toPosix(path.normalize(path.join(path.dirname(context.markdownPath), withoutFragment)));
      const page = context.pageMap.get(source);
      if (page) return slot(`<a href="${htmlEscape(relativeUrl(context.htmlPath, page))}">${label}</a>`);
    }
    if (/^(?:\.\/)?site\/index\.html$/i.test(withoutFragment)) return slot(`<a href="${htmlEscape(relativeUrl(context.htmlPath, "index.html"))}">${label}</a>`);
    if (/\.(?:html|svg)$/i.test(withoutFragment)) return slot(`<a href="${htmlEscape(target)}">${label}</a>`);
    if (context.evidenceMap.has(withoutFragment)) return slot(`<a href="${htmlEscape(relativeUrl(context.htmlPath, context.evidenceMap.get(withoutFragment)))}">${label}</a>`);
    return slot(`<span class="unresolved-link" title="Arquivo fora do site ou não encontrado">${label}</span>`);
  });
  text = text.replace(/\[evidence:\s*([^:\]]+?):(\d+)(?:-(\d+))?\]/g, (_, sourceValue, startValue) => {
    const source = sourceValue.trim().replaceAll("\\", "/");
    const target = context.evidenceMap.get(source);
    if (!target) return `<span class="evidence evidence-unlinked">[evidence: ${htmlEscape(source)}:${startValue}]</span>`;
    return slot(`<a class="evidence" href="${htmlEscape(relativeUrl(context.htmlPath, target))}#L${startValue}">evidence: ${htmlEscape(source)}:${startValue}</a>`);
  });
  text = text.replace(/\*\*([^*]+)\*\*/g, (_, bold) => slot(`<strong>${bold}</strong>`));
  text = text.replace(/\*([^*]+)\*/g, (_, italic) => slot(`<em>${italic}</em>`));
  return text.replace(/\u0000(\d+)\u0000/g, (_, index) => slots[Number(index)]);
}

function headingId(value) {
  return slugify(value);
}

function renderMermaidSvg(source, name) {
  const lines = source.split("\n").map((line) => line.trim()).filter(Boolean);
  const nodes = new Map();
  const edges = [];
  const addNode = (id, label = id) => {
    if (!nodes.has(id)) nodes.set(id, label.replace(/^['"]|['"]$/g, ""));
  };
  for (const line of lines) {
    if (/^(?:flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram)\b/i.test(line)) continue;
    const flow = line.match(/^([A-Za-z0-9_-]+)(?:\[([^\]]+)\])?\s*[-.]+>+\s*(?:\|([^|]*)\|\s*)?([A-Za-z0-9_-]+)(?:\[([^\]]+)\])?/);
    if (flow) {
      addNode(flow[1], flow[2] || flow[1]);
      addNode(flow[4], flow[5] || flow[4]);
      edges.push([flow[1], flow[4], flow[3] || '']);
      continue;
    }
    const declaration = line.match(/^([A-Za-z0-9_-]+)\[([^\]]+)\]\s*$/);
    if (declaration) {
      addNode(declaration[1], declaration[2]);
      continue;
    }
    const participant = line.match(/^participant\s+([A-Za-z0-9_-]+)(?:\s+as\s+(.+))?/i);
    if (participant) addNode(participant[1], participant[2] || participant[1]);
    const message = line.match(/^([A-Za-z0-9_-]+)\s*-{1,2}>{1,2}\s*([A-Za-z0-9_-]+)\s*:\s*(.+)$/);
    if (message) {
      addNode(message[1]);
      addNode(message[2]);
      edges.push([message[1], message[2], message[3]]);
    }
  }
  if (nodes.size === 0) {
    lines.slice(0, 10).forEach((line, index) => addNode(`line${index + 1}`, line));
  }
  const list = [...nodes.entries()];
  const columns = Math.min(6, Math.max(1, list.length));
  const rows = Math.ceil(list.length / columns);
  const width = Math.max(760, columns * 170);
  const height = Math.max(180, 110 + rows * 110);
  const positions = new Map(list.map(([id], index) => [id, { x: 90 + (index % columns) * 170, y: 70 + Math.floor(index / columns) * 110 }]));
  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title-${name}">`);
  svg.push(`<title id="title-${name}">Diagrama ${htmlEscape(name)}</title><desc>Renderização SVG local de um bloco Mermaid. Fonte original preservada na página.</desc>`);
  svg.push(`<defs><marker id="arrow-${name}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#5b6b87"/></marker></defs>`);
  for (const [from, to, label] of edges) {
    const a = positions.get(from);
    const b = positions.get(to);
    if (!a || !b) continue;
    const y = a.y + 34 + (label ? 30 : 0);
    svg.push(`<path d="M${a.x + 64} ${y} L${b.x - 64} ${y}" stroke="#5b6b87" stroke-width="2" fill="none" marker-end="url(#arrow-${name})"/>`);
    if (label) svg.push(`<text x="${(a.x + b.x) / 2}" y="${y - 8}" text-anchor="middle" class="edge-label">${htmlEscape(label.slice(0, 60))}</text>`);
  }
  for (const [id, label] of list) {
    const point = positions.get(id);
    svg.push(`<rect x="${point.x - 64}" y="${point.y - 28}" width="128" height="56" rx="10" fill="#edf2ff" stroke="#5267a8" stroke-width="2"/>`);
    svg.push(`<text x="${point.x}" y="${point.y + 5}" text-anchor="middle" class="node-label">${htmlEscape(label.slice(0, 28))}</text>`);
  }
  svg.push(`<style>.node-label{font:600 14px system-ui,sans-serif;fill:#16213b}.edge-label{font:12px system-ui,sans-serif;fill:#33405d}</style></svg>`);
  return svg.join("");
}

function renderMarkdown(markdown, context, diagramWriter) {
  const lines = markdown.replace(/^---[\s\S]*?---\s*/u, "").split("\n");
  const output = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];
  let fence = null;
  let fenceLines = [];
  let tableLines = [];
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${renderInline(paragraph.join(" "), context)}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    output.push(`<${listType}>${listItems.map((item) => `<li>${renderInline(item, context)}</li>`).join("")}</${listType}>`);
    listItems = [];
    listType = null;
  };
  const flushTable = () => {
    if (tableLines.length < 2) { tableLines.forEach((line) => output.push(`<p>${renderInline(line, context)}</p>`)); tableLines = []; return; }
    const rows = tableLines.map((line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()));
    const head = rows[0];
    const body = rows.slice(2);
    output.push(`<table><thead><tr>${head.map((cell) => `<th>${renderInline(cell, context)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell, context)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
    tableLines = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*([^\s]*)?.*$/);
    if (fenceMatch) {
      if (!fence) {
        flushParagraph(); flushList(); flushTable();
        fence = fenceMatch[1][0];
        fenceLines = [];
        context.fenceLanguage = (fenceMatch[2] || "").toLowerCase();
      } else if (fenceMatch[1][0] === fence) {
        if (context.fenceLanguage === "mermaid") {
          const diagramName = `${slugify(context.markdownPath)}-${context.diagramCount + 1}`;
          const filename = `${diagramName}.svg`;
          diagramWriter(filename, fenceLines.join("\n"));
          const imagePath = relativeUrl(context.htmlPath, `assets/diagrams/${filename}`);
          output.push(`<figure class="diagram"><img src="${imagePath}" alt="Diagrama ${htmlEscape(diagramName)}"><figcaption>Diagrama renderizado localmente</figcaption><details><summary>Ver fonte Mermaid</summary><pre>${htmlEscape(fenceLines.join("\n"))}</pre></details></figure>`);
          context.diagramCount += 1;
        } else output.push(`<pre><code class="language-${htmlEscape(context.fenceLanguage)}">${htmlEscape(fenceLines.join("\n"))}</code></pre>`);
        fence = null;
        fenceLines = [];
        context.fenceLanguage = "";
      } else if (fence) fenceLines.push(line);
      continue;
    }
    if (fence) { fenceLines.push(line); continue; }
    if (/^\s*\|.*\|\s*$/.test(line)) { flushParagraph(); flushList(); tableLines.push(line); continue; }
    if (tableLines.length) flushTable();
    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) { flushParagraph(); flushList(); const level = heading[1].length; const label = heading[2]; output.push(`<h${level} id="${headingId(label)}">${renderInline(label, context)}</h${level}>`); continue; }
    const unordered = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) { flushParagraph(); const type = unordered ? "ul" : "ol"; if (listType && listType !== type) flushList(); listType = type; listItems.push((unordered || ordered)[1]); continue; }
    if (!line.trim()) { flushParagraph(); flushList(); continue; }
    paragraph.push(line.trim());
  }
  if (fence) output.push(`<pre><code>${htmlEscape(fenceLines.join("\n"))}</code></pre>`);
  flushParagraph(); flushList(); flushTable();
  return output.join("\n");
}

function shell({ title, body, page, pages, assetPrefix, searchIndex, track }) {
  const nav = pages.map((item) => `<a href="${htmlEscape(relativeUrl(page, item.url))}" class="nav-link">${htmlEscape(item.title)}</a>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="generator" content="Repo-Wiki offline builder"><title>${htmlEscape(title)} · Repo-Wiki</title><link rel="stylesheet" href="${assetPrefix}assets/site.css"></head><body data-track="${htmlEscape(track)}"><a class="skip-link" href="#content">Pular para o conteúdo</a><div class="layout"><aside class="sidebar" id="sidebar"><a class="brand" href="${htmlEscape(relativeUrl(page, "index.html"))}">Repo-Wiki</a><nav aria-label="Páginas">${nav}</nav></aside><main class="main"><header class="toolbar"><button type="button" class="menu-button" data-menu aria-label="Abrir menu">☰</button><label class="search-label" for="site-search">Buscar</label><input id="site-search" type="search" placeholder="Buscar na documentação (Ctrl+K)" autocomplete="off"><select id="track-filter" aria-label="Filtrar trilha"><option value="">Todas as trilhas</option><option value="business-rules">Regras de negócio</option><option value="security">Segurança</option><option value="automation">Automação/RPA</option><option value="improvements">Melhorias</option><option value="architecture">Arquitetura</option><option value="workflows">Workflows</option><option value="boundaries">Boundaries e contratos</option><option value="database">Banco de dados</option><option value="verification">Verificação</option><option value="modules">Módulos</option></select><button type="button" data-theme-toggle aria-label="Alternar tema">Tema</button></header><div id="search-results" class="search-results" hidden></div><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${htmlEscape(relativeUrl(page, "index.html"))}">Repo-Wiki</a><span aria-hidden="true">/</span><span>${htmlEscape(title)}</span></nav><article id="content" class="content" data-page="${htmlEscape(page)}" data-track="${htmlEscape(track)}">${body}</article><footer class="footer">Gerado localmente. Índice: ${htmlEscape(searchIndex)}</footer></main></div><script src="${htmlEscape(assetPrefix)}assets/search-index.js"></script><script src="${htmlEscape(assetPrefix)}assets/site.js"></script></body></html>`;
}

const CSS = `:root{color-scheme:light;--bg:#f7f8fc;--panel:#fff;--text:#1c2434;--muted:#647086;--line:#dce2ee;--accent:#3156c8;--soft:#edf2ff;--code:#20293b}*{box-sizing:border-box}html[data-theme=dark]{color-scheme:dark;--bg:#111722;--panel:#182131;--text:#edf2ff;--muted:#a7b2c5;--line:#344158;--accent:#9bb2ff;--soft:#263458;--code:#0d121b}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,Segoe UI,sans-serif}.layout{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:100vh}.sidebar{background:var(--panel);border-right:1px solid var(--line);padding:24px 14px;position:sticky;top:0;height:100vh;overflow:auto}.brand{display:block;font-size:1.25rem;font-weight:800;color:var(--text);text-decoration:none;padding:0 10px 22px}.nav-link{display:block;color:var(--muted);text-decoration:none;padding:8px 10px;border-radius:8px}.nav-link:hover,.nav-link:focus{background:var(--soft);color:var(--accent)}.main{min-width:0}.toolbar{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:center;padding:14px max(22px,calc((100% - 1050px)/2));background:color-mix(in srgb,var(--panel) 94%,transparent);border-bottom:1px solid var(--line);backdrop-filter:blur(8px)}.toolbar input{flex:1;min-width:120px;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text)}.toolbar select,.toolbar button{padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text)}.search-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.menu-button{display:none}.content,.breadcrumbs,.footer{width:min(1050px,calc(100% - 44px));margin-left:auto;margin-right:auto}.content{padding:28px 0 58px}.breadcrumbs{padding:22px 0 0;color:var(--muted);font-size:.9rem}.breadcrumbs a{color:var(--accent)}h1,h2,h3,h4{line-height:1.25;margin:1.6em 0 .55em}h1{font-size:2.2rem;margin-top:.3em}h2{font-size:1.45rem;border-bottom:1px solid var(--line);padding-bottom:6px}a{color:var(--accent)}p{max-width:85ch}ul,ol{padding-left:28px}code{background:var(--soft);padding:2px 5px;border-radius:5px}pre{overflow:auto;background:var(--code);color:#edf2ff;padding:16px;border-radius:10px}pre code{background:transparent;padding:0}table{width:100%;border-collapse:collapse;margin:20px 0;display:block;overflow:auto}th,td{text-align:left;border:1px solid var(--line);padding:8px 10px;vertical-align:top}th{background:var(--soft)}.evidence{font-size:.9em}.evidence-unlinked{color:var(--muted)}.unresolved-link{border-bottom:1px dashed #bd5b5b;color:var(--muted)}.diagram{margin:24px 0;padding:16px;background:var(--panel);border:1px solid var(--line);border-radius:12px}.diagram img{width:100%;height:auto}.diagram figcaption{color:var(--muted);font-size:.85rem}.search-results{position:fixed;z-index:3;top:72px;left:50%;transform:translateX(-50%);width:min(780px,calc(100% - 44px));max-height:70vh;overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:0 18px 50px #0003;padding:12px}.result{display:block;padding:12px;border-radius:8px;text-decoration:none}.result:hover,.result:focus{background:var(--soft)}.result small{display:block;color:var(--muted)}.footer{border-top:1px solid var(--line);padding:18px 0 30px;color:var(--muted);font-size:.85rem}.skip-link{position:absolute;left:-10000px}.skip-link:focus{left:12px;top:12px;z-index:10;background:var(--panel);padding:8px}.content:focus{outline:3px solid var(--accent)}@media(max-width:800px){.layout{display:block}.sidebar{position:fixed;z-index:5;left:-280px;transition:left .18s;width:260px;box-shadow:10px 0 30px #0003}.sidebar.open{left:0}.menu-button{display:block}.toolbar{padding:10px 12px;flex-wrap:wrap}.toolbar input{order:2;flex-basis:calc(100% - 42px)}.toolbar select{order:3;flex:1}.toolbar [data-theme-toggle]{order:3}.content,.breadcrumbs,.footer{width:calc(100% - 28px)}h1{font-size:1.8rem}}`;

const JS = `(() => {\n  const root = new URL('../', document.currentScript.src);\n  const index = Array.isArray(window.REPO_WIKI_INDEX) ? window.REPO_WIKI_INDEX : [];\n  const input = document.querySelector('#site-search');\n  const filter = document.querySelector('#track-filter');\n  const results = document.querySelector('#search-results');\n  const normalize = (value) => String(value || '').normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();\n  const show = () => {\n    const query = normalize(input.value).trim();\n    const track = filter.value;\n    if (!query && !track) { results.hidden = true; results.textContent = ''; return; }\n    const terms = query.split(/\\s+/).filter(Boolean);\n    const matches = index.filter((item) => (!track || item.track === track) && terms.every((term) => normalize(item.search).includes(term)));\n    results.textContent = '';\n    const title = document.createElement('div'); title.className = 'result'; title.textContent = matches.length + ' resultado(s)'; results.append(title);\n    matches.slice(0, 40).forEach((item) => {\n      const link = document.createElement('a'); link.className = 'result'; link.href = new URL(item.url, root).href;\n      const strong = document.createElement('strong'); strong.textContent = item.title; link.append(strong);\n      const small = document.createElement('small'); small.textContent = item.track + ' · ' + item.path + ' · ' + item.excerpt; link.append(small);\n      results.append(link);\n    });\n    results.hidden = false;\n  };\n  input.addEventListener('input', show); filter.addEventListener('change', show);\n  document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); input.focus(); input.select(); } if (event.key === '/' && document.activeElement !== input) { event.preventDefault(); input.focus(); } if (event.key === 'Escape') { input.value = ''; filter.value = ''; show(); } });\n  document.querySelector('[data-menu]')?.addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));\n  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => { const dark = document.documentElement.dataset.theme === 'dark'; document.documentElement.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('repo-wiki-theme', dark ? 'light' : 'dark'); } catch {} });\n  try { const saved = localStorage.getItem('repo-wiki-theme'); if (saved) document.documentElement.dataset.theme = saved; } catch {}\n})();`;

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = path.resolve(args.repo);
  const docs = path.resolve(repo, args.docs);
  const site = path.resolve(repo, args.site || path.join(args.docs, "site"));
  if (site === docs || !site.startsWith(`${docs}${path.sep}`)) throw new Error("Site must be a child directory of docs");
  await fs.stat(docs);

  await fs.mkdir(path.join(site, "assets", "diagrams"), { recursive: true });
  await fs.mkdir(path.join(site, "evidence"), { recursive: true });

  const reportPath = path.join(docs, "report.json");
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  if (![2, 3].includes(report.schema_version) || !Array.isArray(report.pages_generated)) throw new Error("Regenerate using reviewed analysis schema 2 or 3");
  const markdownFiles = [];
  for (const relative of report.pages_generated) {
    if (!/^[a-zA-Z0-9_/-]+\.md$/.test(relative) || relative.split("/").some(p => p.startsWith("."))) throw new Error("Invalid page path");
    let absolute = docs;
    for (const part of relative.split("/")) {
      absolute = path.join(absolute, part);
      if ((await fs.lstat(absolute)).isSymbolicLink()) throw new Error("Linked page refused");
    }
    markdownFiles.push(absolute);
  }
  const pageMap = new Map(markdownFiles.map((file) => [toPosix(path.relative(docs, file)), docHtmlPath(path.relative(docs, file))]));
  const evidenceSources = new Map();
  const sourceCache = new Map();
  const citedLines = new Map();
  const architectureEvidence = [
    ...(report.architecture?.contexts || []).flatMap(context => context.evidence || []),
    ...(report.architecture?.levels || []).flatMap(level => level.evidence || []),
    ...(report.architecture?.nodes || []).flatMap(node => node.evidence || []),
    ...(report.architecture?.edges || []).flatMap(edge => edge.evidence || []),
  ];
  const overviewEvidence = [
    ...(report.overview?.technologies || []).flatMap(item => item.evidence || []),
    ...(report.overview?.entrypoints || []).flatMap(item => item.evidence || []),
    ...(report.overview?.commands || []).flatMap(item => item.evidence || []),
    ...(report.overview?.structure || []).flatMap(item => item.evidence || []),
  ];
  const structuredEvidence = [
    ...(report.workflows?.items || []),
    ...(report.boundaries?.items || []),
    ...(report.database?.entities || []),
    ...(report.modules?.items || []),
  ].flatMap(item => item.evidence || []);
  const approvedEvidence = new Set([
    ...report.findings.flatMap(f => f.evidence.map(e => e.path+":"+e.start+"-"+e.end)),
    ...architectureEvidence.map(e => e.path+":"+e.start+"-"+e.end),
    ...overviewEvidence.map(e => e.path+":"+e.start+"-"+e.end),
    ...structuredEvidence.map(e => e.path+":"+e.start+"-"+e.end),
  ]);
  for (const file of markdownFiles) {
    const markdown = await fs.readFile(file, "utf8");
    for (const item of parseEvidence(markdown)) {
      if (!approvedEvidence.has(item.source+":"+item.start+"-"+item.end)) throw new Error("Evidence was not reviewed: "+item.source);
      const source = sourceCache.get(item.source) || await readSource(repo, item.source);
      if (source.sha256 !== report.source_snapshot.find(f => f.path === item.source)?.sha256) throw new Error("Stale evidence: "+item.source);
      sourceCache.set(item.source, source);
      const lines = source.text.split("\n");
      if (item.start < 1 || item.end < item.start || item.end > lines.length) throw new Error("Invalid evidence lines");
      const selected = citedLines.get(item.source) || new Set();
      for (let line=item.start; line<=item.end; line++) selected.add(line);
      citedLines.set(item.source, selected);
      evidenceSources.set(item.source, `evidence/${localEvidenceName(item.source)}`);
    }
  }
  const evidenceMap = new Map(evidenceSources);
  for (const [source, target] of evidenceSources) {
    const lines = sourceCache.get(source).text.split("\n");
    const body = [...citedLines.get(source)].sort((a,b)=>a-b).map(line => `<span class="source-line" id="L${line}"><a href="#L${line}">${line}</a> ${htmlEscape(redactSecrets(lines[line-1]))}</span>`).join("\n");
    await fs.writeFile(path.join(site,target), shell({title:`Evidência · ${source}`,body:`<h1>${htmlEscape(source)}</h1><p>Somente linhas citadas. Snapshot de código, não prova de execução.</p><pre><code>${body}</code></pre>`,page:target,pages:[],assetPrefix:"../",searchIndex:"local",track:"evidence"}));
  }

  const pages = [];
  const searchIndex = [];
  const diagrams = [];
  const pendingDiagramWrites = [];
  for (const file of markdownFiles) {
    const markdown = await fs.readFile(file, "utf8");
    const markdownPath = toPosix(path.relative(docs, file));
    const htmlPath = pageMap.get(markdownPath);
    const context = { markdownPath, htmlPath, pageMap, evidenceMap, diagramCount: 0, fenceLanguage: "" };
    const htmlBody = renderMarkdown(markdown, context, (filename, source) => {
      const output = path.join(site, "assets", "diagrams", filename);
      diagrams.push({ filename, source_sha256: sha256(source) });
      pendingDiagramWrites.push(fs.writeFile(output, renderMermaidSvg(source, slugify(filename)), "utf8"));
    });
    const title = parseTitle(markdown, markdownPath);
    pages.push({ title, path: markdownPath, url: htmlPath, track: parseTrack(markdownPath) });
    searchIndex.push({ title, path: markdownPath, url: htmlPath, track: parseTrack(markdownPath), search: plainText(markdown), excerpt: plainText(markdown).slice(0, 260) });
    const assetPrefix = relativeUrl(htmlPath, "assets/site.css").replace(/assets\/site\.css$/, "");
    await fs.mkdir(path.dirname(path.join(site, htmlPath)), { recursive: true });
    await fs.writeFile(path.join(site, htmlPath), shell({ title, body: htmlBody, page: htmlPath, pages, assetPrefix, searchIndex: "search-index.js", track: parseTrack(markdownPath) }), "utf8");
  }
  await Promise.all(pendingDiagramWrites);
  const orderedPages = pages.sort((a, b) => a.path.localeCompare(b.path));
  for (const page of orderedPages) {
    const htmlPath = path.join(site, page.url);
    const content = await fs.readFile(htmlPath, "utf8");
    const nav = orderedPages.map((item) => `<a href="${htmlEscape(relativeUrl(page.url, item.url))}" class="nav-link">${htmlEscape(item.title)}</a>`).join("");
    const patched = content.replace(/<nav aria-label="Páginas">.*?<\/nav>/s, `<nav aria-label="Páginas">${nav}</nav>`);
    await fs.writeFile(htmlPath, patched, "utf8");
  }
  await fs.writeFile(path.join(site, "assets", "site.css"), CSS, "utf8");
  await fs.writeFile(path.join(site, "assets", "site.js"), JS, "utf8");
  const safeIndex = JSON.stringify(searchIndex).replaceAll("<", "\\u003c");
  await fs.writeFile(path.join(site, "assets", "search-index.js"), `window.REPO_WIKI_INDEX=${safeIndex};\n`, "utf8");


  report.html = { status: "built", site: toPosix(path.relative(repo, site)), pages: pages.length, evidence_pages: evidenceSources.size, diagram_assets: diagrams.length, mermaid_renderer: "builtin-svg-fallback", external_requests: 0 };
  const currentFiles = new Set([...pages.map(p=>p.url), ...evidenceSources.values(), "assets/site.css", "assets/site.js", "assets/search-index.js", ...diagrams.map(d=>"assets/diagrams/"+d.filename)]);
  const previousFiles = await walk(site, path.join(site,"__none__"));
  for (const absolute of previousFiles) {
    const relative = toPosix(path.relative(site,absolute));
    if (!currentFiles.has(relative) && /\.(html|svg|css|js)$/.test(relative)) await fs.unlink(absolute);
  }
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ status: "built", repo, markdown_dir: docs, site, index: path.join(site, "index.html"), report: reportPath, pages: pages.length, evidence_pages: evidenceSources.size, diagrams: diagrams.length, external_requests: 0, renderer: report.html.mermaid_renderer }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
