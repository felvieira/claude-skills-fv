/**
 * Guardas sob demanda (/careful, /freeze) e treino/teste do eval de triggers.
 *   node --test scripts/tests/guards-evals.test.mjs
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { GUARD_TTL_MS, guardsPath, isInside, readGuards, writeGuards } from "../../hooks/scripts/session-guards-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DISPATCHER = join(root, "hooks", "scripts", "runtime-dispatcher.mjs");
const CLI = join(root, "scripts", "session-guard-cli.mjs");
const EVAL = join(root, "scripts", "eval-triggers.mjs");

function repo() {
  const dir = mkdtempSync(join(tmpdir(), "guards-"));
  execFileSync("git", ["init", "-q"], { cwd: dir });
  return dir;
}

function pre(cwd, tool_name, tool_input, extraEnv = {}) {
  const res = spawnSync(process.execPath, [DISPATCHER, "PreToolUse"], {
    cwd,
    input: JSON.stringify({ session_id: "g1", cwd, tool_name, tool_input }),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, ...extraEnv },
  });
  assert.equal(res.status, 0, res.stderr);
  return JSON.parse(res.stdout || "{}");
}

const decision = (out) => out.hookSpecificOutput?.permissionDecision;

// ------------------------------------------------------------------ biblioteca
test("guards-lib: liga, desliga, expira em 8 h e apaga o arquivo quando fica vazio", () => {
  const cwd = repo();
  try {
    assert.deepEqual(readGuards(cwd), { careful: false, freeze: null });
    writeGuards(cwd, { careful: true, freeze: "src" });
    assert.deepEqual(readGuards(cwd), { careful: true, freeze: resolve(cwd, "src") });
    assert.ok(existsSync(guardsPath(cwd)));

    const later = Date.now() + GUARD_TTL_MS + 1000;
    assert.deepEqual(readGuards(cwd, later), { careful: false, freeze: null }, "expirou");

    writeGuards(cwd, { freeze: null });
    assert.equal(readGuards(cwd).freeze, null);
    assert.equal(readGuards(cwd).careful, true, "careful continua");
    writeGuards(cwd, { careful: false });
    assert.ok(!existsSync(guardsPath(cwd)), "sem guarda ativa o arquivo some (o dispatcher pula o hook)");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("guards-lib: isInside nao confunde pastas com prefixo igual e ignora maiuscula no Windows", () => {
  const base = resolve(tmpdir(), "r");
  assert.equal(isInside(join(base, "src"), join(base, "src", "a.ts")), true);
  assert.equal(isInside(join(base, "src"), join(base, "src")), true);
  assert.equal(isInside(join(base, "src"), join(base, "src-old", "a.ts")), false);
  assert.equal(isInside(join(base, "src"), join(base, "other", "a.ts")), false);
  assert.equal(isInside(join(base, "src"), join(base, "SRC", "a.ts"), "win32"), true);
  assert.equal(isInside(join(base, "src"), join(base, "SRC", "a.ts"), "linux"), false, "fora do Windows maiuscula importa");
});

// ------------------------------------------------------------------- /freeze
test("/freeze: Edit/Write fora da pasta sao negados, dentro passam, e sem estado o hook nem e spawnado", () => {
  const cwd = repo();
  const trace = join(cwd, "trace.jsonl");
  const env = { DEVKIT_DISPATCH_TRACE: trace };
  try {
    mkdirSync(join(cwd, "src"), { recursive: true });
    const last = () => JSON.parse(readFileSync(trace, "utf8").trim().split("\n").pop()).scripts;

    assert.equal(decision(pre(cwd, "Edit", { file_path: join(cwd, "lib", "x.ts") }, env)), undefined);
    assert.ok(!last().includes("session-guard.mjs"), "sem /freeze nao gasta um processo");

    const cli = spawnSync(process.execPath, [CLI, "freeze", "src"], { cwd, encoding: "utf8" });
    assert.equal(cli.status, 0, cli.stderr);
    assert.match(cli.stdout, /freeze : LIGADO/);

    const denied = pre(cwd, "Write", { file_path: join(cwd, "lib", "x.ts") }, env);
    assert.equal(decision(denied), "deny");
    assert.match(denied.hookSpecificOutput.permissionDecisionReason, /fora da pasta congelada/);
    assert.ok(last().includes("session-guard.mjs"));

    assert.equal(decision(pre(cwd, "Edit", { file_path: join(cwd, "src", "ok.ts") }, env)), undefined);
    assert.equal(decision(pre(cwd, "Edit", { file_path: join(cwd, "src-old", "no.ts") }, env)), "deny", "prefixo parecido nao libera");
    assert.equal(decision(pre(cwd, "Read", { file_path: join(cwd, "lib", "x.ts") }, env)), undefined, "leitura nunca e bloqueada");

    spawnSync(process.execPath, [CLI, "freeze", "off"], { cwd });
    assert.equal(decision(pre(cwd, "Write", { file_path: join(cwd, "lib", "x.ts") }, env)), undefined);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("/freeze: pasta inexistente e recusada", () => {
  const cwd = repo();
  try {
    const res = spawnSync(process.execPath, [CLI, "freeze", "nao-existe"], { cwd, encoding: "utf8" });
    assert.equal(res.status, 1);
    assert.ok(!existsSync(guardsPath(cwd)));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------ /careful
test("/careful: liga o permission-ladder-guard sob demanda (gated pede, closed nega) e off desliga", () => {
  const cwd = repo();
  try {
    // padrao do kit: guard desligado por config => nada acontece
    assert.equal(decision(pre(cwd, "Bash", { command: "git push --force origin main" })), undefined);

    spawnSync(process.execPath, [CLI, "careful", "on"], { cwd });
    assert.equal(decision(pre(cwd, "Bash", { command: "git push --force origin main" })), "ask");
    assert.equal(decision(pre(cwd, "Bash", { command: "psql $PROD_URL -c 'DROP TABLE users'" })), "deny");
    assert.equal(decision(pre(cwd, "Bash", { command: "git status" })), undefined, "comando comum passa");
    assert.equal(decision(pre(cwd, "Bash", { command: "git push --force origin main # permission-ladder: allow" })), undefined, "escape da lane gated");

    spawnSync(process.execPath, [CLI, "careful", "off"], { cwd });
    assert.equal(decision(pre(cwd, "Bash", { command: "git push --force origin main" })), undefined);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------ treino / teste
const run = (...a) => spawnSync(process.execPath, [EVAL, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

test("eval-triggers --split: ~30% vai para teste, estavel entre execucoes, contagem fecha", () => {
  const a = JSON.parse(run("--split", "--json").stdout);
  const b = JSON.parse(run("--split", "--json").stdout);
  assert.deepEqual(a.summary.split, b.summary.split, "divisao deterministica");
  const { train_n, test_n } = a.summary.split;
  const total = a.results.reduce((n, r) => n + r.should.total + r.shouldnt.total, 0);
  assert.equal(train_n + test_n, total);
  const share = test_n / total;
  assert.ok(share > 0.2 && share < 0.4, `teste = ${(share * 100).toFixed(1)}% (esperado ~30%)`);
});

test("eval-triggers --compare: KEEP, REVERT por regressao e REVERT por overfitting (so o treino subiu)", () => {
  const dir = mkdtempSync(join(tmpdir(), "evalcmp-"));
  try {
    const now = JSON.parse(run("--split", "--json").stdout);
    const baseWith = (dTrain, dTest) => {
      const base = structuredClone(now);
      base.summary.split.train_acc = Math.round((now.summary.split.train_acc - dTrain) * 10) / 10;
      base.summary.split.test_acc = Math.round((now.summary.split.test_acc - dTest) * 10) / 10;
      const file = join(dir, `base-${dTrain}-${dTest}.json`);
      writeFileSync(file, JSON.stringify(base));
      return file;
    };
    const verdict = (file, ...extra) => {
      const out = JSON.parse(run("--compare", file, "--json", ...extra).stdout).summary.compare;
      return out;
    };

    assert.equal(verdict(baseWith(0, 0)).verdict, "NO-CHANGE");
    assert.equal(verdict(baseWith(3, 3)).verdict, "KEEP"); // agora esta 3 pp acima nos dois
    assert.equal(verdict(baseWith(3, 0)).verdict, "REVERT"); // so o treino subiu
    assert.match(verdict(baseWith(3, 0)).why, /overfitting/);
    assert.equal(verdict(baseWith(-3, 3)).verdict, "REVERT"); // treino caiu em relacao ao baseline
    const strict = run("--compare", baseWith(3, 0), "--strict");
    assert.equal(strict.status, 1, "--strict falha no REVERT");

    const noSplit = join(dir, "sem-split.json");
    writeFileSync(noSplit, JSON.stringify({ summary: {} }));
    assert.equal(run("--compare", noSplit).status, 2, "baseline sem treino/teste e erro de uso");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------ multiplataforma (Grok, Codex)
function guarded(cwd, payload, env = {}, profile = "guards") {
  const res = spawnSync(process.execPath, [DISPATCHER, "PreToolUse", profile], {
    cwd,
    input: JSON.stringify({ cwd, ...payload }),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, ...env },
  });
  assert.equal(res.status, 0, res.stderr);
  return JSON.parse(res.stdout || "{}");
}

test("grok: payload camelCase (toolName/toolInput) e ferramentas write/search_replace/run_terminal_command", () => {
  const cwd = repo();
  try {
    mkdirSync(join(cwd, "src"), { recursive: true });
    spawnSync(process.execPath, [CLI, "freeze", "src"], { cwd });
    const grok = (toolName, toolInput) => guarded(cwd, { hookEventName: "pre_tool_use", sessionId: "gk", toolName, toolInput });

    assert.equal(decision(grok("write", { file_path: join(cwd, "out.txt"), contents: "x" })), "deny");
    assert.equal(decision(grok("search_replace", { file_path: join(cwd, "out.txt"), old_string: "a", new_string: "b" })), "deny");
    assert.equal(decision(grok("write", { file_path: join(cwd, "src", "ok.txt"), contents: "x" })), undefined);
    assert.equal(decision(grok("read_file", { target_file: join(cwd, "out.txt") })), undefined);

    spawnSync(process.execPath, [CLI, "careful", "on"], { cwd });
    assert.equal(decision(grok("run_terminal_command", { command: "echo DROP TABLE users" })), "deny");
    assert.equal(decision(grok("run_terminal_command", { command: "git status" })), undefined);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("codex: apply_patch (texto cru e embutido em JS do modo code) respeita o /freeze", () => {
  const cwd = repo();
  try {
    mkdirSync(join(cwd, "src"), { recursive: true });
    spawnSync(process.execPath, [CLI, "freeze", "src"], { cwd });
    const codex = (tool_input) => guarded(cwd, { session_id: "cx", tool_name: "apply_patch", tool_input }, {}, "guards");

    const raw = (file) => `*** Begin Patch\n*** Add File: ${file}\n+oi\n*** End Patch`;
    assert.equal(decision(codex(raw("out.txt"))), "deny", "caminho relativo fora de src");
    assert.equal(decision(codex(raw("src/ok.txt"))), undefined);
    assert.equal(decision(codex({ input: raw(join(cwd, "out.txt").replace(/\\/g, "/")) })), "deny", "absoluto com /");

    // modo code: o patch vem como string JS numa linha so, com \n literal
    const js = (file) => `const r = await tools.apply_patch("*** Begin Patch\\n*** Add File: ${file}\\n+oi\\n*** End Patch"); text(r)`;
    assert.equal(decision(codex({ code: js("out.txt") })), "deny");
    assert.equal(decision(codex({ code: js("src/ok.txt") })), undefined);

    // varios arquivos no mesmo patch: um fora basta para negar
    const multi = `*** Begin Patch\n*** Update File: src/a.ts\n@@\n-a\n+b\n*** Update File: lib/b.ts\n@@\n-a\n+b\n*** End Patch`;
    assert.equal(decision(codex(multi)), "deny");

    // caminho do Windows escapado em JS ("D:\\\\x")
    const win = `await tools.apply_patch("*** Begin Patch\\n*** Add File: ${join(cwd, "out.txt").replace(/\\/g, "\\\\")}\\n+oi\\n*** End Patch")`;
    assert.equal(decision(codex({ code: win })), "deny");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("perfil guards: so session-guard e permission-ladder-guard, e nada roda sem estado ligado", () => {
  const cwd = repo();
  const trace = join(cwd, "trace.jsonl");
  try {
    guarded(cwd, { session_id: "g", tool_name: "Bash", tool_input: { command: "ls" } }, { DEVKIT_DISPATCH_TRACE: trace });
    guarded(cwd, { session_id: "g", tool_name: "Write", tool_input: { file_path: join(cwd, "x") } }, { DEVKIT_DISPATCH_TRACE: trace });
    const lines = readFileSync(trace, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.deepEqual(lines[0].scripts, ["permission-ladder-guard.mjs"]); // Bash: so a guarda de comandos
    assert.deepEqual(lines[1].scripts, [], "Write sem /freeze: nenhum processo"); // session-guard pulado pelo dispatcher
    assert.ok(!lines.flatMap((l) => l.scripts).some((s) => /pre-tool-enforcer|design-anchor/.test(s)), "nenhum gate do kit completo");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("install-memory-hooks --guards: registra PreToolUse no perfil guards (Grok e bloco do Codex)", () => {
  const home = mkdtempSync(join(tmpdir(), "guards-home-"));
  const script = join(root, "scripts", "install-memory-hooks.mjs");
  try {
    const withGuards = spawnSync(process.execPath, [script, "--runtime", "grok", "--guards", "--apply", "--home", home], { encoding: "utf8" });
    assert.equal(withGuards.status, 0, withGuards.stderr);
    const cfg = JSON.parse(readFileSync(join(home, ".grok", "hooks", "dev-team-kit-memory.json"), "utf8"));
    assert.match(cfg.hooks.PreToolUse[0].hooks[0].command, / PreToolUse guards$/);

    spawnSync(process.execPath, [script, "--runtime", "grok", "--apply", "--home", home]);
    const plain = JSON.parse(readFileSync(join(home, ".grok", "hooks", "dev-team-kit-memory.json"), "utf8"));
    assert.ok(!plain.hooks.PreToolUse, "sem --guards nao registra PreToolUse");

    const codex = spawnSync(process.execPath, [script, "--runtime", "codex", "--guards"], { encoding: "utf8" });
    assert.match(codex.stdout, /PreToolUse guards/);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
