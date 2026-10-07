#!/usr/bin/env node
/**
 * render-seek — renderiza um filme escrito como PROGRAMA: a pagina expoe `window.seek(t)` (pinta o quadro
 * exato do instante t, em segundos), um Chromium headless chama seek() quadro a quadro, tira o screenshot
 * e o ffmpeg costura o MP4. Nada depende de relogio: o render e identico a cada execucao e corrigir um
 * quadro e editar uma linha + renderizar de novo.
 *
 *   node render-seek.mjs <pagina.html> --out film.mp4 [--duration 3] [--fps 30] [--size 1280x720]
 *                        [--audio trilha.wav] [--query "w=1080&h=1920"]
 *   node render-seek.mjs <pagina.html> --stills 0,1.5,2.9 [--sheet folha.png] [--stills-dir dir]
 *                        # so alguns quadros (critique loop): PNGs + folha de contato em uma imagem so
 *
 * A pagina pode exportar `window.DURATION` (s) e `window.ready` (Promise). Imports de modulo locais:
 * `/_lib/motion.mjs` aponta para scripts/motion.mjs desta skill (file:// bloqueia modulos no Chromium,
 * entao um servidor local efemero serve a pasta da pagina).
 *
 * Requisitos: ffmpeg no PATH e o pacote `playwright` com Chromium (npm i -D playwright && npx playwright
 * install chromium). Se estiver em outro lugar: PLAYWRIGHT_DIR=<pasta que contem node_modules/playwright>.
 */
import { spawn, spawnSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp" };

export function loadPlaywright() {
  const bases = [process.env.PLAYWRIGHT_DIR, process.cwd(), here].filter(Boolean);
  for (const base of bases) {
    try { return createRequire(join(resolve(base), "noop.js"))("playwright"); } catch { /* proxima base */ }
  }
  throw new Error("Pacote `playwright` nao encontrado. Instale: npm i -D playwright && npx playwright install chromium (ou defina PLAYWRIGHT_DIR).");
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

async function main() {
  const a = process.argv.slice(2);
  const v = (n, d) => { const i = a.indexOf(n); return i !== -1 ? a[i + 1] : d; };
  const pageArg = a.find((x, i) => !x.startsWith("--") && !["--out", "--duration", "--fps", "--size", "--audio", "--query", "--stills", "--sheet", "--stills-dir"].includes(a[i - 1]));
  if (!pageArg) { console.error("Uso: render-seek.mjs <pagina.html> --out film.mp4 | --stills 0,1.5 [--sheet folha.png]"); process.exit(2); }
  const pagePath = resolve(pageArg);
  if (!existsSync(pagePath)) { console.error(`Nao encontrei ${pagePath}`); process.exit(2); }
  const [width, height] = String(v("--size", "1280x720")).split("x").map(Number);
  const fps = Number(v("--fps", 30));
  // w/h sempre na URL (a pagina desenha para o tamanho do quadro); --query acrescenta/sobrepoe
  const params = new URLSearchParams(`w=${width}&h=${height}`);
  for (const [k, val] of new URLSearchParams(v("--query", ""))) params.set(k, val);
  const query = params.toString();

  const { chromium } = loadPlaywright();
  const { server, port } = await serve(dirname(pagePath));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => { console.error(`erro na pagina: ${e.message}`); process.exitCode = 1; });
    await openPage(page, port, pagePath.slice(dirname(pagePath).length + 1).replace(/\\/g, "/"), query);
    const duration = Number(v("--duration", await page.evaluate(() => window.DURATION || 3)));

    if (v("--stills")) {
      const times = v("--stills").split(",").map(Number).filter(Number.isFinite);
      const dir = resolve(v("--stills-dir", pagePath.replace(/\.html?$/i, "") + "-stills"));
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
        const cols = Math.min(files.length, 3), rows = Math.ceil(files.length / cols);
        const inputs = files.flatMap((f) => ["-i", f]);
        const scaled = files.map((_, k) => `[${k}:v]scale=640:-1[s${k}]`).join(";");
        const stack = `${files.map((_, k) => `[s${k}]`).join("")}xstack=inputs=${files.length}:layout=${files.map((_, k) => `${(k % cols) * 640}_${Math.floor(k / cols) * Math.round((640 * height) / width)}`).join("|")}[o]`;
        // xstack exige 2+ entradas: com um quadro so, apenas reduz
        const filter = files.length === 1 ? ["-vf", "scale=640:-1"] : ["-filter_complex", `${scaled};${stack}`, "-map", "[o]"];
        const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, ...filter, "-frames:v", "1", resolve(v("--sheet"))], { encoding: "utf8" });
        if (r.status !== 0) console.error(`folha falhou: ${r.stderr}`); else console.log(`folha: ${resolve(v("--sheet"))} (${cols}x${rows})`);
      }
      return;
    }

    const out = v("--out");
    if (!out) { console.error("Faltou --out film.mp4 (ou use --stills)."); process.exit(2); }
    const frames = Math.round(duration * fps);
    const audio = v("--audio");
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-i", "-", ...(audio ? ["-i", resolve(audio)] : []), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", ...(audio ? ["-c:a", "aac", "-shortest"] : []), resolve(out)], { stdio: ["pipe", "inherit", "inherit"] });
    const done = new Promise((ok, fail) => { ff.on("close", (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg saiu com ${c}`)))); ff.on("error", fail); });
    for (let f = 0; f < frames; f++) {
      await page.evaluate((t) => window.seek(t), f / fps);
      await nextPaint(page);
      const png = await page.screenshot({ type: "png" });
      if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once("drain", r));
    }
    ff.stdin.end();
    await done;
    console.log(`${resolve(out)} — ${frames} quadros @ ${fps} fps (${(frames / fps).toFixed(2)} s), ${width}x${height}`);
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main().catch((e) => { console.error(e.message); process.exit(1); });
