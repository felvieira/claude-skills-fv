/**
 * Guardas sob demanda (/careful, /freeze): estado do projeto em `.auto/session-guards.json`.
 *
 * Ideia vinda de "Lessons from building Claude Code: how we use skills" (claude.dev): hooks que so
 * ligam quando a pessoa pede, para operacoes arriscadas, sem custo nem atrito o resto do tempo.
 *
 * Limite honesto: o estado e do PROJETO, nao da sessao (o hook nao sabe qual sessao rodou o
 * comando). Por isso expira em 8 h e `/careful off` / `/freeze off` apagam na hora. Duas sessoes
 * abertas no mesmo repo compartilham a guarda.
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, parse, resolve, sep } from "node:path";

export const GUARD_TTL_MS = 8 * 60 * 60 * 1000;
const ROOT_MARKERS = [".git", "package.json", ".claude"];

export function findProjectRoot(cwd = process.cwd()) {
  let dir = resolve(cwd);
  const stop = parse(dir).root;
  for (;;) {
    if (existsSync(join(dir, ".auto", "session-guards.json"))) return dir;
    if (ROOT_MARKERS.some((m) => existsSync(join(dir, m)))) return dir;
    if (dir === stop) return resolve(cwd);
    dir = dirname(dir);
  }
}

export function guardsPath(cwd) {
  return join(findProjectRoot(cwd), ".auto", "session-guards.json");
}

function load(cwd) {
  try {
    const raw = JSON.parse(readFileSync(guardsPath(cwd), "utf8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

const alive = (entry, now) => entry && Number.isFinite(entry.since) && now - entry.since <= GUARD_TTL_MS;

/** Estado efetivo (ja sem o que expirou): { careful: boolean, freeze: string|null } */
export function readGuards(cwd, now = Date.now()) {
  const raw = load(cwd);
  return {
    careful: Boolean(alive(raw.careful, now)),
    freeze: alive(raw.freeze, now) && typeof raw.freeze.dir === "string" ? raw.freeze.dir : null,
  };
}

/** patch: { careful?: boolean, freeze?: string|null }. Arquivo vazio e apagado (o dispatcher pula o hook). */
export function writeGuards(cwd, patch, now = Date.now()) {
  const raw = load(cwd);
  const next = {};
  if (alive(raw.careful, now)) next.careful = raw.careful;
  if (alive(raw.freeze, now)) next.freeze = raw.freeze;
  if ("careful" in patch) { if (patch.careful) next.careful = { since: now }; else delete next.careful; }
  if ("freeze" in patch) { if (patch.freeze) next.freeze = { dir: resolve(cwd, patch.freeze), since: now }; else delete next.freeze; }

  const file = guardsPath(cwd);
  if (!Object.keys(next).length) {
    try { unlinkSync(file); } catch { /* ja nao existia */ }
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
  }
  return readGuards(cwd, now);
}

/** true se `target` esta dentro de `dir` (ou e ele). Compara sem diferenciar maiuscula no Windows. */
export function isInside(dir, target, platform = process.platform) {
  const norm = (p) => (platform === "win32" ? resolve(p).toLowerCase() : resolve(p));
  const base = norm(dir);
  const t = norm(target);
  if (t === base) return true;
  return t.startsWith(base.endsWith(sep) ? base : base + sep);
}
