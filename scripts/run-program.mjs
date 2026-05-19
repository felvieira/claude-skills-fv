#!/usr/bin/env node
/**
 * Executor de programs/*.yml. Parseia YAML, resolve variables, executa steps
 * em ordem, respeita gates/parallel/conditional.
 *
 * IMPORTANTE: este executor é uma camada de **planejamento**. Ele resolve o
 * plano (substitui variables, ordena steps, identifica gates) e devolve para
 * o agente Claude executar cada step via tool calls. Não invoca slash
 * commands diretamente — isso é feito pelo agente que rodou /run-program.
 *
 * Uso:
 *   node scripts/run-program.mjs <name> [--dry-run] [--list]
 *   node scripts/run-program.mjs --list
 *   node scripts/run-program.mjs --describe <name>
 *
 * Output: JSON estruturado para stdout (agente parseia e executa).
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

// Reuse YAML parser from validator
async function loadParser() {
  const mod = await import("./validate-program.mjs");
  // validate-program exports nothing currently; we inline parseYAML
  return null;
}

// Inline minimal parser (kept in sync with validate-program.mjs)
function parseYAML(content) {
  const lines = content.split("\n");
  return parseBlock(lines, 0, 0).value;
}
function parseBlock(lines, startIdx, baseIndent) {
  const result = {};
  let i = startIdx;
  while (i < lines.length) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) { i++; continue; }
    const indent = raw.length - raw.trimStart().length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; }
    const line = raw.trim();
    if (line.startsWith("- ")) return parseList(lines, startIdx, baseIndent);
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) { i++; continue; }
    const key = line.substring(0, colonIdx).trim();
    const valueRaw = line.substring(colonIdx + 1).trim();
    if (!valueRaw) {
      const next = lines[i + 1];
      if (!next) { result[key] = null; i++; continue; }
      const nextIndent = next.length - next.trimStart().length;
      if (next.trim().startsWith("- ")) {
        const sub = parseList(lines, i + 1, nextIndent);
        result[key] = sub.value;
        i = sub.nextIdx;
      } else {
        const sub = parseBlock(lines, i + 1, nextIndent);
        result[key] = sub.value;
        i = sub.nextIdx;
      }
    } else {
      result[key] = parseScalar(valueRaw);
      i++;
    }
  }
  return { value: result, nextIdx: i };
}
function parseList(lines, startIdx, baseIndent) {
  const result = [];
  let i = startIdx;
  while (i < lines.length) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) { i++; continue; }
    const indent = raw.length - raw.trimStart().length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; }
    const line = raw.trim();
    if (!line.startsWith("- ")) break;
    const itemContent = line.substring(2).trim();
    if (!itemContent) {
      const sub = parseBlock(lines, i + 1, baseIndent + 2);
      result.push(sub.value);
      i = sub.nextIdx;
    } else if (itemContent.includes(":")) {
      const colonIdx = itemContent.indexOf(":");
      const key = itemContent.substring(0, colonIdx).trim();
      const valueRaw = itemContent.substring(colonIdx + 1).trim();
      const item = {};
      item[key] = valueRaw ? parseScalar(valueRaw) : null;
      const sub = parseBlock(lines, i + 1, baseIndent + 2);
      Object.assign(item, sub.value);
      result.push(item);
      i = sub.nextIdx;
    } else {
      result.push(parseScalar(itemContent));
      i++;
    }
  }
  return { value: result, nextIdx: i };
}
function parseScalar(s) {
  s = s.trim();
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  if (s.startsWith("[") && s.endsWith("]")) return s.slice(1, -1).split(",").map(x => parseScalar(x.trim())).filter(Boolean);
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  return s;
}

// ============ CLI ============

async function listPrograms() {
  const programsDir = path.join(root, "programs");
  const entries = await fs.readdir(programsDir);
  const ymlFiles = entries.filter(f => f.endsWith(".yml"));
  const programs = [];
  for (const f of ymlFiles) {
    try {
      const content = await fs.readFile(path.join(programsDir, f), "utf8");
      const doc = parseYAML(content);
      programs.push({
        file: `programs/${f}`,
        id: doc.program?.id,
        name: doc.program?.name,
        version: doc.program?.version,
        description: doc.program?.description,
        step_count: Array.isArray(doc.steps) ? doc.steps.length : 0,
      });
    } catch (e) {
      programs.push({ file: `programs/${f}`, error: e.message });
    }
  }
  return programs;
}

async function describeProgram(nameOrPath) {
  const programPath = nameOrPath.endsWith(".yml")
    ? nameOrPath
    : `programs/${nameOrPath}.yml`;
  const content = await fs.readFile(path.join(root, programPath), "utf8");
  const doc = parseYAML(content);
  return {
    file: programPath,
    program: doc.program,
    requires: doc.requires || {},
    inputs: doc.inputs || {},
    steps: (doc.steps || []).map(s => ({
      id: s.id,
      type: inferType(s),
      command: s.command,
      prompt_preview: s.prompt ? (s.prompt.substring(0, 100) + (s.prompt.length > 100 ? "..." : "")) : undefined,
      bash_preview: s.bash ? (s.bash.substring(0, 100) + (s.bash.length > 100 ? "..." : "")) : undefined,
      message: s.message,
      when: s.when,
      context: s.context,
      provider: s.provider,
      model: s.model,
      parallel_count: Array.isArray(s.parallel) ? s.parallel.length : undefined,
      trigger_rule: s.trigger_rule,
      loop: s.loop ? {
        until: s.loop.until,
        max_iterations: s.loop.max_iterations,
        fresh_context: s.loop.fresh_context,
      } : undefined,
    })),
  };
}

function inferType(s) {
  if (s.type) return s.type;
  if (s.command) return "command";
  if (s.prompt) return "prompt";
  if (s.bash) return "bash";
  if (s.message) return "gate";
  if (s.loop) return "loop";
  if (s.parallel) return "parallel";
  if (s.if) return "conditional";
  return "unknown";
}

async function dryRun(nameOrPath, inputs = {}) {
  const programPath = nameOrPath.endsWith(".yml")
    ? nameOrPath
    : `programs/${nameOrPath}.yml`;
  const content = await fs.readFile(path.join(root, programPath), "utf8");
  const doc = parseYAML(content);

  // Resolve defaults for missing inputs
  const resolved = { ...inputs };
  for (const [key, schema] of Object.entries(doc.inputs || {})) {
    if (!(key in resolved) && schema.default !== undefined) {
      resolved[key] = schema.default;
    }
  }

  // Check required inputs
  const missing = [];
  for (const [key, schema] of Object.entries(doc.inputs || {})) {
    if (schema.required && !(key in resolved)) missing.push({ key, prompt: schema.prompt });
  }

  // Resolve ${inputs.X} in step args / commands (best effort — ${steps.X} stays literal)
  const substitute = (str) => {
    if (typeof str !== "string") return str;
    return str.replace(/\$\{inputs\.([a-z_][a-z0-9_]*)\}/g, (m, k) => {
      return resolved[k] !== undefined ? resolved[k] : `<UNRESOLVED:${k}>`;
    });
  };
  const resolvedSteps = (doc.steps || []).map(s => ({
    ...s,
    type: inferType(s),
    command: substitute(s.command),
    args: substitute(s.args),
    prompt: substitute(s.prompt),
    bash: substitute(s.bash),
    message: substitute(s.message),
    when: substitute(s.when),
    if: substitute(s.if),
  }));

  return {
    program: doc.program,
    resolved_inputs: resolved,
    missing_inputs: missing,
    resolved_steps: resolvedSteps,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help") {
    console.log(JSON.stringify({ usage: "run-program <name> [--dry-run] | --list | --describe <name>" }));
    process.exit(0);
  }

  try {
    if (args[0] === "--list") {
      const programs = await listPrograms();
      console.log(JSON.stringify({ action: "list", programs }, null, 2));
      process.exit(0);
    }

    if (args[0] === "--describe") {
      const name = args[1];
      if (!name) { console.log(JSON.stringify({ error: "--describe requires program name" })); process.exit(1); }
      const desc = await describeProgram(name);
      console.log(JSON.stringify({ action: "describe", ...desc }, null, 2));
      process.exit(0);
    }

    // Default: dry-run mode (executor planeja; agente executa)
    const name = args[0];
    const isDryRun = args.includes("--dry-run");
    const inputs = {};
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--input" && args[i + 1]) {
        const [k, ...v] = args[i + 1].split("=");
        inputs[k] = v.join("=");
        i++;
      }
    }
    const plan = await dryRun(name, inputs);
    console.log(JSON.stringify({
      action: isDryRun ? "dry-run" : "plan",
      ...plan,
      note: "Agent should execute resolved_steps in order. Gates require AskUserQuestion. Parallels dispatch via Task in one message."
    }, null, 2));
    process.exit(0);
  } catch (e) {
    console.log(JSON.stringify({ error: e.message, stack: e.stack }));
    process.exit(1);
  }
}

main();
