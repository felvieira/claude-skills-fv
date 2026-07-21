#!/usr/bin/env node

import { routeTask } from "./lib/plugin-catalog.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const prompt = args.filter((arg) => !arg.startsWith("--")).join(" ").trim();

if (!prompt) {
  console.error("Usage: node scripts/route-task.mjs [--json] <task description>");
  process.exit(2);
}

try {
  const route = await routeTask(prompt);
  if (json) {
    console.log(JSON.stringify(route, null, 2));
  } else if (route.plugins.length === 0 && route.external_plugins.length === 0) {
    console.log("No catalog route matched. Use skill 09 (orchestrator) for an ad-hoc pipeline.");
  } else {
    if (route.plugins.length) console.log(`Plugins: ${route.plugins.map((plugin) => plugin.id).join(", ")}`);
    if (route.external_plugins.length) {
      console.log(`External plugins (not installed): ${route.external_plugins.map((plugin) => `${plugin.id} via ${plugin.install.provider}`).join(", ")}`);
    }
    if (route.skills.length) console.log(`Skills: ${route.skills.join(", ")}`);
    if (route.policies.length) console.log(`Policies: ${route.policies.join(", ")}`);
    if (route.commands.length) console.log(`Commands: ${route.commands.join(", ")}`);
    console.log(`Risk: ${route.risk}${route.requires_human_review ? " (human review required)" : ""}`);
  }
} catch (error) {
  console.error(`Routing failed: ${error.message}`);
  process.exit(1);
}
