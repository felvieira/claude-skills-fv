#!/usr/bin/env node
/**
 * bench/ab/run-ab.mjs — A/B REAL: Claude vanilla vs Claude + Dev Team Kit
 *
 * Executa a MESMA tarefa (task.md) em dois braços isolados via `claude -p`
 * headless, captura os traces reais (stream-json) e mede:
 *
 *   • tokens in/out/cache + custo $ real (do campo usage de cada turno)
 *   • nº de turnos até "verde" (testes passando de verdade)
 *   • retrabalho (writes repetidos no mesmo arquivo)
 *   • claims sem evidência (afirma "passou" sem rodar o teste antes)
 *   • qualidade final (roda vitest no código gerado de cada braço)
 *
 * Isolamento (honesto):
 *   - Ambos braços rodam com CLAUDE_CONFIG_DIR = dir temporário isolado:
 *     CLAUDE.md vazio, settings mínimo, SEM hooks, SEM plugins.
 *   - Auth (.credentials.json) é copiada do ~/.claude real → ambos autenticam
 *     pela MESMA subscription. Única variável = --plugin-dir do kit (braço B).
 *   - Projeto = pasta vazia idêntica nos dois. A tarefa é byte-a-byte igual.
 *
 * Uso:
 *   node bench/ab/run-ab.mjs                # roda os 2 braços + gera HTML
 *   node bench/ab/run-ab.mjs --arm vanilla  # só um braço
 *   node bench/ab/run-ab.mjs --max-turns 40 # teto de turnos por braço
 *   node bench/ab/run-ab.mjs --dry          # mostra os comandos, não executa
 */

import { spawn } from "node:child_process";
import {
  mkdirSync, rmSync, cpSync, writeFileSync, readFileSync,
  existsSync, readdirSync, statSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");          // repo root (kit)
const OUT = join(__dirname, "out");

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };

const ARM_FILTER = val("--arm", null);             // "vanilla" | "kit" | null(ambos)
const MAX_TURNS = Number(val("--max-turns", 60));
const MODEL = val("--model", "sonnet");
const DRY = has("--dry");

const TASK = readFileSync(join(__dirname, "task.md"), "utf8");

// ─── isolamento de config ────────────────────────────────────────────────────

function makeIsolatedConfig(armName) {
  const cfg = join(tmpdir(), `ab-cfg-${armName}`);
  rmSync(cfg, { recursive: true, force: true });
  mkdirSync(cfg, { recursive: true });

  // auth real → ambos autenticam pela mesma subscription
  const cred = join(homedir(), ".claude", ".credentials.json");
  if (existsSync(cred)) cpSync(cred, join(cfg, ".credentials.json"));

  // CLAUDE.md VAZIO → zero instruções globais vazando pro vanilla
  writeFileSync(join(cfg, "CLAUDE.md"), "");
  // settings mínimo: sem hooks, sem nada
  writeFileSync(join(cfg, "settings.json"), JSON.stringify({}, null, 2));

  return cfg;
}

function makeProjectDir(armName) {
  const proj = join(tmpdir(), `ab-proj-${armName}`);
  rmSync(proj, { recursive: true, force: true });
  mkdirSync(proj, { recursive: true });
  // CLAUDE.md de projeto também vazio (não dar pista de stack pré-mastigada)
  writeFileSync(join(proj, "CLAUDE.md"), "");
  return proj;
}

// ─── execução de um braço ─────────────────────────────────────────────────────

function buildArgs(armName, projDir) {
  const a = [
    "-p", TASK,
    "--output-format", "stream-json",
    "--verbose",                       // stream-json exige verbose
    "--model", MODEL,
    "--no-session-persistence",
    "--dangerously-skip-permissions",  // headless autônomo
    "--max-turns", String(MAX_TURNS),
    "--add-dir", projDir,
  ];
  if (armName === "kit") {
    a.push("--plugin-dir", ROOT);
  }
  return a;
}

function runArm(armName) {
  return new Promise((resolve) => {
    const cfg = makeIsolatedConfig(armName);
    const proj = makeProjectDir(armName);
    const args = buildArgs(armName, proj);
    const env = { ...process.env, CLAUDE_CONFIG_DIR: cfg };

    if (DRY) {
      console.log(`\n[${armName}] cwd=${proj}`);
      console.log(`[${armName}] CLAUDE_CONFIG_DIR=${cfg}`);
      console.log(`[${armName}] claude ${args.map((x) => (x === TASK ? '"<task.md>"' : x)).join(" ")}`);
      return resolve(null);
    }

    console.log(`\n▶ [${armName}] iniciando (model=${MODEL}, max-turns=${MAX_TURNS})…`);
    const t0 = Date.now();
    const events = [];
    let buf = "";

    const child = spawn("claude", args, { cwd: proj, env, shell: false });

    const onLine = (line) => {
      line = line.trim();
      if (!line) return;
      try { events.push(JSON.parse(line)); }
      catch { /* linha parcial/não-json — ignora */ }
    };

    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        onLine(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
      }
      // heartbeat leve
      process.stdout.write(".");
    });
    child.stderr.on("data", (c) => { /* silencioso; debug se precisar */ });

    child.on("close", (code) => {
      if (buf.trim()) onLine(buf);
      const wallMs = Date.now() - t0;
      console.log(`\n✔ [${armName}] terminou em ${(wallMs / 1000).toFixed(1)}s, exit=${code}, eventos=${events.length}`);

      const trace = {
        arm: armName,
        model: MODEL,
        wallMs,
        exitCode: code,
        projectDir: proj,
        events,
      };
      const outFile = join(OUT, `${armName}-trace.json`);
      mkdirSync(OUT, { recursive: true });
      writeFileSync(outFile, JSON.stringify(trace, null, 2));
      console.log(`  trace → ${outFile}`);
      resolve(trace);
    });
  });
}

// ─── main ─────────────────────────────────────────────────────────────────────

const arms = ARM_FILTER ? [ARM_FILTER] : ["vanilla", "kit"];
console.log("═".repeat(70));
console.log("  A/B REAL — Claude vanilla vs Dev Team Kit");
console.log(`  Tarefa: ${join(__dirname, "task.md")}`);
console.log(`  Braços: ${arms.join(", ")} | model=${MODEL} | max-turns=${MAX_TURNS}`);
console.log("═".repeat(70));

for (const arm of arms) {
  await runArm(arm);
}

if (!DRY) {
  console.log("\n✅ Braços concluídos. Próximo passo:");
  console.log("   node bench/ab/instrument.mjs   # extrai métricas dos traces");
  console.log("   node bench/ab/report/generate.mjs  # gera o HTML");
}
