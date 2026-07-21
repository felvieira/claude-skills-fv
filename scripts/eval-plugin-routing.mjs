#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { routeTask } from "./lib/plugin-catalog.mjs";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");

function containsAll(actual, expected) {
  return expected.every((item) => actual.includes(item));
}

export async function runRoutingEvals() {
  const fixturePaths = [
    path.join(root, "evals", "routing", "plugin-routing.json"),
    path.join(root, "evals", "routing", "real-scenarios.json"),
  ];
  const cases = (await Promise.all(fixturePaths.map(async (fixturePath) =>
    JSON.parse(await fs.readFile(fixturePath, "utf8")),
  ))).flat();
  const results = [];

  for (const testCase of cases) {
    const route = await routeTask(testCase.prompt);
    const actualPlugins = route.plugins.map((plugin) => plugin.id);
    const actualExternalPlugins = route.external_plugins.map((plugin) => plugin.id);
    const failures = [];
    if (!containsAll(actualPlugins, testCase.plugins || [])) failures.push(`missing plugins: ${(testCase.plugins || []).filter((id) => !actualPlugins.includes(id)).join(", ")}`);
    if (!containsAll(actualExternalPlugins, testCase.external_plugins || [])) failures.push(`missing external plugins: ${(testCase.external_plugins || []).filter((id) => !actualExternalPlugins.includes(id)).join(", ")}`);
    if (!containsAll(route.skills, testCase.skills || [])) failures.push(`missing skills: ${(testCase.skills || []).filter((id) => !route.skills.includes(id)).join(", ")}`);
    for (const plugin of testCase.exclude_plugins || []) {
      if (actualPlugins.includes(plugin)) failures.push(`unexpected plugin: ${plugin}`);
    }
    for (const plugin of testCase.exclude_external_plugins || []) {
      if (actualExternalPlugins.includes(plugin)) failures.push(`unexpected external plugin: ${plugin}`);
    }
    if (testCase.risk && route.risk !== testCase.risk) failures.push(`risk expected ${testCase.risk}, got ${route.risk}`);
    if (typeof testCase.requires_human_review === "boolean" && route.requires_human_review !== testCase.requires_human_review) {
      failures.push(`requires_human_review expected ${testCase.requires_human_review}, got ${route.requires_human_review}`);
    }
    if (typeof testCase.max_skill_count === "number" && route.skill_count > testCase.max_skill_count) {
      failures.push(`skill_count must be <= ${testCase.max_skill_count}, got ${route.skill_count}`);
    }
    if (typeof testCase.max_recommendation_count === "number" && route.recommendation_count > testCase.max_recommendation_count) {
      failures.push(`recommendation_count must be <= ${testCase.max_recommendation_count}, got ${route.recommendation_count}`);
    }
    results.push({ name: testCase.name, pass: failures.length === 0, failures, route });
  }

  return results;
}

async function main() {
  const json = process.argv.includes("--json");
  const results = await runRoutingEvals();
  const failed = results.filter((result) => !result.pass);
  if (json) {
    console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  } else {
    for (const result of results) console.log(`${result.pass ? "PASS" : "FAIL"} ${result.name}${result.failures.length ? ` — ${result.failures.join("; ")}` : ""}`);
    console.log(`\n${results.length - failed.length}/${results.length} routing evals passed.`);
  }
  process.exit(failed.length > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
