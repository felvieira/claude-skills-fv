/**
 * deps.mjs — onde estao (e como achar) as dependencias do render: ffmpeg/ffprobe, o pacote `playwright` e o
 * Chromium dele. Usado pelo render-seek (falha com mensagem acionavel) e pelo doctor (verifica e instala).
 *
 * Ordem de busca do Playwright: PLAYWRIGHT_DIR -> pasta de ferramentas do kit (DEVKIT_TOOLS_DIR ou
 * ~/.dev-team-kit/motion-tools) -> projeto atual (cwd) -> pasta destes scripts. A pasta de ferramentas do
 * kit existe para a skill instalar o Playwright UMA vez, sem tocar no package.json de nenhum projeto.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export const toolsDir = () => resolve(process.env.DEVKIT_TOOLS_DIR || join(homedir(), ".dev-team-kit", "motion-tools"));

/**
 * Pastas candidatas a conter `node_modules/playwright`, em ordem de prioridade.
 * `strict` = a pasta TEM de conter node_modules/playwright (nao vale um node_modules de pasta-pai): e assim que
 * PLAYWRIGHT_DIR e a pasta de ferramentas do kit se comportam. cwd e esta pasta seguem a resolucao normal do Node
 * (sobe pelas pastas-pai), como qualquer projeto que ja tem o pacote instalado.
 */
export function playwrightBases() {
  return [
    ...(process.env.PLAYWRIGHT_DIR ? [{ dir: resolve(process.env.PLAYWRIGHT_DIR), strict: true }] : []),
    { dir: toolsDir(), strict: true },
    { dir: resolve(process.cwd()), strict: false },
    { dir: here, strict: false },
  ];
}

/** { module, base } ou null. Nao lanca. */
export function findPlaywright() {
  for (const { dir, strict } of playwrightBases()) {
    if (strict && !existsSync(join(dir, "node_modules", "playwright", "package.json"))) continue;
    try { return { module: createRequire(join(dir, "noop.js"))("playwright"), base: dir }; } catch { /* proxima base */ }
  }
  return null;
}

/** Pasta onde o Playwright guarda os navegadores (respeita PLAYWRIGHT_BROWSERS_PATH). */
export function browsersPath() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== "0") return resolve(process.env.PLAYWRIGHT_BROWSERS_PATH);
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "ms-playwright");
  if (process.platform === "darwin") return join(homedir(), "Library", "Caches", "ms-playwright");
  return join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "ms-playwright");
}

/** Caminho do executavel do Chromium do Playwright se estiver baixado; senao null. */
export function chromiumPath(pw) {
  try {
    const p = pw.chromium.executablePath();
    return p && existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

/**
 * A verdade sobre o navegador: ele ABRE? (O executavel existir nao basta: o Playwright novo usa um
 * "headless shell" separado, e uma instalacao interrompida deixa so o Chromium completo.)
 * Devolve { ok, error }.
 */
export async function launchProbe(pw) {
  let browser;
  try {
    browser = await pw.chromium.launch({ timeout: 45000 });
    return { ok: true, error: null };
  } catch (e) {
    return { ok: false, error: String(e.message || e).split("\n")[0] };
  } finally {
    try { await browser?.close(); } catch { /* ja fechado */ }
  }
}

/** Erro de launch que significa "navegador nao instalado" (para dizer o comando certo, nao um stack). */
export const isMissingBrowserError = (msg) => /Executable doesn't exist|npx playwright install|playwright install/i.test(String(msg));

function probe(cmd) {
  const r = spawnSync(cmd, ["-version"], { encoding: "utf8", timeout: 15000, windowsHide: true });
  if (r.error || r.status !== 0) return null;
  return (r.stdout || "").split("\n")[0].trim();
}

/** Locais comuns do ffmpeg que ainda nao estao no PATH do processo (logo depois de instalar). */
function ffmpegExtraDirs() {
  const dirs = [];
  if (process.platform === "win32") {
    const local = process.env.LOCALAPPDATA;
    if (local) dirs.push(join(local, "Microsoft", "WinGet", "Links"));
    dirs.push("C:/ProgramData/chocolatey/bin", "C:/ffmpeg/bin", "C:/Program Files/ffmpeg/bin");
  } else {
    dirs.push("/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/snap/bin");
  }
  return dirs.filter((d) => existsSync(d));
}

/** Acha ffmpeg e ffprobe; devolve os comandos a usar (nome no PATH ou caminho absoluto) ou null para o que faltar. */
export function findFfmpeg() {
  // Gancho de teste: DEVKIT_SIMULATE_MISSING=ffmpeg faz o doctor se comportar como se nao houvesse ffmpeg
  // (para verificar o plano de instalacao com --dry-run sem mexer no sistema de ninguem).
  if (/\bffmpeg\b/.test(process.env.DEVKIT_SIMULATE_MISSING || "")) return { ffmpeg: null, ffprobe: null };
  const find = (name) => {
    const exe = process.platform === "win32" ? `${name}.exe` : name;
    if (probe(name)) return { cmd: name, version: probe(name) };
    for (const d of ffmpegExtraDirs()) {
      const full = join(d, exe);
      if (existsSync(full) && probe(full)) return { cmd: full, version: probe(full) };
    }
    return null;
  };
  return { ffmpeg: find("ffmpeg"), ffprobe: find("ffprobe") };
}

/** Estado completo das dependencias (nao instala nada). */
export function checkDeps() {
  const node = Number(process.versions.node.split(".")[0]);
  const ff = findFfmpeg();
  const pw = findPlaywright();
  const chrome = pw ? chromiumPath(pw.module) : null;
  return {
    node: { ok: node >= 18, version: process.versions.node },
    ffmpeg: { ok: Boolean(ff.ffmpeg && ff.ffprobe), ffmpeg: ff.ffmpeg, ffprobe: ff.ffprobe },
    playwright: { ok: Boolean(pw), base: pw?.base ?? null },
    chromium: { ok: Boolean(chrome), path: chrome },
    toolsDir: toolsDir(),
  };
}

export const allOk = (s) => s.node.ok && s.ffmpeg.ok && s.playwright.ok && s.chromium.ok;

/** O que falta, em linguagem de acao. */
export function missing(s) {
  const out = [];
  if (!s.node.ok) out.push(`Node >= 18 (achei ${s.node.version})`);
  if (!s.ffmpeg.ok) out.push("ffmpeg/ffprobe");
  if (!s.playwright.ok) out.push("pacote playwright");
  else if (!s.chromium.ok) out.push("Chromium do Playwright");
  return out;
}
