#!/usr/bin/env node
/**
 * bench/ab/instrument.mjs — extrai métricas REAIS dos traces dos dois braços.
 *
 * Lê out/vanilla-trace.json e out/kit-trace.json (gerados por run-ab.mjs),
 * deriva as métricas comparáveis e escreve out/metrics.json (consumido pelo
 * gerador de HTML). Também roda `npm install && npm test` no código final de
 * cada braço pra medir qualidade real (testes verdes? quantos? cobertura?).
 *
 * Métricas por braço:
 *   tokens:     input, output, cacheCreate, cacheRead, totalBilled
 *   cost:       custo $ real (somado dos result/assistant)
 *   turns:      nº de turnos (num_turns do result)
 *   wallMs:     tempo de parede
 *   tools:      contagem por ferramenta (Write/Edit/Bash/Read…)
 *   rework:     writes repetidos no MESMO arquivo (sinal de retrabalho)
 *   claims:     afirmações "passou/funciona/pronto" SEM tool-call de teste antes
 *   quality:    { testsRan, testsPassed, testsFailed, exitZero, fileCount }
 *   timeline:   por turno → tokens acumulados, contexto estimado, tool usado
 *
 * Uso:
 *   node bench/ab/instrument.mjs            # processa ambos + roda testes
 *   node bench/ab/instrument.mjs --no-test  # pula execução de testes (rápido)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "out");
const argv = process.argv.slice(2);
const NO_TEST = argv.includes("--no-test");

// preço Sonnet (USD por 1M tokens) — usado só como sanity-check; o custo real
// já vem no trace (total_cost_usd). Tabela editável.
const PRICE = {
  input: 3.0 / 1e6,
  output: 15.0 / 1e6,
  cacheWrite: 3.75 / 1e6,
  cacheRead: 0.30 / 1e6,
};

// frases que sinalizam "afirmação de resultado"
const CLAIM_RE =
  /\b(test(es)?\s+(passa(ram|ndo|m)?|verde|ok)|tudo\s+(funcion|passa)|funciona(ndo)?\s+(corret|perfeit)|pronto|conclu[íi]d|sucesso|all\s+tests?\s+pass|passing|works?\s+(correctly|fine)|deploy\s+ok)\b/i;

// ─── helpers ──────────────────────────────────────────────────────────────────

function loadTrace(arm) {
  const f = join(OUT, `${arm}-trace.json`);
  if (!existsSync(f)) return null;
  return JSON.parse(readFileSync(f, "utf8"));
}

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walkFiles(p, acc);
    else acc.push(p);
  }
  return acc;
}

// ─── extração por braço ───────────────────────────────────────────────────────

function analyze(trace) {
  const tokens = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 };
  const tools = {};
  const writesByPath = {};      // path → nº de writes (rework)
  const editsByPath = {};
  let claims = [];              // {turn, text, hadTestBefore}
  let testRunSeen = false;      // já rodou vitest/npm test em algum Bash?
  let costFromResult = 0;
  let numTurns = 0;
  let resultSubtype = null;
  let resultText = "";

  const timeline = [];          // por assistant turn
  let turnIdx = 0;
  let accOut = 0;

  for (const e of trace.events) {
    // detecta execução de teste em qualquer Bash (tool_use OU tool_result)
    if (e.type === "assistant" && e.message?.content) {
      const u = e.message.usage;
      if (u) {
        tokens.input += u.input_tokens || 0;
        tokens.output += u.output_tokens || 0;
        tokens.cacheCreate += u.cache_creation_input_tokens || 0;
        tokens.cacheRead += u.cache_read_input_tokens || 0;
        accOut += u.output_tokens || 0;
      }

      let turnText = "";
      let turnTool = null;
      for (const b of e.message.content) {
        if (b.type === "text") turnText += b.text;
        if (b.type === "tool_use") {
          tools[b.name] = (tools[b.name] || 0) + 1;
          turnTool = b.name;
          const inp = b.input || {};
          const p = inp.file_path || inp.path;
          if (b.name === "Write" && p) writesByPath[p] = (writesByPath[p] || 0) + 1;
          if (b.name === "Edit" && p) editsByPath[p] = (editsByPath[p] || 0) + 1;
          if (b.name === "Bash") {
            const cmd = (inp.command || "").toLowerCase();
            if (/\b(vitest|npm\s+(run\s+)?test|jest|node\s+--test)\b/.test(cmd)) {
              testRunSeen = true;
            }
          }
        }
      }

      // claim sem evidência: texto afirma resultado E ainda não rodou teste
      if (turnText && CLAIM_RE.test(turnText)) {
        claims.push({
          turn: turnIdx,
          snippet: turnText.replace(/\s+/g, " ").slice(0, 160),
          hadTestBefore: testRunSeen,
        });
      }

      timeline.push({
        turn: turnIdx,
        tool: turnTool,
        outTokensAcc: accOut,
        cacheReadThisTurn: e.message.usage?.cache_read_input_tokens || 0,
      });
      turnIdx++;
    }

    if (e.type === "result") {
      costFromResult = e.total_cost_usd || 0;
      numTurns = e.num_turns || turnIdx;
      resultSubtype = e.subtype;
      resultText = (e.result || "").slice(0, 400);
      // result.usage é a fonte de verdade dos totais (os assistant deltas em
      // stream-json são cumulativos por-iteração, não somáveis). Sobrescreve.
      if (e.usage) {
        tokens.input = e.usage.input_tokens || 0;
        tokens.output = e.usage.output_tokens || 0;
        tokens.cacheCreate = e.usage.cache_creation_input_tokens || 0;
        tokens.cacheRead = e.usage.cache_read_input_tokens || 0;
      }
    }
  }

  // rework = soma de (writes-1) por arquivo escrito 2x+  ∪  edits após write
  const reworkWrites = Object.entries(writesByPath)
    .filter(([, n]) => n > 1)
    .map(([p, n]) => ({ path: p.split(/[\\/]/).pop(), writes: n }));
  const reworkScore =
    reworkWrites.reduce((s, r) => s + (r.writes - 1), 0) +
    Object.values(editsByPath).reduce((s, n) => s + n, 0);

  // custo derivado (sanity) vs custo real do trace
  const derivedCost =
    tokens.input * PRICE.input +
    tokens.output * PRICE.output +
    tokens.cacheCreate * PRICE.cacheWrite +
    tokens.cacheRead * PRICE.cacheRead;

  const totalBilled =
    tokens.input + tokens.output + tokens.cacheCreate + tokens.cacheRead;

  // claims sem evidência = afirmou resultado ANTES de qualquer teste rodar
  const unverifiedClaims = claims.filter((c) => !c.hadTestBefore);

  return {
    arm: trace.arm,
    model: trace.model,
    wallMs: trace.wallMs,
    exitCode: trace.exitCode,
    projectDir: trace.projectDir,
    tokens,
    totalBilled,
    costReal: costFromResult,
    costDerived: derivedCost,
    numTurns,
    resultSubtype,
    resultText,
    tools,
    rework: { files: reworkWrites, score: reworkScore },
    testRunDuringSession: testRunSeen,
    claims: { all: claims, unverified: unverifiedClaims },
    timeline,
  };
}

// ─── qualidade: roda os testes do código final ────────────────────────────────

function runQuality(projectDir) {
  const q = {
    fileCount: 0, hasPackageJson: false, hasTests: false,
    installOk: false, testsRan: false, exitZero: false,
    passed: null, failed: null, raw: "",
  };
  if (!existsSync(projectDir)) return q;

  const files = walkFiles(projectDir);
  q.fileCount = files.length;
  q.hasPackageJson = existsSync(join(projectDir, "package.json"));
  q.hasTests = files.some((f) => /\.test\.|\.spec\./.test(f));

  if (NO_TEST || !q.hasPackageJson) return q;

  try {
    execSync("npm install --no-audit --no-fund --loglevel=error", {
      cwd: projectDir, stdio: "pipe", timeout: 180000,
    });
    q.installOk = true;
  } catch (e) {
    q.raw = "install failed: " + (e.stdout?.toString() || e.message).slice(0, 500);
    return q;
  }

  try {
    const out = execSync("npm test", {
      cwd: projectDir, stdio: "pipe", timeout: 120000,
    }).toString();
    q.testsRan = true;
    q.exitZero = true;
    q.raw = out.replace(/\x1b\[[0-9;]*m/g, "").slice(-1500);
  } catch (e) {
    q.testsRan = true;
    q.exitZero = false;
    q.raw = ((e.stdout?.toString() || "") + (e.stderr?.toString() || ""))
      .replace(/\x1b\[[0-9;]*m/g, "").slice(-1500);
  }

  // parse contagem de testes (vitest: "Tests  22 passed (22)")
  // Prioridade: linha "Tests " (não "Test Files ") → captura casos individuais
  const mTests = q.raw.match(/^\s*Tests\s+(\d+)\s+passed(?:.*?(\d+)\s+failed)?/im);
  if (mTests) {
    q.passed = Number(mTests[1]);
    q.failed = mTests[2] ? Number(mTests[2]) : 0;
  } else {
    // fallback: jest/outras formatações
    const m = q.raw.match(/(\d+)\s+passed(?:.*?(\d+)\s+failed)?/i);
    if (m) { q.passed = Number(m[1]); q.failed = m[2] ? Number(m[2]) : 0; }
  }

  return q;
}

// ─── main ─────────────────────────────────────────────────────────────────────

const arms = ["vanilla", "kit"];
const result = {};

for (const arm of arms) {
  const trace = loadTrace(arm);
  if (!trace) {
    console.log(`⚠ trace de '${arm}' não encontrado — pulei (rode run-ab.mjs primeiro).`);
    continue;
  }
  console.log(`\n▶ analisando braço '${arm}'…`);
  const a = analyze(trace);
  console.log(`  turnos=${a.numTurns} subtype=${a.resultSubtype} cost=$${a.costReal.toFixed(4)}`);
  console.log(`  tokens out=${a.tokens.output} cacheRead=${a.tokens.cacheRead} billed=${a.totalBilled}`);
  console.log(`  tools=${JSON.stringify(a.tools)} rework=${a.rework.score} claims sem prova=${a.claims.unverified.length}`);
  console.log(`  rodando qualidade (npm install && npm test) em ${a.projectDir}…`);
  a.quality = NO_TEST ? { skipped: true } : runQuality(a.projectDir);
  if (!NO_TEST) {
    console.log(`  qualidade: testes verdes=${a.quality.exitZero} passed=${a.quality.passed} failed=${a.quality.failed} files=${a.quality.fileCount}`);
  }
  result[arm] = a;
}

writeFileSync(join(OUT, "metrics.json"), JSON.stringify(result, null, 2));
console.log(`\n✅ métricas → ${join(OUT, "metrics.json")}`);
console.log("   próximo: node bench/ab/report/generate.mjs");
