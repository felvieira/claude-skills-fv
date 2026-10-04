#!/usr/bin/env node
/**
 * scripts/eval-triggers.mjs
 *
 * Runtime para as fixtures em evals/triggers/<skill-id>.json.
 *
 * Para cada prompt em should_trigger / shouldnt_trigger, simula a heurística
 * de discovery do harness: faz match (case-insensitive, substring) de cada
 * trigger declarado no frontmatter da skill (linha "Trigger em: ...") contra
 * o prompt. Se ANY trigger casa, o prompt é considerado "matched".
 *
 * Saudável quando:
 *   - should_trigger: ≥ 8/10 (80%) matched
 *   - shouldnt_trigger: ≤ 1/5 (20%) matched
 *
 * Zero deps (Node 18+ stdlib only).
 *
 * Uso:
 *   node scripts/eval-triggers.mjs                                    # tabela human-readable
 *   node scripts/eval-triggers.mjs --json                             # JSON puro
 *   node scripts/eval-triggers.mjs --skill 43-canary-deployment      # uma fixture só
 *   node scripts/eval-triggers.mjs --min-should 80 --max-shouldnt 20 # threshold custom
 *   node scripts/eval-triggers.mjs --strict                          # exit 1 se qualquer skill fail
 *   node scripts/eval-triggers.mjs --split --json > base.json        # 70% treino / 30% teste (hash estavel)
 *   node scripts/eval-triggers.mjs --compare base.json [--strict]    # KEEP / REVERT / NO-CHANGE
 *
 * Treino/teste (ideia de "Automating eval design and hillclimbing", claude.dev): ao ajustar a
 * descricao de uma skill para passar nas fixtures, o ganho so vale se o conjunto de TESTE tambem
 * nao piora. Se so o treino sobe, a descricao foi moldada as fixtures (overfitting): REVERT. A
 * divisao e por hash de "skill|prompt" — estavel quando se acrescentam prompts novos.
 */

import { readFile, readdir } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const TRIGGERS_DIR = join(ROOT, "evals", "triggers");
const SKILLS_DIR = join(ROOT, "skills");

// ─── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const next = argv[i + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
};
const asJson = argv.includes("--json");
const strict = argv.includes("--strict");
const skillFilter = flag("--skill");
const split = argv.includes("--split") || typeof flag("--compare") === "string";
const compareFile = typeof flag("--compare") === "string" ? flag("--compare") : null;
const minShould = Number(flag("--min-should") ?? 80); // %
const maxShouldnt = Number(flag("--max-shouldnt") ?? 20); // %

// ─── Normalização Unicode (v2.13.0+) ─────────────────────────────────────────
// Match precisa ser tolerante a acentos PT-BR. Prompts reais escritos sem
// acento ("validacao final", "producao", "ultima verificacao") devem casar
// triggers declarados com acento ("validação final", "produção", etc).
// NFD decompõe (ç → c + cedilha) e strip combining marks remove os diacríticos.
function foldAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ─── Extrai triggers da SKILL.md ─────────────────────────────────────────────
// Os triggers vivem DENTRO do campo `description:` (texto livre YAML multiline),
// numa frase tipo: Trigger em: "x", "y", "z". O frontmatter inteiro pode ser
// usado como sopa de texto — extraímos todas as strings entre aspas.
function extractTriggers(skillBody) {
  const fmMatch = skillBody.match(/^---\n([\s\S]*?)\n---/);
  const fm = fmMatch ? fmMatch[1] : skillBody.slice(0, 2000);

  // Procura "Trigger em:" (case-insensitive) e captura o resto da description
  // até o final do frontmatter — paramos no \n--- (fim do FM) ou em uma linha
  // que comece com top-level YAML key (sem indent + identifier + :).
  const idx = fm.search(/[Tt]rigger\s+em\s*:/);
  if (idx < 0) return [];

  const tail = fm.slice(idx);
  // Termina no próximo top-level YAML key (linha sem indent começando com letra)
  // ou consome até o fim do frontmatter.
  const stopAt = tail.search(/\n[A-Za-z_][A-Za-z0-9_-]*\s*:/);
  const block = stopAt > 0 ? tail.slice(0, stopAt) : tail;

  // Extrai strings entre aspas duplas/simples (dropping the regex header marker)
  const quoted = [...block.matchAll(/["']([^"']{2,80})["']/g)].map((m) =>
    m[1].toLowerCase().trim(),
  );
  if (quoted.length > 0) return [...new Set(quoted)];

  // Fallback: tira "Trigger em:" e separa por vírgula
  return [
    ...new Set(
      block
        .replace(/^[Tt]rigger\s+em\s*:/, "")
        .split(/[,\n]/)
        .map((s) => s.replace(/["'`.]/g, "").trim().toLowerCase())
        .filter((s) => s.length >= 2 && s.length <= 80),
    ),
  ];
}

// ─── Match heurístico ────────────────────────────────────────────────────────
// Case-insensitive E accent-insensitive (NFD fold). Ambos lados normalizados
// antes do includes() pra que "validacao final" case "validação final".
function matchesAnyTrigger(prompt, triggers) {
  const p = foldAccents(prompt.toLowerCase());
  for (const t of triggers) {
    if (!t) continue;
    const tNorm = foldAccents(t.toLowerCase());
    if (p.includes(tNorm)) {
      return { matched: true, by: t }; // retorna trigger ORIGINAL (com acento)
    }
  }
  return { matched: false, by: null };
}

// ─── Carrega fixtures ────────────────────────────────────────────────────────
async function loadFixtures() {
  let entries;
  try {
    entries = await readdir(TRIGGERS_DIR);
  } catch {
    console.error(`No triggers dir at ${TRIGGERS_DIR}`);
    process.exit(2);
  }
  const files = entries
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (files.length === 0) {
    console.error("No .json fixtures found in evals/triggers/");
    process.exit(2);
  }

  const fixtures = [];
  for (const file of files) {
    const raw = await readFile(join(TRIGGERS_DIR, file), "utf8");
    try {
      const data = JSON.parse(raw);
      if (skillFilter && data.skill !== skillFilter) continue;
      fixtures.push({ file, data });
    } catch (err) {
      console.error(`Skipping ${file}: invalid JSON (${err.message})`);
    }
  }
  return fixtures;
}

// ─── Carrega triggers da skill correspondente ────────────────────────────────
async function loadSkillTriggers(skillId) {
  const skillPath = join(SKILLS_DIR, skillId, "SKILL.md");
  try {
    const body = await readFile(skillPath, "utf8");
    return { triggers: extractTriggers(body), error: null };
  } catch (err) {
    return { triggers: [], error: `Could not read ${skillPath}: ${err.message}` };
  }
}

// ─── Avalia 1 fixture ────────────────────────────────────────────────────────
async function evaluateFixture(fixture) {
  const { skill, should_trigger = [], shouldnt_trigger = [] } = fixture.data;
  const { triggers, error } = await loadSkillTriggers(skill);

  if (error) {
    return {
      skill,
      error,
      triggers_count: 0,
      should: { total: should_trigger.length, hits: 0, pct: 0, samples: [] },
      shouldnt: { total: shouldnt_trigger.length, hits: 0, pct: 0, samples: [] },
      passed: false,
    };
  }

  const evalPool = (pool) => {
    const samples = pool.map((p) => {
      const m = matchesAnyTrigger(p, triggers);
      return { prompt: p, matched: m.matched, by: m.by };
    });
    const hits = samples.filter((s) => s.matched).length;
    const pct = pool.length === 0 ? 0 : Math.round((hits / pool.length) * 100);
    return { total: pool.length, hits, pct, samples };
  };

  const should = evalPool(should_trigger);
  const shouldnt = evalPool(shouldnt_trigger);
  const passed = should.pct >= minShould && shouldnt.pct <= maxShouldnt;

  const result = {
    skill,
    error: null,
    triggers_count: triggers.length,
    should,
    shouldnt,
    passed,
  };
  if (split) result.split = splitScores(skill, should.samples, shouldnt.samples);
  return result;
}

// ─── Treino/teste ────────────────────────────────────────────────────────────
function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
const isTest = (skill, prompt) => fnv1a(`${skill}|${prompt}`) % 10 >= 7; // ~30%

/** Acertos = should casado + shouldnt NAO casado; devolve contagens (nao % por skill: amostra pequena). */
function splitScores(skill, shouldSamples, shouldntSamples) {
  const out = { train: { n: 0, ok: 0 }, test: { n: 0, ok: 0 } };
  const add = (s, correct) => {
    const bucket = isTest(skill, s.prompt) ? out.test : out.train;
    bucket.n += 1;
    if (correct) bucket.ok += 1;
  };
  for (const s of shouldSamples) add(s, s.matched);
  for (const s of shouldntSamples) add(s, !s.matched);
  return out;
}

const pct = (ok, n) => (n ? Math.round((ok / n) * 1000) / 10 : 0);

function aggregateSplit(results) {
  const sum = { train: { n: 0, ok: 0 }, test: { n: 0, ok: 0 } };
  for (const r of results) {
    if (!r.split) continue;
    for (const k of ["train", "test"]) { sum[k].n += r.split[k].n; sum[k].ok += r.split[k].ok; }
  }
  const train_acc = pct(sum.train.ok, sum.train.n);
  const test_acc = pct(sum.test.ok, sum.test.n);
  return { train_n: sum.train.n, test_n: sum.test.n, train_acc, test_acc, gap: Math.round((train_acc - test_acc) * 10) / 10 };
}

/** KEEP so se treino e teste nao pioram e um deles sobe; subir so o treino = overfitting. */
function compareSplits(base, now, epsilon = 0.5) {
  const dTrain = Math.round((now.train_acc - base.train_acc) * 10) / 10;
  const dTest = Math.round((now.test_acc - base.test_acc) * 10) / 10;
  let verdict = "NO-CHANGE";
  let why = "treino e teste iguais ao baseline";
  if (dTrain < -epsilon || dTest < -epsilon) { verdict = "REVERT"; why = "regressao (treino ou teste caiu)"; }
  else if (dTrain > epsilon && dTest <= epsilon) { verdict = "REVERT"; why = "so o treino subiu: a descricao foi moldada as fixtures (overfitting)"; }
  else if (dTrain > epsilon || dTest > epsilon) { verdict = "KEEP"; why = "treino e teste nao pioraram e houve ganho"; }
  return { verdict, why, d_train: dTrain, d_test: dTest };
}

// ─── Main ────────────────────────────────────────────────────────────────────
const fixtures = await loadFixtures();
const results = [];
for (const f of fixtures) {
  results.push(await evaluateFixture(f));
}

const summary = {
  fixtures_count: results.length,
  passed_count: results.filter((r) => r.passed).length,
  failed_count: results.filter((r) => !r.passed && !r.error).length,
  error_count: results.filter((r) => r.error).length,
  thresholds: { min_should_pct: minShould, max_shouldnt_pct: maxShouldnt },
};

if (split) summary.split = aggregateSplit(results);
if (compareFile) {
  let baseline;
  try {
    baseline = JSON.parse((await readFile(compareFile, "utf8")).replace(/^﻿/, "")); // PowerShell grava BOM
  } catch (err) {
    console.error(`Nao consegui ler o baseline ${compareFile}: ${err.message}`);
    process.exit(2);
  }
  if (!baseline?.summary?.split) {
    console.error("Baseline sem treino/teste: gere com `--split --json > base.json`.");
    process.exit(2);
  }
  summary.compare = compareSplits(baseline.summary.split, summary.split);
}

if (asJson) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  const rpad = (s, n) => String(s).padStart(n);

  console.log("");
  console.log("Dev Team Kit — trigger eval");
  console.log("=".repeat(78));
  console.log(
    pad("skill", 32) +
      rpad("triggers", 10) +
      rpad("should", 12) +
      rpad("shouldnt", 12) +
      "  result",
  );
  console.log("-".repeat(78));
  for (const r of results) {
    if (r.error) {
      console.log(pad(r.skill, 32) + "  ERROR: " + r.error);
      continue;
    }
    const shouldStr = `${r.should.hits}/${r.should.total} (${r.should.pct}%)`;
    const shouldntStr = `${r.shouldnt.hits}/${r.shouldnt.total} (${r.shouldnt.pct}%)`;
    const verdict = r.passed ? "PASS" : "FAIL";
    console.log(
      pad(r.skill, 32) +
        rpad(r.triggers_count, 10) +
        rpad(shouldStr, 12) +
        rpad(shouldntStr, 12) +
        "  " +
        verdict,
    );
  }
  console.log("-".repeat(78));
  console.log(
    `Thresholds: should >= ${minShould}%, shouldnt <= ${maxShouldnt}%`,
  );
  console.log(
    `Summary: ${summary.passed_count}/${summary.fixtures_count} passed, ` +
      `${summary.failed_count} failed, ${summary.error_count} errored`,
  );

  if (summary.split) {
    const s = summary.split;
    console.log("");
    console.log(`Treino/teste (acuracia = should casado + shouldnt nao casado): treino ${s.train_acc}% (n=${s.train_n}) | teste ${s.test_acc}% (n=${s.test_n}) | folga ${s.gap} pp`);
    if (s.gap > 10) console.log("  ! folga > 10 pp: os gatilhos podem estar moldados as fixtures de treino.");
  }
  if (summary.compare) {
    const c = summary.compare;
    console.log(`Comparacao com baseline: ${c.verdict} — ${c.why} (treino ${c.d_train >= 0 ? "+" : ""}${c.d_train} pp, teste ${c.d_test >= 0 ? "+" : ""}${c.d_test} pp)`);
  }

  // Detail of failures (top 3 misses per pool)
  const failures = results.filter((r) => !r.passed && !r.error);
  if (failures.length > 0) {
    console.log("");
    console.log("Failure detail:");
    for (const r of failures) {
      console.log(`  ${r.skill}:`);
      if (r.should.pct < minShould) {
        const misses = r.should.samples.filter((s) => !s.matched).slice(0, 3);
        console.log(`    should_trigger misses (${r.should.hits}/${r.should.total}):`);
        for (const m of misses) console.log(`      - "${m.prompt}"`);
      }
      if (r.shouldnt.pct > maxShouldnt) {
        const fps = r.shouldnt.samples.filter((s) => s.matched).slice(0, 3);
        console.log(`    shouldnt_trigger false positives (${r.shouldnt.hits}/${r.shouldnt.total}):`);
        for (const m of fps)
          console.log(`      - "${m.prompt}"  (matched by "${m.by}")`);
      }
    }
  }
  console.log("");
}

if (strict) {
  const fatal = summary.failed_count + summary.error_count;
  if (fatal > 0 || summary.compare?.verdict === "REVERT") process.exit(1);
}
