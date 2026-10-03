#!/usr/bin/env node
/**
 * eval-memory-recall — mede a injecao de memoria (learned-skills) do kit.
 *
 * Dois eixos, porque achar nao basta:
 *   - POSITIVOS: dado um prompt cuja resposta esta na memoria, a injecao
 *     traz a skill certa E carrega a resposta (strings obrigatorias)?
 *   - CONTROLES NEGATIVOS: dado um prompt sem relacao (ou so informativo),
 *     a injecao e ZERO? Memoria que fala fora de hora custa token e atrapalha.
 * Tambem reporta tokens por positivo contra um baseline "despejar tudo".
 *
 * Fixtures: bench/memory/cases.json + bench/memory/skills/*.md. Roda o
 * keyword-detector real, como subprocesso, num diretorio temporario.
 *
 *   node scripts/eval-memory-recall.mjs [--json] [--strict]
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "bench", "memory");
const detector = join(root, "hooks", "scripts", "keyword-detector.mjs");
const AS_JSON = process.argv.includes("--json");
const STRICT = process.argv.includes("--strict");

const today = new Date().toISOString().slice(0, 10);
const cases = JSON.parse(readFileSync(join(fixtures, "cases.json"), "utf8"));
const skillFiles = readdirSync(join(fixtures, "skills")).filter((f) => f.endsWith(".md"));
const skillBodies = Object.fromEntries(
  skillFiles.map((f) => [f, readFileSync(join(fixtures, "skills", f), "utf8").replaceAll("{{TODAY}}", today)]),
);

const tokens = (s) => Math.ceil(String(s).length / 4);
const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

function inject(prompt) {
  const cwd = mkdtempSync(join(tmpdir(), "memeval-"));
  try {
    const dir = join(cwd, ".bot", "learned-skills");
    mkdirSync(dir, { recursive: true });
    for (const [file, body] of Object.entries(skillBodies)) writeFileSync(join(dir, file), body);
    const res = spawnSync(process.execPath, [detector], {
      cwd,
      input: JSON.stringify({ prompt, hook_event_name: "UserPromptSubmit" }),
      encoding: "utf8",
      timeout: 20000,
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: root },
    });
    if (res.status !== 0) throw new Error(`keyword-detector saiu com ${res.status}: ${res.stderr}`);
    const out = res.stdout.trim() ? JSON.parse(res.stdout) : {};
    // No diretorio temporario nao existe skills/, entao so learned-skills podem ser injetadas.
    return out.hookSpecificOutput?.additionalContext ?? "";
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const positives = cases.positives.map((c) => {
  const ctx = inject(c.prompt);
  const rightSkill = ctx.includes(`: ${c.skill}`);
  const carries = c.must_contain.every((s) => ctx.includes(s));
  return { name: c.name, ok: rightSkill && carries, skill: c.skill, tokens: tokens(ctx), missing: c.must_contain.filter((s) => !ctx.includes(s)), rightSkill };
});

const negatives = cases.negatives.map((c) => {
  const ctx = inject(c.prompt);
  return { name: c.name, ok: ctx === "", tokens: tokens(ctx) };
});

const dumpAll = tokens(Object.values(skillBodies).join("\n"));
const result = {
  positives_carry_answer: positives.filter((p) => p.ok).length / positives.length,
  negatives_inject_zero: negatives.filter((n) => n.ok).length / negatives.length,
  median_positive_tokens: median(positives.map((p) => p.tokens)),
  baseline_dump_all_tokens: dumpAll,
  positives,
  negatives,
};

const t = cases.thresholds;
const failures = [];
if (result.positives_carry_answer < t.positives_carry_answer) failures.push(`positivos que carregam a resposta: ${result.positives_carry_answer} < ${t.positives_carry_answer}`);
if (result.negatives_inject_zero < t.negatives_inject_zero) failures.push(`controles negativos com injecao zero: ${result.negatives_inject_zero} < ${t.negatives_inject_zero}`);
if (result.median_positive_tokens > t.median_positive_tokens_max) failures.push(`mediana de tokens ${result.median_positive_tokens} > ${t.median_positive_tokens_max}`);

if (AS_JSON) {
  console.log(JSON.stringify({ ...result, failures }, null, 2));
} else {
  console.log("Eval de injecao de memoria (learned-skills)\n");
  console.log("Positivos (devem trazer a resposta)");
  for (const p of positives) {
    console.log(`  ${p.ok ? "PASS" : "FAIL"}  ${p.name}  [${p.tokens} tok]${p.ok ? "" : `  skill certa=${p.rightSkill} faltando=${JSON.stringify(p.missing)}`}`);
  }
  console.log("\nControles negativos (devem injetar zero)");
  for (const n of negatives) console.log(`  ${n.ok ? "PASS" : "FAIL"}  ${n.name}  [${n.tokens} tok]`);
  console.log(`\nCarrega a resposta: ${(result.positives_carry_answer * 100).toFixed(0)}%   Negativos em zero: ${(result.negatives_inject_zero * 100).toFixed(0)}%`);
  console.log(`Mediana por positivo: ${result.median_positive_tokens} tok   vs. despejar tudo: ${dumpAll} tok`);
  if (failures.length) console.log(`\nFALHOU:\n  - ${failures.join("\n  - ")}`);
}
process.exit(STRICT && failures.length ? 1 : 0);
