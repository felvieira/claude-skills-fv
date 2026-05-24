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
const minShould = Number(flag("--min-should") ?? 80); // %
const maxShouldnt = Number(flag("--max-shouldnt") ?? 20); // %

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
function matchesAnyTrigger(prompt, triggers) {
  const p = prompt.toLowerCase();
  for (const t of triggers) {
    if (!t) continue;
    if (p.includes(t)) {
      return { matched: true, by: t };
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

  return {
    skill,
    error: null,
    triggers_count: triggers.length,
    should,
    shouldnt,
    passed,
  };
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
  if (fatal > 0) process.exit(1);
}
