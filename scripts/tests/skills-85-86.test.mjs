/**
 * Skills 85 (illustration-studio) e 86 (code-motion-film): matematica de movimento, sintese de audio,
 * linter/exportador de icones e, quando ha Playwright + ffmpeg, o render real.
 *   node --test scripts/tests/skills-85-86.test.mjs
 *   PLAYWRIGHT_DIR=<pasta com node_modules/playwright> node --test ...   # liga o teste de render
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { barsFor, beatGrid, dampingRatio, layout, overshoot, presets, pulse, settleTime, snapToBeat, spring, track } from "../../skills/86-code-motion-film/scripts/motion.mjs";
import { encodeWav, synth } from "../../skills/86-code-motion-film/scripts/audio-synth.mjs";
import { contrast, flattenPath, hexToRgb, lintPalette, lintSvg } from "../svg-icon-lint.mjs";
import { innerSvg, rootStyleAttrs, toJsx } from "../svg-icon-export.mjs";
import { allOk, browsersPath, findPlaywright, isMissingBrowserError, missing, playwrightBases, toolsDir } from "../../skills/86-code-motion-film/scripts/deps.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const EXAMPLES = join(root, "skills", "85-illustration-studio", "assets", "examples");
const LINT = join(root, "scripts", "svg-icon-lint.mjs");
const EXPORT = join(root, "scripts", "svg-icon-export.mjs");
const RENDER = join(root, "skills", "86-code-motion-film", "scripts", "render-seek.mjs");
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b} (±${eps})`);

// ================================================================== 86: molas
test("mola: valor conhecido do caso critico e limites 0 -> 1", () => {
  const cfg = { stiffness: 100, damping: 20, mass: 1 }; // w0 = 10, zeta = 1
  near(dampingRatio(cfg), 1);
  near(spring(cfg, 0), 0);
  near(spring(cfg, -1), 0, 0);
  near(spring(cfg, 0.1), 1 - Math.exp(-1) * 2, 1e-9); // 1 - e^-1 (1 + 1)
  for (const [name, p] of Object.entries(presets)) near(spring(p, 10), 1, 1e-6), assert.ok(name);
});

test("mola: continua entre os regimes sub, critico e super-amortecido", () => {
  const at = (z) => spring({ stiffness: 100, damping: 2 * z * 10, mass: 1 }, 0.3);
  near(at(0.999), at(1), 5e-4);
  near(at(1.001), at(1), 5e-4);
  assert.ok(at(0.5) > at(1) && at(2) < at(1)); // quanto menos amortecida, mais rapida no inicio
});

test("mola: sobrepasso por papel (playful passa, type nao passa) e assenta em tempo razoavel", () => {
  assert.ok(overshoot(presets.playful) > 0.1, "playful precisa sobrepassar visivelmente");
  assert.ok(overshoot(presets.snappy) < overshoot(presets.playful));
  assert.ok(overshoot(presets.type) < 1e-9, "texto nao pode sobrepassar");
  for (const p of Object.values(presets)) assert.ok(settleTime(p) < 3, `assenta em ${settleTime(p).toFixed(2)} s`);
});

test("track: uma mola por mudanca, sem reiniciar, continuo e puro (funcao so de t)", () => {
  const v = track(100, [{ at: 1.2, to: 40 }, { at: 0.5, to: 300 }], presets.default); // fora de ordem de proposito
  near(v(0), 100, 1e-9);
  near(v(0.5), 100, 1e-9);
  near(v(20), 40, 1e-6);
  // continuidade no instante da segunda mudanca: nenhum salto
  assert.ok(Math.abs(v(1.2 + 1e-6) - v(1.2 - 1e-6)) < 1e-2);
  // pureza: avaliar fora de ordem e repetido da o mesmo valor (render do quadro 812 sem simular os anteriores)
  const a = [0.1, 2.5, 0.9, 1.7].map(v), b = [1.7, 0.9, 2.5, 0.1].map(v).reverse();
  assert.deepEqual(a, b);
  // equivale a soma de degraus: 100 + 200*spring(t-0.5) - 260*spring(t-1.2)
  const t = 1.6;
  near(v(t), 100 + 200 * spring(presets.default, t - 0.5) - 260 * spring(presets.default, t - 1.2), 1e-9);
});

test("batidas: grade, encaixe, compassos e pulso", () => {
  assert.deepEqual(beatGrid(120, 4), [0, 0.5, 1, 1.5]);
  assert.deepEqual(beatGrid(120, 2, 2), [0, 0.25, 0.5, 0.75]);
  near(snapToBeat(0.74, 120), 0.5);
  near(snapToBeat(0.76, 120), 1);
  assert.deepEqual(barsFor(8, 120), { beats: 16, bars: 4, whole: true });
  assert.equal(barsFor(6.5, 120).whole, false);
  assert.ok(pulse(0, 120) > pulse(0.25, 120) && pulse(0.5, 120) > 0.99);
});

test("layout: retrato x paisagem, unidade relativa", () => {
  const l = layout(1080, 1920), p = layout(1920, 1080);
  assert.equal(l.portrait, true);
  assert.equal(p.portrait, false);
  near(l.u, 10.8); near(p.u, 10.8);
});

// ================================================================== 86: audio
test("audio-synth: WAV valido, duracao exata, deterministico, kick forte na batida", () => {
  const a = synth({ bpm: 120, seconds: 2, cuts: [1] }), b = synth({ bpm: 120, seconds: 2, cuts: [1] });
  assert.equal(a.samples.length, 2 * 44100);
  assert.deepEqual(a.samples.slice(0, 2000), b.samples.slice(0, 2000), "mesma entrada, mesma saida");
  const peak = a.samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(peak <= 0.951 && peak > 0.2, `pico ${peak}`);
  const wav = encodeWav(a.samples, a.rate);
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt32LE(40), a.samples.length * 2);
  const rms = (t0, t1) => { let s = 0, n = 0; for (let i = Math.floor(t0 * a.rate); i < Math.floor(t1 * a.rate); i++) { s += a.samples[i] ** 2; n++; } return Math.sqrt(s / n); };
  assert.ok(rms(0.5, 0.56) > 1.5 * rms(0.38, 0.44), "energia na batida maior que entre batidas");
});

// ================================================================== 85: linter
const SVG = (inner, root = 'viewBox="0 0 24 24" fill="none" stroke="#1f1c19" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${root}>${inner}</svg>`;
const rules = (svg, opts) => lintSvg(svg, opts).findings.filter((f) => f.level === "error").map((f) => f.rule);

test("linter: o conjunto de exemplo passa sem erro nem aviso (com paleta)", () => {
  const res = spawnSync(process.execPath, [LINT, EXAMPLES, "--palette", join(EXAMPLES, "palette.json"), "--json", "--strict"], { encoding: "utf8" });
  assert.equal(res.status, 0, res.stdout + res.stderr);
  const out = JSON.parse(res.stdout);
  assert.deepEqual(out.summary, { icons: 8, errors: 0, warnings: 0, median_weight: out.summary.median_weight });
});

test("linter: cada regra da skill e pega separadamente", () => {
  assert.deepEqual(rules(SVG('<circle cx="12" cy="12" r="4"/>')), []);
  assert.ok(rules(SVG('<circle cx="12" cy="12" r="4"/>', 'viewBox="0 0 32 32" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"')).includes("viewbox"));
  assert.ok(rules(SVG('<circle cx="12" cy="12" r="4" stroke-width="1.5"/>')).includes("stroke-width"));
  assert.ok(rules(SVG('<path d="M4 12h16"/>', 'viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2"')).includes("linecap"));
  assert.ok(rules(SVG('<path d="M4 12h16" transform="translate(1 1)"/>')).includes("transform"));
  assert.ok(rules(SVG('<circle id="x" cx="12" cy="12" r="4"/>')).includes("stray-id"));
  assert.ok(!rules(SVG('<defs><clipPath id="c"><rect x="2" y="2" width="20" height="20" rx="2"/></clipPath></defs><circle cx="12" cy="12" r="4" clip-path="url(#c)"/>')).includes("stray-id"), "id referenciado e valido");
  assert.ok(rules(SVG('<circle cx="12.5" cy="12" r="4"/>')).includes("whole-pixels"));
  assert.ok(rules(SVG('<path d="M1 12h22"/>')).includes("safe-area"));
  assert.ok(rules(SVG('<rect x="4" y="4" width="16" height="16"/>')).includes("corner"));
  assert.ok(!rules(SVG('<rect x="4" y="4" width="16" height="16" rx="2"/>')).includes("corner"));
  const many = "M3 3" + Array.from({ length: 13 }, (_, k) => `l${k % 2 ? 1 : -1} 1`).join("");
  assert.ok(rules(SVG(`<path d="${many}"/>`)).includes("path-points"));
  assert.ok(rules(SVG('<circle cx="8" cy="12" r="3" fill="#f4bda4"/><circle cx="16" cy="12" r="3" fill="#b4532d"/>')).includes("accent"));
  assert.deepEqual(rules(SVG('<circle cx="12" cy="12" r="3" fill="#f4bda4"/>')), [], "um destaque e permitido");
});

test("linter: arcos (relativo e absoluto), curvas e pontos de ancoragem", () => {
  const semi = flattenPath("M6 12a6 6 0 0 1 12 0"); // semicirculo para cima: x 6..18, topo em y=6
  const pts = semi.subpaths.flat();
  near(Math.min(...pts.map((p) => p[1])), 6, 0.05);
  near(Math.max(...pts.map((p) => p[0])), 18, 0.05);
  assert.equal(semi.anchors, 2);
  assert.equal(flattenPath("M2 2L4 4H8V10Z").anchors, 4);
  const cub = flattenPath("M4 4C4 12 12 12 12 4").subpaths.flat();
  assert.ok(Math.max(...cub.map((p) => p[1])) < 12, "curva fica dentro do casco convexo");
  assert.ok(rules(SVG('<path d="M12 22s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z"/>')).length === 0, "marcador do exemplo e valido");
});

test("linter: paleta (cor fora, contraste ink/paper e accent/paper)", () => {
  assert.ok(rules(SVG('<circle cx="12" cy="12" r="3" fill="#123456"/>'), { palette: { ink: "#1f1c19", paper: "#fbf8f3" } }).includes("palette"));
  near(contrast("#000000", "#ffffff"), 21, 1e-9);
  assert.deepEqual(hexToRgb("#abc"), [170, 187, 204]);
  assert.equal(hexToRgb("azul"), null);
  const good = JSON.parse(readFileSync(join(EXAMPLES, "palette.json"), "utf8"));
  assert.deepEqual(lintPalette(good), []);
  assert.ok(lintPalette({ ...good, ink: "#cccccc" }).some((f) => f.rule === "contrast" && f.level === "error"));
  assert.ok(lintPalette({ ...good, accent: "#f0f0f0" }).some((f) => f.rule === "contrast"));
  assert.ok(lintPalette({ ink: "#000" }).some((f) => f.rule === "palette-size"));
});

test("linter: peso desigual no conjunto vira aviso (outlier), nao erro", () => {
  const dir = mkdtempSync(join(tmpdir(), "svgw-"));
  try {
    const light = SVG('<path d="M4 12h6"/>');
    const heavy = SVG('<path d="M3 3h18v18H3z" /><path d="M3 12h18M12 3v18M3 3l18 18"/>');
    for (const [n, s] of [["a", light], ["b", light], ["c", light], ["d", heavy]]) writeFileSync(join(dir, `${n}.svg`), s);
    const res = spawnSync(process.execPath, [LINT, dir, "--json"], { encoding: "utf8" });
    const out = JSON.parse(res.stdout);
    assert.ok(out.files.find((f) => f.file === "d.svg").findings.some((f) => f.rule === "weight" && f.level === "warn"));
    assert.equal(spawnSync(process.execPath, [LINT, dir, "--strict"], { encoding: "utf8" }).status === 1, out.summary.errors > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ================================================================== 85: exportador
test("exportador: sprite, componentes React e folha; recusa conjunto com erro (e --force ignora)", () => {
  const out = mkdtempSync(join(tmpdir(), "svgx-"));
  const bad = mkdtempSync(join(tmpdir(), "svgbad-"));
  try {
    const ok = spawnSync(process.execPath, [EXPORT, EXAMPLES, "--out", out, "--palette", join(EXAMPLES, "palette.json")], { encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stderr);
    assert.deepEqual(readdirSync(out).sort(), ["Icons.tsx", "contact-sheet.html", "sprite.svg"]);
    const sprite = readFileSync(join(out, "sprite.svg"), "utf8");
    assert.equal((sprite.match(/<symbol /g) || []).length, 8);
    assert.match(sprite, /id="icon-sun"/);
    assert.match(sprite, /stroke="currentColor"/);
    const tsx = readFileSync(join(out, "Icons.tsx"), "utf8");
    assert.match(tsx, /export const SunIcon = \(\{ size = 24, \.\.\.props \}: IconProps\)/);
    assert.match(tsx, /strokeWidth=\{2\}/);
    const sheet = readFileSync(join(out, "contact-sheet.html"), "utf8");
    assert.match(sheet, /stroke="#1f1c19"/, "a folha repassa os atributos herdados da raiz (senao tudo sai preto)");

    writeFileSync(join(bad, "01-ruim.svg"), SVG('<circle cx="12" cy="12" r="4" stroke-width="3"/>'));
    const refused = spawnSync(process.execPath, [EXPORT, bad, "--out", join(bad, "dist")], { encoding: "utf8" });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /Recusado/);
    assert.equal(spawnSync(process.execPath, [EXPORT, bad, "--out", join(bad, "dist"), "--force"], { encoding: "utf8" }).status, 0);
  } finally {
    rmSync(out, { recursive: true, force: true });
    rmSync(bad, { recursive: true, force: true });
  }
});

test("exportador: helpers de SVG -> JSX", () => {
  assert.equal(innerSvg(SVG("<g>\n  <path d=\"M2 2\"/>\n</g>")), '<g>\n  <path d="M2 2"/>\n</g>');
  assert.equal(toJsx('<path stroke-width="2" class="a" data-name="x"/>'), '<path strokeWidth="2" className="a" data-name="x"/>');
  assert.equal(rootStyleAttrs(SVG("")), 'fill="none" stroke="#1f1c19" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"');
});

// ================================================================== 86: render real (opcional)
// O veredito vem do proprio doctor (ffmpeg + playwright + Chromium que ABRE). Em CI, o passo anterior roda `doctor --install`.
const DOCTOR = join(root, "skills", "86-code-motion-film", "scripts", "doctor.mjs");
const doctorJson = (args = [], env = {}) => {
  const r = spawnSync(process.execPath, [DOCTOR, "--json", ...args], { encoding: "utf8", env: { ...process.env, ...env }, timeout: 180000 });
  try { return { ...JSON.parse(r.stdout), status: r.status }; } catch { return { ok: false, missing: ["doctor sem saida"], status: r.status, stderr: r.stderr }; }
};
const health = doctorJson(["--no-smoke"]);
const skipRender = health.ok ? false : `dependencias do render ausentes: ${(health.missing || []).join(", ")} (rode doctor.mjs --install)`;

test("render-seek: MP4 com a duracao pedida, quadros iguais em dois renders e centro correto", { skip: skipRender, timeout: 120000 }, () => {
  const out = mkdtempSync(join(tmpdir(), "rseek-"));
  try {
    const page = join(root, "skills", "86-code-motion-film", "assets", "example", "index.html");
    const run = (...a) => spawnSync(process.execPath, [RENDER, page, "--size", "320x180", ...a], { encoding: "utf8", env: process.env });
    const mp4 = run("--out", join(out, "f.mp4"), "--duration", "1", "--fps", "12");
    assert.equal(mp4.status, 0, mp4.stderr);
    const probe = spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames,width,height", "-of", "default=nw=1", join(out, "f.mp4")], { encoding: "utf8" }).stdout;
    assert.match(probe, /width=320/);
    assert.match(probe, /nb_read_frames=12/);

    run("--stills", "2.0", "--stills-dir", join(out, "a"));
    run("--stills", "2.0", "--stills-dir", join(out, "b"));
    const hash = (d) => createHash("sha256").update(readFileSync(join(out, d, readdirSync(join(out, d))[0]))).digest("hex");
    assert.equal(hash("a"), hash("b"), "render deterministico: mesmo instante, mesmos pixels");

    const one = run("--stills", "0", "--sheet", join(out, "um.png"), "--stills-dir", join(out, "c"));
    assert.equal(one.status, 0, one.stderr);
    assert.ok(existsSync(join(out, "um.png")), "folha de um quadro so (xstack exige 2+)");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

// ================================================================== 86: dependencias (doctor)
test("deps: pasta de ferramentas e ordem de busca do Playwright (estrita para env e ferramentas)", () => {
  const saved = { t: process.env.DEVKIT_TOOLS_DIR, p: process.env.PLAYWRIGHT_DIR };
  const base = mkdtempSync(join(tmpdir(), "deps-"));
  try {
    process.env.DEVKIT_TOOLS_DIR = join(base, "tools");
    delete process.env.PLAYWRIGHT_DIR;
    assert.equal(toolsDir(), join(base, "tools"));
    let bases = playwrightBases();
    assert.deepEqual(bases.slice(0, 1).map((b) => [b.dir, b.strict]), [[join(base, "tools"), true]]);
    assert.equal(bases.at(-1).strict, false, "o projeto e esta pasta seguem a resolucao normal do Node");

    process.env.PLAYWRIGHT_DIR = join(base, "pw");
    bases = playwrightBases();
    assert.deepEqual(bases[0], { dir: join(base, "pw"), strict: true }, "PLAYWRIGHT_DIR tem prioridade");

    // pacote falso em tools/node_modules/playwright: achado; um filho SEM o pacote nao herda o do pai
    const fake = (dir) => { mkdirSync(join(dir, "node_modules", "playwright"), { recursive: true }); writeFileSync(join(dir, "node_modules", "playwright", "package.json"), '{"name":"playwright","main":"index.js"}'); writeFileSync(join(dir, "node_modules", "playwright", "index.js"), "module.exports={chromium:{executablePath:()=>'x'}};"); };
    delete process.env.PLAYWRIGHT_DIR;
    fake(join(base, "tools"));
    assert.equal(findPlaywright()?.base, join(base, "tools"));
    process.env.PLAYWRIGHT_DIR = join(base, "tools", "sub"); // dentro de uma pasta que TEM node_modules/playwright
    mkdirSync(join(base, "tools", "sub"), { recursive: true });
    assert.equal(findPlaywright()?.base, join(base, "tools"), "PLAYWRIGHT_DIR estrito sem o pacote cai para a pasta de ferramentas, nao para o pai");
  } finally {
    if (saved.t === undefined) delete process.env.DEVKIT_TOOLS_DIR; else process.env.DEVKIT_TOOLS_DIR = saved.t;
    if (saved.p === undefined) delete process.env.PLAYWRIGHT_DIR; else process.env.PLAYWRIGHT_DIR = saved.p;
    rmSync(base, { recursive: true, force: true });
  }
});

test("deps: o que falta vira instrucao de acao; erro de navegador ausente e reconhecido", () => {
  const ok = { node: { ok: true, version: "22" }, ffmpeg: { ok: true }, playwright: { ok: true }, chromium: { ok: true } };
  assert.equal(allOk(ok), true);
  assert.deepEqual(missing({ ...ok, ffmpeg: { ok: false } }), ["ffmpeg/ffprobe"]);
  assert.deepEqual(missing({ ...ok, playwright: { ok: false }, chromium: { ok: false } }), ["pacote playwright"]);
  assert.deepEqual(missing({ ...ok, chromium: { ok: false } }), ["Chromium do Playwright"]);
  assert.deepEqual(missing({ ...ok, node: { ok: false, version: "16.0.0" } }), ["Node >= 18 (achei 16.0.0)"]);
  assert.ok(isMissingBrowserError("browserType.launch: Executable doesn't exist at /x/chrome-headless-shell"));
  assert.ok(isMissingBrowserError("Please run: npx playwright install"));
  assert.ok(!isMissingBrowserError("net::ERR_CONNECTION_REFUSED"));
  assert.ok(browsersPath().length > 0);
});

test("doctor: sem ffmpeg ele diz o que falta e, com --install --dry-run, mostra o plano sem executar nada", () => {
  const r = doctorJson(["--no-smoke", "--install", "--dry-run"], { DEVKIT_SIMULATE_MISSING: "ffmpeg" });
  assert.equal(r.ok, false);
  assert.equal(r.status, 1);
  assert.ok(r.missing.includes("ffmpeg/ffprobe"));
  assert.ok(r.actions.some((a) => a.step === "ffmpeg"));
  // com um gerenciador de pacotes disponivel o plano nomeia o ffmpeg; sem nenhum, devolve a dica manual
  const ffAction = r.actions.find((a) => a.step === "ffmpeg");
  assert.ok(r.planned.some((c) => /ffmpeg/.test(c)) || /\S/.test(ffAction.hint || ""), "plano ou dica manual");
  assert.ok(r.planned.every((c) => !/rm |del /.test(c)));
});

test("doctor: sem --install nao instala nem altera nada (so verifica)", () => {
  const r = doctorJson(["--no-smoke"], { DEVKIT_SIMULATE_MISSING: "ffmpeg" });
  assert.equal(r.ok, false);
  assert.deepEqual(r.actions, []);
  assert.deepEqual(r.planned, []);
});

test("render-seek sem ffmpeg para ANTES de abrir o navegador e diz o comando exato", () => {
  const res = spawnSync(process.execPath, [RENDER, join(root, "skills", "86-code-motion-film", "assets", "example", "index.html"), "--stills", "0", "--stills-dir", join(tmpdir(), "nao-deve-existir-rs")], { encoding: "utf8", env: { ...process.env, DEVKIT_SIMULATE_MISSING: "ffmpeg" } });
  assert.equal(res.status, 1);
  assert.match(res.stderr, /Faltam dependencias do render: ffmpeg\/ffprobe/);
  assert.match(res.stderr, /doctor\.mjs" --install|doctor\.mjs --install/);
  assert.ok(!existsSync(join(tmpdir(), "nao-deve-existir-rs")));
});

test("doctor completo: tudo presente => ok e prova com um render de verdade", { skip: skipRender, timeout: 240000 }, () => {
  const r = doctorJson([]);
  assert.equal(r.ok, true, JSON.stringify(r).slice(0, 600));
  assert.equal(r.smoke.ok, true);
  assert.match(r.smoke.detail, /MP4 verificado com ffprobe/);
  assert.equal(r.state.chromium.ok, true);
});

// ================================================================== 86: padrao, biblioteca local e linter de brief
import { analyze, classify, FEATURES, indexMarkdown, libDir, loadLibrary, parseEntry, searchEntries } from "../../skills/86-code-motion-film/scripts/prompt-motion.mjs";
import { lintBrief } from "../../skills/86-code-motion-film/scripts/brief-lint.mjs";
import { serve } from "../../skills/86-code-motion-film/scripts/render-seek.mjs";

const SK = join(root, "skills", "86-code-motion-film");
const BRIEF_LINT = join(SK, "scripts", "brief-lint.mjs");
const errs = (r) => r.findings.filter((f) => f.level === "error").map((f) => f.rule);
const readFileUtf8 = (p) => readFileSync(p, "utf8").replace(/^﻿/, "");

test("prompt-motion: parseEntry le titulo, criador, tipo, modelo, esforco e o texto (DOM inventado, sem conteudo de ninguem)", () => {
  const dom = {
    title: "Pulsing dot study",
    text: "All videos\nA\nAda Exemplo\n@ada_exemplo\nView post\n(opens in a new tab)\nPulsing dot study\nPrompt\nCopy\nmake a 12-second film about a pulsing dot.\nno gradients.\n\nThis prompt was taken directly from @ada_exemplo’s post\n(opens in a new tab)\n.\n\nModel\nOpus 5.5\nEffort\nHigh\nPosted\nOct 1, 2026",
    links: [["View post", "https://x.com/ada_exemplo/status/123"]],
    video: "https://media.example.invalid/v.mp4",
  };
  const e = parseEntry("ada-exemplo-aaaaaa", dom);
  assert.equal(e.title, "Pulsing dot study");
  assert.equal(e.creator, "Ada Exemplo");
  assert.equal(e.handle, "ada_exemplo");
  assert.equal(e.kind, "prompt");
  assert.equal(e.model, "Opus 5.5");
  assert.equal(e.effort, "High");
  assert.equal(e.posted, "Oct 1, 2026");
  assert.equal(e.prompt, "make a 12-second film about a pulsing dot.\nno gradients.");
  assert.equal(e.post_url, "https://x.com/ada_exemplo/status/123");
  const sk = parseEntry("x-bbbbbb", { title: "Pack", links: [["v", "https://x.com/z/status/9"]], text: "All videos\nZed\n@z\nPack\nSkill\nCopy\nA skill that does a thing.\n\nnpx skills add a/b\nCopy\nView repo\n\nModel\nOpus 5.5\nPosted\nOct 4, 2026" });
  assert.equal(sk.kind, "skill");
  assert.match(sk.prompt, /^A skill that does a thing/);
});

test("prompt-motion: camadas T0..T3 e skill sao decididas pela ESTRUTURA", () => {
  const e = (prompt, kind = "prompt") => ({ kind, prompt, prompt_chars: prompt.length });
  assert.equal(classify(e("make a 15 second reel, go all out")), "T0");
  assert.equal(classify(e("x".repeat(400))), "T0", "texto longo sem estrutura continua T0");
  assert.equal(classify(e("A skill.", "skill")), "skill");
  assert.equal(classify(e("Make a film.\n\nRULES\n- no gradients\n- no glow\n- never use stock\n\nCRAFT\n- springs\n".padEnd(260, " "))), "T1");
  const t2 = "<inputs>Ask me for X</inputs>\n<direction>Banned: a, b, c</direction>\n<structure>120 BPM</structure>\n<build>seek(t)</build>";
  assert.equal(classify(e(t2)), "T2");
  const t3 = `${t2}\n${"S1 f0–71 a. S2 f72–100 b. S3 f101–158 c. S4 f159–200 d. ".repeat(10)}`.padEnd(1600, " ");
  assert.equal(classify(e(t3)), "T3");
});

test("prompt-motion: analyze conta camadas, duplicatas e caracteristicas; 'motion graphics' nao vira 'grafico/dados'", () => {
  const mk = (slug, prompt, extra = {}) => ({ slug, kind: "prompt", prompt, prompt_chars: prompt.length, title: slug, handle: "h", effort: null, ...extra });
  const lib = { synced_at: "2026-10-07T00:00:00Z", entries: [
    mk("a", "make a dynamic 15-second motion graphics video, showreel, go all out"),
    mk("b", "make a dynamic 15-second motion graphics video, showreel, go all out"),
    mk("c", "a bar chart that draws itself in a dashboard"),
    mk("d", "<inputs>Ask me for x</inputs><direction>Banned: a, b, c. one accent</direction><structure>120 BPM</structure><build>seek(t) closed-form springs, one HTML file, Playwright and ffmpeg</build>"),
  ] };
  const a = analyze(lib);
  assert.equal(a.entradas, 4);
  assert.equal(a.distintos, 3);
  assert.equal(a.entradas_em_duplicata, 2);
  assert.equal(a.maior_duplicata.copias, 2);
  assert.equal(a.tiers.T2.n, 1);
  const byName = (g, n) => a[g].find((x) => x.name === n)?.n ?? 0;
  assert.equal(byName("estilo", "grafico/dados"), 1, "so a entrada do grafico de barras");
  assert.equal(byName("duracao", "15 s"), 2);
  assert.equal(byName("estilo", "showreel/reel"), 2);
  assert.equal(byName("estrutura", "seek/deterministico"), 1);
  assert.ok(Object.values(FEATURES).every((g) => g.every(([name, re]) => name && re instanceof RegExp)));
});

test("prompt-motion: busca por termos (sem acento) e indice sem NENHUM texto de prompt", () => {
  const es = [
    { slug: "a-111111", title: "Kinetic type reel", handle: "a", kind: "prompt", prompt: "tipografia cinetica ritmada", prompt_chars: 27, url: "u1", post_url: "p1" },
    { slug: "b-222222", title: "Other", handle: "b", kind: "prompt", prompt: "nada a ver", prompt_chars: 10, url: "u2", post_url: "p2" },
  ];
  assert.deepEqual(searchEntries(es, ["cinética"]).map((e) => e.slug), ["a-111111"]);
  assert.deepEqual(searchEntries(es, ["kinetic"]).map((e) => e.slug), ["a-111111"], "titulo conta");
  assert.deepEqual(searchEntries(es, ["zzz"]), []);
  const md = indexMarkdown({ synced_at: "2026-10-07T00:00:00Z", entries: es });
  assert.match(md, /Kinetic type reel/);
  assert.match(md, /\[@a\]\(https:\/\/x\.com\/a\)/);
  assert.ok(!md.includes("tipografia cinetica ritmada"), "o indice nao pode conter o texto do prompt");
});

test("prompt-motion: a biblioteca fica FORA do repositorio (e respeita DEVKIT_PM_DIR)", () => {
  const saved = process.env.DEVKIT_PM_DIR;
  try {
    delete process.env.DEVKIT_PM_DIR;
    const dir = libDir();
    assert.ok(!dir.startsWith(root), `biblioteca em ${dir} esta dentro do repo`);
    assert.match(dir, /\.dev-team-kit/);
    process.env.DEVKIT_PM_DIR = join(tmpdir(), "pm-x");
    assert.equal(libDir(), join(tmpdir(), "pm-x"));
    assert.deepEqual(loadLibrary().entries, [], "biblioteca inexistente = vazia, sem erro");
  } finally {
    if (saved === undefined) delete process.env.DEVKIT_PM_DIR; else process.env.DEVKIT_PM_DIR = saved;
  }
});

test("GUARDA DE DIREITOS: nenhum prompt da biblioteca local aparece literalmente em arquivos do repositorio", { skip: !existsSync(join(libDir(), "library.json")) && "sem biblioteca local (rode prompt-motion.mjs sync)" }, () => {
  const lib = loadLibrary();
  const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const texts = [];
  const walk = (d) => {
    for (const ent of readdirSync(d, { withFileTypes: true })) {
      if (ent.name === ".git" || ent.name === "node_modules" || ent.name === "graphify-out") continue;
      const p = join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (/\.(md|mjs|js|json|html|yml|yaml|txt)$/i.test(ent.name) && statSyncSize(p) < 3e6) texts.push(norm(readFileSync(p, "utf8")));
    }
  };
  for (const d of ["skills", "docs", "policies", "plugins", "evals", "templates", "scripts", "commands", "agents"]) if (existsSync(join(root, d))) walk(join(root, d));
  for (const f of readdirSync(root)) if (/\.md$/i.test(f)) texts.push(norm(readFileSync(join(root, f), "utf8")));
  const haystack = texts.join("\n");
  const leaks = lib.entries.filter((e) => norm(e.prompt).length >= 80 && haystack.includes(norm(e.prompt).slice(0, 80))).map((e) => e.slug);
  assert.deepEqual(leaks, [], `prompt(s) copiado(s) literalmente no repo: ${leaks.slice(0, 5).join(", ")}`);
});
function statSyncSize(p) { try { return readFileSync(p).length; } catch { return Infinity; } }

test("brief-lint: os briefs dos exemplos passam, os templates so falham por campos [EDITE]", () => {
  for (const f of ["assets/example/BRIEF.md", "assets/example-recipe/BRIEF.md"]) {
    const r = lintBrief(readFileUtf8(join(SK, f)));
    assert.deepEqual(r.findings, [], `${f}: ${JSON.stringify(r.findings)}`);
  }
  assert.deepEqual(errs(lintBrief(readFileUtf8(join(SK, "assets/templates/director-brief.md")))), ["template-fields"]);
  assert.deepEqual(errs(lintBrief(readFileUtf8(join(SK, "assets/templates/quick-brief.md")), { profile: "quick" })), ["template-fields"]);
  assert.equal(spawnSync(process.execPath, [BRIEF_LINT, join(SK, "assets/example/BRIEF.md"), "--strict"]).status, 0);
  assert.equal(spawnSync(process.execPath, [BRIEF_LINT, join(SK, "assets/templates/director-brief.md"), "--strict"]).status, 1);
});

test("brief-lint: cada parte do padrao e cobrada separadamente", () => {
  const good = readFileUtf8(join(SK, "assets/example/BRIEF.md"));
  const without = (tagName) => good.replace(new RegExp(`<${tagName}>[\\s\\S]*?</${tagName}>`, "i"), "");
  for (const t of ["inputs", "direction", "structure", "build", "start"]) assert.ok(errs(lintBrief(without(t))).includes(`tag-${t}`), `sem <${t}>`);
  assert.ok(lintBrief(without("gotchas")).findings.some((f) => f.rule === "tag-gotchas" && f.level === "warn"));
  assert.ok(errs(lintBrief(good.replace(/Proibido:[^\n]*/, "Sem gradientes."))).includes("direction-banned"));
  assert.ok(errs(lintBrief(good.replace(/120 BPM[^\n]*\n(b\d+[^\n]*\n)+/i, "um filme bonito e calmo\n"))).includes("structure-time"));
  assert.ok(errs(lintBrief(good.replace(/seek\(t\)/g, "uma funcao"))).includes("build-seek"));
  assert.ok(errs(lintBrief(good.replace(/Peça-me: [^\n]*/, "Use o produto X."))).includes("inputs-ask"));
  assert.ok(errs(lintBrief(good.replace(/Peça-me os inputs e, antes de escrever qualquer código, mostre-me[^\n]*/, "Construa o filme."))).includes("start-ask"));
  assert.ok(errs(lintBrief(good.replace(/Peça-me os inputs e, antes de escrever qualquer código, mostre-me[^\n]*/, "Peça-me os inputs e construa."))).includes("start-show"));
  assert.ok(errs(lintBrief(`${good}\nUse {{PRODUCT}} aqui.`)).includes("placeholders"));
  // quick
  const quick = "Faça um filme de 15 s sobre um produto. Cores #111 e #eee, música a 120 BPM. Sem gradientes e sem jargão. Estilo editorial com referência clara e regras de acabamento bem definidas aqui.";
  assert.deepEqual(errs(lintBrief(quick, { profile: "quick" })), []);
  assert.ok(errs(lintBrief("Faça um filme bonito, sem gradientes. Cores e música.", { profile: "quick" })).includes("quick-duration"));
});

test("filme de receita: o liquido aparece (pixel vermelho no copo) e o titulo volta no fim", { skip: skipRender, timeout: 120000 }, async () => {
  const { chromium } = (await import("../../skills/86-code-motion-film/scripts/deps.mjs")).findPlaywright().module;
  const { server, port } = await serve(join(SK, "assets", "example-recipe"));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
    await page.goto(`http://127.0.0.1:${port}/index.html?w=640&h=360`);
    const px = async (t, x, y) => page.evaluate(([tt, xx, yy]) => { window.seek(tt); const d = document.getElementById("c").getContext("2d").getImageData(xx, yy, 1, 1).data; return [d[0], d[1], d[2]]; }, [t, x, y]);
    // t=11.9: copo cheio; ponto dentro do copo, na altura do liquido (centro x=320; liquido ocupa a metade de baixo do copo)
    const full = await px(11.9, 300, 205);
    assert.ok(full[0] > full[1] + 60 && full[0] > full[2] + 60, `liquido final deveria ser vermelho-escuro, veio rgb(${full})`);
    const empty = await px(0.5, 300, 205);
    assert.deepEqual(empty, [246, 239, 228], "no inicio o copo esta vazio (cor do papel)");
    // determinismo: o mesmo instante dá o mesmo pixel em chamadas diferentes
    assert.deepEqual(await px(9.4, 300, 205), await px(9.4, 300, 205));
    // loop de titulo: no quadro final o titulo esta de volta (pixel escuro no texto "NEGRONI")
    const title = await page.evaluate(() => { window.seek(11.9); const c = document.getElementById("c").getContext("2d"); const d = c.getImageData(250, 55, 140, 28).data; let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 90 && d[i + 1] < 90) dark++; return dark; });
    assert.ok(title > 50, `titulo ausente no ultimo quadro (${title} pixels escuros)`);
  } finally {
    await browser.close();
    server.close();
  }
});

// ================================================================== 86: padrao de qualidade (filme Relay, stage, blur, partitura)
import { clamp01, ease, mixHex, typed } from "../../skills/86-code-motion-film/scripts/stage.mjs";

test("audio-synth: partitura limita bateria por batidas, eventos entram no tempo certo e tudo e deterministico", () => {
  const score = { bpm: 120, seconds: 4, drums: [[4, 8]], bass: false, events: [{ t: 1, type: "impact" }, { t: 0.2, type: "type" }] };
  const a = synth(score), b = synth(score);
  assert.deepEqual(a.samples.slice(0, 4000), b.samples.slice(0, 4000));
  const rms = (t0, t1) => { let s = 0, n = 0; for (let i = Math.floor(t0 * a.rate); i < Math.floor(t1 * a.rate); i++) { s += a.samples[i] ** 2; n++; } return Math.sqrt(s / n); };
  assert.ok(rms(0.5, 0.56) < 0.001, "batida 1 (0,5 s) sem bateria: so silencio");
  assert.ok(rms(2.0, 2.06) > 0.05, "batida 4 (2,0 s) dentro da faixa: bumbo audivel");
  assert.ok(rms(1.0, 1.1) > 0.1, "impacto em 1,0 s");
  assert.ok(rms(0.2, 0.22) > 0.005, "tecla em 0,2 s");
  const legacy = synth({ bpm: 120, seconds: 2 });
  assert.ok(legacy.samples.slice(0, 4000).some((v) => Math.abs(v) > 0.05), "sem drums: comportamento original (kick sempre)");
});

test("stage: ajudantes puros (typed, ease, clamp01, mixHex)", () => {
  assert.equal(typed("relay ship", 0.2, 10, 0.1), "");
  assert.equal(typed("relay ship", 0.2, 10, 0.5), "rel");
  assert.equal(typed("relay ship", 0.2, 10, 9), "relay ship");
  assert.equal(clamp01(-3), 0); assert.equal(clamp01(2), 1);
  assert.equal(ease(0), 0); assert.equal(ease(1), 1); assert.ok(ease(0.5) > 0.5, "ease-out");
  assert.equal(mixHex("#000000", "#ffffff", 0.5), "rgb(128,128,128)");
  assert.equal(mixHex("#000000", "#ff0000", 5), "rgb(255,0,0)");
});

test("brief do filme Relay passa no linter (--strict) e o filme tem partitura valida", () => {
  const dir = join(SK, "assets", "example-launch");
  assert.deepEqual(lintBrief(readFileUtf8(join(dir, "BRIEF.md"))).findings, []);
  assert.equal(spawnSync(process.execPath, [BRIEF_LINT, join(dir, "BRIEF.md"), "--strict"]).status, 0);
  const score = JSON.parse(readFileUtf8(join(dir, "score.json")));
  assert.equal(score.bpm, 120);
  assert.equal(score.seconds, 15);
  assert.ok(score.events.length > 20 && score.events.every((e) => e.t >= 0 && e.t < 15), "eventos dentro dos 15 s");
});

test("filme Relay: loop fecha (primeiro = ultimo quadro) e --blur mantem a duracao", { skip: skipRender, timeout: 240000 }, () => {
  const out = mkdtempSync(join(tmpdir(), "relay-"));
  try {
    const page = join(SK, "assets", "example-launch", "index.html");
    const run = (...a) => spawnSync(process.execPath, [RENDER, page, "--size", "640x360", ...a], { encoding: "utf8", env: process.env });
    const s = run("--stills", "0,14.999", "--stills-dir", join(out, "s"));
    assert.equal(s.status, 0, s.stderr);
    // o grao muda por quadro (numero do quadro), entao compara a estrutura: reduz os dois a 16x9 em escala de cinza
    const small = (f) => spawnSync("ffmpeg", ["-v", "error", "-i", join(out, "s", f), "-vf", "scale=16:9,format=gray", "-f", "rawvideo", "-"], { encoding: "buffer" }).stdout;
    const [f0, f1] = readdirSync(join(out, "s")).sort();
    const A = small(f0), B = small(f1);
    let diff = 0; for (let i = 0; i < A.length; i++) diff = Math.max(diff, Math.abs(A[i] - B[i]));
    assert.ok(A.length === 144 && diff <= 12, `ultimo quadro deveria igualar o primeiro (diferenca maxima ${diff})`);

    const m = run("--out", join(out, "b.mp4"), "--duration", "1", "--fps", "10", "--blur", "3");
    assert.equal(m.status, 0, m.stderr);
    assert.match(m.stdout, /motion blur 3/);
    const probe = spawnSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "default=nw=1", join(out, "b.mp4")], { encoding: "utf8" }).stdout;
    assert.match(probe, /nb_read_frames=10/, "3 subquadros por quadro, mas 10 quadros de saida");
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
