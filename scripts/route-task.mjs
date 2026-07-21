#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { routeTask } from "./lib/plugin-catalog.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const outIndex = args.indexOf("--out");
const outputPath = outIndex >= 0 ? args[outIndex + 1] : null;
if (outIndex >= 0 && !outputPath) {
  console.error("--out requires a project-relative destination path");
  process.exit(2);
}
const prompt = args.filter((arg, index) =>
  !arg.startsWith("--") && index !== outIndex + 1,
).join(" ").trim();

if (!prompt) {
  console.error("Usage: node scripts/route-task.mjs [--json] [--out project-relative-route.json] <task description>");
  process.exit(2);
}

try {
  const route = await routeTask(prompt);
  if (outputPath) {
    const resolved = path.resolve(outputPath);
    const cwd = path.resolve(process.cwd());
    if (resolved !== cwd && !resolved.startsWith(`${cwd}${path.sep}`)) {
      throw new Error("--out must stay inside the current project");
    }
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, `${JSON.stringify(route, null, 2)}\n`, "utf8");
  }
  if (json) {
    console.log(JSON.stringify(route, null, 2));
  } else if (route.plugins.length === 0 && route.external_plugins.length === 0) {
    console.log("No catalog route matched. Use skill 09 (orchestrator) for an ad-hoc pipeline.");
  } else {
    if (route.plugins.length) console.log(`Plugins: ${route.plugins.map((plugin) => plugin.id).join(", ")}`);
    if (route.external_plugins.length) {
      console.log(`External plugins (not installed): ${route.external_plugins.map((plugin) => `${plugin.id} [${plugin.trust}] via ${plugin.install.provider}`).join(", ")}`);
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
