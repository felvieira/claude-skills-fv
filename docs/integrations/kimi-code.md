# Kimi Code Adapter

Use the Dev Team Kit through its MCP server in Kimi Code. This preserves the same routing, plugin catalog, safety gates, and read-only discovery tools used by other MCP clients.

## Setup

1. Install the kit in the consumer repository so `.bot/mcp-server/dist/index.js` exists.
2. From the repository root, print the portable configuration:

```bash
node .bot/scripts/print-kimi-mcp-setup.mjs --json
```

3. Start Kimi Code and run `/mcp-config`. Add the emitted `stdio` server, then start a new session.

The adapter intentionally uses MCP only. Do not assume Kimi's marketplace plugin or hook formats are compatible with this repository's Claude plugin format. Kimi can manage its own plugins and hooks separately.

## What becomes available

- `devkit_route_task` for the legacy pipeline plus minimal skill/plugin composition
- `devkit_list_plugins` to inspect bundled and external capabilities
- the remaining Dev Team Kit MCP tools, including governance, context, and session intelligence

On Windows, configure Git for Windows before using Kimi Code; its official installer documents the Git Bash requirement.
