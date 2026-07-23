#!/usr/bin/env node
/**
 * Real runtime check: spawns the built MCP server as an actual child process,
 * speaks real MCP JSON-RPC over stdio (initialize + tools/list), and asserts
 * it responds with a non-empty tool list within a timeout.
 *
 * This is deliberately NOT another string/keyword routing eval. Everything
 * else under evals/ and scripts/eval-plugin-routing.mjs checks WHAT the kit
 * recommends (routing correctness). This script checks whether the
 * recommending SYSTEM itself boots and serves protocol traffic — a
 * different failure mode (e.g. a broken build, a crashing constructor, a
 * malformed tool schema) that no amount of routing-keyword matching can
 * catch. See policies/plugin-catalog.md "Validation" for how this fits
 * alongside the routing evals.
 *
 * Usage: node scripts/verify-mcp-runtime.mjs [--json] [--timeout-ms=10000]
 * Exit code: 0 on a verified boot + protocol response, 1 otherwise.
 */

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");

const args = process.argv.slice(2);
const json = args.includes("--json");
const timeoutArg = args.find((a) => a.startsWith("--timeout-ms="));
const timeoutMs = timeoutArg ? Number(timeoutArg.split("=")[1]) : 10_000;

const serverPath = path.join(root, "mcp-server", "dist", "index.js");

function fail(message) {
  const report = { ok: false, server_path: serverPath, error: message };
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.error("MCP runtime check FAILED:");
    console.error(`- ${message}`);
  }
  process.exit(1);
}

if (!fs.existsSync(serverPath)) {
  fail(
    `MCP server is not built: ${serverPath} does not exist. ` +
      `Run: cd mcp-server && npm run build`,
  );
}

/**
 * Spawns the built MCP server and performs a real stdio JSON-RPC round trip:
 * initialize -> notifications/initialized -> tools/list. Mirrors the
 * approach already proven in scripts/tests/consumer-install.mjs's
 * listMcpTools(), but targets the in-repo build directly so it can run
 * without a full consumer install.
 */
async function verifyServerBoots() {
  const child = spawn(process.execPath, [serverPath], {
    cwd: root,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdoutBuffer = "";
  let stderrBuffer = "";
  child.stderr.on("data", (chunk) => {
    stderrBuffer += chunk.toString();
  });

  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `timed out after ${timeoutMs}ms waiting for tools/list response. ` +
            `stderr=${stderrBuffer.slice(-1000) || "(empty)"}`,
        ),
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";
      for (const line of lines.filter(Boolean)) {
        let message;
        try {
          message = JSON.parse(line);
        } catch {
          continue; // MCP servers may log non-JSON lines to stdout; ignore.
        }
        if (message.id === 1 && message.result) {
          child.stdin.write(
            `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
          );
          child.stdin.write(
            `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`,
          );
        }
        if (message.id === 2) {
          clearTimeout(timer);
          if (message.error) reject(new Error(`tools/list returned an error: ${JSON.stringify(message.error)}`));
          else resolve(message.result?.tools || []);
        }
      }
    });

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`failed to spawn MCP server process: ${error.message}`));
    });

    child.once("exit", (code, signal) => {
      if (code !== null && code !== 0) {
        clearTimeout(timer);
        reject(new Error(`MCP server process exited with code ${code} before responding. stderr=${stderrBuffer.slice(-1000)}`));
      } else if (signal) {
        clearTimeout(timer);
        reject(new Error(`MCP server process was killed by signal ${signal}. stderr=${stderrBuffer.slice(-1000)}`));
      }
    });

    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "devkit-runtime-verify", version: "1.0.0" },
        },
      })}\n`,
    );
  }).finally(() => {
    try {
      child.stdin.end();
    } catch {
      // already closed
    }
    child.kill();
  });

  return result;
}

async function main() {
  let tools;
  try {
    tools = await verifyServerBoots();
  } catch (error) {
    fail(error.message);
    return;
  }

  if (!Array.isArray(tools) || tools.length === 0) {
    fail(`server responded but tools/list returned an empty or invalid tool array: ${JSON.stringify(tools)}`);
    return;
  }

  const report = {
    ok: true,
    server_path: serverPath,
    tool_count: tools.length,
    sample_tools: tools.slice(0, 5).map((tool) => tool.name),
  };

  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `MCP runtime check passed: server booted and responded to initialize + tools/list with ${tools.length} tools.`,
    );
  }
  process.exit(0);
}

main().catch((error) => {
  fail(error?.message || String(error));
});
