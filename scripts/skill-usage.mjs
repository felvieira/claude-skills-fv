#!/usr/bin/env node
/**
 * skill-usage — uso REAL das skills do kit, lido de `.auto/events.jsonl`.
 *
 * `/skill-health` olha so o texto das skills (descricao, gatilhos, evals). Este script responde a
 * outra pergunta: quais skills alguem chamou de fato. O `session-event-logger` ja grava toda
 * chamada de ferramenta; a tool `Skill` entra la com `args.skill`.
 *
 * Uso:
 *   node scripts/skill-usage.mjs                       # varre <repo>/.auto e ../*​/.auto
 *   node scripts/skill-usage.mjs --root D:/Repos       # raiz com varios projetos (repetivel)
 *   node scripts/skill-usage.mjs --since-days=90
 *   node scripts/skill-usage.mjs --json
 *
 * Limites (nao esconder): so conta o que passou pelo logger em maquinas onde o plugin estava
 * ligado; skill nunca chamada nao significa inutil (pode ser rara de proposito, como migracao);
 * e um sinal para revisar a descricao/gatilho, nao para apagar.
 */
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
const roots = args.flatMap((a, i) => (a === "--root" && args[i + 1] ? [resolve(args[i + 1])] : []));
const sinceDays = Number(flag("--since-days") || 0);
const asJson = args.includes("--json");

/** "dev-team-kit-fv:09-orchestrator" | "09-orchestrator" -> "09-orchestrator" */
export function skillKey(raw) {
  return String(raw || "").trim().replace(/^.*:/, "").toLowerCase();
}

function eventFiles(autoDir) {
  try {
    return readdirSync(autoDir).filter((n) => /^events(\.\d{4}-\d{2}-\d{2}.*)?\.jsonl$/.test(n)).map((n) => join(autoDir, n));
  } catch {
    return [];
  }
}

function autoDirs() {
  const found = new Set();
  const consider = (dir) => { const auto = join(dir, ".auto"); if (existsSync(auto)) found.add(auto); };
  if (!roots.length) consider(kitRoot);
  for (const root of roots.length ? roots : [dirname(kitRoot)]) {
    consider(root);
    try {
      for (const e of readdirSync(root, { withFileTypes: true })) if (e.isDirectory()) consider(join(root, e.name));
    } catch { /* raiz ilegivel */ }
  }
  return [...found];
}

async function countFile(file, since, counts, last) {
  const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.includes('"Skill"')) continue; // barato: evita JSON.parse na maioria das linhas
    try {
      const ev = JSON.parse(line);
      if (ev.tool !== "Skill") continue;
      if (since && Date.parse(ev.ts) < since) continue;
      const key = skillKey(ev.args?.skill ?? ev.args?.name);
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!last.has(key) || ev.ts > last.get(key)) last.set(key, ev.ts);
    } catch { /* linha invalida */ }
  }
}

function kitSkills() {
  const dir = join(kitRoot, "skills");
  return readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory() && existsSync(join(dir, n, "SKILL.md")));
}

async function main() {
  const since = sinceDays ? Date.now() - sinceDays * 86400000 : 0;
  const dirs = autoDirs();
  const counts = new Map();
  const last = new Map();
  let files = 0;
  for (const dir of dirs) for (const f of eventFiles(dir)) { files++; await countFile(f, since, counts, last); }

  const skills = kitSkills();
  const known = new Set(skills.map((s) => s.toLowerCase()));
  const rows = skills
    .map((s) => ({ skill: s, calls: counts.get(s.toLowerCase()) || 0, last: last.get(s.toLowerCase()) || null }))
    .sort((a, b) => b.calls - a.calls || a.skill.localeCompare(b.skill));
  const outsiders = [...counts].filter(([k]) => !known.has(k)).map(([skill, calls]) => ({ skill, calls })).sort((a, b) => b.calls - a.calls);
  const total = rows.reduce((n, r) => n + r.calls, 0);
  const result = { projects: dirs.length, files, total_kit_calls: total, never_called: rows.filter((r) => !r.calls).length, kit_skills: skills.length, rows, outsiders };

  if (asJson) return console.log(JSON.stringify(result, null, 2));
  console.log(`Fontes: ${dirs.length} projeto(s) com .auto, ${files} arquivo(s) de eventos${sinceDays ? `, ultimos ${sinceDays} dias` : ""}.`);
  console.log(`Chamadas a skills do kit: ${total} em ${skills.length - result.never_called}/${skills.length} skills; nunca chamadas: ${result.never_called}.\n`);
  console.log("Mais usadas:");
  for (const r of rows.filter((x) => x.calls).slice(0, 15)) console.log(`  ${String(r.calls).padStart(5)}  ${r.skill}  (ultima: ${r.last?.slice(0, 10)})`);
  console.log("\nNunca chamadas (revisar descricao/gatilho antes de concluir qualquer coisa):");
  console.log(`  ${rows.filter((r) => !r.calls).map((r) => r.skill).join("\n  ") || "(nenhuma)"}`);
  if (outsiders.length) console.log(`\nChamadas a skills de fora do kit: ${outsiders.slice(0, 8).map((o) => `${o.skill} x${o.calls}`).join(", ")}`);
  console.log("\nLimite: so conta o que passou pelo session-event-logger; skill rara de proposito (ex.: migracao) tambem aparece aqui.");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
