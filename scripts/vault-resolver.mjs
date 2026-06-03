#!/usr/bin/env node
/**
 * vault-resolver.mjs — fonte canônica do path do vault de memória.
 *
 * Resolve o caminho do vault de forma PORTÁVEL, na ordem:
 *   1. $CLAUDE_MEMORY_VAULT (env var explícita — máxima flexibilidade)
 *   2. ~/.claude-memory (padrão portável, vale Windows/Mac/Linux)
 *   3. D:/claude-memory (legado — compat com instalações antigas no Windows)
 *   4. ~/claude-memory (legado — sem o ponto)
 *
 * Retorna o PRIMEIRO que existe. Se NENHUM existe e `createIfMissing`,
 * retorna o path padrão (~/.claude-memory) para o init-vault criar.
 *
 * Uso como lib:  import { resolveVault } from "./vault-resolver.mjs"
 * Uso como CLI:  node vault-resolver.mjs           → imprime o path resolvido
 *                node vault-resolver.mjs --default  → imprime o path padrão (mesmo que não exista)
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export function defaultVaultPath() {
  return join(homedir(), ".claude-memory");
}

export function vaultCandidates(explicit) {
  return [
    explicit,
    process.env.CLAUDE_MEMORY_VAULT,
    defaultVaultPath(),               // ~/.claude-memory (portável, novo padrão)
    "D:/claude-memory",               // legado Windows
    join(homedir(), "claude-memory"), // legado sem ponto
    ".bot/docs/memory",               // fallback por-projeto
  ].filter(Boolean);
}

/**
 * Resolve o vault existente. Se nenhum existe:
 *   - createIfMissing=false (default) → retorna null
 *   - createIfMissing=true → retorna o path padrão (~/.claude-memory) para criação
 */
export function resolveVault(explicit, { createIfMissing = false } = {}) {
  const found = vaultCandidates(explicit).find((p) => existsSync(p));
  if (found) return found;
  return createIfMissing ? defaultVaultPath() : null;
}

// ---- CLI ----
const isMain = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("vault-resolver.mjs");
if (isMain) {
  const wantDefault = process.argv.includes("--default");
  const out = wantDefault ? defaultVaultPath() : (resolveVault(null) || defaultVaultPath());
  process.stdout.write(out);
}
