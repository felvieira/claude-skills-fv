#!/usr/bin/env node
// hooks/scripts/graph-update-post-tool.mjs (v2.17.0+)
//
// Regenera graphify-out/graph.json incremental após edits em arquivos de código.
// Inspirado em `/understand --auto-update` do Lum1104/Understand-Anything (MIT).
//
// Opt-in: só roda se env GRAPHIFY_AUTO=1 estiver setada. Default off — evita
// rodar graphify em toda PR pequena. User ativa com:
//   export GRAPHIFY_AUTO=1
//   # ou setx GRAPHIFY_AUTO 1   (Windows)
//
// Idempotente: se graphify não está instalado ou falha, silencia sem quebrar
// o flow do agent.

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.GRAPHIFY_AUTO !== "1") {
  // Opt-in não ativado — sair silencioso (não escrever stderr)
  process.exit(0);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..");
const GRAPHIFY_OUT = resolve(ROOT, "graphify-out");

if (!existsSync(GRAPHIFY_OUT)) {
  // Repo não usa graphify, sair silencioso
  process.exit(0);
}

// Verifica se graphify está disponível
let graphifyAvailable = false;
try {
  execSync("graphify --version", { stdio: "ignore", timeout: 3000 });
  graphifyAvailable = true;
} catch {
  // graphify não instalado — sai sem barulho
  process.exit(0);
}

if (!graphifyAvailable) process.exit(0);

// Lê stdin JSON do hook (PostToolUse) — só roda se foi Edit/Write
let toolInput;
try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  if (chunks.length > 0) {
    toolInput = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }
} catch {
  // Sem input ou JSON inválido — sai sem quebrar
  process.exit(0);
}

const toolName = toolInput?.tool_name ?? "";
if (!["Edit", "Write", "NotebookEdit"].includes(toolName)) {
  // Não foi edit de arquivo — não precisa regenerar
  process.exit(0);
}

const filePath = toolInput?.tool_input?.file_path ?? "";
// Só regenera se editou código (não markdown puro, não config root)
const codeExts = [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".go", ".rs", ".rb", ".java", ".kt", ".cs", ".php", ".swift"];
const isCode = codeExts.some((e) => filePath.toLowerCase().endsWith(e));
if (!isCode) process.exit(0);

// Roda graphify update em background, capped em 30s
try {
  execSync(`graphify update "${ROOT}"`, {
    stdio: "ignore",
    cwd: ROOT,
    timeout: 30000,
  });
  console.error(`[graphify auto-update] graph rebuilt after editing ${filePath}`);
} catch (err) {
  // Não bloqueia o flow do agent se graphify falhar
  console.error(`[graphify auto-update] failed: ${err.message}`);
}

process.exit(0);
