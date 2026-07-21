#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePluginCatalog } from "./lib/plugin-catalog.mjs";
import { runRoutingEvals } from "./eval-plugin-routing.mjs";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");

async function parseJson(relPath, errors) {
  try {
    JSON.parse(await fs.readFile(path.join(root, relPath), "utf8"));
  } catch (error) {
    errors.push(`${relPath}: ${error.message}`);
  }
}

async function main() {
  const json = process.argv.includes("--json");
  const errors = [];
  const warnings = [];

  await Promise.all([
    parseJson(".claude-plugin/plugin.json", errors),
    parseJson(".claude-plugin/marketplace.json", errors),
    parseJson("hooks/config.json", errors),
  ]);

  for (const relPath of ["commands/doctor.md", "scripts/route-task.mjs", "scripts/print-kimi-mcp-setup.mjs", "hooks/scripts/intent-classifier.mjs"]) {
    try {
      await fs.access(path.join(root, relPath));
    } catch {
      errors.push(`missing ${relPath}`);
    }
  }

  const catalog = await validatePluginCatalog(root);
  errors.push(...catalog.errors);
  warnings.push(...catalog.warnings);

  const routingResults = await runRoutingEvals();
  for (const result of routingResults.filter((item) => !item.pass)) {
    errors.push(`routing eval ${result.name}: ${result.failures.join("; ")}`);
  }

  const report = {
    ok: errors.length === 0,
    errors,
    warnings,
    catalog_plugins: catalog.entries.map((entry) => entry.data.id),
    routing_evals: { passed: routingResults.filter((item) => item.pass).length, total: routingResults.length },
  };

  if (json) console.log(JSON.stringify(report, null, 2));
  else if (report.ok) console.log(`DevKit doctor passed (${report.catalog_plugins.length} plugins, ${report.routing_evals.passed}/${report.routing_evals.total} routing evals).`);
  else {
    console.error("DevKit doctor found problems:");
    for (const error of errors) console.error(`- ${error}`);
  }
  process.exit(report.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
