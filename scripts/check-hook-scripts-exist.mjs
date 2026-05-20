#!/usr/bin/env node
/**
 * Validates that every hook script referenced in hooks/hooks.json
 * actually exists on disk.
 *
 * Used by .github/workflows/validate-plugin.yml.
 * Parses the Claude Code plugin schema:
 *   { hooks: { <event>: [ { matcher?, hooks: [ { type, command } ] } ] } }
 */

import fs from "fs";

const raw = JSON.parse(fs.readFileSync("hooks/hooks.json", "utf-8"));
const events = raw.hooks || raw; // tolerate legacy flat format
const scriptRef = /\$\{CLAUDE_PLUGIN_ROOT\}\/(hooks\/scripts\/[^\s"]+\.mjs)/g;

let missing = 0;
let found = 0;

for (const [event, blocks] of Object.entries(events)) {
  if (!Array.isArray(blocks)) continue;
  for (const block of blocks) {
    const list = block.hooks || (Array.isArray(block) ? block : []);
    for (const h of list) {
      const cmd = typeof h === "string" ? h : (h.command || "");
      for (const m of cmd.matchAll(scriptRef)) {
        found++;
        if (!fs.existsSync(m[1])) {
          console.error(`❌ Missing: ${m[1]} (referenced in ${event})`);
          missing++;
        }
      }
    }
  }
}

if (missing > 0) {
  console.error(`${missing} hook script(s) missing`);
  process.exit(1);
}

console.log(`✅ All ${found} hook scripts referenced in hooks.json exist`);
