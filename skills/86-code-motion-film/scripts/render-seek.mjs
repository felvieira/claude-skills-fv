#!/usr/bin/env node
/**
 * render-seek — renderiza um filme escrito como PROGRAMA: a pagina expoe `window.seek(t)` (pinta o quadro
 * exato do instante t, em segundos), um Chromium headless chama seek() quadro a quadro, tira o screenshot
 * e o ffmpeg costura o MP4. Nada depende de relogio: o render e identico a cada execucao e corrigir um
 * quadro e editar uma linha + renderizar de novo.
 *
 *   node render-seek.mjs <pagina.html> --out film.mp4 [--duration 3] [--fps 30] [--size 1280x720]
 *                        [--audio trilha.wav] [--query "w=1080&h=1920"] [--blur 4 [--shutter 0.5]] [--scale 2]
 *   node render-seek.mjs <pagina.html> --stills 0,1.5,2.9 [--sheet folha.png] [--stills-dir dir] [--tile 640]
 *                        # faixas: --stills 11.8:13.4:0.05 (de:ate:passo); --tile 360 = miniaturas do tamanho de um celular
 *                        # so alguns quadros (critique loop): PNGs + folha de contato em uma imagem so
 *
 * A pagina pode exportar `window.DURATION` (s) e `window.ready` (Promise). Imports de modulo locais:
 * `/_lib/motion.mjs` aponta para scripts/motion.mjs desta skill (file:// bloqueia modulos no Chromium,
 * entao um servidor local efemero serve a pasta da pagina).
 *
 * Requisitos: ffmpeg/ffprobe, o pacote `playwright` e o Chromium dele. NAO precisa instalar a mao: rode
 *   node doctor.mjs --install      (verifica, instala o que falta e prova com um render de verdade)
 * O render-seek confere tudo antes de comecar e, se faltar algo, diz exatamente esse comando. O Playwright
 * e procurado em PLAYWRIGHT_DIR, na pasta de ferramentas do kit (~/.dev-team-kit/motion-tools), no projeto e aqui.
 */
import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { allOk, checkDeps, findPlaywright, isMissingBrowserError, missing } from "./deps.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp" };

export function loadPlaywright() {
  const found = findPlaywright();
  if (!found) throw new Error(`Pacote \`playwright\` nao encontrado. Rode: node ${join(here, "doctor.mjs")} --install`);
  return found.module;
}

/** Garante ffmpeg, Playwright e Chromium ANTES de gastar tempo; senao diz exatamente o que rodar. */
export function preflight() {
  const state = checkDeps();
  if (allOk(state)) return state;
  const err = new Error(`Faltam dependencias do render: ${missing(state).join(", ")}.\nInstale e valide com: node ${join(here, "doctor.mjs")} --install`);
  err.code = "DEPS_MISSING";
  throw err;
}

export function serve(root) {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    const base = url.startsWith("/_lib/") ? here : root;
    const rel = url.startsWith("/_lib/") ? url.slice(6) : url;
    const file = normalize(join(base, rel));
    if (!file.startsWith(normalize(base)) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": MIME[extname(file).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
    createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok({ server, port: server.address().port })));
}

const nextPaint = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

async function openPage(page, port, file, query) {
  await page.goto(`http://127.0.0.1:${port}/${file}${query ? `?${query}` : ""}`, { waitUntil: "load" });
  await page.evaluate(() => (window.ready ? window.ready : null));
  if (!(await page.evaluate(() => typeof window.seek === "function"))) throw new Error("A pagina precisa expor window.seek(t).");
}

/** "0,1.5,2.9" e/ou faixas "11.8:13.4:0.05" (inclusive nas pontas) -> lista de instantes. */
export function parseTimes(spec) {
  const out = [];
  for (const tok of String(spec).split(",").filter(Boolean)) {
    if (tok.includes(":")) {
      const [a, b, st = 0.05] = tok.split(":").map(Number);
      if (![a, b, st].every(Number.isFinite) || st <= 0 || b < a) continue;
      for (let i = 0; a + i * st <= b + 1e-9; i++) out.push(Math.round((a + i * st) * 1e6) / 1e6);
    } else if (Number.isFinite(Number(tok))) out.push(Number(tok));
  }
  return out;
}

async function main() {
  const a = process.argv.slice(2);
  const v = (n, d) => { const i = a.indexOf(n); return i !== -1 ? a[i + 1] : d; };
  const pageArg = a.find((x, i) => !x.startsWith("--") && !["--out", "--duration", "--fps", "--size", "--audio", "--query", "--stills", "--sheet", "--stills-dir", "--blur", "--shutter", "--tile", "--scale"].includes(a[i - 1]));
  if (!pageArg) { console.error("Uso: render-seek.mjs <pagina.html> --out film.mp4 | --stills 0,1.5 [--sheet folha.png]"); process.exit(2); }
  const pagePath = resolve(pageArg);
  if (!existsSync(pagePath)) { console.error(`Nao encontrei ${pagePath}`); process.exit(2); }
  const [width, height] = String(v("--size", "1280x720")).split("x").map(Number);
  const fps = Number(v("--fps", 30));
  // --scale N: supersampling. A pagina desenha em N vezes o tamanho e o ffmpeg reduz (texto pequeno nao cintila).
  const scale = Math.max(1, Math.min(4, Number(v("--scale", 1)) || 1));
  const rw = Math.round(width * scale), rh = Math.round(height * scale);
  // w/h sempre na URL (a pagina desenha para o tamanho do quadro); --query acrescenta/sobrepoe
  const params = new URLSearchParams(`w=${rw}&h=${rh}`);
  for (const [k, val] of new URLSearchParams(v("--query", ""))) params.set(k, val);
  const query = params.toString();

  const deps = preflight();
  const FFMPEG = deps.ffmpeg.ffmpeg.cmd;
  const { chromium } = loadPlaywright();
  const { server, port } = await serve(dirname(pagePath));
  let browser;
  try {
    browser = await chromium.launch();
  } catch (e) {
    server.close();
    if (isMissingBrowserError(e.message)) throw new Error(`O Chromium do Playwright nao esta instalado por completo.\nInstale e valide com: node ${join(here, "doctor.mjs")} --install`);
    throw e;
  }
  try {
    const page = await browser.newPage({ viewport: { width: rw, height: rh }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => { console.error(`erro na pagina: ${e.message}`); process.exitCode = 1; });
    await openPage(page, port, pagePath.slice(dirname(pagePath).length + 1).replace(/\\/g, "/"), query);
    const duration = Number(v("--duration", await page.evaluate(() => window.DURATION || 3)));

    if (v("--stills")) {
      const times = parseTimes(v("--stills"));
      // padrao: ./motion-stills no diretorio de trabalho (nunca ao lado da pagina: assets/ nao e lugar de saida)
      const dir = resolve(v("--stills-dir", "motion-stills"));
      mkdirSync(dir, { recursive: true });
      const files = [];
      for (const [k, t] of times.entries()) {
        await page.evaluate((x) => window.seek(x), t);
        await nextPaint(page);
        const f = join(dir, `still-${String(k + 1).padStart(2, "0")}-${t.toFixed(2)}s.png`);
        writeFileSync(f, await page.screenshot({ type: "png" }));
        files.push(f);
      }
      console.log(`${files.length} quadro(s) em ${dir}`);
      if (v("--sheet")) {
        const tile = Math.max(120, Number(v("--tile", 640)) || 640); // --tile 360 = largura de um celular no feed
        const cols = Math.min(files.length, 3), rows = Math.ceil(files.length / cols);
        const inputs = files.flatMap((f) => ["-i", f]);
        const scaled = files.map((_, k) => `[${k}:v]scale=${tile}:-1[s${k}]`).join(";");
        const stack = `${files.map((_, k) => `[s${k}]`).join("")}xstack=inputs=${files.length}:layout=${files.map((_, k) => `${(k % cols) * tile}_${Math.floor(k / cols) * Math.round((tile * height) / width)}`).join("|")}[o]`;
        // xstack exige 2+ entradas: com um quadro so, apenas reduz
        const filter = files.length === 1 ? ["-vf", `scale=${tile}:-1`] : ["-filter_complex", `${scaled};${stack}`, "-map", "[o]"];
        const r = spawnSync(FFMPEG, ["-y", "-loglevel", "error", ...inputs, ...filter, "-frames:v", "1", resolve(v("--sheet"))], { encoding: "utf8" });
        if (r.status !== 0) console.error(`folha falhou: ${r.stderr}`); else console.log(`folha: ${resolve(v("--sheet"))} (${cols}x${rows})`);
      }
      return;
    }

    const out = v("--out");
    if (!out) { console.error("Faltou --out film.mp4 (ou use --stills)."); process.exit(2); }
    const frames = Math.round(duration * fps);
    const audio = v("--audio");
    // Motion blur por subquadros: N capturas por quadro, espalhadas por `shutter` do intervalo (0.5 = obturador de 180 graus)
    // e combinadas pelo ffmpeg (tmix). Como seek(t) e pura, isso e exato: nenhum borrado "falso", so a media de instantes reais.
    const blur = Math.max(1, Math.min(16, Math.round(Number(v("--blur", 1)))));
    const shutter = Math.max(0.05, Math.min(1, Number(v("--shutter", 0.5))));
    const chain = [...(scale > 1 ? [`scale=${width}:${height}:flags=lanczos`] : []), ...(blur > 1 ? [`tmix=frames=${blur}`, `select='eq(mod(n,${blur}),${blur - 1})'`] : [])];
    const vf = chain.length ? ["-vf", chain.join(","), ...(blur > 1 ? ["-r", String(fps), "-fps_mode", "cfr"] : [])] : [];
    const ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps * blur), "-i", "-", ...(audio ? ["-i", resolve(audio)] : []), ...vf, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-movflags", "+faststart", ...(audio ? ["-c:a", "aac", "-shortest"] : []), resolve(out)], { stdio: ["pipe", "inherit", "inherit"] });
    const done = new Promise((ok, fail) => { ff.on("close", (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg saiu com ${c}`)))); ff.on("error", fail); });
    for (let f = 0; f < frames; f++) {
      for (let s = 0; s < blur; s++) {
        const t = Math.max(0, (f + (blur === 1 ? 0 : shutter * ((s + 0.5) / blur - 0.5))) / fps);
        await page.evaluate((tt) => window.seek(tt), t);
        await nextPaint(page);
        const png = await page.screenshot({ type: "png" });
        if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
      }
    }
    ff.stdin.end();
    await done;
    console.log(`${resolve(out)} — ${frames} quadros @ ${fps} fps (${(frames / fps).toFixed(2)} s), ${width}x${height}${blur > 1 ? `, motion blur ${blur} subquadros, obturador ${Math.round(shutter * 360)}°` : ""}${scale > 1 ? `, supersampling ${scale}x` : ""}`);
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main().catch((e) => { console.error(e.message); process.exit(1); });
