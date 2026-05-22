/**
 * skill-manifest.test.ts
 *
 * Validates that file-reader.ts::listSkills correctly parses the v2
 * frontmatter fields (version, author, compatibility, requires) absorbed
 * from bytedance/deer-flow. Backward compat: skills without these fields
 * must still load with the new fields as `undefined`.
 *
 * Run via: npm run test:manifest (added to mcp-server/package.json)
 */
import { listSkills } from "../services/file-reader.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void> | void) {
  return (async () => {
    try {
      await fn();
      console.log(`  ok  ${name}`);
      passed++;
    } catch (err) {
      console.error(`  FAIL ${name}`);
      console.error(`       ${(err as Error).message}`);
      failed++;
    }
  })();
}

function assertTrue(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

console.log("skill-manifest v2 parsing");

const skills = await listSkills();

await test("listSkills returns at least the 39 core skills", () => {
  assertTrue(skills.length >= 39, `expected >=39, got ${skills.length}`);
});

await test("every skill has a defined name and description", () => {
  for (const s of skills) {
    assertTrue(typeof s.name === "string" && s.name.length > 0, `skill ${s.id} has no name`);
    assertTrue(typeof s.description === "string", `skill ${s.id} has no description`);
  }
});

await test("v2 fields are typed as optional (undefined when absent)", () => {
  for (const s of skills) {
    // version / author / compatibility / requires should all be either
    // a primitive of the right type, or undefined. Never null, never NaN.
    if (s.version !== undefined)       assertTrue(typeof s.version === "string", `${s.id}.version not string`);
    if (s.author !== undefined)        assertTrue(typeof s.author === "string", `${s.id}.author not string`);
    if (s.compatibility !== undefined) assertTrue(typeof s.compatibility === "string", `${s.id}.compatibility not string`);
    if (s.requires !== undefined) {
      assertTrue(Array.isArray(s.requires), `${s.id}.requires not array`);
      for (const r of s.requires) assertTrue(typeof r === "string", `${s.id}.requires has non-string entry`);
    }
  }
});

await test("backward compat: skills without v2 frontmatter still parse", () => {
  // The 39 core skills do not (yet) declare v2 fields. Confirm all 4 are
  // undefined for at least one core skill — proves the parser tolerates
  // their absence rather than failing or substituting empty strings.
  const sample = skills.find(s => s.id === "01-po-feature-spec");
  assertTrue(sample !== undefined, "01-po-feature-spec should exist");
  assertTrue(sample!.version === undefined, "v1 skill must not invent a version");
  assertTrue(sample!.author === undefined, "v1 skill must not invent an author");
  assertTrue(sample!.compatibility === undefined, "v1 skill must not invent compatibility");
  assertTrue(sample!.requires === undefined, "v1 skill must not invent requires");
});

console.log("");
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
