/**
 * Keeps the MCP router aligned with scripts/route-task.mjs by consuming the
 * same deterministic routing fixtures. A catalog change must satisfy both
 * surfaces: hooks/CLI and MCP clients.
 */
import fs from "fs/promises";
import path from "path";
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

const fixturePath = path.join(KIT_ROOT, "evals", "routing", "plugin-routing.json");
const fixtures = JSON.parse(await fs.readFile(fixturePath, "utf8")) as RoutingFixture[];

await test("lists bundled and external plugins with install metadata", async () => {
  const plugins = await listPluginCatalog();
  assert(plugins.some((plugin) => plugin.id === "product-marketing" && plugin.availability === "bundled"), "missing bundled product-marketing");
  const legal = plugins.find((plugin) => plugin.id === "legal-workflows");
  if (!legal) throw new Error("missing legal-workflows");
  assert(legal.availability === "external", "legal-workflows must be external");
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
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
