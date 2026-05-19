#!/usr/bin/env node
/**
 * Valida programs/*.yml contra o schema em policies/programs-schema.md.
 *
 * Uso:
 *   node scripts/validate-program.mjs                    # valida todos em programs/
 *   node scripts/validate-program.mjs programs/foo.yml   # valida um especifico
 *
 * Exit codes:
 *   0 — todos validos
 *   1 — pelo menos um invalido
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

// Mini YAML parser — suficiente para nosso subset. Para uso real,
// trocar por `yaml` package quando build pipeline permitir.
function parseYAML(content) {
  // Simplest possible YAML → JSON via line-based parser.
  // Limitado a: mappings, scalars, lists. Sem anchors/aliases.
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

    // List item at this indent — caller should handle as list
    if (line.startsWith("- ")) {
      return parseList(lines, startIdx, baseIndent);
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) { i++; continue; }
    const key = line.substring(0, colonIdx).trim();
    const valueRaw = line.substring(colonIdx + 1).trim();

    if (!valueRaw) {
      // Block sub-value
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
      // Block item
      const sub = parseBlock(lines, i + 1, baseIndent + 2);
      result.push(sub.value);
      i = sub.nextIdx;
    } else if (itemContent.includes(":")) {
      // Inline mapping start
      const colonIdx = itemContent.indexOf(":");
      const key = itemContent.substring(0, colonIdx).trim();
      const valueRaw = itemContent.substring(colonIdx + 1).trim();
      const item = {};
      item[key] = valueRaw ? parseScalar(valueRaw) : null;
      // Continue parsing rest of this item's keys
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
  if (s.startsWith("[") && s.endsWith("]")) {
    return s.slice(1, -1).split(",").map(x => parseScalar(x.trim())).filter(Boolean);
  }
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  return s;
}

function validate(programPath, doc) {
  const errors = [];
  const warnings = [];

  if (!doc || typeof doc !== "object") {
    errors.push("Document is empty or invalid");
    return { errors, warnings };
  }

  if (doc.schema_version !== "1.0") {
    errors.push(`schema_version must be "1.0", got: ${doc.schema_version}`);
  }

  if (!doc.program) errors.push("Missing required field: program");
  else {
    const p = doc.program;
    if (!p.id) errors.push("program.id is required");
    if (!p.name) errors.push("program.name is required");
    if (!p.version) errors.push("program.version is required");
    if (!p.description) errors.push("program.description is required");
    if (p.id && !/^[a-z][a-z0-9-]*$/.test(p.id)) {
      errors.push(`program.id must be lowercase slug: ${p.id}`);
    }
  }

  if (!Array.isArray(doc.steps) || doc.steps.length === 0) {
    errors.push("steps[] is required and must have at least 1 step");
  } else {
    const ids = new Set();
    for (const step of doc.steps) {
      if (!step.id) { errors.push("step missing id"); continue; }
      if (ids.has(step.id)) errors.push(`duplicate step id: ${step.id}`);
      ids.add(step.id);

      // Infer type from fields (v1.7.0 — fields can be implicit)
      let type = step.type;
      if (!type) {
        if (step.command) type = "command";
        else if (step.prompt) type = "prompt";
        else if (step.bash) type = "bash";
        else if (step.message) type = "gate";
        else if (step.loop) type = "loop";
        else if (step.parallel) type = "parallel";
        else if (step.if) type = "conditional";
      }
      const VALID_TYPES = ["command", "prompt", "bash", "gate", "loop", "parallel", "conditional"];
      if (!VALID_TYPES.includes(type)) {
        errors.push(`step "${step.id}": unknown type "${type}". Valid: ${VALID_TYPES.join(", ")}`);
      }

      // Type-specific required fields
      if (type === "command" && !step.command) {
        errors.push(`step "${step.id}": type=command requires command field`);
      }
      if (type === "prompt" && !step.prompt) {
        errors.push(`step "${step.id}": type=prompt requires prompt field`);
      }
      if (type === "bash" && !step.bash) {
        errors.push(`step "${step.id}": type=bash requires bash field`);
      }
      if (type === "gate" && !step.message) {
        errors.push(`step "${step.id}": type=gate requires message field`);
      }
      if (type === "loop") {
        if (!step.loop) errors.push(`step "${step.id}": type=loop requires loop block`);
        else {
          if (!step.loop.prompt && !step.loop.command) {
            errors.push(`step "${step.id}": loop requires loop.prompt or loop.command`);
          }
          if (!step.loop.until) {
            errors.push(`step "${step.id}": loop requires loop.until token`);
          }
          if (!step.loop.max_iterations) {
            errors.push(`step "${step.id}": loop requires loop.max_iterations (anti-pattern: infinite loops)`);
          }
        }
      }
      if (type === "parallel") {
        if (!Array.isArray(step.parallel) || step.parallel.length === 0) {
          errors.push(`step "${step.id}": type=parallel requires parallel[] with ≥1 step`);
        }
        if (step.trigger_rule && !["all_success", "one_success", "all_done"].includes(step.trigger_rule)) {
          errors.push(`step "${step.id}": unknown trigger_rule "${step.trigger_rule}"`);
        }
      }
      if (type === "conditional" && (!step.if || !step.then)) {
        errors.push(`step "${step.id}": type=conditional requires if + then`);
      }

      // Validate context / provider / model
      if (step.context && !["inherit", "fresh"].includes(step.context)) {
        errors.push(`step "${step.id}": context must be "inherit" or "fresh", got "${step.context}"`);
      }
      if (step.provider && !["claude", "codex"].includes(step.provider)) {
        warnings.push(`step "${step.id}": provider "${step.provider}" is unusual (expected: claude, codex)`);
      }

      // Anti-pattern checks
      if (type === "bash" && step.bash) {
        const dangerous = /\b(rm\s+-rf|git\s+push\s+--force|git\s+reset\s+--hard|sudo|chmod\s+777)\b/;
        if (dangerous.test(step.bash)) {
          warnings.push(`step "${step.id}": bash contains potentially destructive command — ensure gate precedes`);
        }
      }
      if (type === "prompt" && step.prompt && step.prompt.length > 5000) {
        warnings.push(`step "${step.id}": prompt is ${step.prompt.length} chars (>5000) — consider extracting to slash command`);
      }
    }

    // Check ${steps.X} references
    const allRefs = [];
    const findRefs = (obj) => {
      if (typeof obj === "string") {
        const matches = obj.matchAll(/\$\{steps\.([a-z][a-z0-9-]*)/g);
        for (const m of matches) allRefs.push(m[1]);
      } else if (Array.isArray(obj)) {
        obj.forEach(findRefs);
      } else if (obj && typeof obj === "object") {
        Object.values(obj).forEach(findRefs);
      }
    };
    findRefs(doc.steps);
    for (const ref of allRefs) {
      if (!ids.has(ref)) errors.push(`reference to non-existent step: \${steps.${ref}}`);
    }
  }

  return { errors, warnings };
}

async function main() {
  const args = process.argv.slice(2);
  let files;
  if (args.length > 0) {
    files = args;
  } else {
    const programsDir = path.join(root, "programs");
    const entries = await fs.readdir(programsDir);
    files = entries.filter(f => f.endsWith(".yml")).map(f => path.join("programs", f));
  }

  let totalErrors = 0;
  for (const file of files) {
    const abs = path.resolve(root, file);
    try {
      const content = await fs.readFile(abs, "utf8");
      const doc = parseYAML(content);
      const { errors, warnings } = validate(file, doc);
      if (errors.length === 0 && warnings.length === 0) {
        console.log(`✓ ${file}`);
      } else {
        console.log(`${errors.length ? "✗" : "⚠"} ${file}`);
        for (const e of errors) console.log(`    ERROR: ${e}`);
        for (const w of warnings) console.log(`    WARN:  ${w}`);
        totalErrors += errors.length;
      }
    } catch (e) {
      console.log(`✗ ${file}`);
      console.log(`    ERROR: parse failed: ${e.message}`);
      totalErrors++;
    }
  }

  console.log("");
  console.log(`Validated ${files.length} program(s), ${totalErrors} error(s).`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
