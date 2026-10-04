#!/usr/bin/env node
/**
 * session-guard-cli — liga/desliga as guardas sob demanda do projeto (usado por /careful e /freeze).
 *
 *   node scripts/session-guard-cli.mjs careful on|off
 *   node scripts/session-guard-cli.mjs freeze <pasta>|off
 *   node scripts/session-guard-cli.mjs status
 */
import { existsSync } from "node:fs";
import { GUARD_TTL_MS, guardsPath, readGuards, writeGuards } from "../hooks/scripts/session-guards-lib.mjs";

const [cmd, arg] = process.argv.slice(2);
const cwd = process.cwd();
const hours = GUARD_TTL_MS / 3600000;

function show(state) {
  console.log(`careful: ${state.careful ? "LIGADO (comandos destrutivos pedem confirmacao; lane fechada nega)" : "desligado"}`);
  console.log(`freeze : ${state.freeze ? `LIGADO — so edita dentro de ${state.freeze}` : "desligado"}`);
  if (state.careful || state.freeze) console.log(`(estado do projeto em ${guardsPath(cwd)}; expira em ${hours} h)`);
}

if (cmd === "careful" && ["on", "off"].includes(arg)) {
  show(writeGuards(cwd, { careful: arg === "on" }));
} else if (cmd === "freeze" && arg) {
  if (arg !== "off" && !existsSync(arg)) {
    console.error(`Pasta nao encontrada: ${arg}`);
    process.exit(1);
  }
  show(writeGuards(cwd, { freeze: arg === "off" ? null : arg }));
} else if (cmd === "status") {
  show(readGuards(cwd));
} else {
  console.error("Uso: careful on|off | freeze <pasta>|off | status");
  process.exit(2);
}
