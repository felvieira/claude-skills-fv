#!/usr/bin/env node
/**
 * Optional ai-memory backend. Install is best-effort for the kit, but every
 * server/CLI failure is reported and the native vault remains active.
 *
 * --check is read-only; --skip selects native; --upgrade --backup-to ABSOLUTE_FILE
 * upgrades only kit-owned, unmodified standalone containers. The backup is
 * verified outside Docker before the old container is stopped. The previous
 * container is retained (stopped and renamed), never deleted automatically.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const CONTAINER = "ai-memory";
const IMAGE = "akitaonrails/ai-memory:latest";
const VOLUME = "ai-memory-data";
const OWNER_LABEL = "dev-team-kit.ai-memory";
const MARKER = join(homedir(), ".dev-team-kit", "memory-backend.json");
const CMD = (port) => ["serve", "--transport", "http", "--bind", `0.0.0.0:${port}`, "--enable-web"];
const URL = (port) => `http://127.0.0.1:${port}`;

function needsManualCliUpgrade(version) {
  const match = version?.match(/\b(\d+)\.(\d+)\.(\d+)\b/);
  return match && (Number(match[1]) < 2 || (Number(match[1]) === 2 && Number(match[2]) < 3)) ? match[0] : null;
}

function manualCliUpgrade(version) {
  return `host CLI ${version} does not support self-upgrade. Download the official ai-memory-windows-x86_64.zip and matching .sha256 from https://github.com/akitaonrails/ai-memory/releases/latest, compare Get-FileHash -Algorithm SHA256 to the published checksum, unpack and replace the writable host CLI manually, then rerun setup (or --upgrade with a NEW --backup-to file). Existing server unchanged.`;
}

function execute(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  return { ok: !result.error && result.status === 0, output: (result.stdout || "").trim(),
    error: result.error?.message || (result.stderr || "").trim() || `exit ${result.status}` };
}

function parse(result, description) {
  if (!result.ok) throw new Error(`${description}: ${result.error}`);
  try { return JSON.parse(result.output); }
  catch { throw new Error(`${description}: invalid Docker JSON`); }
}

function marker(backend, extra = {}) {
  mkdirSync(dirname(MARKER), { recursive: true });
  writeFileSync(MARKER, JSON.stringify({ backend, updated_at: new Date().toISOString(), ...extra }, null, 2));
}

function expectedRun(port, bindSpec = `${VOLUME}:/data`) {
  return ["run", "-d", "--name", CONTAINER, "--label", `${OWNER_LABEL}=1`,
    "--restart", "unless-stopped", "-p", `127.0.0.1:${port}:${port}`,
    "-e", `AI_MEMORY_SERVER_URL=${URL(port)}`, "-v", bindSpec, IMAGE, ...CMD(port)];
}

// Only containers matching the exact kit runtime contract may be recreated.
// Unexpected settings (secrets, mounts, security, networks, custom command)
// require manual inspection and reconstruction rather than guesswork.
function kitOwned(container, imageConfig, port) {
  const c = container.Config || {};
  const h = container.HostConfig || {};
  const bindings = h.PortBindings || {};
  const ports = Object.entries(bindings);
  const expectedEnv = new Map((imageConfig.Config?.Env || []).map((entry) => [entry.slice(0, entry.indexOf("=")), entry]));
  expectedEnv.set("AI_MEMORY_SERVER_URL", `AI_MEMORY_SERVER_URL=${URL(port)}`);
  const actualEnv = c.Env || [];
  const envMatches = actualEnv.length === expectedEnv.size &&
    actualEnv.every((entry) => expectedEnv.get(entry.slice(0, entry.indexOf("="))) === entry);
  const mount = container.Mounts || [];
  const labels = c.Labels || {};
  const inheritedLabels = imageConfig.Config?.Labels || {};
  const legacy = Object.keys(labels).length === Object.keys(inheritedLabels).length &&
    Object.entries(inheritedLabels).every(([key, value]) => labels[key] === value);
  const knownLegacyEnv = !legacy || actualEnv.length === 5 &&
    ["AI_MEMORY_SERVER_URL", "PATH", "AI_MEMORY_DATA_DIR", "AI_MEMORY_ALLOWED_HOSTS", "AI_MEMORY_IN_CONTAINER"]
      .every((key) => actualEnv.some((entry) => entry.startsWith(`${key}=`)));
  const mode = mount[0]?.Mode || "";
  const acceptedBinds = [`${VOLUME}:/data`, `${VOLUME}:/data:z`];
  return (labels[OWNER_LABEL] === "1" || legacy) && knownLegacyEnv && envMatches && c.Image === IMAGE &&
    JSON.stringify(c.Cmd) === JSON.stringify(CMD(port)) &&
    JSON.stringify(c.Entrypoint) === JSON.stringify(imageConfig.Config?.Entrypoint) &&
    mount.length === 1 && mount[0].Type === "volume" && mount[0].Name === VOLUME && mount[0].Destination === "/data" &&
    mount[0].RW !== false && (mode === "" || mode === "z") &&
    ports.length === 1 && ports[0][0] === `${port}/tcp` && ports[0][1]?.length === 1 &&
    ports[0][1][0].HostIp === "127.0.0.1" && ports[0][1][0].HostPort === String(port) &&
    h.RestartPolicy?.Name === "unless-stopped" && !h.Privileged &&
    (!h.NetworkMode || h.NetworkMode === "default" || h.NetworkMode === "bridge") &&
    h.Binds?.length === 1 && acceptedBinds.includes(h.Binds[0]) &&
    !h.Devices?.length && !h.CapAdd?.length && !h.SecurityOpt?.length &&
    (c.User || "") === (imageConfig.Config?.User || "") && !h.PublishAllPorts;
}

function inspect(exec, name) {
  const result = exec("docker", ["inspect", name]);
  if (!result.ok) {
    if (result.error?.includes("No such object") || result.error?.includes("No such container")) return null;
    throw new Error(`cannot determine whether ${name} exists: ${result.error}`);
  }
  const items = parse(result, `docker inspect ${name}`);
  if (items.length !== 1) throw new Error(`unexpected docker inspect result for ${name}`);
  return items[0];
}

async function ready(exec, attempts) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const container = inspect(exec, CONTAINER);
    if (container?.State?.Status === "running" && container.State.Health?.Status === "healthy") return true;
    if (attempt < attempts - 1) await new Promise((done) => setTimeout(done, 1000));
  }
  return false;
}

function docker(exec, args) {
  const result = exec("docker", args);
  if (!result.ok) throw new Error(`docker ${args[0]} failed: ${result.error}`);
  return result;
}

function backup(exec, archive, volumeSource, log) {
  if (!archive || !isAbsolute(archive)) throw new Error("--upgrade requires --backup-to ABSOLUTE_FILE outside Docker");
  const path = resolve(archive);
  const parent = realpathSync(dirname(path));
  if (!statSync(parent).isDirectory() || existsSync(path)) throw new Error(`backup destination must be a new file: ${path}`);
  if (typeof volumeSource === "string" && isAbsolute(volumeSource) && existsSync(volumeSource)) {
    const fromVolume = relative(realpathSync(volumeSource), parent);
    if (!fromVolume || (fromVolume !== ".." && !fromVolume.startsWith(`..${sep}`) && !isAbsolute(fromVolume)))
      throw new Error(`backup destination must be outside Docker's ${VOLUME} volume`);
  }
  const inContainer = `/tmp/dev-team-kit-backup-${Date.now()}-${process.pid}.tar.gz`;
  docker(exec, ["exec", CONTAINER, "ai-memory", "backup", "--to", inContainer]);
  docker(exec, ["cp", `${CONTAINER}:${inContainer}`, path]);
  const archiveInfo = statSync(path);
  const listing = exec("tar", ["-tzf", path]);
  if (!archiveInfo.isFile() || archiveInfo.size === 0 || !listing.ok || !listing.output)
    throw new Error(`backup verification failed: ${path}; existing container untouched`);
  log(`[ai-memory] verified external backup: ${path} (${archiveInfo.size} bytes)`);
  return path;
}

export async function setup({ args = process.argv.slice(2), env = process.env, exec = execute,
  readinessAttempts = 150, writeMarker = marker, log = console.log } = {}) {
  const check = args.includes("--check");
  const skip = args.includes("--skip") || env.DEVKIT_MEMORY_BACKEND === "native";
  const upgrade = args.includes("--upgrade");
  const backupIndex = args.indexOf("--backup-to");
  const backupTo = backupIndex < 0 ? null : args[backupIndex + 1];
  const port = Number(env.DEVKIT_AI_MEMORY_PORT || 39374);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("invalid DEVKIT_AI_MEMORY_PORT");
  if (check && (upgrade || backupIndex >= 0)) throw new Error("--check cannot be combined with upgrade/backup options");
  if (!upgrade && backupIndex >= 0) throw new Error("--backup-to requires --upgrade");
  if (upgrade && skip) throw new Error("--upgrade cannot be combined with native/--skip");
  if (skip) {
    log("[ai-memory] skipped — using native vault");
    if (!check) writeMarker("native", { reason: "opt-out" });
    return;
  }
  const version = exec("docker", ["version", "--format", "{{.Server.Version}}"]);
  if (!version.ok || !version.output) {
    if (upgrade) throw new Error("Docker daemon unavailable; upgrade not attempted");
    log("[ai-memory] Docker daemon unavailable — using native vault");
    if (!check) writeMarker("native", { reason: "no-docker" });
    return;
  }
  let container = inspect(exec, CONTAINER);
  const hadContainer = Boolean(container);
  if (check) {
    const status = container ? container.State?.Status || "unknown" : "absent";
    const active = status === "running" && container.State.Health?.Status === "healthy";
    const cli = exec("ai-memory", ["--version"]);
    log(`[ai-memory] Docker available; container: ${status}; server ready: ${active}; image: ${container?.Image || "none"}; host CLI: ${cli.ok ? cli.output : "unavailable"}`);
    return;
  }
  let preserveMarkerOnFailure = false;
  try {
    if (upgrade) {
      if (!container) throw new Error("no existing container to upgrade; run setup without --upgrade for first install");
      if (container.State?.Status !== "running" || !(await ready(exec, readinessAttempts)))
        throw new Error("existing server has no healthy Docker healthcheck; repair it before upgrading and backing up");
      // Inspect the original image before pulling: inherited image env can
      // otherwise be mistaken for operator-defined configuration.
      const oldImage = parse(docker(exec, ["image", "inspect", container.Image]), "existing image")[0];
      if (!oldImage || !kitOwned(container, oldImage, port))
        throw new Error("container is not a recognized, unmodified kit-owned standalone server; do not recreate it automatically. Inspect `docker inspect ai-memory` and preserve all environment, ports, mounts and restart settings. Run `ai-memory backup` and copy/verify it outside the volume before following upstream standalone upgrade guidance.");
      if (!backupTo) throw new Error("--upgrade requires --backup-to ABSOLUTE_FILE outside Docker");
      const cliVersion = exec("ai-memory", ["--version"]);
      if (!cliVersion.ok)
        throw new Error("host CLI unavailable; install it before upgrading the server");
      const oldVersion = needsManualCliUpgrade(cliVersion.output);
      if (oldVersion) throw new Error(manualCliUpgrade(oldVersion));
      const saved = backup(exec, backupTo, container.Mounts[0].Source, log);
      const cliUpgrade = exec("ai-memory", ["upgrade"]);
      if (!cliUpgrade.ok) throw new Error(`host CLI upgrade failed: ${cliUpgrade.error}; server unchanged, verified backup ${saved}. If this CLI does not support upgrade, install the official release manually: download the matching binary archive and .sha256 from https://github.com/akitaonrails/ai-memory/releases/latest, verify its SHA-256 (Windows: Get-FileHash -Algorithm SHA256), replace the writable host binary, then rerun with a NEW --backup-to path.`);
      log("[ai-memory] host CLI upgrade completed; checking the current server image.");
      docker(exec, ["pull", IMAGE]);
      const newest = parse(docker(exec, ["image", "inspect", IMAGE]), "pulled image")[0];
      if (!newest?.Id) throw new Error("pulled image has no ID");
      if (container.Image === newest.Id) {
        log(`[ai-memory] server image already current; backup retained at ${saved}`);
      } else {
        const previous = `ai-memory-previous-${Date.now()}-${process.pid}`;
        docker(exec, ["stop", CONTAINER]);
        try { docker(exec, ["rename", CONTAINER, previous]); }
        catch (error) { throw new Error(`${error.message}; original container is stopped under its original name. Backup: ${saved}. No new server was started; review and restart it with docker start ${CONTAINER} if appropriate.`); }
        // Never restart the old binary automatically after a new server has
        // seen the volume: upstream schema migrations are forward-only.
        try { docker(exec, expectedRun(port, container.HostConfig.Binds[0])); }
        catch (error) { throw new Error(`${error.message}; previous container ${previous} retained stopped, verified backup ${saved}. Do not restart the old image against migrated data.`); }
        container = inspect(exec, CONTAINER);
        log(`[ai-memory] new image launched, awaiting Docker healthcheck; previous container retained stopped as ${previous}; backup: ${saved}`);
      }
    } else if (container) {
      const oldImage = exec("docker", ["image", "inspect", container.Image]);
      const base = oldImage.ok ? parse(oldImage, "existing image")[0] : null;
      if (!base || !kitOwned(container, base, port)) {
        preserveMarkerOnFailure = true;
        throw new Error("existing container is not a recognized kit-owned or exact legacy standalone server; inspect it and follow upstream standalone upgrade instructions; kit will not start or configure it");
      }
      const localImage = exec("docker", ["image", "inspect", IMAGE, "--format", "{{.Id}}"]);
      const stale = localImage.ok && localImage.output && localImage.output !== container.Image;
      log(`[ai-memory] existing container retained; ${stale ? "its image is older than the locally available image" : "its freshness against the registry is unverified"}. Use \`node scripts/ai-memory-setup.mjs --upgrade --backup-to ABSOLUTE_FILE\` for a guarded upgrade.`);
      if (container.State?.Status !== "running") {
        docker(exec, ["start", CONTAINER]);
        container = inspect(exec, CONTAINER);
      }
    } else {
      const volume = exec("docker", ["volume", "inspect", VOLUME, "--format", "{{.Name}}"]);
      if (volume.ok || !volume.error?.includes("No such volume")) {
        preserveMarkerOnFailure = true;
        throw new Error(`existing or unverified ${VOLUME} volume: refusing first start against potentially migrated data. Inspect and back up that volume before manually attaching it.`);
      }
      docker(exec, ["pull", IMAGE]);
      docker(exec, expectedRun(port));
      container = inspect(exec, CONTAINER);
    }
    if (!container || !(await ready(exec, readinessAttempts)))
      throw new Error("server failed Docker healthcheck; inspect its status and the preserved backup before choosing a backend");
    if (hadContainer && !upgrade)
      preserveMarkerOnFailure = true;
    log(`[ai-memory] server ready at ${URL(port)} (image ${container.Image})`);
    const cli = exec("ai-memory", ["--version"]);
    if (!cli.ok)
      throw new Error("CLI missing/broken; hooks/MCP not installed. Install or upgrade the host CLI from https://github.com/akitaonrails/ai-memory/releases and rerun setup");
    const oldVersion = needsManualCliUpgrade(cli.output);
    if (oldVersion) throw new Error(manualCliUpgrade(oldVersion));
    for (const command of [["install-hooks", "--agent", "claude-code"], ["install-mcp", "--client", "claude-code"]]) {
      const result = exec("ai-memory", [...command, "--server-url", URL(port), "--apply"]);
      if (!result.ok) throw new Error(`ai-memory ${command[0]} failed: ${result.error}`);
    }
    writeMarker("ai-memory", { server_url: URL(port) });
    log("[ai-memory] server and CLI hooks/MCP ready; native vault injection disabled.");
    if (upgrade) log(`[ai-memory] Other previously configured agents may need a hook refresh on Windows: rerun ai-memory install-hooks --agent <agent> --server-url ${URL(port)} --apply and install-mcp --client <client> --server-url ${URL(port)} --apply for each agent you actually use (Codex, Cursor, etc.).`);
  } catch (error) {
    log(`[ai-memory] ${error.message}`);
    log("[ai-memory] setup incomplete; no container or volume is automatically deleted.");
    if (!upgrade && !preserveMarkerOnFailure) writeMarker("native", { reason: "setup-failed" });
    throw error;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  setup().catch((error) => { console.error(`[ai-memory] ${error.message}`); process.exitCode = 1; });
}
