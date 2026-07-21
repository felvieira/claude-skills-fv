/**
 * Keeps the MCP router aligned with scripts/route-task.mjs by consuming the
 * same deterministic routing fixtures. A catalog change must satisfy both
 * surfaces: hooks/CLI and MCP clients.
 */
import fs from "fs/promises";
import path from "path";
import { execFileSync } from "node:child_process";
import { KIT_ROOT } from "../constants.js";
import { listPluginCatalog, routePluginComposition } from "./plugin-router.js";

interface RoutingFixture {
  name: string;
  prompt: string;
  plugins?: string[];
  external_plugins?: string[];
  skills?: string[];
  exclude_plugins?: string[];
  exclude_external_plugins?: string[];
  risk?: "low" | "medium" | "high";
  requires_human_review?: boolean;
  max_skill_count?: number;
  max_recommendation_count?: number;
}

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
    passed++;
  } catch (error) {
    console.error(`  FAIL ${name}`);
    console.error(`       ${(error as Error).message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function missing(actual: string[], expected: string[]) {
  return expected.filter((item) => !actual.includes(item));
}

console.log("plugin-router shared routing fixtures");

const fixturePaths = ["plugin-routing.json", "real-scenarios.json"].map((file) => path.join(KIT_ROOT, "evals", "routing", file));
const fixtures = (await Promise.all(fixturePaths.map(async (fixturePath) =>
  JSON.parse(await fs.readFile(fixturePath, "utf8")) as RoutingFixture[],
))).flat();

await test("lists bundled and external plugins with install metadata", async () => {
  const plugins = await listPluginCatalog();
  assert(plugins.some((plugin) => plugin.id === "product-marketing" && plugin.availability === "bundled"), "missing bundled product-marketing");
  const legal = plugins.find((plugin) => plugin.id === "legal-workflows");
  if (!legal) throw new Error("missing legal-workflows");
  assert(legal.availability === "external", "legal-workflows must be external");
  assert(legal.trust === "official", "legal-workflows must expose official provenance");
  assert(Boolean(legal.install?.reference), "external plugin needs an install reference");
});

for (const fixture of fixtures) {
  await test(fixture.name, async () => {
    const route = await routePluginComposition(fixture.prompt);
    const pluginIds = route.plugins.map((plugin) => plugin.id);
    const externalPluginIds = route.external_plugins.map((plugin) => plugin.id);
    const skillIds = route.skills;

    const missingPlugins = missing(pluginIds, fixture.plugins || []);
    assert(missingPlugins.length === 0, `missing plugins: ${missingPlugins.join(", ")}`);
    const missingExternal = missing(externalPluginIds, fixture.external_plugins || []);
    assert(missingExternal.length === 0, `missing external plugins: ${missingExternal.join(", ")}`);
    const missingSkills = missing(skillIds, fixture.skills || []);
    assert(missingSkills.length === 0, `missing skills: ${missingSkills.join(", ")}`);

    for (const excluded of fixture.exclude_plugins || []) {
      assert(!pluginIds.includes(excluded), `unexpected plugin: ${excluded}`);
    }
    for (const excluded of fixture.exclude_external_plugins || []) {
      assert(!externalPluginIds.includes(excluded), `unexpected external plugin: ${excluded}`);
    }
    if (fixture.risk) assert(route.risk === fixture.risk, `risk expected ${fixture.risk}, got ${route.risk}`);
    if (typeof fixture.requires_human_review === "boolean") {
      assert(route.requires_human_review === fixture.requires_human_review,
        `requires_human_review expected ${fixture.requires_human_review}, got ${route.requires_human_review}`);
    }
    if (typeof fixture.max_skill_count === "number") {
      assert(route.skill_count <= fixture.max_skill_count, `skill_count must be <= ${fixture.max_skill_count}, got ${route.skill_count}`);
    }
    if (typeof fixture.max_recommendation_count === "number") {
      assert(route.recommendation_count <= fixture.max_recommendation_count, `recommendation_count must be <= ${fixture.max_recommendation_count}, got ${route.recommendation_count}`);
    }
  });
}

await test("CLI and MCP route contract stay in parity", async () => {
  for (const fixture of fixtures) {
    const cli = JSON.parse(execFileSync(process.execPath, [path.join(KIT_ROOT, "scripts", "route-task.mjs"), "--json", fixture.prompt], { encoding: "utf8" }));
    const mcp = await routePluginComposition(fixture.prompt);
    const project = (route: typeof mcp) => ({
      plugins: route.plugins.map((plugin) => ({ id: plugin.id, matchedCapabilities: plugin.matchedCapabilities, trust: plugin.trust })),
      external_plugins: route.external_plugins.map((plugin) => ({ id: plugin.id, matchedCapabilities: plugin.matchedCapabilities, trust: plugin.trust })),
      skills: route.skills,
      policies: route.policies,
      commands: route.commands,
      risk: route.risk,
      requires_human_review: route.requires_human_review,
      skill_count: route.skill_count,
      recommendation_count: route.recommendation_count,
    });
    assert(JSON.stringify(project(cli)) === JSON.stringify(project(mcp)), `CLI/MCP mismatch for ${fixture.name}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
