#!/usr/bin/env node

/**
 * score-design — compara sinais heurísticos e pares de contraste entre braços.
 *
 * O bench que originou `rules/frontend/ui-design.md` rodou uma vez, expôs 3 UIs
 * indigo quase idênticas, e a correção foi escrever uma regra. Ninguém rodou de
 * novo pra provar que a regra funcionou. Este script coleta evidências parciais;
 * os sinais não provam qualidade visual e a comparação exige revisão humana.
 *
 * Uso:
 *   node bench/ab/score-design.mjs <dir-braço-1> <dir-braço-2> ...
 *   node bench/ab/score-design.mjs --json <dirs...>
 *
 * Sem argumento, pontua cada subdiretório de bench/ab/arms/.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");

function runChecker(script, target) {
  try {
    const out = execFileSync(
      process.execPath,
      [path.join(root, "scripts", script), "--json", target],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    return JSON.parse(out);
  } catch (error) {
    // exit 1 é resultado esperado (achou problema), não falha de execução —
    // o JSON continua no stdout.
    if (error.stdout) {
      try { return JSON.parse(error.stdout); } catch {}
    }
    return null;
  }
}

/**
 * A pontuação é apenas a porcentagem de pares de contraste identificados que
 * passaram. Sem pares, é null. Sinais estéticos são reportados sem penalidade.
 */
function scoreArm(name, generic, contrast) {
  const genericErrors = generic?.errors?.length ?? 0;
  const genericWarns = generic?.warns?.length ?? 0;
  const contrastFails = contrast?.failures?.length ?? 0;

  const contrastPairs = contrast?.pairs ?? 0;
  const score = contrastPairs > 0 ? Math.round((contrastPairs - contrastFails) / contrastPairs * 100) : null;

  return {
    arm: name,
    score,
    scoreType: "static-contrast-pairs-percent",
    genericErrors,
    genericWarns,
    contrastFails,
    filesScanned: generic?.scanned ?? 0,
    contrastPairs,
    contrastSkippedTokens: contrast?.skippedTokens ?? null,
    signals: [...new Set([...(generic?.errors ?? []), ...(generic?.warns ?? [])].map((e) => e.rule))],
  };
}

async function resolveTargets(argv) {
  const dirs = argv.filter((a) => !a.startsWith("--"));
  if (dirs.length > 0) return dirs;

  const armsDir = path.join(__dirname, "arms");
  try {
    const entries = await fs.readdir(armsDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => path.join(armsDir, e.name));
  } catch {
    return [];
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const targets = await resolveTargets(argv);

  if (targets.length === 0) {
    console.log("Nenhum braço para pontuar.");
    console.log("Uso: node bench/ab/score-design.mjs <dir...>  (ou popule bench/ab/arms/)");
    return 0;
  }

  const results = [];
  for (const target of targets) {
    const generic = runChecker("check-design-generic.mjs", target);
    const contrast = runChecker("check-contrast.mjs", target);
    results.push(scoreArm(path.basename(target), generic, contrast));
  }

  results.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  if (asJson) {
    console.log(JSON.stringify({ results }, null, 2));
    return 0;
  }

  console.log("\nPares de contraste aprovados (%) e pistas visuais por braço\n");
  console.log("braço".padEnd(22) + "pares%".padEnd(8) + "erros".padEnd(8) + "contraste".padEnd(12) + "avisos");
  console.log("-".repeat(60));
  for (const r of results) {
    console.log(
      r.arm.padEnd(22) +
      String(r.score ?? "n/a").padEnd(8) +
      String(r.genericErrors).padEnd(8) +
      String(r.contrastFails).padEnd(12) +
      String(r.genericWarns)
    );
  }

  const withSignals = results.filter((r) => r.signals.length > 0);
  if (withSignals.length > 0) {
    console.log("\nPistas visuais encontradas para revisão contextual:");
    for (const r of withSignals) console.log(`  ${r.arm}: ${r.signals.join(", ")}`);
  }

  console.log("\nTokens não interpretados, pares não medidos e aparência renderizada exigem verificação própria; isto não é nota de design.");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("score-design falhou:", error.message);
    process.exit(1);
  });
