#!/usr/bin/env node
/**
 * bench/ab/report/generate.mjs — gera o relatório HTML self-contained.
 *
 * Lê out/metrics.json (produzido por instrument.mjs) e produz out/index.html:
 * um relatório passo-a-passo, lado a lado, com 4 eixos:
 *   1. Token & custo $        2. Qualidade & retrabalho
 *   3. Memória & contexto     4. Honestidade (claims falsos)
 *
 * Chart.js é embutido inline (report/chart.min.js) → zero CDN, abre offline.
 *
 * Uso: node bench/ab/report/generate.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "out");

const metricsPath = join(OUT, "metrics.json");
if (!existsSync(metricsPath)) {
  console.error("✗ out/metrics.json não existe. Rode: node bench/ab/instrument.mjs");
  process.exit(1);
}
const M = JSON.parse(readFileSync(metricsPath, "utf8"));
const V = M.vanilla;
const K = M.kit;

const chartJs = existsSync(join(__dirname, "chart.min.js"))
  ? readFileSync(join(__dirname, "chart.min.js"), "utf8")
  : "";

// screenshots embutidas como base64 (opcionais — geradas por capture-screenshots.mjs)
function loadScreenshot(arm) {
  const p = join(OUT, "screenshots", `${arm}.png`);
  if (!existsSync(p)) return null;
  return "data:image/png;base64," + readFileSync(p).toString("base64");
}
const ssVanilla = loadScreenshot("vanilla");
const ssKit = loadScreenshot("kit");

// ─── helpers de formatação ────────────────────────────────────────────────────
const n = (x) => (x == null ? "—" : Number(x).toLocaleString("en-US"));
const usd = (x) => (x == null ? "—" : "$" + Number(x).toFixed(4));
const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : 0);
const safe = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function armSummary(a) {
  if (!a) return null;
  const q = a.quality || {};
  return {
    arm: a.arm,
    turns: a.numTurns,
    finished: a.resultSubtype === "success",
    subtype: a.resultSubtype,
    out: a.tokens.output,
    cacheRead: a.tokens.cacheRead,
    cacheCreate: a.tokens.cacheCreate,
    billed: a.totalBilled,
    cost: a.costReal,
    wallS: Math.round(a.wallMs / 1000),
    tools: a.tools,
    rework: a.rework.score,
    reworkFiles: a.rework.files,
    claims: a.claims.unverified.length,
    claimsAll: a.claims.all.length,
    testGreen: q.exitZero === true,
    passed: q.passed,
    failed: q.failed,
    files: q.fileCount,
    timeline: a.timeline,
  };
}

const vs = armSummary(V);
const ks = armSummary(K);

// dataset pra gráfico de contexto (cache_read por turno = proxy de contexto carregado)
function ctxSeries(s) {
  if (!s) return [];
  return s.timeline.map((t) => t.cacheReadThisTurn || 0);
}

const data = {
  vanilla: vs,
  kit: ks,
  ctxVanilla: ctxSeries(vs),
  ctxKit: ctxSeries(ks),
  generatedNote: "Dados reais capturados via `claude -p` headless, traces em bench/ab/out/*.json",
};

// ─── verdial: quem ganha cada eixo ────────────────────────────────────────────
function verdict() {
  const v = [];
  if (vs && ks) {
    const costWin = ks.cost < vs.cost ? "kit" : "vanilla";
    v.push(`Custo: ${costWin} mais barato (${usd(vs.cost)} vs ${usd(ks.cost)})`);
    const greenWin = ks.testGreen && !vs.testGreen ? "kit" : vs.testGreen && !ks.testGreen ? "vanilla" : "empate";
    v.push(`Testes verdes: ${greenWin}`);
    v.push(`Retrabalho: vanilla=${vs.rework} vs kit=${ks.rework}`);
    v.push(`Claims sem prova: vanilla=${vs.claims} vs kit=${ks.claims}`);
  }
  return v;
}

// ─── HTML ─────────────────────────────────────────────────────────────────────
function card(s, color) {
  if (!s) return `<div class="card"><h3>${color}</h3><p class="muted">sem dados</p></div>`;
  const badge = s.testGreen
    ? `<span class="pill ok">✅ testes verdes</span>`
    : `<span class="pill bad">❌ não chegou a verde (${safe(s.subtype)})</span>`;
  return `
  <div class="card">
    <h3>${s.arm === "kit" ? "🧰 Claude + Dev Team Kit" : "⬜ Claude puro (vanilla)"}</h3>
    ${badge}
    <table class="kv">
      <tr><td>Turnos</td><td><b>${n(s.turns)}</b></td></tr>
      <tr><td>Custo real</td><td><b>${usd(s.cost)}</b></td></tr>
      <tr><td>Tokens output</td><td>${n(s.out)}</td></tr>
      <tr><td>Cache read (contexto relido)</td><td>${n(s.cacheRead)}</td></tr>
      <tr><td>Total billed</td><td>${n(s.billed)}</td></tr>
      <tr><td>Tempo de parede</td><td>${n(s.wallS)}s</td></tr>
      <tr><td>Arquivos gerados</td><td>${n(s.files)}</td></tr>
      <tr><td>Testes passando</td><td>${s.passed == null ? "—" : n(s.passed)}${s.failed ? ` (${n(s.failed)} falhando)` : ""}</td></tr>
      <tr><td>Retrabalho (writes/edits repetidos)</td><td>${n(s.rework)}</td></tr>
      <tr><td>Claims sem evidência</td><td>${n(s.claims)} / ${n(s.claimsAll)}</td></tr>
    </table>
  </div>`;
}

function toolRows() {
  const allTools = new Set([...Object.keys(vs?.tools || {}), ...Object.keys(ks?.tools || {})]);
  return [...allTools].sort().map((t) =>
    `<tr><td>${safe(t)}</td><td>${n(vs?.tools?.[t] || 0)}</td><td>${n(ks?.tools?.[t] || 0)}</td></tr>`
  ).join("");
}

function reworkList(s) {
  if (!s || !s.reworkFiles?.length) return `<li class="muted">nenhum arquivo reescrito 2x+ — sem retrabalho detectado</li>`;
  return s.reworkFiles.map((f) => `<li><code>${safe(f.path)}</code> escrito <b>${f.writes}×</b></li>`).join("");
}

function claimList(a) {
  if (!a) return "";
  const cs = a.claims.unverified;
  if (!cs.length) return `<p class="muted">✅ nenhuma afirmação de resultado sem rodar teste antes.</p>`;
  return `<ul class="claims">` + cs.map((c) =>
    `<li>turno ${c.turn}: “${safe(c.snippet)}…” <span class="pill bad">sem teste antes</span></li>`
  ).join("") + `</ul>`;
}

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A/B Real — Claude vanilla vs Dev Team Kit</title>
<style>
  :root{--bg:#0d1117;--card:#161b22;--bd:#30363d;--fg:#e6edf3;--mut:#8b949e;--van:#6e7681;--kit:#3fb950;--bad:#f85149;--acc:#58a6ff}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 -apple-system,Segoe UI,Roboto,sans-serif}
  .wrap{max-width:1080px;margin:0 auto;padding:32px 20px 80px}
  h1{font-size:30px;margin:0 0 4px} h2{font-size:21px;margin:48px 0 14px;border-bottom:1px solid var(--bd);padding-bottom:8px}
  h3{margin:0 0 10px;font-size:18px}
  .sub{color:var(--mut);margin:0 0 8px}
  .note{background:#1c2128;border:1px solid var(--bd);border-radius:8px;padding:10px 14px;color:var(--mut);font-size:13px;margin:14px 0}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
  .card{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px}
  table.kv{width:100%;border-collapse:collapse;margin-top:8px}
  table.kv td{padding:6px 4px;border-bottom:1px solid #21262d;font-size:14px}
  table.kv td:last-child{text-align:right}
  table.cmp{width:100%;border-collapse:collapse;margin-top:10px}
  table.cmp th,table.cmp td{padding:8px 10px;border-bottom:1px solid var(--bd);text-align:left}
  table.cmp th:nth-child(2),table.cmp td:nth-child(2){text-align:right;color:var(--van)}
  table.cmp th:nth-child(3),table.cmp td:nth-child(3){text-align:right;color:var(--kit)}
  .pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600}
  .pill.ok{background:#1a3a23;color:var(--kit)} .pill.bad{background:#3a1a1a;color:var(--bad)}
  .muted{color:var(--mut)} code{background:#21262d;padding:1px 5px;border-radius:4px;font-size:13px}
  canvas{margin-top:12px;background:#0d1117;border-radius:8px;max-height:300px}
  .chartbox{background:var(--card);border:1px solid var(--bd);border-radius:12px;padding:18px;margin-top:14px}
  ul.claims li{margin:6px 0} .win{color:var(--kit);font-weight:700}
  .legend{font-size:13px;color:var(--mut);margin-top:6px}
  .sw{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:middle}
  .step{display:flex;gap:12px;margin:10px 0;align-items:flex-start}
  .step .num{flex:0 0 28px;height:28px;border-radius:50%;background:#21262d;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;color:var(--acc)}
</style>
</head>
<body>
<div class="wrap">
  <h1>A/B Real — Claude puro vs Dev Team Kit</h1>
  <p class="sub">Mesma tarefa (TODO CRUD API · Express + SQLite + Vitest), dois braços isolados, números reais.</p>
  <div class="note">${safe(data.generatedNote)} · Modelo: <b>${safe(vs?.arm ? V.model : "sonnet")}</b> · Auth: subscription · Isolamento: <code>CLAUDE_CONFIG_DIR</code> temporário (CLAUDE.md vazio, sem hooks). Única variável: <code>--plugin-dir</code> do kit.</div>

  <h2>Placar geral</h2>
  <div class="grid">
    ${card(vs, "vanilla")}
    ${card(ks, "kit")}
  </div>

  <h2>📸 Apps rodando — evidência visual</h2>
  <p class="sub">Screenshots reais dos dois servidores respondendo à mesma request <code>GET /todos</code>. Capturadas via Playwright headless após o bench.</p>
  <div class="grid">
    <div class="card">
      <h3>⬜ Vanilla — localhost:3000</h3>
      ${ssVanilla
        ? `<img src="${ssVanilla}" style="width:100%;border-radius:6px;margin-top:8px" alt="vanilla app screenshot">`
        : `<p class="muted">screenshot não encontrado — rode: node bench/ab/capture-screenshots.mjs</p>`}
    </div>
    <div class="card">
      <h3>🧰 Kit — localhost:3002</h3>
      ${ssKit
        ? `<img src="${ssKit}" style="width:100%;border-radius:6px;margin-top:8px" alt="kit app screenshot">`
        : `<p class="muted">screenshot não encontrado — rode: node bench/ab/capture-screenshots.mjs</p>`}
    </div>
  </div>
  <div class="note" style="margin-top:12px">⚠ Encoding: o vanilla usou PowerShell (Windows-1252) em 4 turnos — note o "Deploy em produ??o" quebrado. O kit usou só Bash → UTF-8 correto em todos os campos. Achado real do bench, não cosmético.</div>

  <h2>① Token &amp; custo $</h2>
  <p class="sub">Quanto cada braço gastou pra entregar a MESMA tarefa.</p>
  <div class="chartbox"><canvas id="costChart"></canvas>
    <div class="legend"><span class="sw" style="background:#6e7681"></span>vanilla &nbsp; <span class="sw" style="background:#3fb950"></span>kit</div>
  </div>
  <table class="cmp">
    <tr><th>Métrica</th><th>Vanilla</th><th>Kit</th></tr>
    <tr><td>Custo real (USD)</td><td>${usd(vs?.cost)}</td><td>${usd(ks?.cost)}</td></tr>
    <tr><td>Tokens output</td><td>${n(vs?.out)}</td><td>${n(ks?.out)}</td></tr>
    <tr><td>Cache read (contexto relido)</td><td>${n(vs?.cacheRead)}</td><td>${n(ks?.cacheRead)}</td></tr>
    <tr><td>Total billed</td><td>${n(vs?.billed)}</td><td>${n(ks?.billed)}</td></tr>
    <tr><td>Turnos até parar</td><td>${n(vs?.turns)}</td><td>${n(ks?.turns)}</td></tr>
  </table>

  <h2>② Qualidade &amp; retrabalho</h2>
  <p class="sub">O código final passa nos testes? Quantas vezes reescreveu o mesmo arquivo?</p>
  <div class="grid">
    <div class="card"><h3>⬜ Vanilla — retrabalho</h3><ul>${reworkList(vs)}</ul></div>
    <div class="card"><h3>🧰 Kit — retrabalho</h3><ul>${reworkList(ks)}</ul></div>
  </div>
  <table class="cmp">
    <tr><th>Ferramenta usada</th><th>Vanilla</th><th>Kit</th></tr>
    ${toolRows()}
  </table>
  <div class="chartbox"><canvas id="qualChart"></canvas></div>

  <h2>③ Memória &amp; contexto</h2>
  <p class="sub">Contexto relido por turno (cache read) — proxy de quanto o agente carrega a cada passo. Curva mais baixa/estável = menos pressão de janela.</p>
  <div class="chartbox"><canvas id="ctxChart"></canvas>
    <div class="legend"><span class="sw" style="background:#6e7681"></span>vanilla &nbsp; <span class="sw" style="background:#3fb950"></span>kit</div>
  </div>

  <h2>④ Honestidade — claims sem evidência</h2>
  <p class="sub">Cada vez que o braço afirmou “passou / funciona / pronto” <b>antes</b> de rodar teste. O kit tem <code>claim-verifier</code> que intercepta isso.</p>
  <div class="grid">
    <div class="card"><h3>⬜ Vanilla</h3>${claimList(V)}</div>
    <div class="card"><h3>🧰 Kit</h3>${claimList(K)}</div>
  </div>

  <h2>Veredicto</h2>
  <div class="card">
    <ul>${verdict().map((x) => `<li>${safe(x)}</li>`).join("")}</ul>
    <p class="muted">Reproduza: <code>node bench/ab/run-ab.mjs &amp;&amp; node bench/ab/instrument.mjs &amp;&amp; node bench/ab/report/generate.mjs</code></p>
  </div>
</div>

<script>${chartJs}</script>
<script>
const D = ${JSON.stringify(data)};
const GRID = {color:"#21262d"}, TICK = {color:"#8b949e"};
const baseOpts = (title)=>({responsive:true,plugins:{legend:{labels:{color:"#e6edf3"}},title:{display:!!title,text:title,color:"#e6edf3"}},scales:{x:{grid:GRID,ticks:TICK},y:{grid:GRID,ticks:TICK,beginAtZero:true}}});

if (D.vanilla && D.kit) {
  new Chart(costChart,{type:"bar",data:{labels:["Custo (¢)","Output (k tok)","Billed (k tok)"],
    datasets:[
      {label:"vanilla",backgroundColor:"#6e7681",data:[Math.round(D.vanilla.cost*100),Math.round(D.vanilla.out/1000),Math.round(D.vanilla.billed/1000)]},
      {label:"kit",backgroundColor:"#3fb950",data:[Math.round(D.kit.cost*100),Math.round(D.kit.out/1000),Math.round(D.kit.billed/1000)]}
    ]},options:baseOpts("Custo e tokens (menor = melhor)")});

  new Chart(qualChart,{type:"bar",data:{labels:["Turnos","Retrabalho","Testes ✓","Claims s/ prova"],
    datasets:[
      {label:"vanilla",backgroundColor:"#6e7681",data:[D.vanilla.turns,D.vanilla.rework,D.vanilla.passed||0,D.vanilla.claims]},
      {label:"kit",backgroundColor:"#3fb950",data:[D.kit.turns,D.kit.rework,D.kit.passed||0,D.kit.claims]}
    ]},options:baseOpts("Qualidade (testes↑ bom; resto↓ bom)")});

  const maxLen=Math.max(D.ctxVanilla.length,D.ctxKit.length);
  const labels=Array.from({length:maxLen},(_,i)=>"t"+(i+1));
  new Chart(ctxChart,{type:"line",data:{labels,
    datasets:[
      {label:"vanilla",borderColor:"#6e7681",backgroundColor:"transparent",data:D.ctxVanilla,tension:.25},
      {label:"kit",borderColor:"#3fb950",backgroundColor:"transparent",data:D.ctxKit,tension:.25}
    ]},options:baseOpts("Contexto relido por turno (cache read)")});
}
</script>
</body>
</html>`;

writeFileSync(join(OUT, "index.html"), html);
console.log(`✅ relatório → ${join(OUT, "index.html")}`);
console.log("   abra no browser para ver a comparação completa.");
