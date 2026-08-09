#!/usr/bin/env node

/**
 * score-design — pontua objetivamente a UI produzida por cada braço do bench A/B.
 *
 * O bench que originou `rules/frontend/ui-design.md` rodou uma vez, expôs 3 UIs
 * indigo quase idênticas, e a correção foi escrever uma regra. Ninguém rodou de
 * novo pra provar que a regra funcionou. Este script fecha esse loop: roda os
 * dois checkers em cada braço e devolve um número comparável entre versões.
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
 * Score 0-100. Erro de design genérico pesa mais que aviso, e falha de contraste
 * pesa como erro — acessibilidade não é preferência.
 */
function scoreArm(name, generic, contrast) {
  const genericErrors = generic?.errors?.length ?? 0;
  const genericWarns = generic?.warns?.length ?? 0;
  const contrastFails = contrast?.failures?.length ?? 0;

  const penalty = genericErrors * 15 + contrastFails * 15 + genericWarns * 3;
  const score = Math.max(0, 100 - penalty);

  return {
    arm: name,
    score,
    genericErrors,
    genericWarns,
    contrastFails,
    filesScanned: generic?.scanned ?? 0,
    contrastPairs: contrast?.pairs ?? 0,
    // Assinatura do default estatístico: o que o bench original expôs.
    signals: [...new Set((generic?.errors ?? []).map((e) => e.rule))],
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

  results.sort((a, b) => b.score - a.score);

  if (asJson) {
    console.log(JSON.stringify({ results }, null, 2));
    return 0;
  }

  console.log("\nDesign score por braço (0-100, maior é melhor)\n");
  console.log("braço".padEnd(22) + "score".padEnd(8) + "erros".padEnd(8) + "contraste".padEnd(12) + "avisos");
  console.log("-".repeat(60));
  for (const r of results) {
    console.log(
      r.arm.padEnd(22) +
      String(r.score).padEnd(8) +
      String(r.genericErrors).padEnd(8) +
      String(r.contrastFails).padEnd(12) +
      String(r.genericWarns)
    );
  }

  const withSignals = results.filter((r) => r.signals.length > 0);
  if (withSignals.length > 0) {
    console.log("\nSinais de default estatístico encontrados:");
    for (const r of withSignals) console.log(`  ${r.arm}: ${r.signals.join(", ")}`);
  }

  console.log("\nComparar entre versões do kit responde a pergunta que importa:");
  console.log("a regra escrita mudou o resultado, ou só documentou a intenção?");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("score-design falhou:", error.message);
    process.exit(1);
  });
