#!/usr/bin/env node
/**
 * ai-memory-setup.mjs — configura o backend de memória ai-memory
 * (github.com/akitaonrails/ai-memory) quando Docker está disponível.
 *
 * Chamado do fim de setup/install.sh (auto, best-effort) e utilizável standalone:
 *   node scripts/ai-memory-setup.mjs             → tenta subir se Docker existir
 *   node scripts/ai-memory-setup.mjs --check      → só reporta disponibilidade, não muta nada
 *   node scripts/ai-memory-setup.mjs --skip        → força fallback pro vault nativo
 *
 * Opt-out permanente: env var DEVKIT_MEMORY_BACKEND=native, ou --profile lean/--no-input
 * no installer (que já propaga essa env var).
 *
 * Nunca lança (best-effort): qualquer falha aqui deve deixar o vault nativo
 * (init-vault.mjs) como fallback funcional — a instalação do kit não pode
 * quebrar por causa disto.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const CONTAINER = "ai-memory";
const IMAGE = "akitaonrails/ai-memory:latest";
const PORT = 49374;
const MARKER_DIR = join(homedir(), ".dev-team-kit");
const BACKEND_MARKER = join(MARKER_DIR, "memory-backend.json");

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes("--check");
const FORCE_SKIP = args.includes("--skip") || process.env.DEVKIT_MEMORY_BACKEND === "native";

// execFile/spawn with an argument array only — never a shell string — so no
// externally-influenced value can be interpreted as a shell metacharacter.
function run(cmd, cmdArgs = []) {
  const res = spawnSync(cmd, cmdArgs, { encoding: "utf-8" });
  if (res.status !== 0 || res.error) return null;
  return (res.stdout || "").trim();
}

function dockerAvailable() {
  const version = run("docker", ["version", "--format", "{{.Server.Version}}"]);
  return Boolean(version);
}

function containerExists() {
  const out = run("docker", ["ps", "-a", "--filter", `name=^/${CONTAINER}$`, "--format", "{{.Names}}"]);
  return out === CONTAINER;
}

function containerRunning() {
  const out = run("docker", ["ps", "--filter", `name=^/${CONTAINER}$`, "--format", "{{.Names}}"]);
  return out === CONTAINER;
}

function writeBackendMarker(backend, extra = {}) {
  try {
    mkdirSync(MARKER_DIR, { recursive: true });
    writeFileSync(BACKEND_MARKER, JSON.stringify({
      backend,
      updated_at: new Date().toISOString(),
      ...extra,
    }, null, 2));
  } catch {
    // best-effort only
  }
}

function startContainer() {
  if (containerRunning()) return { started: false, reason: "already-running" };
  if (containerExists()) {
    const res = spawnSync("docker", ["start", CONTAINER], { stdio: "ignore" });
    return { started: res.status === 0, reason: "restarted-existing" };
  }
  const res = spawnSync("docker", [
    "run", "-d", "--name", CONTAINER,
    "--restart", "unless-stopped",
    "-p", `127.0.0.1:${PORT}:${PORT}`,
    "-v", "ai-memory-data:/data",
    IMAGE,
  ], { stdio: "ignore" });
  return { started: res.status === 0, reason: "created" };
}

function main() {
  if (FORCE_SKIP) {
    console.log("[ai-memory] skipped (DEVKIT_MEMORY_BACKEND=native or --skip) — using native vault");
    writeBackendMarker("native", { reason: "opt-out" });
    return;
  }

  if (!dockerAvailable()) {
    console.log("[ai-memory] Docker not available — using native vault (init-vault.mjs)");
    writeBackendMarker("native", { reason: "no-docker" });
    return;
  }

  if (CHECK_ONLY) {
    console.log(`[ai-memory] Docker available. Container running: ${containerRunning()}`);
    return;
  }

  console.log("[ai-memory] Docker detected — starting ai-memory server (busca cross-agent, cross-session)...");
  const { started, reason } = startContainer();
  const ok = started || reason === "already-running";
  if (!ok) {
    console.log("[ai-memory] failed to start container — falling back to native vault");
    console.log(`[ai-memory] you can retry manually: docker run -d --name ${CONTAINER} --restart unless-stopped -p 127.0.0.1:${PORT}:${PORT} -v ai-memory-data:/data ${IMAGE}`);
    writeBackendMarker("native", { reason: "docker-run-failed" });
    return;
  }

  console.log(`[ai-memory] server up (${reason}) at http://127.0.0.1:${PORT}`);
  console.log(`[ai-memory] web UI: http://127.0.0.1:${PORT}/web/`);
  console.log("[ai-memory] wiring hooks + MCP for this agent...");

  // install-hooks / install-mcp need the ai-memory CLI binary. If it isn't
  // on PATH yet, that's a manual follow-up step — never block install.sh on it.
  const cliCheck = run("ai-memory", ["--version"]);
  if (!cliCheck) {
    console.log("[ai-memory] CLI binary not found on PATH — hooks/MCP registration skipped.");
    console.log(`[ai-memory] download: https://github.com/akitaonrails/ai-memory/releases`);
    console.log(`[ai-memory] then run: ai-memory install-hooks --agent claude-code --apply && ai-memory install-mcp --client claude-code --apply`);
    writeBackendMarker("ai-memory", { reason: "server-only-no-cli", server_url: `http://127.0.0.1:${PORT}` });
    return;
  }

  spawnSync("ai-memory", ["install-hooks", "--agent", "claude-code", "--server-url", `http://127.0.0.1:${PORT}`, "--apply"], { stdio: "inherit" });
  spawnSync("ai-memory", ["install-mcp", "--client", "claude-code", "--server-url", `http://127.0.0.1:${PORT}`, "--apply"], { stdio: "inherit" });

  writeBackendMarker("ai-memory", { server_url: `http://127.0.0.1:${PORT}` });
  console.log("[ai-memory] done. Native memory-curator/session-start vault injection will defer to ai-memory automatically.");
}

main();
