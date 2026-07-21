#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const kitRoot = path.resolve(path.dirname(__filename), "..");
const config = {
  name: "dev-team-kit",
  transport: "stdio",
  command: "node",
  args: [path.join(kitRoot, "mcp-server", "dist", "index.js")],
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(config, null, 2));
} else {
  console.log("In Kimi Code, run /mcp-config and add this stdio server:");
  console.log(JSON.stringify(config, null, 2));
  console.log("Restart or start a new Kimi session after saving the MCP configuration.");
}
