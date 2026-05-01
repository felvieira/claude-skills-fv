#!/usr/bin/env node
/**
 * test-polish-skill-paths.mjs — Verifies all SKILL_PATHS referenced by polish.mjs
 * resolve to a real, non-empty SKILL.md (or skill.md / README.md) on disk.
 *
 * Why: loadSkillPrompt silently logs 'skill not found' and marks polishIncomplete
 * if a referenced skill dir was renamed or its SKILL.md is missing. This test
 * fails loudly if any path is broken so it can be fixed before the auto-loop
 * polish pass runs in production.
 *
 * Usage: node scripts/tests/auto-loop/test-polish-skill-paths.mjs
 * Exit 0 = all paths valid, Exit 1 = at least one missing.
 *
 * Part of auto-loop v2 gap-fix Task 2.
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { SKILL_PATHS } from '../../auto-loop/polish.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Repo root is two levels up from scripts/tests/auto-loop/
const repoRoot = resolve(__dirname, '..', '..', '..');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

console.log('Test: every SKILL_PATHS entry resolves to a loadable skill file\n');

const skillEntries = Object.entries(SKILL_PATHS);
assert(
  'SKILL_PATHS has at least one entry',
  skillEntries.length > 0,
  `got ${skillEntries.length}`,
);

for (const [skillName, skillPath] of skillEntries) {
  // Resolve relative to the repo root so the test works regardless of cwd.
  const absDir = resolve(repoRoot, skillPath);
  const dirExists = existsSync(absDir) && statSync(absDir).isDirectory();
  assert(
    `'${skillName}' directory exists (${skillPath})`,
    dirExists,
    `expected directory at ${absDir}`,
  );

  if (!dirExists) continue;

  const candidates = ['SKILL.md', 'skill.md', 'README.md'];
  const found = candidates
    .map(name => join(absDir, name))
    .find(p => existsSync(p) && statSync(p).isFile());

  assert(
    `'${skillName}' has SKILL.md / skill.md / README.md`,
    !!found,
    `none of [${candidates.join(', ')}] found in ${absDir}`,
  );

  if (!found) continue;

  const body = readFileSync(found, 'utf-8');
  assert(
    `'${skillName}' skill body > 50 chars`,
    body.trim().length > 50,
    `got ${body.trim().length} chars in ${found}`,
  );
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
