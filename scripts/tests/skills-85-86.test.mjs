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
import { loadPlaywright } from "../../skills/86-code-motion-film/scripts/render-seek.mjs";

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
const playwrightOk = (() => { try { loadPlaywright(); return true; } catch { return false; } })();
const ffmpegOk = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status === 0;
const skipRender = !playwrightOk ? "Playwright nao encontrado (defina PLAYWRIGHT_DIR)" : !ffmpegOk ? "ffmpeg ausente" : false;

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
