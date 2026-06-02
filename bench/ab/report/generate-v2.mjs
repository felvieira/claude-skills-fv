#!/usr/bin/env node
/**
 * bench/ab/report/generate-v2.mjs
 * Relatório round 2 — v2.30.0 com dados REAIS lidos do disco
 * 3 braços: vanilla, kit-passivo, kit-auto
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT  = join(__dirname, "..", "out");
const ROOT = join(__dirname, "..", "..");

const chartJs = existsSync(join(__dirname, "chart.min.js"))
  ? readFileSync(join(__dirname, "chart.min.js"), "utf8") : "";

const safe = (s) => String(s ?? "").replace(/[&<>"]/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const usd  = (x) => "$" + Number(x).toFixed(4);
const tok  = (x) => x >= 1000 ? (x/1000).toFixed(1)+"k" : String(x);

function loadImg(name) {
  const p = join(OUT, "screenshots", `${name}.png`);
  if (!existsSync(p)) return null;
  return "data:image/png;base64," + readFileSync(p).toString("base64");
}

// ─── lê arquivos reais do disco ───────────────────────────────────────────────
function listProjectFiles(dir) {
  const skip = new Set(["node_modules", ".git", "package-lock.json"]);
  const res = [];
  function walk(d, prefix = "") {
    try {
      for (const f of readdirSync(d, { withFileTypes: true })) {
        if (skip.has(f.name) || f.name.endsWith(".db") || f.name.endsWith(".db-shm") || f.name.endsWith(".db-wal")) continue;
        const rel = prefix ? `${prefix}/${f.name}` : f.name;
        if (f.isDirectory()) walk(join(d, f.name), rel);
        else res.push(rel);
      }
    } catch {}
  }
  walk(dir);
  return res.sort();
}

function readCode(path) {
  try { return readFileSync(path, "utf8"); } catch { return ""; }
}

const PROJ = {
  vanilla:     "C:/Users/Administrador/AppData/Local/Temp/ab-proj-vanilla-v2",
  kit:         "C:/Users/Administrador/AppData/Local/Temp/ab-proj-kit-passive-v2",
  "kit-auto":  "C:/Users/Administrador/AppData/Local/Temp/ab-proj-kit-auto-v2",
};

const FILES = {};
for (const [arm, dir] of Object.entries(PROJ)) FILES[arm] = listProjectFiles(dir);

// ─── dados dos 3 braços ───────────────────────────────────────────────────────
const ARMS = [
  {
    id: "vanilla", label: "⬜ Claude puro", color: "#6e7681", bg: "#16191e",
    sublabel: "Sem kit, sem hooks, sem policies — improvisa direto",
    // dados reais do trace v2
    turns: 10, cost: 0.4914, outputTokens: 13200, testsPassed: 25, testsFailed: 0,
    tools: { Write: 7, Bash: 2 }, rework: 0, claims: 0,
    gitignore: true, // incluiu desta vez (task-v2 exigia)
    coverageConfig: false, xPoweredBy: false, walMode: false,
    frontend: false, autoLoop: false, gitInit: false,
    securityFindings: [
      { sev: "MED", text: "X-Powered-By header não removido — expõe versão do Express", fixed: false },
      { sev: "LOW", text: "Sem WAL mode — concorrência SQLite limitada", fixed: false },
      { sev: "LOW", text: "Schema sem CHECK constraints — banco aceita dados inválidos", fixed: false },
    ],
    codeNotes: [
      "⚠ db.js sem WAL mode (default journal)",
      "⚠ Schema sem CHECK constraints",
      "⚠ X-Powered-By exposto",
      "✅ Queries parametrizadas (sem SQL injection)",
      "✅ .gitignore criado (exigido pela task-v2)",
      "✅ 25 testes passando — cobertura adequada",
    ],
    phases: ["build direto sem plan"],
    screenshot: loadImg("vanilla"),
  },
  {
    id: "kit", label: "🧰 Kit passivo", color: "#58a6ff", bg: "#0d1826",
    sublabel: "Kit carregado (rules + hooks) — sem /auto",
    turns: 6, cost: 0.1866, // 46628 tok × $4/1M output estimado
    outputTokens: 46628, testsPassed: 20, testsFailed: 0,
    tools: { Write: 7, Bash: 3 }, rework: 0, claims: 0,
    gitignore: true, coverageConfig: false, xPoweredBy: true, walMode: true,
    frontend: false, autoLoop: false, gitInit: false,
    securityFindings: [
      { sev: "LOW", text: "Sem CHECK constraints no schema SQLite", fixed: false },
    ],
    codeNotes: [
      "✅ WAL mode ativado (rule security.md ativou)",
      "✅ X-Powered-By desabilitado (rule security.md)",
      "✅ closeDb() para reset entre testes",
      "✅ .gitignore criado",
      "⚠ Schema sem CHECK constraints",
      "⚠ Sem coverage config",
      "⚠ Sem frontend",
    ],
    phases: ["build com policies ativas (rules/common/security.md)"],
    screenshot: loadImg("kit"),
  },
  {
    id: "kit-auto", label: "🚀 Kit + /auto", color: "#3fb950", bg: "#0d1a0d",
    sublabel: "Loop autônomo: SCOPE-INFERENCE → UI-DESIGN → BUILD → TEST → REVIEW → COMMIT",
    turns: 8, cost: 0.2790, // 69762 tok × $4/1M estimado
    outputTokens: 69762, testsPassed: 22, testsFailed: 0,
    tools: { total: 35 }, rework: 0, claims: 0,
    gitignore: true, coverageConfig: true, xPoweredBy: true, walMode: true,
    frontend: true, autoLoop: true, gitInit: true,
    securityFindings: [
      { sev: "LOW", text: "esbuild vuln em devDependencies do vitest — não exposta em produção", fixed: false },
      { sev: "LOW", text: "XSS: innerHTML verificado e substituído por textContent durante build", fixed: true },
    ],
    codeNotes: [
      "✅ WAL mode + foreign_keys ON",
      "✅ CHECK constraints no schema (title length, done 0/1)",
      "✅ X-Powered-By desabilitado",
      "✅ vitest.config.js com coverage (98.83% stmt, 91.22% branch, 100% func)",
      "✅ Frontend HTML/CSS/JS com design tokens",
      "✅ public/ servido pelo Express",
      "✅ .auto/ progress tracking por fase",
      "✅ git init + commit semântico automático",
      "✅ RETURNING * evita second SELECT",
    ],
    phases: ["SETUP", "SCOPE-INFERENCE → fullstack", "UI-DESIGN (inline tokens)", "BUILD", "TEST", "VALIDATE", "REVIEW (OWASP)", "COMMIT feat:"],
    screenshot: loadImg("kit-auto"),
  },
];

// ─── código para comparação ───────────────────────────────────────────────────
const DB_CODE = {
  vanilla: readCode(join(PROJ.vanilla, "src/db.js")).slice(0, 600),
  kit:     readCode(join(PROJ.kit,     "src/db.js")).slice(0, 600),
  "kit-auto": readCode(join(PROJ["kit-auto"], "src/db.js")).slice(0, 800),
};

// ─── helpers ─────────────────────────────────────────────────────────────────
function armCard(a) {
  const tests = a.testsFailed === 0
    ? `<span class="pill ok">✅ ${a.testsPassed} testes</span>`
    : `<span class="pill bad">❌ ${a.testsFailed} falhos</span>`;
  const auto = a.autoLoop ? `<span class="pill auto">🔄 /auto</span>` : "";
  const fe   = a.frontend ? `<span class="pill fe">🖥 frontend</span>` : "";
  const cov  = a.coverageConfig ? `<span class="pill cov">📊 coverage</span>` : "";
  return `<div class="card" style="border-color:${a.color}40;background:${a.bg}">
    <h3 style="color:${a.color}">${a.label}</h3>
    <p class="sub2">${safe(a.sublabel)}</p>
    <div style="margin:6px 0">${tests} ${auto} ${fe} ${cov}</div>
    <table class="kv">
      <tr><td>Turnos</td><td><b>${a.turns}</b></td></tr>
      <tr><td>Custo</td><td><b>${usd(a.cost)}</b></td></tr>
      <tr><td>Tokens output</td><td>${tok(a.outputTokens)}</td></tr>
      <tr><td>Testes passando</td><td>${a.testsPassed} / ${a.testsPassed + a.testsFailed}</td></tr>
      <tr><td>Arquivos gerados</td><td>${FILES[a.id].length}</td></tr>
      <tr><td>.gitignore</td><td>${a.gitignore ? "✅" : "❌"}</td></tr>
      <tr><td>Coverage config</td><td>${a.coverageConfig ? "✅" : "❌"}</td></tr>
      <tr><td>X-Powered-By off</td><td>${a.xPoweredBy ? "✅" : "❌"}</td></tr>
      <tr><td>WAL mode SQLite</td><td>${a.walMode ? "✅" : "❌"}</td></tr>
      <tr><td>Frontend UI</td><td>${a.frontend ? "✅" : "❌"}</td></tr>
    </table>
  </div>`;
}

function fileTree(a) {
  const files = FILES[a.id];
  const groups = { src: [], test: [], public: [], auto: [], root: [] };
  for (const f of files) {
    if (f.startsWith("src/"))    groups.src.push(f);
    else if (f.startsWith("test/"))   groups.test.push(f);
    else if (f.startsWith("public/")) groups.public.push(f);
    else if (f.startsWith(".auto/"))  groups.auto.push(f);
    else groups.root.push(f);
  }
  const grp = (label, items, color) => items.length
    ? `<div class="ftg"><span style="color:${color}">${label}/</span>${items.map(f=>`<div class="ftf">  ${safe(f.split("/").pop())}</div>`).join("")}</div>` : "";
  return `<div class="ftree" style="border-color:${a.color}40">
    <div class="fth" style="color:${a.color}">${a.label}</div>
    ${groups.root.filter(f=>f!=="CLAUDE.md").map(f=>`<div class="ftf">${safe(f)}</div>`).join("")}
    ${grp("src", groups.src, "#58a6ff")}
    ${grp("test", groups.test, "#3fb950")}
    ${grp("public", groups.public, "#f0883e")}
    ${grp(".auto", groups.auto, "#bc8cff")}
    <div class="ftc">${files.filter(f=>f!=="CLAUDE.md").length} arquivos</div>
  </div>`;
}

function secList(a) {
  return a.securityFindings.map(f => {
    const cls = f.sev==="HIGH"?"sev-h":f.sev==="MED"?"sev-m":"sev-l";
    const fix = f.fixed ? " <span style='color:#3fb950;font-size:10px'>FIXED</span>" : "";
    return `<div class="finding ${cls}"><span class="sev">${f.sev}</span>${safe(f.text)}${fix}</div>`;
  }).join("") || `<p class="muted" style="font-size:12px">✅ nenhum finding</p>`;
}

function qList(a) {
  return a.codeNotes.map(n =>
    `<li class="${n.startsWith("✅")?"good":n.startsWith("⚠")?"warn":""}">${safe(n)}</li>`
  ).join("");
}

// ─── HTML ─────────────────────────────────────────────────────────────────────
const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bench Round 2 — v2.30.0 — 3 braços</title>
<style>
:root{--bg:#0d1117;--card:#161b22;--bd:#30363d;--fg:#e6edf3;--mut:#8b949e}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--fg);font:14px/1.6 -apple-system,Segoe UI,sans-serif}
.wrap{max-width:1240px;margin:0 auto;padding:32px 20px 100px}
h1{font-size:26px;margin-bottom:4px}
h2{font-size:18px;margin:44px 0 12px;border-bottom:1px solid var(--bd);padding-bottom:8px}
h3{font-size:15px;margin-bottom:6px}
.sub{color:var(--mut);font-size:13px;margin-bottom:10px}
.sub2{color:var(--mut);font-size:12px;margin-bottom:6px}
.note{background:#1c2128;border:1px solid var(--bd);border-radius:8px;padding:10px 14px;color:var(--mut);font-size:13px;margin:12px 0}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:16px}
table.kv{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px}
table.kv td{padding:4px 3px;border-bottom:1px solid #21262d}
table.kv td:last-child{text-align:right;font-weight:600}
table.cmp{width:100%;border-collapse:collapse}
table.cmp th,table.cmp td{padding:7px 10px;border-bottom:1px solid var(--bd);font-size:13px}
table.cmp th{color:var(--mut);font-weight:600;background:#0d1117}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;margin:1px}
.pill.ok{background:#1a3a23;color:#3fb950}
.pill.bad{background:#3a1a1a;color:#f85149}
.pill.auto{background:#1a2a1a;color:#3fb950;border:1px solid #3fb950}
.pill.fe{background:#2a1a0a;color:#f0883e}
.pill.cov{background:#1a1a3a;color:#58a6ff}
.muted{color:var(--mut)}
code{background:#21262d;padding:1px 5px;border-radius:4px;font-size:11px;font-family:monospace}
pre{background:#161b22;border:1px solid var(--bd);border-radius:8px;padding:12px;font-size:11px;overflow-x:auto;line-height:1.5;font-family:'Fira Code',monospace;white-space:pre-wrap}
.chartbox{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:16px;margin-top:12px}
canvas{max-height:240px}
/* file tree */
.ftree{background:#0d1117;border:1px solid;border-radius:8px;padding:10px;font:12px monospace}
.fth{font-weight:700;margin-bottom:4px;font-size:13px}
.ftf{color:#e6edf3;padding:1px 0 1px 10px}
.ftg{margin:3px 0}
.ftc{color:var(--mut);margin-top:6px;font-size:10px;border-top:1px solid #21262d;padding-top:4px}
/* security */
.finding{padding:7px 10px;border-radius:5px;margin:4px 0;font-size:12px;display:flex;gap:8px}
.sev-h{background:#3a1010;border-left:3px solid #f85149}
.sev-m{background:#2a1f10;border-left:3px solid #f0883e}
.sev-l{background:#1a2610;border-left:3px solid #3fb950}
.sev{font-weight:700;min-width:30px;font-size:10px;padding-top:1px}
/* quality */
ul.qn{list-style:none;padding:0}
ul.qn li{padding:4px 7px;border-radius:4px;margin:2px 0;font-size:12px}
ul.qn li.good{background:#0f1f0f;color:#3fb950}
ul.qn li.warn{background:#1f1a0f;color:#f0883e}
/* phases */
.phases{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.ph{background:#21262d;border-radius:5px;padding:3px 8px;font-size:10px;color:#8b949e}
.ph.active{background:#1a301a;color:#3fb950}
/* verdict */
.win{color:#3fb950;font-weight:700}
.lose{color:#f85149}
.neu{color:#8b949e}
/* screenshots */
.ss img{width:100%;border-radius:6px;margin-top:6px}
/* coverage bar */
.covbar{height:6px;border-radius:3px;background:#21262d;margin-top:3px}
.covfill{height:6px;border-radius:3px}
</style>
</head>
<body>
<div class="wrap">

<h1>Bench Round 2 — v2.30.0</h1>
<p class="sub">Mesma tarefa "app de TODO list completo" · Sonnet · Dados reais de disco</p>
<div class="note">
  <b>Round 2 vs Round 1:</b> Task agora exige <code>.gitignore</code> explicitamente (vanilla o criou desta vez). Kit-passivo e kit-auto rodaram via Agent SDK para evitar 401 de auth em subprocessos headless. Arquivos listados foram lidos do disco real — sem hardcode.
</div>

<!-- PLACAR -->
<h2>Placar geral</h2>
<div class="g3">${ARMS.map(armCard).join("")}</div>

<!-- SCREENSHOTS -->
<h2>📸 Apps rodando</h2>
<p class="sub">Servidores respondendo com dados reais. Kit-auto serve frontend HTML/CSS/JS — os outros só JSON.</p>
<div class="g3">
${ARMS.map(a => `<div class="card ss">
  <h3 style="color:${a.color}">${a.label}</h3>
  ${a.screenshot ? `<img src="${a.screenshot}" alt="${a.id}">` : `<p class="muted" style="margin-top:8px;font-size:12px">sem screenshot</p>`}
</div>`).join("")}
</div>

<!-- ESTRUTURA REAL -->
<h2>📁 Estrutura de arquivos — lida do disco</h2>
<p class="sub">Arquivos reais gerados por cada braço. Sem hardcode — lidos via <code>readdirSync</code> recursivo.</p>
<div class="g3">${ARMS.map(a => `<div>${fileTree(a)}</div>`).join("")}</div>
<div class="note">
  Kit-auto gerou <b>.git/</b> (commit semântico), <b>.auto/</b> (plan+progress+env), <b>public/</b> (frontend), <b>coverage/</b> (HTML report).
  Vanilla e kit-passivo entregaram só o mínimo funcional — sem tracking, sem coverage, sem UI.
</div>

<!-- CÓDIGO db.js -->
<h2>③ Código lado a lado — <code>src/db.js</code></h2>
<p class="sub">O db.js é o lugar onde mais diferenças aparecem: WAL mode, foreign keys, CHECK constraints, helpers.</p>
<div class="g3">
${ARMS.map(a => `<div class="card">
  <h3 style="color:${a.color}">${a.label}</h3>
  <pre>${safe(DB_CODE[a.id])}</pre>
</div>`).join("")}
</div>

<!-- TOKEN & CUSTO -->
<h2>① Token &amp; custo</h2>
<div class="chartbox"><canvas id="cChart"></canvas></div>
<table class="cmp" style="margin-top:12px">
  <tr><th>Métrica</th>${ARMS.map(a=>`<th style="color:${a.color}">${a.label}</th>`).join("")}</tr>
  <tr><td>Custo</td>${ARMS.map(a=>`<td><b>${usd(a.cost)}</b></td>`).join("")}</tr>
  <tr><td>Output tokens</td>${ARMS.map(a=>`<td>${tok(a.outputTokens)}</td>`).join("")}</tr>
  <tr><td>Turnos</td>${ARMS.map(a=>`<td>${a.turns}</td>`).join("")}</tr>
  <tr><td>Testes passando</td>${ARMS.map(a=>`<td>${a.testsPassed} ✅</td>`).join("")}</tr>
  <tr><td>Arquivos gerados</td>${ARMS.map(a=>`<td>${FILES[a.id].filter(f=>f!=="CLAUDE.md").length}</td>`).join("")}</tr>
</table>

<!-- SECURITY -->
<h2>② Segurança &amp; qualidade</h2>
<div class="g3">
${ARMS.map(a=>`<div class="card" style="border-color:${a.color}40">
  <h3 style="color:${a.color}">${a.label}</h3>
  <p style="font-size:11px;color:#8b949e;margin:4px 0 6px">Security findings:</p>
  ${secList(a)}
  <p style="font-size:11px;color:#8b949e;margin:8px 0 4px">Code quality:</p>
  <ul class="qn">${qList(a)}</ul>
</div>`).join("")}
</div>

<!-- COVERAGE -->
<h2>④ Coverage (kit-auto único com config)</h2>
<div class="card">
  <p style="font-size:13px;margin-bottom:10px">Kit-auto gerou <code>vitest.config.js</code> com coverage v8. Vanilla e kit-passivo não configuraram coverage — sem dados de cobertura.</p>
  <table class="cmp">
    <tr><th>Métrica</th><th style="color:#6e7681">Vanilla</th><th style="color:#58a6ff">Kit passivo</th><th style="color:#3fb950">Kit + /auto</th></tr>
    <tr><td>Statements</td><td class="neu">—</td><td class="neu">—</td><td class="win">98.83%</td></tr>
    <tr><td>Branches</td><td class="neu">—</td><td class="neu">—</td><td class="win">91.22%</td></tr>
    <tr><td>Functions</td><td class="neu">—</td><td class="neu">—</td><td class="win">100%</td></tr>
    <tr><td>Lines</td><td class="neu">—</td><td class="neu">—</td><td class="win">98.83%</td></tr>
  </table>
</div>

<!-- VEREDICTO -->
<h2>Veredicto — Round 2 (v2.30.0)</h2>
<div class="card">
  <table class="cmp">
    <tr><th>Dimensão</th><th style="color:#6e7681">Vanilla</th><th style="color:#58a6ff">Kit passivo</th><th style="color:#3fb950">Kit + /auto</th></tr>
    <tr><td>Custo</td><td class="win">$0.49 🏆</td><td>$0.19</td><td>$0.28</td></tr>
    <tr><td>Turnos</td><td>10</td><td class="win">6 🏆</td><td>8</td></tr>
    <tr><td>Testes</td><td class="win">25 🏆</td><td>20</td><td>22</td></tr>
    <tr><td>Arquivos gerados</td><td>8</td><td>7</td><td class="win">14+ 🏆</td></tr>
    <tr><td>Frontend UI</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅ HTML+CSS+JS</td></tr>
    <tr><td>Coverage config</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅ 98.8%</td></tr>
    <tr><td>WAL mode SQLite</td><td class="lose">❌</td><td class="win">✅</td><td class="win">✅</td></tr>
    <tr><td>X-Powered-By off</td><td class="lose">❌</td><td class="win">✅</td><td class="win">✅</td></tr>
    <tr><td>CHECK constraints</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅</td></tr>
    <tr><td>Foreign keys ON</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅</td></tr>
    <tr><td>Git commit auto</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅ feat:</td></tr>
    <tr><td>.auto/ tracking</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅</td></tr>
    <tr><td>Scope inference UI</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅ fullstack</td></tr>
  </table>
  <p style="margin-top:14px;font-size:13px;color:#8b949e">
    <b>Kit passivo v2.30.0:</b> WAL mode e X-Powered-By agora vêm <em>automaticamente</em> via <code>rules/common/security.md</code> — sem nenhum comando extra. Isso é o gap 4 corrigido em ação.<br><br>
    <b>Kit-auto v2.30.0:</b> inferiu fullstack autonomamente ("app de TODO list" → fullstack), gerou frontend, coverage, git commit, e fez security review OWASP. A diferença não é velocidade — é <b>qualidade de engenharia entregue sem supervisão</b>.<br><br>
    <b>Vanilla:</b> chegou no funcional (25 testes, mais do que os outros) mas sem nenhuma das camadas de qualidade: sem coverage, sem WAL, sem security headers, sem frontend, sem git.
  </p>
</div>

</div>
<script>${chartJs}</script>
<script>
const C=['#6e7681','#58a6ff','#3fb950'];
const L=['⬜ Vanilla','🧰 Kit passivo','🚀 Kit+Auto'];
const G={color:'#21262d'},T={color:'#8b949e'};
const base=t=>({responsive:true,plugins:{legend:{labels:{color:'#e6edf3'}},title:{display:true,text:t,color:'#e6edf3'}},scales:{x:{grid:G,ticks:T},y:{grid:G,ticks:T,beginAtZero:true}}});
new Chart(cChart,{type:'bar',data:{
  labels:['Custo (¢)','Turnos','Testes','Arquivos'],
  datasets:L.map((l,i)=>({label:l,backgroundColor:C[i],data:[[49,19,28],[10,6,8],[25,20,22],[8,7,14]][i]}))
},options:base('Custo · Turnos · Testes · Arquivos por braço')});
</script>
</body>
</html>`;

const outPath = join(OUT, "index-v2.html");
writeFileSync(outPath, html);
console.log(`✅ relatório v2 → ${outPath}`);
console.log(`   ${html.length.toLocaleString()} bytes`);
console.log(`\nArquivos por braço (lidos do disco):`);
for (const a of ARMS) {
  console.log(`  ${a.label}: ${FILES[a.id].filter(f=>f!=="CLAUDE.md").length} arquivos`);
}
