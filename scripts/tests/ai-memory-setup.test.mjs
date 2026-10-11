import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setup } from "../ai-memory-setup.mjs";

const port = 39374;
const url = `http://127.0.0.1:${port}`;
const oldImage = "sha256:old";
const newImage = "sha256:new";

function fixture({ existing = false, owner = true, current = false, running = true, cli = true,
  hooks = true, healthy = true, successorHealthy = true, backupValid = true, cliUpgrade = true,
  cliVersion = "2.6.3", orphanVolume = false, user = "ai-memory" } = {}) {
  const calls = [];
  const markers = [];
  const messages = [];
  const state = { present: existing, running, image: oldImage, latest: current ? oldImage : newImage, oldName: null };
  const container = () => ({ Image: state.image, State: { Status: state.running ? "running" : "exited",
    Health: { Status: healthy && (state.image === oldImage || successorHealthy) ? "healthy" : "unhealthy" } },
    Config: { Image: "akitaonrails/ai-memory:latest", Labels: owner === true ? { "dev-team-kit.ai-memory": "1" } : owner === "legacy" ? {} : { "someone.else": "1" },
      Cmd: ["serve", "--transport", "http", "--bind", `0.0.0.0:${port}`, "--enable-web"],
      Entrypoint: ["/usr/local/bin/ai-memory"],
      Env: ["PATH=/bin", "AI_MEMORY_DATA_DIR=/data", "AI_MEMORY_ALLOWED_HOSTS=localhost", "AI_MEMORY_IN_CONTAINER=1",
        `AI_MEMORY_SERVER_URL=${url}`], User: user },
    Mounts: [{ Type: "volume", Name: "ai-memory-data", Destination: "/data", Mode: "z", RW: true }],
    HostConfig: { PortBindings: { [`${port}/tcp`]: [{ HostIp: "127.0.0.1", HostPort: String(port) }] },
      RestartPolicy: { Name: "unless-stopped" }, NetworkMode: "bridge", Binds: ["ai-memory-data:/data"] } });
  function exec(command, args) {
    calls.push([command, ...args]);
    if (command === "tar") return { ok: backupValid, output: backupValid ? "wiki/data.md" : "", error: "bad archive" };
    if (command === "ai-memory") {
      if (args[0] === "--version" && !cli) return { ok: false, error: "not installed" };
      if (args[0] === "upgrade" && !cliUpgrade) return { ok: false, error: "cannot update native CLI" };
      if (args[0] === "install-hooks" && !hooks) return { ok: false, error: "config denied" };
      return { ok: true, output: cliVersion };
    }
    if (command !== "docker") throw Error(`unexpected ${command}`);
    if (args[0] === "version") return { ok: true, output: "28" };
    if (args[0] === "inspect") return state.present ? { ok: true, output: JSON.stringify([container()]) } : { ok: false, error: "No such object: ai-memory" };
    if (args[0] === "volume") return orphanVolume ? { ok: true, output: "ai-memory-data" } : { ok: false, error: "No such volume: ai-memory-data" };
    if (args[0] === "image" && args[1] === "inspect") {
      if (args.includes("--format")) return { ok: true, output: state.latest };
      return { ok: true, output: JSON.stringify([{ Id: args[2] === oldImage ? oldImage : state.latest,
        Config: { Env: ["PATH=/bin", "AI_MEMORY_DATA_DIR=/data", "AI_MEMORY_ALLOWED_HOSTS=localhost", "AI_MEMORY_IN_CONTAINER=1"],
          Entrypoint: ["/usr/local/bin/ai-memory"], User: "ai-memory" } }]) };
    }
    if (args[0] === "cp") { writeFileSync(args[2], "archive bytes"); return { ok: true }; }
    if (args[0] === "run") { state.present = true; state.running = true; state.image = state.latest; }
    if (args[0] === "stop") state.running = false;
    if (args[0] === "rename") { state.oldName = args[2]; state.present = false; }
    if (args[0] === "start") state.running = true;
    return { ok: true, output: "ok" };
  }
  const options = { env: {}, exec, readinessAttempts: 1,
    writeMarker: (backend, extra) => markers.push({ backend, ...extra }), log: (line) => messages.push(line) };
  return { options, calls, markers, messages, state };
}

function command(calls, ...tokens) { return calls.some((line) => tokens.every((token) => line.includes(token))); }

test("fresh install pulls before run, persists named volume and reports CLI setup", async () => {
  const f = fixture();
  await setup(f.options);
  const pulled = f.calls.findIndex((line) => line[1] === "pull");
  const ran = f.calls.findIndex((line) => line[1] === "run");
  assert.ok(pulled >= 0 && ran > pulled);
  assert.ok(command(f.calls, "run", "ai-memory-data:/data", "dev-team-kit.ai-memory=1"));
  assert.deepEqual(f.markers.map((item) => item.backend), ["ai-memory"]);
});

test("orphan named volume is never mounted into a new server without backup", async () => {
  const f = fixture({ orphanVolume: true });
  await assert.rejects(setup(f.options), /potentially migrated data/);
  assert.ok(["pull", "run", "start", "stop"].every((verb) => !command(f.calls, verb)));
  assert.deepEqual(f.markers, []);
  assert.ok(f.messages.some((line) => line.includes("Inspect and back up")));
});

test("check and native opt-out never pull, install CLI or write marker", async () => {
  for (const args of [["--check"], ["--check", "--skip"]]) {
    const f = fixture({ existing: true });
    await setup({ ...f.options, args });
    assert.deepEqual(f.markers, []);
    assert.ok(!command(f.calls, "pull") && !command(f.calls, "run") && !command(f.calls, "install-hooks"));
  }
  const f = fixture();
  await setup({ ...f.options, args: [], env: { DEVKIT_MEMORY_BACKEND: "native" } });
  assert.deepEqual(f.calls, []);
  assert.equal(f.markers[0].backend, "native");
});

test("ordinary install warns about retained old server instead of silently pulling", async () => {
  const f = fixture({ existing: true });
  await setup(f.options);
  assert.ok(f.messages.some((line) => line.includes("--upgrade --backup-to")));
  assert.ok(!command(f.calls, "pull") && !command(f.calls, "stop"));
});

test("explicit upgrade verifies external backup before CLI/image update and preserves volume", async () => {
  const dir = mkdtempSync(join(tmpdir(), "memory-upgrade-"));
  try {
    const f = fixture({ existing: true });
    await setup({ ...f.options, args: ["--upgrade", "--backup-to", join(dir, "backup.tar.gz")] });
    const cp = f.calls.findIndex((line) => line[1] === "cp");
    const verify = f.calls.findIndex((line) => line[0] === "tar");
    const cliUpgrade = f.calls.findIndex((line) => line[0] === "ai-memory" && line[1] === "upgrade");
    const stop = f.calls.findIndex((line) => line[1] === "stop");
    assert.ok(cp >= 0 && verify > cp && cliUpgrade > verify && stop > cliUpgrade);
    assert.ok(command(f.calls, "rename", "ai-memory"));
    assert.ok(command(f.calls, "run", "ai-memory-data:/data", "--restart", "unless-stopped"));
    assert.ok(!command(f.calls, "rm") && f.state.oldName);
    assert.equal(f.markers.at(-1).backend, "ai-memory");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("exact legacy kit container may be upgraded without losing its named volume", async () => {
  const dir = mkdtempSync(join(tmpdir(), "memory-legacy-"));
  try {
    const f = fixture({ existing: true, owner: "legacy" });
    await setup({ ...f.options, args: ["--upgrade", "--backup-to", join(dir, "backup.tar.gz")] });
    assert.ok(command(f.calls, "run", "ai-memory-data:/data", "dev-team-kit.ai-memory=1"));
    assert.equal(f.markers.at(-1).backend, "ai-memory");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("failed successor leaves prior backend marker untouched for explicit recovery", async () => {
  const dir = mkdtempSync(join(tmpdir(), "memory-unready-successor-"));
  try {
    const f = fixture({ existing: true, successorHealthy: false });
    await assert.rejects(setup({ ...f.options, args: ["--upgrade", "--backup-to", join(dir, "backup.tar.gz")] }),
      /server failed Docker healthcheck/);
    assert.ok(f.state.oldName);
    assert.deepEqual(f.markers, []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("unknown container and failed backup never stop or recreate existing service", async () => {
  const dir = mkdtempSync(join(tmpdir(), "memory-upgrade-denied-"));
  try {
    for (const change of [{ owner: false }, { user: "root" }, { backupValid: false }, { cliUpgrade: false }, { cliVersion: "ai-memory 2.0.0" }]) {
      const f = fixture({ existing: true, ...change });
      await assert.rejects(setup({ ...f.options, args: ["--upgrade", "--backup-to", join(dir, `backup-${Object.keys(change)[0]}.tar.gz`)] }));
      assert.ok(!command(f.calls, "stop") && !command(f.calls, "rename") && !command(f.calls, "run"));
      assert.deepEqual(f.markers, []);
      if (change.cliVersion) {
        assert.ok(f.messages.some((line) => line.includes("ai-memory-windows-x86_64.zip")));
        assert.ok(!command(f.calls, "exec") && !command(f.calls, "pull"));
      }
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("unready server and failed CLI registration never claim ai-memory active", async () => {
  for (const change of [{ healthy: false }, { hooks: false }, { cli: false }, { cliVersion: "ai-memory 2.0.0" }]) {
    const f = fixture(change);
    await assert.rejects(setup(f.options));
    assert.equal(f.markers.at(-1).backend, "native");
    assert.ok(!f.messages.some((line) => line.includes("server and CLI hooks/MCP ready")));
  }
});
