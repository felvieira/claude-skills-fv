#!/usr/bin/env node
/**
 * generate-v3.mjs — Round 3: prompt natural "crie um app completo todo list com crud"
 * Todos os 3 braços rodaram via Agent SDK. Arquivos lidos do disco real.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "out");

const chartJs = existsSync(join(__dirname, "chart.min.js"))
  ? readFileSync(join(__dirname, "chart.min.js"), "utf8") : "";

const safe = (s) => String(s ?? "").replace(/[&<>"]/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const usd = (x) => "$" + Number(x).toFixed(2);

function loadImg(name) {
  const p = join(OUT, "screenshots-v3", `${name}.png`);
  if (!existsSync(p)) return null;
  return "data:image/png;base64," + readFileSync(p).toString("base64");
}

const SKIP = new Set(["node_modules", ".git", "package-lock.json"]);
function listFiles(dir, prefix = "") {
  const out = [];
  try {
    for (const f of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP.has(f.name) || f.name.endsWith(".db") || f.name.endsWith(".db-shm") || f.name.endsWith(".db-wal")) continue;
      const rel = prefix ? `${prefix}/${f.name}` : f.name;
      if (f.isDirectory()) out.push(...listFiles(join(dir, f.name), rel));
      else out.push(rel);
    }
  } catch {}
  return out.sort();
}

const PROJ = {
  vanilla:   "C:/Users/Administrador/AppData/Local/Temp/ab-proj-vanilla-v3",
  kit:       "C:/Users/Administrador/AppData/Local/Temp/ab-proj-kit-passive-v3",
  "kit-auto":"C:/Users/Administrador/AppData/Local/Temp/ab-proj-kit-auto-v3",
};
const FILES = {};
for (const [arm, dir] of Object.entries(PROJ)) {
  FILES[arm] = listFiles(dir).filter(f => f !== "CLAUDE.md");
}

const ARMS = [
  {
    id: "vanilla", label: "⬜ Claude puro", color: "#6e7681", bg: "#16191e",
    turns: 8, cost: 0.21, tests: 17, runner: "node:test", lang: "EN",
    ui: true, wal: false, xpow: false, cov: false, git: false, eslint: false,
    sublabel: "Stack escolhida: Express + in-memory store + node:test + vanilla JS",
    uiDesc: "Form com title+description, filtros All/Active/Completed — UI em inglês, sem dados persistidos entre restarts",
    stackNote: "Usou node:test (nativo Node.js) em vez de Vitest — runner mais limitado, sem coverage nativo. Store in-memory perde dados ao reiniciar.",
  },
  {
    id: "kit", label: "🧰 Kit passivo", color: "#58a6ff", bg: "#0d1826",
    turns: 8, cost: 0.20, tests: 17, runner: "Vitest", lang: "PT",
    ui: true, wal: true, xpow: true, cov: false, git: false, eslint: false,
    sublabel: "Stack: Express + better-sqlite3 (WAL) + Vitest — rules ativaram security automaticamente",
    uiDesc: "UI em português: input inline + botão Adicionar, filtros Todas/Pendentes/Concluídas, todos persistidos em SQLite",
    stackNote: "WAL mode e X-Powered-By desabilitados automaticamente via rules/common/security.md — sem nenhum comando extra. SQLite real = dados persistem.",
  },
  {
    id: "kit-auto", label: "🚀 Kit + /auto", color: "#3fb950", bg: "#0d1a0d",
    turns: 8, cost: 0.27, tests: 17, runner: "Vitest", lang: "PT",
    ui: true, wal: true, xpow: true, cov: false, git: true, eslint: true,
    sublabel: "Stack: Express + better-sqlite3 (WAL) + Vitest + ESLint — loop PLAN→BUILD→TEST→REVIEW→COMMIT",
    uiDesc: "UI em português: input, filtros, contador de stats, empty state com emoji. Gerou git commit feat: e passou por ESLint.",
    stackNote: "Adicionou ESLint 9 (flat config) além do Vitest. Fez git init + commit semântico automático. .auto/ documenta cada fase do loop.",
  },
];

function armCard(a) {
  const img = loadImg(a.id);
  return `<div class="card" style="border-color:${a.color}40;background:${a.bg}">
    <h3 style="color:${a.color}">${a.label}</h3>
    <p class="sub2">${safe(a.sublabel)}</p>
    <span class="pill ok">${a.tests} testes ✅</span>
    ${a.git ? '<span class="pill git">git commit</span>' : ""}
    ${a.eslint ? '<span class="pill lint">ESLint</span>' : ""}
    <table class="kv">
      <tr><td>Test runner</td><td><code>${safe(a.runner)}</code></td></tr>
      <tr><td>WAL SQLite</td><td>${a.wal ? "✅" : "❌ in-memory"}</td></tr>
      <tr><td>X-Powered-By off</td><td>${a.xpow ? "✅" : "❌"}</td></tr>
      <tr><td>Arquivos</td><td>${FILES[a.id].length}</td></tr>
      <tr><td>Idioma UI</td><td>${safe(a.lang)}</td></tr>
    </table>
    ${img ? `<img src="${img}" style="width:100%;border-radius:8px;margin-top:10px;border:1px solid ${a.color}30" alt="${a.id}">` : ""}
    <p style="font-size:11px;color:#8b949e;margin-top:8px">${safe(a.uiDesc)}</p>
  </div>`;
}

function fileTree(a) {
  const files = FILES[a.id];
  const src   = files.filter(f => f.startsWith("src/"));
  const tests = files.filter(f => f.startsWith("test") || f.startsWith("tests"));
  const pub   = files.filter(f => f.startsWith("public"));
  const auto  = files.filter(f => f.startsWith(".auto"));
  const root  = files.filter(f => !f.startsWith("src/") && !f.startsWith("test") && !f.startsWith("public") && !f.startsWith(".auto"));
  const grp = (label, items, color) => items.length
    ? `<div class="ftg"><span style="color:${color}">${label}/</span>${items.map(f => `<div class="ftf">  ${safe(f.split("/").pop())}</div>`).join("")}</div>` : "";
  return `<div class="ftree" style="border-color:${a.color}40">
    <div class="fth" style="color:${a.color}">${a.label}</div>
    ${root.map(f => `<div class="ftf">${safe(f)}</div>`).join("")}
    ${grp("src", src, "#58a6ff")}
    ${grp("test/tests", tests, "#3fb950")}
    ${grp("public", pub, "#f0883e")}
    ${grp(".auto", auto, "#bc8cff")}
    <div class="ftc">${files.length} arquivos</div>
  </div>`;
}

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bench Round 3 — "crie um app completo todo list com crud"</title>
<style>
:root{--bg:#0d1117;--card:#161b22;--bd:#30363d;--fg:#e6edf3;--mut:#8b949e}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--fg);font:14px/1.6 -apple-system,Segoe UI,sans-serif}
.wrap{max-width:1240px;margin:0 auto;padding:32px 20px 100px}
h1{font-size:24px;margin-bottom:4px}
h2{font-size:17px;margin:40px 0 12px;border-bottom:1px solid var(--bd);padding-bottom:6px}
h3{font-size:14px;margin-bottom:4px}
.sub{color:var(--mut);font-size:13px;margin-bottom:10px}
.sub2{color:var(--mut);font-size:12px;margin-bottom:6px}
.prompt{background:#161b22;border:2px solid #3fb95066;border-radius:10px;padding:16px 20px;font-size:20px;font-weight:700;color:#3fb950;margin:14px 0;font-family:monospace;letter-spacing:-0.5px}
.note{background:#1c2128;border:1px solid var(--bd);border-radius:8px;padding:10px 14px;color:var(--mut);font-size:13px;margin:10px 0}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:16px}
table.kv{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
table.kv td{padding:4px 3px;border-bottom:1px solid #21262d}
table.kv td:last-child{text-align:right;font-weight:600}
table.cmp{width:100%;border-collapse:collapse}
table.cmp th,table.cmp td{padding:7px 10px;border-bottom:1px solid var(--bd);font-size:13px}
table.cmp th{color:var(--mut);font-weight:600;background:#0d1117}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;margin:2px}
.pill.ok{background:#1a3a23;color:#3fb950}
.pill.git{background:#1a1a3a;color:#58a6ff}
.pill.lint{background:#2a1a2a;color:#bc8cff}
.win{color:#3fb950;font-weight:700}
.lose{color:#f85149}
.neu{color:#8b949e}
code{background:#21262d;padding:1px 5px;border-radius:4px;font-size:11px;font-family:monospace}
.ftree{background:#0d1117;border:1px solid;border-radius:8px;padding:10px;font:11px monospace;line-height:1.7}
.fth{font-weight:700;margin-bottom:4px;font-size:12px}
.ftf{color:#e6edf3;padding:0 0 0 10px}
.ftg{margin:2px 0}
.ftc{color:var(--mut);margin-top:6px;font-size:10px;border-top:1px solid #21262d;padding-top:4px}
.chartbox{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:16px;margin-top:12px}
canvas{max-height:200px}
.stacknote{background:#1c2128;border-radius:6px;padding:8px 10px;font-size:12px;color:#8b949e;margin-top:8px}
</style>
</head>
<body>
<div class="wrap">

<h1>Bench Round 3 — Prompt completamente natural</h1>
<div class="prompt">"crie um app completo todo list com crud"</div>
<p class="sub">Sem spec técnica. Sem stack definida. Sem requisitos. O agente decide tudo — incluindo se cria UI, qual stack usar, como organizar o código.</p>
<div class="note">
  <b>Achado principal:</b> todos os 3 inferiram fullstack e criaram UI. A diferença está nas <b>decisões de qualidade de engenharia</b> que cada braço tomou autonomamente:<br>
  vanilla → node:test + in-memory | kit-passivo → Vitest + SQLite + WAL + security headers (via rules) | kit-auto → tudo + ESLint + git commit
</div>

<h2>📸 Apps gerados — frontends reais no browser</h2>
<p class="sub">Screenshots reais capturados via Playwright. Cada UI foi criada pelo agente sem nenhuma instrução de design.</p>
<div class="g3">
  ${ARMS.map(armCard).join("")}
</div>

<h2>📁 Estrutura de arquivos — lida do disco</h2>
<div class="g3">${ARMS.map(a => `<div>${fileTree(a)}</div>`).join("")}</div>

<h2>Notas de stack por braço</h2>
<div class="g3">
  ${ARMS.map(a => `<div class="card" style="border-color:${a.color}40">
    <h3 style="color:${a.color}">${a.label}</h3>
    <div class="stacknote">${safe(a.stackNote)}</div>
  </div>`).join("")}
</div>

<h2>Veredicto</h2>
<div class="card">
  <table class="cmp">
    <tr><th>Dimensão</th><th style="color:#6e7681">Vanilla</th><th style="color:#58a6ff">Kit passivo</th><th style="color:#3fb950">Kit + /auto</th></tr>
    <tr><td>Inferiu UI?</td><td class="win">✅</td><td class="win">✅</td><td class="win">✅</td></tr>
    <tr><td>Persistência real</td><td class="lose">❌ in-memory</td><td class="win">✅ SQLite</td><td class="win">✅ SQLite</td></tr>
    <tr><td>WAL mode</td><td class="lose">❌</td><td class="win">✅ via rules</td><td class="win">✅ via rules</td></tr>
    <tr><td>Security headers</td><td class="lose">❌</td><td class="win">✅ via rules</td><td class="win">✅ via rules</td></tr>
    <tr><td>Test runner moderno</td><td class="lose">node:test</td><td class="win">Vitest</td><td class="win">Vitest</td></tr>
    <tr><td>Linter</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅ ESLint 9</td></tr>
    <tr><td>Git commit semântico</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅ feat:</td></tr>
    <tr><td>Idioma da UI</td><td class="neu">EN</td><td class="win">PT</td><td class="win">PT</td></tr>
  </table>
  <p style="margin-top:14px;font-size:13px;color:#8b949e">
    <b>O que as rules do kit fazem de verdade:</b> kit-passivo escolheu SQLite, WAL e desabilitou X-Powered-By <em>sem que ninguém pedisse</em>. São decisões que o vanilla não tomou. Isso é o valor das <code>rules/common/security.md</code> e <code>rules/common/testing.md</code> em ação — não precisam de /auto pra funcionar.
    <br><br>
    <b>O /auto adiciona:</b> ESLint, git commit semântico, .auto/ tracking de fases, loop documentado. Para projetos simples a diferença é pequena. Para projetos grandes onde auditoria e rastreabilidade importam, é a diferença entre "entregou" e "entregou com qualidade".
  </p>
</div>

</div>
<script>${chartJs}</script>
<script>
const C=['#6e7681','#58a6ff','#3fb950'];
const L=['Vanilla','Kit passivo','Kit+Auto'];
const G={color:'#21262d'},T={color:'#8b949e'};
new Chart(document.createElement('canvas'),{});
</script>
</body>
</html>`;

writeFileSync(join(OUT, "index-v3.html"), html);
console.log(`✅ index-v3.html → ${join(OUT, "index-v3.html")}`);
console.log(`   ${(html.length / 1024).toFixed(0)}KB`);
for (const a of ARMS) {
  console.log(`  ${a.label}: ${FILES[a.id].length} arquivos`);
}
