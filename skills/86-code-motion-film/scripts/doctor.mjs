#!/usr/bin/env node
/**
 * doctor — verifica (e com --install instala) tudo que o render da skill 86 precisa, e PROVA que funciona
 * rodando um render de um quadro de verdade (Chromium -> PNG -> ffmpeg -> MP4).
 *
 *   node doctor.mjs                 # so verifica; exit 1 se faltar algo
 *   node doctor.mjs --install       # instala o que falta (veja "O que --install faz")
 *   node doctor.mjs --no-smoke      # pula o render de prova
 *   node doctor.mjs --install --dry-run     # mostra os comandos de instalacao sem executar nada
 *   node doctor.mjs --json          # saida estruturada
 *   node doctor.mjs --install --with-deps   # Linux: tambem as bibliotecas do sistema do Chromium (usa sudo/apt)
 *
 * O que --install faz:
 *  - playwright: `npm install playwright` na pasta de ferramentas do kit (~/.dev-team-kit/motion-tools, ou
 *    DEVKIT_TOOLS_DIR). Nao toca no package.json de projeto nenhum.
 *  - chromium: `npx playwright install chromium` (baixa para o cache do Playwright; ~150-200 MB na 1a vez).
 *  - ffmpeg: usa o gerenciador do sistema (winget/choco no Windows, brew no macOS, apt no Linux). Se nao houver
 *    gerenciador ou faltar permissao, imprime o comando exato e sai com erro (nao inventa).
 * Nada e instalado sem --install.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { allOk, browsersPath, checkDeps, findFfmpeg, findPlaywright, launchProbe, missing, toolsDir } from "./deps.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const win = process.platform === "win32";
const log = (...a) => { if (!flag("--json")) console.log(...a); };

const planned = [];
function run(cmd, cmdArgs, opts = {}) {
  log(`  $ ${cmd} ${cmdArgs.join(" ")}`);
  if (flag("--dry-run")) { planned.push([cmd, ...cmdArgs].join(" ")); return true; } // so mostra o que faria
  const r = spawnSync(cmd, cmdArgs, { encoding: "utf8", stdio: flag("--json") ? "pipe" : "inherit", shell: win, windowsHide: true, ...opts });
  return r.status === 0;
}

function installFfmpeg() {
  const has = (c) => spawnSync(win ? "where" : "which", [c], { encoding: "utf8", shell: win }).status === 0;
  const plan = [];
  const wingetExe = win ? join(process.env.LOCALAPPDATA || "", "Microsoft", "WindowsApps", "winget.exe") : "";
  if (win) { if (has("winget") || (wingetExe && existsSync(wingetExe))) plan.push([has("winget") ? "winget" : `"${wingetExe}"`, ["install", "--id", "Gyan.FFmpeg", "-e", "--accept-source-agreements", "--accept-package-agreements"]]); if (has("choco")) plan.push(["choco", ["install", "ffmpeg", "-y"]]); if (has("scoop")) plan.push(["scoop", ["install", "ffmpeg"]]); }
  else if (process.platform === "darwin") { if (has("brew")) plan.push(["brew", ["install", "ffmpeg"]]); }
  else if (has("apt-get")) {
    const root = typeof process.getuid === "function" && process.getuid() === 0;
    plan.push(...(root ? [["apt-get", ["update"]], ["apt-get", ["install", "-y", "ffmpeg"]]] : has("sudo") ? [["sudo", ["apt-get", "update"]], ["sudo", ["apt-get", "install", "-y", "ffmpeg"]]] : []));
  } else if (has("dnf")) plan.push(["sudo", ["dnf", "install", "-y", "ffmpeg"]]);
  else if (has("pacman")) plan.push(["sudo", ["pacman", "-S", "--noconfirm", "ffmpeg"]]);
  if (!plan.length) return { ok: false, hint: win ? "winget install --id Gyan.FFmpeg -e   (ou: choco install ffmpeg)" : process.platform === "darwin" ? "brew install ffmpeg" : "sudo apt-get install -y ffmpeg" };
  // winget/choco/apt: tenta cada gerenciador ate um deixar o ffmpeg achavel
  for (let i = 0; i < plan.length; i++) {
    run(plan[i][0], plan[i][1]);
    if (flag("--dry-run")) continue;
    const ff = findFfmpeg();
    if (ff.ffmpeg && ff.ffprobe) return { ok: true };
  }
  if (flag("--dry-run")) return { ok: false, hint: "dry-run: nada foi executado" };
  return { ok: false, hint: "o gerenciador rodou mas o ffmpeg ainda nao esta no PATH — abra um terminal novo e rode o doctor de novo" };
}

function installPlaywright() {
  const dir = toolsDir();
  mkdirSync(dir, { recursive: true });
  if (!existsSync(join(dir, "package.json"))) writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "dev-team-kit-motion-tools", private: true, description: "Playwright para a skill 86 (render-seek). Gerado pelo doctor." }, null, 2));
  log(`Instalando playwright em ${dir}`);
  if (!run("npm", ["install", "playwright", "--no-audit", "--no-fund", "--no-progress"], { cwd: dir })) return false;
  return true;
}

async function installChromium() {
  const pw = findPlaywright();
  const base = pw?.base ?? toolsDir();
  const withDeps = flag("--with-deps") ? ["--with-deps"] : [];
  log("Baixando o Chromium do Playwright (na primeira vez, ~150-200 MB)");
  // O Playwright as vezes morre depois de baixar com "Unable to update lock ... __dirlock" (lock obsoleto,
  // visto no Windows). Remove o lock e tenta de novo (o download ja feito e reaproveitado ou refeito).
  for (let attempt = 1; attempt <= 3; attempt++) {
    run("npx", ["playwright", "install", "chromium", ...withDeps], { cwd: base });
    const pwNow = findPlaywright();
    // O criterio e o navegador ABRIR (nao o executavel existir): uma queda no meio deixa so o Chromium completo.
    if (pwNow && (await launchProbe(pwNow.module)).ok) return true;
    const lock = join(browsersPath(), "__dirlock");
    if (existsSync(lock)) { log(`  tentativa ${attempt} falhou; removendo lock obsoleto ${lock}`); rmSync(lock, { recursive: true, force: true }); }
    else log(`  tentativa ${attempt} falhou`);
  }
  return false;
}

/** Render de prova: uma pagina minima com seek(t), 3 quadros, ffmpeg -> MP4, ffprobe confere. */
async function smoke(state) {
  const pw = findPlaywright();
  const ff = findFfmpeg();
  const dir = mkdtempSync(join(tmpdir(), "motion-smoke-"));
  try {
    const page = join(dir, "index.html");
    writeFileSync(page, `<!doctype html><meta charset="utf-8"><body style="margin:0"><canvas id="c" width="160" height="90"></canvas><script>
const c=document.getElementById('c').getContext('2d');window.DURATION=0.25;
window.seek=(t)=>{c.fillStyle='#111';c.fillRect(0,0,160,90);c.fillStyle='#e8643c';c.fillRect(10+t*400,30,30,30);};window.seek(0);</script>`);
    const out = join(dir, "smoke.mp4");
    const render = resolve(dirname(fileURLToPath(import.meta.url)), "render-seek.mjs");
    const env = { ...process.env, PLAYWRIGHT_DIR: pw.base };
    const r = spawnSync(process.execPath, [render, page, "--out", out, "--duration", "0.25", "--fps", "12", "--size", "160x90"], { encoding: "utf8", env, timeout: 120000 });
    if (r.status !== 0) return { ok: false, detail: (r.stderr || r.stdout || "").trim().slice(0, 400) };
    const pr = spawnSync(ff.ffprobe.cmd, ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames,width,height", "-of", "default=nw=1", out], { encoding: "utf8" });
    const frames = Number((pr.stdout.match(/nb_read_frames=(\d+)/) || [])[1]);
    const ok = frames === 3 && /width=160/.test(pr.stdout) && statSync(out).size > 0;
    return { ok, detail: ok ? "3 quadros 160x90 -> MP4 verificado com ffprobe" : `ffprobe inesperado: ${pr.stdout.trim()}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** O Chromium so conta como ok se ABRIR (a existencia do arquivo nao prova). */
async function withLaunch(state) {
  if (!state.playwright.ok || !state.chromium.ok) return state;
  const pw = findPlaywright();
  const r = await launchProbe(pw.module);
  if (r.ok) return state;
  return { ...state, chromium: { ...state.chromium, ok: false, error: r.error } };
}

async function main() {
  let state = await withLaunch(checkDeps()); // a decisao de instalar usa o estado REAL (o navegador abre?), nao o arquivo existir
  const actions = [];

  if (!allOk(state) && flag("--install")) {
    log(`Faltando: ${missing(state).join(", ")}. Instalando (--install)...`);
    if (!state.ffmpeg.ok) { const r = installFfmpeg(); actions.push({ step: "ffmpeg", ...r }); }
    if (!state.playwright.ok) actions.push({ step: "playwright", ok: installPlaywright() });
    state = await withLaunch(checkDeps());
    if (state.playwright.ok && !state.chromium.ok) actions.push({ step: "chromium", ok: await installChromium() });
    state = await withLaunch(checkDeps());
  }

  let smokeResult = null;
  if (allOk(state) && !flag("--no-smoke")) smokeResult = await smoke(state);

  const ok = allOk(state) && (smokeResult ? smokeResult.ok : true);
  if (flag("--json")) {
    console.log(JSON.stringify({ ok, state, actions, planned, smoke: smokeResult, missing: missing(state) }, null, 2));
  } else {
    const mark = (b) => (b ? "ok " : "FALTA");
    console.log(`\nnode        ${mark(state.node.ok)}  ${state.node.version}`);
    console.log(`ffmpeg      ${mark(state.ffmpeg.ok)}  ${state.ffmpeg.ffmpeg?.version ?? "nao encontrado"}`);
    console.log(`ffprobe     ${mark(Boolean(state.ffmpeg.ffprobe))}  ${state.ffmpeg.ffprobe?.cmd ?? "nao encontrado"}`);
    console.log(`playwright  ${mark(state.playwright.ok)}  ${state.playwright.base ?? "nao encontrado (pasta de ferramentas: " + state.toolsDir + ")"}`);
    console.log(`chromium    ${mark(state.chromium.ok)}  ${state.chromium.ok ? `abre (${state.chromium.path})` : state.chromium.error ?? "nao baixado"}`);
    if (smokeResult) console.log(`render real ${mark(smokeResult.ok)}  ${smokeResult.detail}`);
    for (const a of actions.filter((x) => x.ok === false)) console.log(`\n! ${a.step}: falhou. ${a.hint ?? "veja a saida acima"}`);
    if (!ok) console.log(`\nFalta: ${missing(state).join(", ") || "o render de prova falhou"}. Rode: node ${resolve(fileURLToPath(import.meta.url))} --install`);
    else console.log("\nTudo pronto para renderizar.");
  }
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
