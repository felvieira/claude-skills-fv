#!/usr/bin/env node
/**
 * End-to-end check against a fully installed consumer tree (path passed as
 * argv[1]): asserts installed files/config, and via listMcpTools() below,
 * performs a real stdio JSON-RPC round trip against the installed MCP
 * server (initialize + tools/list) plus routing/feedback/Kimi-config
 * checks. Not currently wired into CI or devkit-doctor.mjs — run manually
 * against an installed tree, e.g. after scripts/smoke-install.sh, with:
 *   node scripts/tests/consumer-install.mjs <installed-root>
 *
 * For an always-on, no-install-required MCP boot check, see
 * scripts/verify-mcp-runtime.mjs (wired into devkit-doctor.mjs and CI) —
 * it covers the same "does the server actually boot and answer tools/list"
 * guarantee against the in-repo mcp-server/dist build, using the same
 * stdio JSON-RPC approach as listMcpTools() here.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";

const consumerRoot = path.resolve(process.argv[2] || "");
if (!process.argv[2] || !fs.existsSync(consumerRoot)) {
  console.error("Usage: node scripts/tests/consumer-install.mjs <installed-consumer-root>");
  process.exit(2);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(consumerRoot, relativePath), "utf8"));
}

function runJson(script, args = []) {
  return JSON.parse(execFileSync(process.execPath, [path.join(consumerRoot, script), ...args], {
    cwd: consumerRoot,
    encoding: "utf8",
  }));
}

function hookCommands(settings, event) {
  return (settings.hooks?.[event] || []).flatMap((block) =>
    Array.isArray(block.hooks) ? block.hooks : (block.command ? [block] : []),
  ).map((hook) => hook.command || "");
}

async function listMcpTools() {
  const serverPath = path.join(consumerRoot, ".bot", "mcp-server", "dist", "index.js");
  const child = spawn(process.execPath, [serverPath], {
    cwd: consumerRoot,
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`MCP tools/list timed out. stderr=${stderr.slice(-1000)}`)), 15_000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
      const lines = stdout.split(/\r?\n/);
      stdout = lines.pop() || "";
      for (const line of lines.filter(Boolean)) {
        let message;
        try { message = JSON.parse(line); } catch { continue; }
        if (message.id === 1 && message.result) {
          child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`);
          child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`);
        }
        if (message.id === 2) {
          clearTimeout(timer);
          if (message.error) reject(new Error(JSON.stringify(message.error)));
          else resolve(message.result?.tools || []);
        }
      }
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error(`MCP exited ${code}. stderr=${stderr.slice(-1000)}`));
    });
    child.stdin.write(`${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "devkit-consumer-e2e", version: "1.0.0" },
      },
    })}\n`);
  }).finally(() => {
    child.stdin.end();
    child.kill();
  });
  return result;
}

for (const relativePath of [
  "CLAUDE.md",
  "AGENTS.md",
  ".bot/GLOBAL.md",
  ".bot/hooks/.integrity.json",
  ".bot/mcp-server/dist/index.js",
  ".claude/settings.json",
  ".mcp.json",
]) {
  assert.ok(fs.existsSync(path.join(consumerRoot, relativePath)), `missing ${relativePath}`);
}

const settings = readJson(".claude/settings.json");
assert.equal(settings.mcpServers?.["dev-team-kit"]?.args?.[0], ".bot/mcp-server/dist/index.js");
const claudeProjectMcp = readJson(".mcp.json");
assert.equal(claudeProjectMcp.mcpServers?.["dev-team-kit"]?.type, "stdio");
assert.equal(claudeProjectMcp.mcpServers?.["dev-team-kit"]?.args?.[0], ".bot/mcp-server/dist/index.js");
assert.equal(claudeProjectMcp.mcpServers?.["dev-team-kit"]?.env, undefined);
assert.ok(!claudeProjectMcp.mcpServers?.fal);
const postToolCommands = hookCommands(settings, "PostToolUse");
assert.ok(postToolCommands.some((command) => command.includes(".bot/hooks/scripts/session-event-logger.mjs")));
assert.ok(!Object.keys(settings.hooks || {}).flatMap((event) => hookCommands(settings, event)).some((command) => command.includes("CLAUDE_PLUGIN_ROOT")));

const tools = await listMcpTools();
const toolNames = tools.map((tool) => tool.name);
assert.ok(toolNames.length >= 38, `expected at least 38 MCP tools, got ${toolNames.length}`);
assert.ok(toolNames.includes("devkit_route_task"));
assert.ok(toolNames.includes("devkit_list_plugins"));

const scenarios = [
  { task: "crie a copy e o design de uma landing page para nosso produto", plugins: ["product-marketing", "design-quality"] },
  { task: "implemente uma API de autenticação com testes e auditoria de segurança", plugins: ["development"] },
  { task: "prepare um rollout canary com rollback para produção", plugins: ["release-ops"] },
  { task: "revise este NDA e as cláusulas do contrato", plugins: ["legal-workflows"], external: true },
];

const feedbackBefore = runJson(".bot/scripts/routing-insights.mjs", ["--json", "--root", consumerRoot]);

for (const scenario of scenarios) {
  const route = runJson(".bot/scripts/route-task.mjs", ["--json", scenario.task]);
  const routedIds = scenario.external
    ? route.external_plugins.map((plugin) => plugin.id)
    : route.plugins.map((plugin) => plugin.id);
  for (const expected of scenario.plugins) assert.ok(routedIds.includes(expected), `${scenario.task}: missing ${expected}`);
  execFileSync(process.execPath, [
    path.join(consumerRoot, ".bot", "scripts", "route-feedback.mjs"),
    "--decision", "accepted",
    "--source", "consumer-e2e",
    "--task", scenario.task,
    "--selected", scenario.plugins.join(","),
  ], { cwd: consumerRoot, stdio: "pipe" });
}

const routingInsights = runJson(".bot/scripts/routing-insights.mjs", ["--json", "--root", consumerRoot]);
assert.equal(routingInsights.total - feedbackBefore.total, scenarios.length);
assert.equal(routingInsights.by_decision.accepted - feedbackBefore.by_decision.accepted, scenarios.length);

const kimiConfig = runJson(".bot/scripts/print-kimi-mcp-setup.mjs", ["--json"]);
assert.equal(kimiConfig.name, "dev-team-kit");
assert.equal(kimiConfig.transport, "stdio");
assert.equal(kimiConfig.command, "node");
assert.ok(fs.existsSync(kimiConfig.args[0]), `Kimi MCP target missing: ${kimiConfig.args[0]}`);

console.log(JSON.stringify({
  consumer_root: consumerRoot,
  claude: { hooks_registered: postToolCommands.length, mcp_configured: true, project_mcp_configured: true },
  mcp: { tools: toolNames.length, route_tool: true, plugin_catalog_tool: true },
  routing_feedback: routingInsights,
  kimi: kimiConfig,
}, null, 2));
