#!/usr/bin/env node
/**
 * check-film — prova que um filme escrito como seek(t) e DETERMINISTICO, antes de gastar um render inteiro.
 *
 *   node check-film.mjs <pagina.html> [--size 640x360] [--step 0.1] [--tol 12] [--no-loop] [--json]
 *
 * Quatro verificacoes:
 *   1. fonte limpa: sem relogio, timer, Math.random nem transicao/animacao CSS nos arquivos do filme;
 *   2. nenhum erro de pagina em quadros espacados por --step ate o fim;
 *   3. o mesmo instante da o mesmo quadro, venha-se de onde vier (estado preso entre quadros e o bug classico);
 *   4. o loop fecha: o quadro DEPOIS do ultimo (t = DURATION) se parece com o primeiro (tolerancia --tol sobre a
 *      diferenca maxima em cinza 32x18, porque grao de filme muda por quadro de proposito). Filme que nao e
 *      loop (termina num estado novo) usa --no-loop.
 *
 * Ideia do conjunto de verificacoes inspirada em kaventro/motion-designer (MIT); implementacao propria.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isMissingBrowserError } from "./deps.mjs";
import { loadPlaywright, preflight, serve } from "./render-seek.mjs";

const CLOCKS = [
  [/Math\.random\s*\(/, "Math.random()"],
  [/Date\.now\s*\(|new Date\s*\(\s*\)|performance\.now\s*\(/, "o relogio (Date/performance)"],
  [/\b(setTimeout|setInterval|requestAnimationFrame)\s*\(/, "um timer"],
  [/(^|[\s;{"'`])(transition|animation)(-[a-z-]+)?\s*:|@keyframes/, "transicao ou animacao CSS"],
];

const firstLine = (e) => String((e && e.message) || e).split(/\r?\n/)[0];

/** Tira comentarios obvios (linha inteira e `// ...` apos espaco) para nao acusar texto de documentacao. */
const stripComments = (line) => {
  const t = line.trim();
  if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("<!--")) return "";
  return line.replace(/\s\/\/\s.*$/, "").replace(/\/\*.*?\*\//g, "");
};

function listFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) listFiles(p, out);
    else if (/\.(html|js|mjs|css)$/.test(name) && st.size < 3_000_000) out.push(p);
  }
  return out;
}

/** Varre a pasta do filme atras de fontes de nao-determinismo. Devolve [{file, line, what}]. */
export function scanSource(folder) {
  const found = [];
  for (const file of listFiles(folder)) {
    readFileSync(file, "utf8").split("\n").forEach((raw, i) => {
      if (raw.length > 2000) return; // bundles/dados embutidos
      const line = stripComments(raw);
      for (const [re, what] of CLOCKS) if (re.test(line)) found.push({ file: relative(folder, file).replace(/\\/g, "/"), line: i + 1, what });
    });
  }
  return found;
}

/** Diferenca maxima, em cinza 32x18, entre dois PNG (base64), calculada no navegador. */
async function grayDiff(page, a, b) {
  return page.evaluate(async ([x, y]) => {
    const gray = async (b64) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const c = new OffscreenCanvas(32, 18), g = c.getContext("2d");
      g.drawImage(bmp, 0, 0, 32, 18);
      const d = g.getImageData(0, 0, 32, 18).data, out = [];
      for (let i = 0; i < d.length; i += 4) out.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      return out;
    };
    const [p, q] = [await gray(x), await gray(y)];
    return Math.max(...p.map((v, i) => Math.abs(v - q[i])));
  }, [a, b]);
}

export async function checkFilm(pagePath, { width = 640, height = 360, step = 0.1, tol = 12, loop = true } = {}) {
  const checks = [];
  const add = (ok, what, detail = "") => checks.push({ ok, what, detail });
  const folder = dirname(resolve(pagePath));

  const src = scanSource(folder);
  add(!src.length, "fonte limpa: sem relogio, timer, Math.random nem animacao CSS", src.length ? `${src.length} ocorrencia(s), ex.: ${src.slice(0, 3).map((f) => `${f.file}:${f.line} ${f.what}`).join("; ")}` : "");

  preflight();
  const { chromium } = loadPlaywright();
  const { server, port } = await serve(folder);
  let browser;
  try {
    try { browser = await chromium.launch(); } catch (e) { throw isMissingBrowserError(e.message) ? new Error("Chromium ausente: rode doctor.mjs --install") : e; }
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message).split("\n")[0]));
    const file = resolve(pagePath).slice(folder.length + 1).replace(/\\/g, "/");
    await page.goto(`http://127.0.0.1:${port}/${file}?w=${width}&h=${height}`, { waitUntil: "load" });
    await page.evaluate(() => (window.ready ? window.ready : null));
    if (!(await page.evaluate(() => typeof window.seek === "function"))) { add(false, "a pagina expoe window.seek(t)"); return checks; }
    const dur = await page.evaluate(() => window.DURATION || 3);
    const end = dur - 1e-6;

    const thrown = [];
    for (let t = 0; t < dur; t += step) {
      try { await page.evaluate((x) => window.seek(x), t); } catch (e) { thrown.push(`${t.toFixed(2)}s ${String(e.message).split("\n")[0]}`); }
    }
    const errs = [...thrown, ...errors];
    add(!errs.length, `sem erro de pagina em quadros a cada ${step} s ate ${dur.toFixed(2)} s`, errs.length ? `${errs.length}, primeiro: ${errs[0]}` : "");

    const shot = async (t) => { await page.evaluate((x) => window.seek(x), t); await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); return page.screenshot({ type: "png" }); };
    const probes = [0, dur * 0.23, dur * 0.51, dur * 0.77, end];
    try {
      const inOrder = [];
      for (const t of probes) inOrder.push(await shot(t));
      const apart = [];
      for (const k of [3, 0, 4, 1, 2]) if (!(await shot(probes[k])).equals(inOrder[k])) apart.push(`${probes[k].toFixed(2)} s`);
      add(!apart.length, "o mesmo instante da o mesmo quadro, em qualquer ordem de seek", apart.length ? `difere em ${apart.join(", ")}: ha estado preso entre quadros` : "");
    } catch (e) {
      add(false, "o mesmo instante da o mesmo quadro, em qualquer ordem de seek", `nao deu para comparar: ${firstLine(e)}`);
    }

    if (loop) {
      try {
        const a = (await shot(0)).toString("base64"), b = (await shot(dur)).toString("base64");
        const d = await grayDiff(page, a, b);
        add(d <= tol, `o loop fecha: o quadro depois do ultimo ~ primeiro (diferenca maxima ${d.toFixed(1)}, tolerancia ${tol})`, d <= tol ? "" : "o fim difere do comeco: movimento ainda correndo ou estado final diferente do inicial");
      } catch (e) {
        add(false, "o loop fecha", `nao deu para comparar: ${firstLine(e)}`);
      }
    }
  } finally {
    await browser?.close();
    server.close();
  }
  return checks;
}

async function main() {
  const a = process.argv.slice(2);
  const v = (n, d) => { const i = a.indexOf(n); return i !== -1 ? a[i + 1] : d; };
  const pageArg = a.find((x, i) => !x.startsWith("--") && !["--size", "--step", "--tol"].includes(a[i - 1]));
  if (!pageArg || !existsSync(resolve(pageArg))) { console.error("Uso: check-film.mjs <pagina.html> [--size 640x360] [--step 0.1] [--tol 12] [--no-loop] [--json]"); process.exit(2); }
  const [width, height] = String(v("--size", "640x360")).split("x").map(Number);
  const checks = await checkFilm(pageArg, { width, height, step: Number(v("--step", 0.1)), tol: Number(v("--tol", 12)), loop: !a.includes("--no-loop") });
  const failed = checks.filter((c) => !c.ok).length;
  if (a.includes("--json")) console.log(JSON.stringify({ ok: !failed, checks }, null, 2));
  else {
    for (const c of checks) { console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.what}`); if (c.detail) console.log(`      ${c.detail}`); }
    console.log(failed ? `${failed} verificacao(oes) falharam` : "todas as verificacoes passaram");
  }
  process.exit(failed ? 1 : 0);
}

// compara pelo caminho real: process.argv[1] pode vir por link simbolico (macOS /var -> /private/var) e import.meta.url nao; sem isso o script sai em silencio sem rodar
import { realpathSync as realpathMain } from "node:fs";
const isMainModule = (url) => { try { return realpathMain(process.argv[1]) === realpathMain(fileURLToPath(url)); } catch { return process.argv[1] === fileURLToPath(url); } };
if (process.argv[1] && isMainModule(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
