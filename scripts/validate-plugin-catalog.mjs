#!/usr/bin/env node

import { validatePluginCatalog } from "./lib/plugin-catalog.mjs";

const json = process.argv.includes("--json");
const result = await validatePluginCatalog();

if (json) {
  console.log(JSON.stringify({ errors: result.errors, warnings: result.warnings, plugins: result.entries.map((entry) => entry.data.id) }, null, 2));
} else if (result.errors.length === 0) {
  console.log(`Plugin catalog valid (${result.entries.length} plugins).`);
} else {
  console.error("Plugin catalog validation failed:");
  for (const error of result.errors) console.error(`- ${error}`);
}

process.exit(result.errors.length > 0 ? 1 : 0);
