/**
 * Helpers compartilhados pelos hooks de memoria: redacao de segredos por
 * FORMATO do valor, frontmatter minimo e checagem de frescor contra o git.
 * Node puro, sem dependencias. Nenhuma funcao aqui lanca: na duvida, devolve
 * "nao sei" (null / available:false) para o chamador ficar em silencio.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Redacao
// ---------------------------------------------------------------------------

const SKIP_ASSIGNED_VALUE = /^(?:\[redacted|\$|<|\{|%|process\.|os\.|undefined$|required$|optional$|string$|null$|true$|false$|none$)/i;

// Ordem importa: formatos especificos antes dos genericos, para o rotulo sair certo.
const SHAPE_RULES = [
  ["pem-private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g],
  ["jwt", /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g],
  ["aws-access-key", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["anthropic-key", /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ["openrouter-key", /\bsk-or-v1-[A-Za-z0-9]{32,}/g],
  ["openai-key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g],
  ["github-token", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/g],
  ["slack-token", /\bxox[abprs]-[A-Za-z0-9-]{10,}/g],
  ["stripe-key", /\b[rs]k_live_[A-Za-z0-9]{16,}/g],
  ["bearer-token", /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/g],
];

const URL_CREDENTIALS = /(\b[a-z][a-z0-9+.-]*:\/\/)[^\s:@/]+:[^\s@/]+@/gi;
const ASSIGNED_SECRET =
  /\b((?:[A-Z0-9_]*(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD))|(?:api[_-]?key|secret|token|password|passwd))(["']?\s*[=:]\s*)(["']?)([^\s"',;]{8,})\3/gi;

/**
 * Troca cada segredo reconhecido por `[redacted:<tipo>]` e mantem o texto em
 * volta. Devolve tambem a contagem por tipo — nunca o valor.
 * Reconhecimento por formato nao e deteccao de segredo: formato desconhecido passa.
 */
export function redactSecrets(input) {
  const hits = {};
  const bump = (kind) => { hits[kind] = (hits[kind] || 0) + 1; };
  let text = String(input ?? "");

  for (const [kind, re] of SHAPE_RULES) {
    text = text.replace(re, () => { bump(kind); return `[redacted:${kind}]`; });
  }
  text = text.replace(URL_CREDENTIALS, (_m, scheme) => { bump("url-credentials"); return `${scheme}[redacted:url-credentials]@`; });
  text = text.replace(ASSIGNED_SECRET, (match, name, sep, quote, value) => {
    if (SKIP_ASSIGNED_VALUE.test(value)) return match;
    bump("assigned-secret");
    return `${name}${sep}${quote}[redacted:assigned-secret]${quote}`;
  });
  return { text, hits };
}

export function redact(input) {
  return redactSecrets(input).text;
}

// ---------------------------------------------------------------------------
// Frontmatter minimo (key: value / key: [a, b])
// ---------------------------------------------------------------------------

function unquote(s) {
  return s.trim().replace(/^["']|["']$/g, "");
}

export function parseFrontmatter(rawContent) {
  // BOM (editores e o PowerShell 5.1 do Windows gravam UTF-8 com BOM) quebraria o `^---`.
  const content = String(rawContent).replace(/^﻿/, "");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { data: {}, body: content };
  const data = {};
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const raw = kv[2].trim();
    if (raw.startsWith("[") && raw.endsWith("]")) {
      data[kv[1]] = raw.slice(1, -1).split(",").map(unquote).filter(Boolean);
    } else if (raw === "") {
      // lista YAML em bloco: `chave:` seguida de linhas `  - valor`
      const items = [];
      while (i + 1 < lines.length && /^\s+-\s+/.test(lines[i + 1])) {
        items.push(unquote(lines[++i].replace(/^\s+-\s+/, "")));
      }
      data[kv[1]] = items.length ? items.filter(Boolean) : "";
    } else {
      data[kv[1]] = unquote(raw);
    }
  }
  return { data, body: String(content).slice(match[0].length) };
}

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

function git(args, cwd, timeout = 1500) {
  try {
    const res = spawnSync("git", args, { cwd, encoding: "utf8", timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    if (res.error || res.status !== 0) return null;
    return res.stdout;
  } catch {
    return null;
  }
}

const norm = (p) => String(p).replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");

export function dirtyFilesFromPorcelain(porcelain) {
  const files = [];
  for (const line of String(porcelain || "").split(/\r?\n/)) {
    if (line.length < 4) continue;
    let path = line.slice(3);
    const arrow = path.indexOf(" -> ");
    if (arrow !== -1) path = path.slice(arrow + 4);
    files.push(norm(path.replace(/^"|"$/g, "")));
  }
  return files;
}

/** Foto barata do repo: HEAD, branch e impressao digital da arvore de trabalho. */
export function gitSnapshot(cwd = process.cwd()) {
  const head = git(["rev-parse", "HEAD"], cwd);
  if (head === null) return { available: false };
  const branch = git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
  const status = git(["status", "--porcelain"], cwd);
  if (status === null) return { available: false };
  return {
    available: true,
    head: head.trim(),
    branch: branch ? branch.trim() : "",
    dirty: dirtyFilesFromPorcelain(status),
    fingerprint: createHash("sha1").update(`${head.trim()}\n${status}`).digest("hex"),
  };
}

const covers = (declared, changed) => {
  const d = norm(declared);
  const c = norm(changed);
  return c === d || c.startsWith(`${d}/`);
};

/**
 * Quais dos `files` declarados mudaram desde `commit` (inclui a arvore suja).
 * Devolve null quando nao da para saber (sem git, commit inexistente) — o
 * chamador nao deve afirmar nada nesse caso.
 */
export function filesChangedSince(commit, files, cwd = process.cwd()) {
  if (!commit || !Array.isArray(files) || files.length === 0) return null;
  if (!/^[0-9a-f]{7,40}$/i.test(commit)) return null;
  const diff = git(["diff", "--name-only", `${commit}..HEAD`], cwd);
  if (diff === null) return null;
  const status = git(["status", "--porcelain"], cwd);
  const changed = [
    ...diff.split(/\r?\n/).filter(Boolean),
    ...dirtyFilesFromPorcelain(status),
  ];
  return files.filter((f) => changed.some((c) => covers(f, c)));
}

export function estimateTokens(text) {
  return Math.ceil(String(text).length / 4);
}
