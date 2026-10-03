/**
 * Testes dos hooks de memoria: redacao por formato, frontmatter, frescor via
 * git, pacote de recuperacao pos-compactacao (PreCompact -> entrega unica) e
 * estados das learned-skills no keyword-detector.
 *
 *   node --test scripts/tests/memory-hooks.test.mjs
 *
 * Segredos de teste sao montados em tempo de execucao: nenhum literal com cara
 * de chave entra no repo (e o push protection do GitHub nao reclama).
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { filesChangedSince, gitSnapshot, parseFrontmatter, redactSecrets } from "../../hooks/scripts/memory-lib.mjs";
import { buildPacket, freshnessVerdict, hasContent, mergeKeep, MAX_PACKET_CHARS, renderPacket } from "../../hooks/scripts/compaction-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DISPATCHER = join(root, "hooks", "scripts", "runtime-dispatcher.mjs");
const KEYWORD = join(root, "hooks", "scripts", "keyword-detector.mjs");

const fake = {
  google: () => "AIza" + "Ab1_".repeat(9).slice(0, 35),
  openrouter: () => "sk-or-v1-" + "a1".repeat(20),
  aws: () => "AKIA" + "Q".repeat(16),
  jwt: () => "eyJ" + "a".repeat(10) + ".eyJ" + "b".repeat(10) + "." + "c".repeat(10),
};

function tmp(prefix) {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

function git(cwd, ...args) {
  return execFileSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...args], { cwd, encoding: "utf8" }).trim();
}

function initRepo() {
  const dir = tmp("memhooks-git");
  git(dir, "init", "-q");
  writeFileSync(join(dir, "a.txt"), "1");
  writeFileSync(join(dir, "b.txt"), "1");
  git(dir, "add", ".");
  git(dir, "commit", "-q", "-m", "c1");
  return dir;
}

function runHook(script, input, cwd, args = []) {
  const res = spawnSync(process.execPath, [script, ...args], {
    cwd,
    input: JSON.stringify(input),
    encoding: "utf8",
    timeout: 20000,
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root },
  });
  assert.equal(res.status, 0, res.stderr);
  return res.stdout.trim() ? JSON.parse(res.stdout) : {};
}

// ---------------------------------------------------------------- redacao

test("redacao reconhece o formato do valor e preserva o texto em volta", () => {
  const cases = [
    [fake.google(), "google-api-key"],
    [fake.openrouter(), "openrouter-key"],
    [fake.aws(), "aws-access-key"],
    [fake.jwt(), "jwt"],
  ];
  for (const [secret, kind] of cases) {
    const { text, hits } = redactSecrets(`antes ${secret} depois`);
    assert.ok(text.includes(`[redacted:${kind}]`), kind);
    assert.ok(!text.includes(secret), `${kind} vazou`);
    assert.ok(text.startsWith("antes ") && text.endsWith(" depois"));
    assert.equal(hits[kind], 1);
  }
});

test("redacao pega atribuicao, bearer, credencial em URL e bloco PEM", () => {
  const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----";
  const input = [
    `OPENAI_API_KEY=${"abcdefgh12345678"}`,
    `{"password": "${"hunter2hunter2"}"}`,
    `Authorization: Bearer ${"x".repeat(30)}`,
    `postgres://user:${"s3cretpass"}@db.local/app`,
    pem,
  ].join("\n");
  const { text, hits } = redactSecrets(input);
  assert.ok(!/abcdefgh12345678|hunter2hunter2|s3cretpass|MIIabc/.test(text));
  assert.ok(!text.includes("x".repeat(30)));
  for (const kind of ["assigned-secret", "bearer-token", "url-credentials", "pem-private-key"]) {
    assert.ok(hits[kind] >= 1, kind);
  }
  assert.ok(text.includes("postgres://[redacted:url-credentials]@db.local/app"));
});

test("redacao nao tem falso positivo em codigo e prosa comuns, e e idempotente", () => {
  const benign = [
    "token: string",
    "const password = process.env.DB_PASSWORD;",
    "api_key=<sua-chave-aqui>",
    "o token expira em 1h; veja a secao de refresh",
    "secret: ${SECRET_FROM_VAULT}",
  ].join("\n");
  assert.equal(redactSecrets(benign).text, benign);

  const once = redactSecrets(`k=${fake.google()}`).text;
  assert.equal(redactSecrets(once).text, once);
});

// ------------------------------------------------------------ frontmatter

test("frontmatter le chave, aspas e arrays", () => {
  const { data, body } = parseFrontmatter(
    '---\nname: x\ntriggers: ["a b", \'c\']\nfiles: [src/a.ts, src/b/]\nstate: rejected\n---\ncorpo\n',
  );
  assert.equal(data.name, "x");
  assert.deepEqual(data.triggers, ["a b", "c"]);
  assert.deepEqual(data.files, ["src/a.ts", "src/b/"]);
  assert.equal(data.state, "rejected");
  assert.equal(body.trim(), "corpo");
  assert.deepEqual(parseFrontmatter("sem frontmatter").data, {});
});

// ------------------------------------------------------------------ frescor

test("frescor: so aponta o que mudou, calla quando nao da para saber", () => {
  const repo = initRepo();
  try {
    const sha = git(repo, "rev-parse", "HEAD");
    assert.deepEqual(filesChangedSince(sha, ["a.txt", "b.txt"], repo), []);

    writeFileSync(join(repo, "a.txt"), "2");
    git(repo, "commit", "-q", "-am", "c2");
    assert.deepEqual(filesChangedSince(sha, ["a.txt", "b.txt"], repo), ["a.txt"]);

    writeFileSync(join(repo, "b.txt"), "dirty"); // mudanca nao commitada tambem conta
    assert.deepEqual(filesChangedSince(sha, ["a.txt", "b.txt"], repo).sort(), ["a.txt", "b.txt"]);

    assert.equal(filesChangedSince("deadbeefdeadbeef", ["a.txt"], repo), null); // commit inexistente
    assert.equal(filesChangedSince("nao-e-sha", ["a.txt"], repo), null);
    assert.equal(filesChangedSince(sha, ["a.txt"], tmp("memhooks-nogit")), null); // sem git

    const snap = gitSnapshot(repo);
    assert.ok(snap.available && snap.dirty.includes("b.txt"));
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

// -------------------------------------------------------------- compactacao

function transcript(records) {
  return records.map((r) => JSON.stringify(r)).join("\n");
}
const user = (text) => ({ type: "user", message: { role: "user", content: text } });
const assistant = (content) => ({ type: "assistant", message: { role: "assistant", content } });

function sampleTranscript(extra = []) {
  return transcript([
    user("Quero que voce implemente o pacote de recuperacao no PreCompact, com redacao de segredos e testes completos."),
    assistant([{ type: "text", text: `Vou comecar.\n\nGap: falta ligar o dispatcher\nChave que colei: ${fake.google()}` }]),
    assistant([{ type: "tool_use", id: "t1", name: "Bash", input: { command: "node scripts/check-consistency.mjs" } }]),
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "Consistency check passed" }] } },
    assistant([{ type: "tool_use", id: "t2", name: "Bash", input: { command: "npm test" } }]),
    { type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t2", content: "Exit code 1\nFAIL" }] } },
    assistant([{ type: "tool_use", id: "t3", name: "Bash", input: { command: "npm run lint" } }]),
    user("continue"),
    assistant([{ type: "text", text: "Dispatcher ligado e testes verdes." }]),
    ...extra,
  ]);
}

test("pacote: objetivo, pendencia rotulada, verificacao com resultado, segredo redigido", () => {
  const packet = buildPacket({ transcriptText: sampleTranscript(), sessionId: "s-1", snapshot: { available: false } });
  assert.match(packet.objective, /pacote de recuperacao no PreCompact/); // "continue" nao vira objetivo
  assert.deepEqual(packet.keep.map((k) => k.text), ["falta ligar o dispatcher"]);
  assert.deepEqual(packet.verification, [
    { cmd: "node scripts/check-consistency.mjs", status: "passed" },
    { cmd: "npm test", status: "failed" },
    { cmd: "npm run lint", status: "unknown" }, // sem resultado registrado: nao inventa
  ]);
  const serial = JSON.stringify(packet);
  assert.ok(!serial.includes(fake.google()), "chave vazou para o pacote");
});

test("pacote: 'Gap' no meio de frase nao conta como pendencia", () => {
  const t = transcript([user("x".repeat(80)), assistant([{ type: "text", text: "Existe um gap: de cobertura que ja resolvi." }])]);
  const packet = buildPacket({ transcriptText: t, sessionId: "s-2", snapshot: { available: false } });
  assert.deepEqual(packet.keep, []);
});

test("keep-until-closed: envelhece e some depois de 2 compactacoes sem reaparecer", () => {
  let keep = mergeKeep([], ["A"]);
  keep = mergeKeep(keep, []);
  assert.deepEqual(keep, [{ text: "A", age: 1 }]);
  keep = mergeKeep(keep, []);
  assert.deepEqual(keep, [{ text: "A", age: 2 }]);
  keep = mergeKeep(keep, []);
  assert.deepEqual(keep, []);
  assert.deepEqual(mergeKeep([{ text: "A", age: 2 }], ["A"]), [{ text: "A", age: 0 }]); // reaparecendo, zera
});

test("render: cabecalho nao confiavel, veredito do git e limite de 4 KiB", () => {
  const long = "palavra ".repeat(2000);
  const packet = buildPacket({
    transcriptText: transcript([user(long), assistant([{ type: "text", text: long }])]),
    sessionId: "s-3",
    snapshot: { available: true, head: "a".repeat(40), branch: "main", fingerprint: "f1" },
  });
  packet.keep = Array.from({ length: 12 }, (_, i) => ({ text: `pendencia ${i} ${"y".repeat(150)}`, age: 0 }));
  const out = renderPacket(packet, { available: true, head: "a".repeat(40), fingerprint: "f1" });
  assert.ok(out.length <= MAX_PACKET_CHARS);
  assert.match(out, /NAO CONFIAVEIS/);
  assert.match(out, /inalterado desde a captura/);
  assert.match(out, /Manter ate fechar/);

  assert.match(freshnessVerdict(packet.git, { available: true, head: "b".repeat(40), fingerprint: "f2" }), /^MUDOU/);
  assert.match(freshnessVerdict(packet.git, { available: true, head: "a".repeat(40), fingerprint: "f2" }), /arvore de trabalho mudou/);
  assert.match(freshnessVerdict({ available: false }, { available: true }), /indisponivel/);
});

test("dispatcher: PreCompact grava o pacote e o proximo prompt o recebe uma unica vez", () => {
  const cwd = tmp("memhooks-disp");
  try {
    const tpath = join(cwd, "t.jsonl");
    writeFileSync(tpath, sampleTranscript());
    const base = { session_id: "sess-abc", cwd, transcript_path: tpath };

    runHook(DISPATCHER, { ...base, hook_event_name: "PreCompact", trigger: "auto" }, cwd, ["PreCompact"]);
    const file = join(cwd, ".auto", "compaction", "sess-abc.json");
    assert.ok(existsSync(file), "pacote nao foi gravado");
    assert.ok(!readFileSync(file, "utf8").includes(fake.google()));

    const first = runHook(DISPATCHER, { ...base, hook_event_name: "UserPromptSubmit", prompt: "oi" }, cwd, ["UserPromptSubmit"]);
    assert.match(first.hookSpecificOutput?.additionalContext ?? "", /Recuperacao pos-compactacao/);
    assert.ok(!existsSync(file), "pacote deveria ter sido consumido");

    const second = runHook(DISPATCHER, { ...base, hook_event_name: "UserPromptSubmit", prompt: "oi" }, cwd, ["UserPromptSubmit"]);
    assert.ok(!(second.hookSpecificOutput?.additionalContext ?? "").includes("Recuperacao pos-compactacao"));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

// ----------------------------------------------------- Codex e desconhecidos

const cx = (payload) => ({ timestamp: "2026-10-03T00:00:00Z", type: "response_item", payload });
const cxMsg = (role, type, text) => cx({ type: "message", role, content: [{ type, text }] });

function codexTranscript() {
  return transcript([
    { type: "session_meta", payload: { id: "s", cwd: "x" } },
    cxMsg("developer", "input_text", "instrucoes enormes do sistema que nao sao fala da pessoa"),
    cxMsg("user", "input_text", "<environment_context>\n<cwd>/repo</cwd>\n</environment_context>"),
    cxMsg("user", "input_text", "# AGENTS.md instructions for /repo\n\n<INSTRUCTIONS>regras</INSTRUCTIONS>"),
    cxMsg("user", "input_text", "Implemente o pacote de recuperacao tambem para o Codex, com testes e sem quebrar o Claude."),
    cxMsg("assistant", "output_text", `Plano pronto.\n\nPendente: ligar o PreCompact no .codex/hooks.json\nchave ${fake.openrouter()}`),
    cx({ type: "function_call", name: "shell_command", call_id: "c1", arguments: JSON.stringify({ command: "npm test", workdir: "/repo" }) }),
    cx({ type: "function_call_output", call_id: "c1", output: "Exit code: 1\nWall time: 2s\nOutput:\nFAIL" }),
    cx({ type: "function_call", name: "shell", call_id: "c2", arguments: JSON.stringify({ command: ["bash", "-lc", "node scripts/check-consistency.mjs"] }) }),
    cx({ type: "function_call_output", call_id: "c2", output: JSON.stringify({ output: "ok", metadata: { exit_code: 0, duration_seconds: 1 } }) }),
    cx({ type: "function_call", name: "shell_command", call_id: "c3", arguments: JSON.stringify({ command: "npm run lint" }) }),
    cx({ type: "function_call_output", call_id: "c3", output: "tudo certo, sem codigo de saida registrado" }),
    cx({ type: "function_call", name: "shell_command", call_id: "c4", arguments: JSON.stringify({ command: "pytest -q" }) }),
    cxMsg("assistant", "output_text", "Hooks do Codex ligados."),
  ]);
}

test("codex: adaptador le fala, pendencia e verificacoes; ignora contexto injetado e segredo", () => {
  const packet = buildPacket({ transcriptText: codexTranscript(), sessionId: "cx-1", snapshot: { available: false } });
  assert.equal(packet.source_format, "codex");
  assert.match(packet.objective, /pacote de recuperacao tambem para o Codex/); // nem developer nem <environment_context>
  assert.deepEqual(packet.keep.map((k) => k.text), ["ligar o PreCompact no .codex/hooks.json"]);
  assert.deepEqual(packet.verification, [
    { cmd: "npm test", status: "failed" },
    { cmd: "node scripts/check-consistency.mjs", status: "passed" }, // argv de shell -> ultimo elemento
    { cmd: "npm run lint", status: "unknown" }, // saida sem codigo: nao inventa "passou"
    { cmd: "pytest -q", status: "unknown" }, // sem saida registrada
  ]);
  assert.ok(!JSON.stringify(packet).includes(fake.openrouter()));
});

test("formato desconhecido: nenhum pacote util, e o dispatcher nao grava arquivo", () => {
  const unknown = transcript([{ foo: 1 }, { bar: "baz", items: [1, 2] }]);
  const packet = buildPacket({ transcriptText: unknown, sessionId: "u-1", snapshot: { available: false } });
  assert.equal(packet.source_format, "unknown");
  assert.equal(hasContent(packet), false);

  const cwd = tmp("memhooks-unk");
  try {
    const tpath = join(cwd, "t.jsonl");
    writeFileSync(tpath, unknown);
    runHook(DISPATCHER, { session_id: "unk-1", cwd, transcript_path: tpath, hook_event_name: "PreCompact" }, cwd, ["PreCompact"]);
    assert.ok(!existsSync(join(cwd, ".auto", "compaction", "unk-1.json")));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("codex: payload do dispatcher (PreCompact -> UserPromptSubmit) entrega o pacote uma vez", () => {
  const cwd = tmp("memhooks-cxdisp");
  try {
    const tpath = join(cwd, "rollout.jsonl");
    writeFileSync(tpath, codexTranscript());
    const base = { session_id: "cx-sess", cwd, transcript_path: tpath };
    runHook(DISPATCHER, { ...base, hook_event_name: "PreCompact" }, cwd, ["PreCompact"]);
    const first = runHook(DISPATCHER, { ...base, hook_event_name: "UserPromptSubmit", prompt: "segue" }, cwd, ["UserPromptSubmit"]);
    const ctx = first.hookSpecificOutput?.additionalContext ?? "";
    assert.match(ctx, /Recuperacao pos-compactacao/);
    assert.match(ctx, /\[FALHOU\] npm test/);
    assert.match(ctx, /\[resultado nao registrado\] pytest -q/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("dispatcher: PreCompact sem transcript ou com id perigoso falha aberto e nao escreve fora de .auto", () => {
  const cwd = tmp("memhooks-bad");
  try {
    const out = runHook(DISPATCHER, { session_id: "../../evil", cwd, hook_event_name: "PreCompact" }, cwd, ["PreCompact"]);
    assert.deepEqual(out, {}); // PreCompact responde {} (valido em todos os hosts)
    assert.ok(!existsSync(join(cwd, "..", "..", "evil.json")));
    assert.ok(!existsSync(join(cwd, ".auto", "compaction")));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

// -------------------------------------------------- learned-skills (estados)

function learned(dir, name, fm, body = "## Fix\n- passo concreto um\n") {
  mkdirSync(join(dir, ".bot", "learned-skills"), { recursive: true });
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${v}`);
  writeFileSync(join(dir, ".bot", "learned-skills", `${name}.md`), `---\nname: ${name}\n${lines.join("\n")}\n---\n${body}`);
}

function detect(cwd, prompt) {
  const out = runHook(KEYWORD, { prompt, hook_event_name: "UserPromptSubmit" }, cwd);
  return out.hookSpecificOutput?.additionalContext ?? "";
}

test("learned-skill salva com 'trigger:' (singular) tambem e injetada", () => {
  const cwd = tmp("memhooks-kd");
  try {
    learned(cwd, "cache-fantasma", { trigger: '["cache fantasma"]', created: "2026-10-01", score: "0.70", last_used: new Date().toISOString().slice(0, 10), uses: "0" });
    assert.match(detect(cwd, "tenho um cache fantasma aqui"), /LearnedSkill matched: cache-fantasma/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("estado rejected: mostra o motivo, nao ganha boost e nao decai ate arquivar", () => {
  const cwd = tmp("memhooks-rej");
  try {
    const old = "2025-01-01"; // muito antigo: uma skill 'accepted' seria arquivada
    learned(cwd, "usar-redis", {
      triggers: '["usar redis"]', created: old, score: "0.40", last_used: old, uses: "0",
      state: "rejected", reason: "latencia de rede dobrou o p95 no teste de carga",
    });
    const ctx = detect(cwd, "vamos usar redis para sessao");
    assert.match(ctx, /REJEITADA/);
    assert.match(ctx, /latencia de rede dobrou o p95/);
    const file = readFileSync(join(cwd, ".bot", "learned-skills", "usar-redis.md"), "utf8");
    assert.match(file, /^score: 0\.40$/m, "rejected nao deve ganhar boost");
    assert.ok(existsSync(join(cwd, ".bot", "learned-skills", "usar-redis.md")), "rejected nao deve ser arquivada");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("estado accepted antigo e de score baixo continua sendo arquivado (comportamento anterior)", () => {
  const cwd = tmp("memhooks-old");
  try {
    learned(cwd, "velha", { triggers: '["velha"]', created: "2025-01-01", score: "0.40", last_used: "2025-01-01", uses: "0" });
    assert.equal(detect(cwd, "falando da velha"), "");
    assert.ok(!existsSync(join(cwd, ".bot", "learned-skills", "velha.md")));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("frescor na injecao: avisa quando arquivo citado mudou desde o commit", () => {
  const repo = initRepo();
  try {
    const sha = git(repo, "rev-parse", "HEAD");
    const today = new Date().toISOString().slice(0, 10);
    learned(repo, "fix-a", { triggers: '["bug do a"]', created: today, score: "0.80", last_used: today, uses: "0", files: "[a.txt, b.txt]", commit: sha });

    assert.ok(!/Frescor/.test(detect(repo, "bug do a de novo")), "nada mudou: deve calar");

    writeFileSync(join(repo, "a.txt"), "2");
    git(repo, "commit", "-q", "-am", "c2");
    rmSync(join(repo, ".bot", ".hook-session.json"), { force: true }); // novo prompt, mesma skill
    const ctx = detect(repo, "bug do a de novo");
    assert.match(ctx, /Frescor: 1 arquivo\(s\) citado\(s\) mudaram desde/);
    assert.match(ctx, /a\.txt/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("filtro informativo: 'acho que e' nao e confundido com 'o que e'", () => {
  const cwd = tmp("memhooks-info");
  try {
    const today = new Date().toISOString().slice(0, 10);
    learned(cwd, "tw", { triggers: '["tailwind"]', created: today, score: "0.80", last_used: today, uses: "0" });
    assert.match(detect(cwd, "acho que e o tailwind"), /LearnedSkill matched: tw/);
    rmSync(join(cwd, ".bot", ".hook-session.json"), { force: true });
    assert.equal(detect(cwd, "o que e tailwind?"), ""); // pergunta informativa de verdade continua calada
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

// ------------------------------------------- ponte learned-skills -> ai-memory

test("ponte: planeja paginas por estado, redige segredo e monta o comando docker (sem executar nada)", async () => {
  const { planPages, buildCommand } = await import("../../scripts/learned-skills-to-ai-memory.mjs");
  const cwd = tmp("memhooks-bridge");
  try {
    const today = new Date().toISOString().slice(0, 10);
    learned(cwd, "usar-redis", { triggers: '["usar redis", "cache de sessao"]', created: today, score: "0.5", last_used: today, uses: "0", state: "rejected", reason: "p95 dobrou" },
      `## Contexto\nfoi revertido. chave ${fake.openrouter()}\n`);
    learned(cwd, "fix-jwt", { trigger: '["jwt"]', created: today, score: "0.8", last_used: today, uses: "0" });

    const pages = planPages(join(cwd, ".bot", "learned-skills"));
    assert.deepEqual(pages.map((p) => [p.path, p.kind, p.pinned]), [
      ["learned-skills/fix-jwt.md", "gotcha", false],
      ["learned-skills/usar-redis.md", "decision", true],
    ]);
    const redis = pages[1];
    assert.ok(redis.tags.includes("state-rejected") && redis.tags.includes("learned-skill"));
    assert.match(redis.body, /estado: \*\*rejected\*\* — p95 dobrou/);
    assert.ok(!redis.body.includes(fake.openrouter()), "segredo foi para a pagina");
    assert.ok(pages[0].tags.includes("jwt"), "grafia 'trigger:' tambem vira tag");

    const docker = buildCommand(redis, { transport: "docker", container: "ai-memory", project: "meu-app" });
    assert.equal(docker.cmd, "docker");
    assert.deepEqual(docker.args.slice(0, 5), ["exec", "-i", "ai-memory", "ai-memory", "write-page"]);
    assert.ok(docker.args.includes("--pinned") && docker.args.includes("--project"));
    assert.deepEqual(docker.args.slice(docker.args.indexOf("--body"), docker.args.indexOf("--body") + 2), ["--body", "-"]);

    const native = buildCommand(redis, { transport: "native", bin: "ai-memory" });
    assert.equal(native.cmd, "ai-memory");

    // dry-run via CLI nao pode executar nada nem falhar
    const dry = spawnSync(process.execPath, [join(root, "scripts", "learned-skills-to-ai-memory.mjs"), "--dir", join(cwd, ".bot", "learned-skills")], { encoding: "utf8" });
    assert.equal(dry.status, 0);
    assert.match(dry.stdout, /Nada foi gravado/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

// ------------------------------------------------- auditor de transcritos

const SCAN = join(root, "scripts", "memory-secrets-scan.mjs");

test("memory-secrets-scan: lista sessao, tipo e contagem sem imprimir o valor; --scrub limpa e guarda copia", async () => {
  const { utimesSync } = await import("node:fs");
  const dir = tmp("memhooks-scan");
  try {
    const secret = fake.google();
    const file = join(dir, "sessao.jsonl");
    const lines = [
      JSON.stringify({ type: "user", message: { role: "user", content: `usa essa ${secret}` } }),
      JSON.stringify({ type: "user", message: { role: "user", content: "sem nada sensivel" } }),
    ];
    writeFileSync(file, lines.join("\n"));
    const old = new Date(Date.now() - 3600 * 1000);
    utimesSync(file, old, old);

    const run = (...extra) => spawnSync(process.execPath, [SCAN, "--root", dir, "--json", ...extra], { encoding: "utf8" });

    const scan = run();
    assert.equal(scan.status, 0);
    assert.ok(!scan.stdout.includes(secret), "o valor vazou na saida");
    const report = JSON.parse(scan.stdout);
    assert.equal(report.sessions_with_secrets, 1);
    assert.equal(report.files[0].kinds["google-api-key"], 1);
    assert.ok(readFileSync(file, "utf8").includes(secret), "scan sem --scrub nao pode alterar o arquivo");

    run("--scrub");
    const after = readFileSync(file, "utf8");
    assert.ok(!after.includes(secret) && after.includes("[redacted:google-api-key]"));
    assert.ok(existsSync(`${file}.pre-scrub`), "falta a copia original");
    after.split("\n").filter(Boolean).forEach((l) => JSON.parse(l)); // continua JSONL valido
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("controle negativo: prompt sem relacao com nenhuma skill injeta zero", () => {
  const cwd = tmp("memhooks-neg");
  try {
    learned(cwd, "so-sobre-redis", { triggers: '["usar redis"]', created: "2026-10-01", score: "0.70", last_used: new Date().toISOString().slice(0, 10), uses: "0" });
    assert.ok(!/LearnedSkill/.test(detect(cwd, "renomeia essa variavel para camelCase")));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
