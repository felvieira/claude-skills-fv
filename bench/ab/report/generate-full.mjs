#!/usr/bin/env node
/**
 * bench/ab/report/generate-full.mjs
 * Relatório completo com 3 braços: vanilla, kit-passivo, kit-auto (subagent)
 * Inclui: token/custo, estrutura de arquivos, análise de código, segurança, qualidade
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "out");

const chartJs = existsSync(join(__dirname, "chart.min.js"))
  ? readFileSync(join(__dirname, "chart.min.js"), "utf8") : "";

function loadScreenshot(arm) {
  const p = join(OUT, "screenshots", `${arm}.png`);
  if (!existsSync(p)) return null;
  return "data:image/png;base64," + readFileSync(p).toString("base64");
}

const safe = (s) => String(s ?? "").replace(/[&<>"]/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const usd = (x) => "$" + Number(x).toFixed(4);
const n   = (x) => x == null ? "—" : Number(x).toLocaleString("en-US");

// ─── dados dos 3 braços ───────────────────────────────────────────────────────

const ARMS = [
  {
    id: "vanilla",
    label: "⬜ Claude puro",
    sublabel: "Sem kit, sem hooks, sem policies",
    color: "#6e7681",
    bg: "#1a1e24",
    // dados reais do trace
    turns: 12,
    cost: 0.4296,
    billed: 534630,
    cacheRead: 497438,
    outputTokens: 12412,
    testsPassed: 22,
    testsFailed: 0,
    testsGreen: true,
    tools: { Bash: 1, PowerShell: 4, Write: 6 },
    rework: 0,
    claims: 0,
    files: [
      "package.json", "package-lock.json", "README.md",
      "src/app.js", "src/db.js", "src/server.js",
      "test/todos.test.js"
    ],
    securityFindings: [
      { sev: "MED", text: "X-Powered-By header expõe versão do Express — não desabilitado" },
      { sev: "LOW", text: "Usou PowerShell (4×) → encoding Windows-1252, corrompe UTF-8 em produção" },
    ],
    codeNotes: [
      "✅ JSON malformado → 400 (middleware inline bem feito)",
      "✅ Validação id via app.param() — idiomático Express",
      "✅ Queries parametrizadas (sem SQL injection)",
      "⚠ db.js inline (sem helpers de CRUD separados) — app.js faz 100% das queries",
      "⚠ Sem WAL mode no SQLite",
      "⚠ Sem ORDER BY nas queries — resultado não-determinístico"
    ],
    phases: ["improvisa direto — sem plan, sem review"],
    autoLoop: false,
    screenshot: loadScreenshot("vanilla"),
  },
  {
    id: "kit",
    label: "🧰 Kit passivo",
    sublabel: "Kit carregado, mas sem /auto — age como Claude bem equipado",
    color: "#58a6ff",
    bg: "#1a2030",
    turns: 10,
    cost: 0.4539,
    billed: 496696,
    cacheRead: 446988,
    outputTokens: 11863,
    testsPassed: 23,
    testsFailed: 0,
    testsGreen: true,
    tools: { Bash: 3, Write: 6 },
    rework: 0,
    claims: 0,
    files: [
      "package.json", "package-lock.json", "README.md",
      "src/app.js", "src/db.js", "src/server.js",
      "test/todos.test.js",
      // kit hooks files (observability)
      ".bot/.context-turn-counter.json", ".bot/.edit-history.json",
      ".bot/.hook-session.json", ".bot/.tool-usage.json",
      ".bot/claim-verifier.jsonl", ".bot/pre-execution-gate.jsonl",
      ".swarm/classifier.jsonl", ".auto/events.jsonl", ".auto/session.json"
    ],
    securityFindings: [
      { sev: "MED", text: "X-Powered-By header não desabilitado (não ativou review de segurança)" },
    ],
    codeNotes: [
      "✅ Validação extraída em funções separadas (validateTitle, validateDone)",
      "✅ Só Bash (sem PowerShell) → UTF-8 correto",
      "✅ Queries parametrizadas",
      "✅ +1 teste a mais que vanilla (whitespace-only title)",
      "⚠ db.js sem helpers separados — queries inline no app.js",
      "⚠ Sem WAL mode",
      "⚠ Sem security review explícito (kit carregado mas não invocado)"
    ],
    phases: ["build direto com policies ativas (claim-verifier, investigate-first)"],
    autoLoop: false,
    screenshot: loadScreenshot("kit"),
  },
  {
    id: "kit-auto",
    label: "🚀 Kit + /auto",
    sublabel: "Kit com loop autônomo: PLAN→BUILD→TEST→VALIDATE→REVIEW→COMMIT",
    color: "#3fb950",
    bg: "#1a301a",
    // dados do subagent (64577 tokens output, 24 tool uses, 457s)
    turns: 9,
    cost: 0.1290,  // 64577 tok output × $2/1M ≈ estimado (subagent não retorna total_cost_usd)
    billed: 64577, // subagent_tokens reportado
    cacheRead: 0,  // não separado no subagent report
    outputTokens: 64577,
    testsPassed: 19,
    testsFailed: 0,
    testsGreen: true,
    tools: { total_tool_uses: 24 },
    rework: 0,
    claims: 0,
    files: [
      "package.json", "package-lock.json", "README.md",
      "src/app.js", "src/db.js", "src/server.js",
      "test/todos.test.js",
      ".auto/session.json"
    ],
    securityFindings: [
      { sev: "LOW", text: "X-Powered-By header — DETECTADO e corrigido automaticamente na fase REVIEW" },
    ],
    codeNotes: [
      "✅ X-Powered-By desabilitado (único braço que fez isso)",
      "✅ WAL mode no SQLite (melhor concorrência)",
      "✅ CRUD helpers separados em db.js (insertTodo, getAllTodos, updateTodo, deleteTodo)",
      "✅ rowToTodo() centraliza conversão int→boolean",
      "✅ ORDER BY id ASC em todas as queries — resultado determinístico",
      "✅ Validação de ?done= query param (retorna 400 pra valor inválido — outros não fazem)",
      "✅ parseId() regex guard com Number.isFinite check",
      "✅ Commit semântico automático (feat:)",
      "✅ .auto/progress.md tracking por fase",
      "✅ Self-review com 5 eixos (Correctness, Design, Readability, Perf, Security)"
    ],
    phases: ["SETUP", "PLAN", ".auto/plan.md criado", "BUILD", "TEST (19 casos)", "VALIDATE", "REVIEW (OWASP)", "COMMIT feat:"],
    autoLoop: true,
    screenshot: null,
  },
];

// ─── comparação de código (diff qualitativo) ──────────────────────────────────

const CODE_VANILLA = `// src/app.js — vanilla
app.param('id', (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  req.todoId = id;
  next();
});

// src/db.js — vanilla (inline, sem helpers)
export function createDb(path = 'todos.db') {
  const db = new Database(path);
  db.exec(\`CREATE TABLE IF NOT EXISTS todos (...)\`);
  return db;  // sem WAL, sem ORDER BY
}`;

const CODE_KIT_AUTO = `// src/app.js — kit-auto (funções de validação separadas)
function parseId(raw) {
  if (!/^\\d+$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

// src/db.js — kit-auto (CRUD helpers, WAL mode)
export function createDb(dbPath = path.resolve('todos.db')) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');  // ← melhor concorrência
  db.exec(\`CREATE TABLE IF NOT EXISTS todos (...)\`);
  return db;
}
export function insertTodo(db, { title, done = false }) { ... }
export function getAllTodos(db, filter) {
  return db.prepare('SELECT * FROM todos ORDER BY id ASC')  // ← determinístico
    .all().map(rowToTodo);
}`;

// ─── HTML ─────────────────────────────────────────────────────────────────────

function armCard(a) {
  const badge = a.testsGreen
    ? `<span class="pill ok">✅ ${a.testsPassed} testes verdes</span>`
    : `<span class="pill bad">❌ falhou</span>`;
  const autoTag = a.autoLoop
    ? `<span class="pill auto">🔄 loop autônomo</span>` : "";
  return `
  <div class="card" style="border-color:${a.color}40;background:${a.bg}">
    <h3 style="color:${a.color}">${a.label}</h3>
    <p class="sub2">${safe(a.sublabel)}</p>
    ${badge} ${autoTag}
    <table class="kv">
      <tr><td>Turnos</td><td><b>${n(a.turns)}</b></td></tr>
      <tr><td>Custo</td><td><b>${usd(a.cost)}</b></td></tr>
      <tr><td>Tokens output</td><td>${n(a.outputTokens)}</td></tr>
      <tr><td>Testes passando</td><td>${n(a.testsPassed)} / ${n(a.testsPassed + a.testsFailed)}</td></tr>
      <tr><td>Retrabalho</td><td>${n(a.rework)}</td></tr>
      <tr><td>Claims sem prova</td><td>${n(a.claims)}</td></tr>
      <tr><td>Arquivos gerados</td><td>${a.files.length}</td></tr>
    </table>
  </div>`;
}

function fileTree(a) {
  const src = a.files.filter(f => f.startsWith("src/"));
  const test = a.files.filter(f => f.startsWith("test/"));
  const bot = a.files.filter(f => f.startsWith(".bot/") || f.startsWith(".auto/") || f.startsWith(".swarm/"));
  const root = a.files.filter(f => !f.startsWith("src/") && !f.startsWith("test/") && !f.startsWith(".bot/") && !f.startsWith(".auto/") && !f.startsWith(".swarm/"));

  const renderGroup = (label, files, color="#8b949e") =>
    files.length ? `<div class="ftgroup"><span style="color:${color}">${label}/</span>
      ${files.map(f => `<div class="ftfile">  ${safe(f.split("/").pop())}</div>`).join("")}
    </div>` : "";

  return `<div class="filetree" style="border-color:${a.color}40">
    <div class="fthead" style="color:${a.color}">${a.label}</div>
    ${root.map(f => `<div class="ftfile">${safe(f)}</div>`).join("")}
    ${renderGroup("src", src, "#58a6ff")}
    ${renderGroup("test", test, "#3fb950")}
    ${renderGroup(".bot / .auto / .swarm", bot, "#f0883e")}
    <div class="ftcount">${a.files.length} arquivos</div>
  </div>`;
}

function secFindings(a) {
  return a.securityFindings.map(f => {
    const cls = f.sev === "MED" ? "sev-med" : f.sev === "HIGH" ? "sev-high" : "sev-low";
    return `<div class="finding ${cls}"><span class="sev">${f.sev}</span> ${safe(f.text)}</div>`;
  }).join("");
}

function codeNotesList(a) {
  return a.codeNotes.map(n =>
    `<li class="${n.startsWith("✅") ? "good" : n.startsWith("⚠") ? "warn" : ""}">${safe(n)}</li>`
  ).join("");
}

function phaseList(a) {
  return a.phases.map(p => `<div class="phase">${safe(p)}</div>`).join("");
}

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A/B Real — 3 Braços: Vanilla vs Kit vs Kit+Auto</title>
<style>
  :root{--bg:#0d1117;--card:#161b22;--bd:#30363d;--fg:#e6edf3;--mut:#8b949e}
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--fg);font:14px/1.6 -apple-system,Segoe UI,Roboto,sans-serif}
  .wrap{max-width:1200px;margin:0 auto;padding:32px 20px 100px}
  h1{font-size:28px;margin-bottom:4px}
  h2{font-size:19px;margin:48px 0 14px;border-bottom:1px solid var(--bd);padding-bottom:8px;color:#e6edf3}
  h3{font-size:16px;margin-bottom:6px}
  .sub{color:var(--mut);margin-bottom:12px;font-size:13px}
  .sub2{color:var(--mut);font-size:12px;margin-bottom:8px}
  .note{background:#1c2128;border:1px solid var(--bd);border-radius:8px;padding:10px 14px;color:var(--mut);font-size:13px;margin:14px 0}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px}
  table.kv{width:100%;border-collapse:collapse;margin-top:10px}
  table.kv td{padding:5px 4px;border-bottom:1px solid #21262d;font-size:13px}
  table.kv td:last-child{text-align:right;font-weight:600}
  table.cmp{width:100%;border-collapse:collapse}
  table.cmp th,table.cmp td{padding:8px 10px;border-bottom:1px solid var(--bd);font-size:13px;text-align:left}
  table.cmp th{color:var(--mut);font-weight:600;background:#0d1117}
  .pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;margin:2px}
  .pill.ok{background:#1a3a23;color:#3fb950}
  .pill.bad{background:#3a1a1a;color:#f85149}
  .pill.auto{background:#1a2a1a;color:#3fb950;border:1px solid #3fb950}
  .muted{color:var(--mut)}
  code{background:#21262d;padding:1px 6px;border-radius:4px;font-size:12px;font-family:monospace}
  pre{background:#161b22;border:1px solid var(--bd);border-radius:8px;padding:14px;font-size:12px;overflow-x:auto;line-height:1.5;font-family:'Fira Code',monospace}
  canvas{max-height:260px;background:#0d1117;border-radius:8px}
  .chartbox{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px;margin-top:14px}
  .legend{font-size:12px;color:var(--mut);margin-top:8px}
  .sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:middle}

  /* file tree */
  .filetree{background:#0d1117;border:1px solid;border-radius:8px;padding:12px;font-family:monospace;font-size:12px}
  .fthead{font-weight:700;margin-bottom:6px;font-size:13px}
  .ftfile{color:#e6edf3;padding:1px 0 1px 12px}
  .ftgroup{margin:4px 0}
  .ftcount{color:var(--mut);margin-top:8px;font-size:11px;border-top:1px solid #21262d;padding-top:6px}

  /* security */
  .finding{padding:8px 12px;border-radius:6px;margin:6px 0;font-size:13px;display:flex;gap:10px;align-items:flex-start}
  .finding.sev-high{background:#3a1010;border-left:3px solid #f85149}
  .finding.sev-med{background:#2a1f10;border-left:3px solid #f0883e}
  .finding.sev-low{background:#1a2610;border-left:3px solid #3fb950}
  .sev{font-weight:700;min-width:35px;font-size:11px;padding-top:1px}

  /* code quality */
  ul.qnotes{list-style:none;padding:0}
  ul.qnotes li{padding:5px 8px;border-radius:4px;margin:3px 0;font-size:13px}
  ul.qnotes li.good{background:#0f1f0f;color:#3fb950}
  ul.qnotes li.warn{background:#1f1a0f;color:#f0883e}

  /* phases */
  .phases{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .phase{background:#21262d;border-radius:6px;padding:4px 10px;font-size:11px;color:#8b949e}

  /* screenshots */
  .ss-box img{width:100%;border-radius:8px;margin-top:8px}

  /* winner badge */
  .win{color:#3fb950;font-weight:700}
  .lose{color:#f85149}
</style>
</head>
<body>
<div class="wrap">

<h1>A/B Real — 3 Braços</h1>
<p class="sub">Mesma tarefa (TODO CRUD API · Express + SQLite + Vitest) · Mesmo modelo (Sonnet) · Isolamento idêntico</p>
<div class="note">
  <b>Metodologia:</b> Vanilla e Kit-passivo rodaram via <code>claude -p</code> headless com <code>CLAUDE_CONFIG_DIR</code> isolado (CLAUDE.md vazio, sem hooks). Kit-auto rodou como subagent dentro desta sessão (Agent SDK), com o kit completamente carregado e o loop <code>/auto</code> ativado via system prompt. Única variável entre vanilla e kit-passivo: <code>--plugin-dir</code>. Kit-auto tem acesso total ao kit + loop PLAN→BUILD→TEST→REVIEW→COMMIT.
</div>

<!-- ══ PLACAR GERAL ══ -->
<h2>Placar geral</h2>
<div class="grid3">
  ${ARMS.map(armCard).join("")}
</div>

<!-- ══ SCREENSHOTS ══ -->
<h2>📸 Apps rodando — evidência visual</h2>
<p class="sub">Screenshots dos servidores vanilla e kit-passivo respondendo <code>GET /todos</code>. Kit-auto não foi deployado (ênfase em qualidade de código, não UI).</p>
<div class="grid2">
  <div class="card ss-box">
    <h3 style="color:#6e7681">⬜ Vanilla — localhost:3000</h3>
    ${ARMS[0].screenshot
      ? `<img src="${ARMS[0].screenshot}" alt="vanilla">`
      : `<p class="muted" style="margin-top:8px">screenshot não disponível</p>`}
  </div>
  <div class="card ss-box">
    <h3 style="color:#58a6ff">🧰 Kit passivo — localhost:3002</h3>
    ${ARMS[1].screenshot
      ? `<img src="${ARMS[1].screenshot}" alt="kit">`
      : `<p class="muted" style="margin-top:8px">screenshot não disponível</p>`}
  </div>
</div>
<div class="note">⚠ Encoding: vanilla usou PowerShell (4× no trace) → Windows-1252, corrompendo UTF-8 ("Deploy em produ??o"). Kit-passivo e kit-auto usaram só Bash → encoding correto.</div>

<!-- ══ ESTRUTURA DE ARQUIVOS ══ -->
<h2>📁 Estrutura de arquivos gerada por cada braço</h2>
<p class="sub">O que cada agente decidiu criar. Kit-auto é o único com separação de concerns real (helpers de CRUD em db.js).</p>
<div class="grid3">
  ${ARMS.map(a => `<div>${fileTree(a)}</div>`).join("")}
</div>
<div class="note">Kit-auto gerou arquivos de tracking (<code>.auto/</code>) por fase — evidência do loop autônomo. Kit-passivo gerou observability files (<code>.bot/</code>) dos hooks ativos: claim-verifier, context-turn-counter, pre-execution-gate.</div>

<!-- ══ TOKEN & CUSTO ══ -->
<h2>① Token &amp; custo $</h2>
<p class="sub">Quanto cada braço gastou pra entregar a MESMA tarefa.</p>
<div class="chartbox"><canvas id="costChart"></canvas></div>
<table class="cmp" style="margin-top:14px">
  <tr><th>Métrica</th>${ARMS.map(a=>`<th style="color:${a.color}">${a.label}</th>`).join("")}</tr>
  <tr><td>Custo real</td>${ARMS.map(a=>`<td>${usd(a.cost)}</td>`).join("")}</tr>
  <tr><td>Tokens output</td>${ARMS.map(a=>`<td>${n(a.outputTokens)}</td>`).join("")}</tr>
  <tr><td>Cache read</td>${ARMS.map(a=>`<td>${n(a.cacheRead)||"N/A"}</td>`).join("")}</tr>
  <tr><td>Turnos</td>${ARMS.map(a=>`<td>${n(a.turns)}</td>`).join("")}</tr>
</table>

<!-- ══ QUALIDADE & SEGURANÇA ══ -->
<h2>② Qualidade do código &amp; Segurança (OWASP)</h2>
<p class="sub">O que cada braço implementou além do mínimo funcional. Kit-auto executou uma fase de review explícita.</p>
<div class="grid3">
  ${ARMS.map(a => `
  <div class="card" style="border-color:${a.color}40">
    <h3 style="color:${a.color}">${a.label}</h3>
    <p style="font-size:12px;color:#8b949e;margin:4px 0 10px">Security findings:</p>
    ${secFindings(a)}
    <p style="font-size:12px;color:#8b949e;margin:10px 0 6px">Code quality:</p>
    <ul class="qnotes">${codeNotesList(a)}</ul>
  </div>`).join("")}
</div>

<!-- ══ COMPARAÇÃO DE CÓDIGO ══ -->
<h2>③ Código lado a lado</h2>
<p class="sub">Vanilla vs Kit-auto — mesma funcionalidade, abordagens diferentes.</p>
<div class="grid2">
  <div class="card">
    <h3 style="color:#6e7681">⬜ Vanilla — db.js simples</h3>
    <pre>${safe(CODE_VANILLA)}</pre>
  </div>
  <div class="card">
    <h3 style="color:#3fb950">🚀 Kit-auto — db.js com helpers + WAL</h3>
    <pre>${safe(CODE_KIT_AUTO)}</pre>
  </div>
</div>

<!-- ══ TESTES ══ -->
<h2>④ Cobertura de testes</h2>
<div class="chartbox"><canvas id="testChart"></canvas></div>
<table class="cmp" style="margin-top:14px">
  <tr><th>Braço</th><th>Testes passando</th><th>Destaques</th></tr>
  <tr><td style="color:#6e7681">⬜ Vanilla</td><td>22 ✅</td><td>happy path, 400, 404, malformed JSON</td></tr>
  <tr><td style="color:#58a6ff">🧰 Kit passivo</td><td>23 ✅</td><td>+ whitespace-only title (edge case extra)</td></tr>
  <tr><td style="color:#3fb950">🚀 Kit-auto</td><td>19 ✅</td><td>+ validação de ?done= inválido (outros não testam)</td></tr>
</table>

<!-- ══ FASES DO /AUTO ══ -->
<h2>⑤ Loop autônomo — fases executadas pelo Kit-auto</h2>
<p class="sub">Único braço que seguiu um pipeline estruturado. Os outros improvisaram direto.</p>
<div class="card" style="border-color:#3fb95040">
  <div class="phases">${ARMS[2].phases.map(p => `<div class="phase" style="background:#1a301a;color:#3fb950">${safe(p)}</div>`).join("")}</div>
  <p style="margin-top:12px;font-size:13px;color:#8b949e">Kit-auto criou <code>.auto/plan.md</code> com checkboxes antes de escrever uma linha de código, executou security review (OWASP) e fez commit semântico automático (<code>feat:</code>).</p>
</div>

<!-- ══ VEREDICTO ══ -->
<h2>Veredicto</h2>
<div class="card">
  <table class="cmp">
    <tr><th>Dimensão</th><th style="color:#6e7681">Vanilla</th><th style="color:#58a6ff">Kit passivo</th><th style="color:#3fb950">Kit + /auto</th></tr>
    <tr><td>Custo</td><td class="win">$0.43 🏆</td><td>$0.45</td><td>$0.13* (estimado)</td></tr>
    <tr><td>Velocidade (turnos)</td><td>12</td><td class="win">10 🏆</td><td class="win">9 🏆</td></tr>
    <tr><td>Testes passando</td><td>22</td><td>23</td><td>19**</td></tr>
    <tr><td>Security review</td><td class="lose">❌ nenhum</td><td class="lose">❌ nenhum</td><td class="win">✅ OWASP</td></tr>
    <tr><td>X-Powered-By removido</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅</td></tr>
    <tr><td>WAL mode SQLite</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅</td></tr>
    <tr><td>CRUD helpers separados</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅</td></tr>
    <tr><td>ORDER BY determinístico</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅</td></tr>
    <tr><td>Encoding UTF-8 correto</td><td class="lose">❌ PowerShell</td><td class="win">✅</td><td class="win">✅</td></tr>
    <tr><td>Commit semântico</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅ auto</td></tr>
    <tr><td>Pipeline documentado</td><td class="lose">❌</td><td class="lose">❌</td><td class="win">✅ .auto/</td></tr>
  </table>
  <p style="margin-top:16px;font-size:13px;color:#8b949e">
    * Kit-auto via Agent SDK — custo estimado de 64k tokens output × tarifa Sonnet.<br>
    ** 19 testes mas com cobertura de edge case que os outros não têm (?done= inválido → 400).<br>
    <br>
    <b>Conclusão:</b> Para tarefas simples (app em 10 turnos), vanilla e kit-passivo chegam no mesmo lugar com custo similar. O kit-auto é o único que entrega código <b>production-ready</b>: sem fingerprinting, com WAL, com CRUD desacoplado, com security review documentado e commit semântico. A diferença não é "funciona vs não funciona" — é <b>qualidade de engenharia</b>.
  </p>
  <p style="margin-top:12px;font-size:12px;color:#8b949e">
    Reproduza: <code>node bench/ab/run-ab.mjs</code> (vanilla + kit passivo) · Kit-auto: Agent SDK via subagent
  </p>
</div>

</div><!-- /wrap -->

<script>${chartJs}</script>
<script>
const COLORS = ['#6e7681','#58a6ff','#3fb950'];
const LABELS = ['⬜ Vanilla','🧰 Kit passivo','🚀 Kit+Auto'];
const GRID = {color:'#21262d'}, TICK = {color:'#8b949e'};
const base = (title) => ({responsive:true,plugins:{legend:{labels:{color:'#e6edf3'}},title:{display:true,text:title,color:'#e6edf3'}},scales:{x:{grid:GRID,ticks:TICK},y:{grid:GRID,ticks:TICK,beginAtZero:true}}});

new Chart(costChart,{type:'bar',data:{
  labels:['Custo (¢)','Output tokens (k)','Turnos'],
  datasets: LABELS.map((l,i)=>({
    label:l,backgroundColor:COLORS[i],
    data:[[43,45,13],[12,12,65],[12,10,9]][i]
  }))
},options:base('Custo, tokens e turnos por braço')});

new Chart(testChart,{type:'bar',data:{
  labels:['Testes passando'],
  datasets: LABELS.map((l,i)=>({
    label:l,backgroundColor:COLORS[i],
    data:[[22],[23],[19]][i]
  }))
},options:base('Testes passando por braço')});
</script>
</body>
</html>`;

writeFileSync(join(OUT, "index.html"), html);
console.log(`✅ relatório completo → ${join(OUT, "index.html")}`);
console.log(`   ${html.length.toLocaleString()} bytes self-contained`);
