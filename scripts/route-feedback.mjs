#!/usr/bin/env node

import { appendRouteFeedback } from "./lib/route-feedback.mjs";

const args = process.argv.slice(2);
function value(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const decision = value("--decision");
const task = value("--task");
if (!decision || !task) {
  console.error("Usage: node scripts/route-feedback.mjs --decision accepted|overridden|rejected --task <description> [--selected id,id] [--source auto|swarm|program] [--reason text] [--root path]");
  process.exit(2);
}

try {
  const result = await appendRouteFeedback({
    root: value("--root") || process.cwd(),
    decision,
    task,
    source: value("--source") || "manual",
    selected: (value("--selected") || "").split(","),
    reason: value("--reason"),
  });
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Could not record route feedback: ${error.message}`);
  process.exit(1);
}
