#!/usr/bin/env node
/**
 * curator-state.mjs — escreve/le o .curator-state.json do vault de memoria.
 *
 * Fecha o loop do memory-curator-nudge.mjs: o nudge LE este state pra saber
 * quando foi a ultima consolidacao; o /consolidate-memory ESCREVE este state
 * ao concluir (passo final). Sem o write, o nudge dispararia pra sempre.
 *
 * Uso:
 *   node scripts/curator-state.mjs --write [--vault D:/claude-memory]
 *     → grava { last_curated_at: agora, files_at_last: <contagem> }
 *   node scripts/curator-state.mjs --read [--vault D:/claude-memory]
 *     → imprime o state atual (ou defaults)
 *
 * Zero-dep, Node >=18. Conta md em logs/ architecture/ learned-skills/ (1 nivel).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
}

function resolveVault(explicit) {
  const candidates = [
    explicit,
    "D:/claude-memory",
    join(homedir(), "claude-memory"),
    ".bot/docs/memory",
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) || explicit || "D:/claude-memory";
}

function countMarkdown(dir) {
  let n = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        try {
          for (const sub of readdirSync(join(dir, entry.name), { withFileTypes: true })) {
            if (sub.isFile() && sub.name.endsWith(".md")) n++;
          }
        } catch { /* skip */ }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        n++;
      }
    }
  } catch { /* missing → 0 */ }
  return n;
}

function totalVaultFiles(vault) {
  let n = 0;
  for (const sub of ["logs", "architecture", "learned-skills"]) {
    n += countMarkdown(join(vault, sub));
  }
  return n;
}

function statePath(vault) {
  return join(vault, ".curator-state.json");
}

function readState(vault) {
  try {
    return JSON.parse(readFileSync(statePath(vault), "utf-8"));
  } catch {
    return { last_curated_at: null, files_at_last: 0 };
  }
}

const vault = resolveVault(arg("--vault"));

if (arg("--write")) {
  const state = {
    last_curated_at: new Date().toISOString(),
    files_at_last: totalVaultFiles(vault),
  };
  try {
    writeFileSync(statePath(vault), JSON.stringify(state, null, 2));
    console.log(`✓ curator state written → ${statePath(vault)}`);
    console.log(`  last_curated_at: ${state.last_curated_at}`);
    console.log(`  files_at_last: ${state.files_at_last}`);
  } catch (e) {
    console.error(`✗ failed to write curator state: ${e.message}`);
    process.exit(1);
  }
} else {
  // default: read
  const state = readState(vault);
  console.log(JSON.stringify({ vault, ...state, current_files: totalVaultFiles(vault) }, null, 2));
}
