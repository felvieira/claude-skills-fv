#!/usr/bin/env node
/**
 * Minimal JSON Schema structure validator.
 * No external deps — uses Node.js built-ins only.
 *
 * Usage:
 *   node scripts/validate-schema.mjs <schema.json> [data.json]
 *   node scripts/validate-schema.mjs --all schemas/skill-io/
 */
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function validateSchemaFile(schemaPath) {
  const abs = path.isAbsolute(schemaPath) ? schemaPath : path.join(root, schemaPath);
  let schema;
  try {
    schema = JSON.parse(await fs.readFile(abs, "utf8"));
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${e.message}` };
  }

  const errors = [];
  if (!schema.$schema) errors.push("Missing $schema field");
  if (!schema.type && !schema.properties) errors.push("Missing type or properties");

  return errors.length ? { ok: false, error: errors.join("; ") } : { ok: true };
}

async function validateDataAgainstSchema(schemaPath, dataPath) {
  const absSchema = path.isAbsolute(schemaPath) ? schemaPath : path.join(root, schemaPath);
  const absData = path.isAbsolute(dataPath) ? dataPath : path.join(root, dataPath);

  let schema, data;
  try { schema = JSON.parse(await fs.readFile(absSchema, "utf8")); }
  catch (e) { return { ok: false, error: `Schema: ${e.message}` }; }
  try { data = JSON.parse(await fs.readFile(absData, "utf8")); }
  catch (e) { return { ok: false, error: `Data: ${e.message}` }; }

  const errors = [];
  // Check required top-level fields
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) errors.push(`Missing required field: ${field}`);
    }
  }
  // Check output.confidence if output is present
  if (schema.properties?.output?.required?.includes("confidence")) {
    if (data.output && !["high","medium","low"].includes(data.output.confidence)) {
      errors.push(`output.confidence must be high|medium|low, got: ${data.output?.confidence}`);
    }
  }

  return errors.length ? { ok: false, error: errors.join("; ") } : { ok: true };
}

const args = process.argv.slice(2);

if (args[0] === "--all") {
  const dir = args[1] || "schemas/skill-io/";
  const absDir = path.isAbsolute(dir) ? dir : path.join(root, dir);
  const files = (await fs.readdir(absDir)).filter(f => f.endsWith(".json") && !f.startsWith("_"));
  let failed = 0;
  for (const f of files) {
    const result = await validateSchemaFile(path.join(absDir, f));
    if (result.ok) {
      console.log(`✓ ${f}`);
    } else {
      console.error(`✗ ${f}: ${result.error}`);
      failed++;
    }
  }
  console.log(`\n${files.length - failed}/${files.length} schemas valid`);
  process.exit(failed > 0 ? 1 : 0);
} else if (args.length >= 1) {
  const result = args.length >= 2
    ? await validateDataAgainstSchema(args[0], args[1])
    : await validateSchemaFile(args[0]);
  if (result.ok) {
    console.log("✓ Valid");
    process.exit(0);
  } else {
    console.error(`✗ ${result.error}`);
    process.exit(1);
  }
} else {
  console.log("Usage:");
  console.log("  node scripts/validate-schema.mjs <schema.json> [data.json]");
  console.log("  node scripts/validate-schema.mjs --all schemas/skill-io/");
  process.exit(1);
}
