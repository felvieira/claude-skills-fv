/**
 * Skill 86: verificador de determinismo (check-film), analise de audio (beats), faixas de quadros e supersampling.
 * Roda com: node --test scripts/tests/skill-86-film-tools.test.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { encodeWav } from "../../skills/86-code-motion-film/scripts/audio-synth.mjs";
import { analyzeSamples, cutBars } from "../../skills/86-code-motion-film/scripts/beats.mjs";
import { checkFilm, scanSource } from "../../skills/86-code-motion-film/scripts/check-film.mjs";
import { parseTimes } from "../../skills/86-code-motion-film/scripts/render-seek.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SK = join(root, "skills", "86-code-motion-film");
const RENDER = join(SK, "scripts", "render-seek.mjs");
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b} (±${eps})`);

const doctor = spawnSync(process.execPath, [join(SK, "scripts", "doctor.mjs"), "--no-smoke", "--json"], { encoding: "utf8", env: process.env });
let health = { ok: false, missing: ["doctor"] };
try { health = JSON.parse(doctor.stdout); } catch { /* sem doctor legivel: pula os testes que renderizam */ }
const skipRender = health.ok ? false : `dependencias do render ausentes: ${(health.missing || []).join(", ")} (rode doctor.mjs --install)`;

/** Musica sintetica a 22050 Hz: chimbais nas contra-batidas, bumbo (acento no tempo forte) a partir do compasso `kickBar`. */
function song({ bpm, offset, seconds, kickBar = 2, rate = 22050 }) {
  const out = new Float32Array(Math.floor(seconds * rate)), per = 60 / bpm;
  let seed = 7;
  const noise = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
  for (let k = 0; offset + k * per < seconds; k++) {
    const t0 = offset + k * per, acc = k % 4 === 0 ? 1 : 0.55;
    if (k >= kickBar * 4) for (let i = 0; i < 0.2 * rate; i++) { const x = i / rate, j = Math.floor(t0 * rate) + i; if (j < out.length) out[j] += 0.8 * acc * Math.sin(2 * Math.PI * (45 + 80 * Math.exp(-x * 30)) * x) * Math.exp(-x * 14); }
    const th = t0 + 0.5 * per;
    for (let i = 0; i < 0.04 * rate; i++) { const j = Math.floor(th * rate) + i; if (j < out.length) out[j] += 0.12 * noise() * Math.exp(-(i / rate) * 80); }
  }
  return out;
}
const wrapDiff = (a, b, m) => { const d = (((a - b) % m) + m) % m; return Math.min(d, m - d); };

test("beats: acha andamento, fase, tempo forte e a levantada em musica sintetica (3 andamentos)", () => {
  for (const [bpm, offset] of [[110, 0.12], [128, 0], [96, 0.17]]) {
    const r = analyzeSamples(song({ bpm, offset, seconds: 26 }));
    near(r.bpm, bpm, 0.15);
    const bar = (60 / bpm) * 4;
    assert.ok(wrapDiff(r.offset, offset, 60 / bpm) < 0.04, `${bpm} BPM: 1a batida em ${r.offset}, esperado ${offset}`);
    assert.ok(wrapDiff(r.bar1, offset, bar) < 0.04, `${bpm} BPM: compasso 1 em ${r.bar1}, esperado ${offset} (mod ${bar.toFixed(2)})`);
    assert.ok(r.drops.some((d) => d.bar === 3 && d.jump > 10), `${bpm} BPM: o bumbo entra no compasso 3: ${JSON.stringify(r.drops)}`);
    assert.ok(!r.drops.some((d) => d.bar === 4), "o mesmo drop nao e marcado em dois compassos seguidos");
  }
  assert.throws(() => analyzeSamples(new Float32Array(22050 * 2)), /curto/);
});

test("beats: o intervalo de busca mantem o andamento no alcance pedido", () => {
  near(analyzeSamples(song({ bpm: 100, offset: 0.1, seconds: 26 }), { range: [80, 160] }).bpm, 100, 0.2);
});

test("render-seek: faixas de tempo 'de:ate:passo' (inclusivas) e listas misturadas", () => {
  assert.deepEqual(parseTimes("0,1.5,2.9"), [0, 1.5, 2.9]);
  assert.deepEqual(parseTimes("1:2:0.5"), [1, 1.5, 2]);
  assert.deepEqual(parseTimes("0,3:3.2:0.1,9"), [0, 3, 3.1, 3.2, 9]);
  assert.deepEqual(parseTimes("5:4:0.1,x,2"), [2], "faixa invertida e lixo sao ignorados");
  assert.equal(parseTimes("11.8:13.4:0.05").length, 33);
});

const PAGE = (draw, extra = "") => `<!doctype html><meta charset=utf-8><canvas id=c></canvas><script>const q=new URLSearchParams(location.search),W=+q.get("w")||320,H=+q.get("h")||180;const c=document.getElementById("c");c.width=W;c.height=H;const g=c.getContext("2d");window.DURATION=2;window.ready=Promise.resolve();${extra}window.seek=(t)=>{${draw}};window.seek(0);</script>`;

test("check-film: a fonte e varrida (random, timer, relogio, animacao CSS) e comentarios nao acusam", () => {
  const dir = mkdtempSync(join(tmpdir(), "chk-"));
  try {
    writeFileSync(join(dir, "ruim.js"), "const a = Math.random();\nsetTimeout(() => {}, 5);\nconst t = Date.now();\n");
    writeFileSync(join(dir, "estilo.css"), ".a { transition: all .3s; }\n@keyframes x {}\n");
    writeFileSync(join(dir, "bom.js"), "// nao use Math.random() nem setTimeout( aqui\n/* Date.now() */\nconst x = 1; // sem timers\n");
    const found = scanSource(dir);
    assert.deepEqual([...new Set(found.map((f) => f.file))].sort(), ["estilo.css", "ruim.js"]);
    assert.equal(found.filter((f) => f.file === "ruim.js").length, 3);
    assert.equal(found.filter((f) => f.file === "estilo.css").length, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("check-film: os filmes de exemplo passam; estado preso, loop aberto e erro de pagina sao pegos", { skip: skipRender, timeout: 300000 }, async () => {
  const failing = async (p, o) => (await checkFilm(join(SK, "assets", p, "index.html"), { step: 0.25, ...o })).filter((c) => !c.ok);
  assert.deepEqual(await failing("example-launch"), []);
  assert.deepEqual(await failing("example"), []);
  assert.deepEqual(await failing("example-recipe", { loop: false }), []);

  const dir = mkdtempSync(join(tmpdir(), "chk-"));
  const opts = { width: 160, height: 90, step: 0.5 };
  try {
    writeFileSync(join(dir, "preso.html"), PAGE("n++;g.fillStyle=`rgb(${(n*37)%255},40,40)`;g.fillRect(0,0,W,H);", "let n=0;"));
    assert.ok((await checkFilm(join(dir, "preso.html"), opts)).some((c) => !c.ok && /mesmo instante/.test(c.what)), "estado preso deveria falhar");

    writeFileSync(join(dir, "aberto.html"), PAGE('g.fillStyle=t<1?"#000":"#fff";g.fillRect(0,0,W,H);'));
    assert.ok((await checkFilm(join(dir, "aberto.html"), opts)).some((c) => !c.ok && /loop/.test(c.what)), "loop aberto deveria falhar");
    assert.ok((await checkFilm(join(dir, "aberto.html"), { ...opts, loop: false })).every((c) => c.ok), "--no-loop aceita filme que nao e loop");

    writeFileSync(join(dir, "erro.html"), PAGE('if(t>1) undefinedFunction();g.fillStyle="#123";g.fillRect(0,0,W,H);'));
    assert.ok((await checkFilm(join(dir, "erro.html"), opts)).some((c) => !c.ok && /erro de pagina/.test(c.what)), "erro de pagina deveria falhar");

    writeFileSync(join(dir, "limpo.html"), PAGE('g.fillStyle="#246";g.fillRect(0,0,W,H);g.fillStyle="#fff";g.fillRect(W*0.1+W*0.2*Math.sin(t*Math.PI),H*0.4,20,20);'));
    assert.deepEqual((await checkFilm(join(dir, "limpo.html"), opts)).filter((c) => !c.ok), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("beats cut: compassos inteiros com duracao exata; render --scale reduz para o tamanho pedido", { skip: skipRender, timeout: 240000 }, () => {
  const out = mkdtempSync(join(tmpdir(), "cut-"));
  try {
    const wav = join(out, "m.wav");
    writeFileSync(wav, encodeWav(song({ bpm: 120, offset: 0, seconds: 20 }), 22050));
    const r = cutBars(wav, { bpm: 120, bar1: 0, a: 2, b: 5, out: join(out, "c.wav") });
    const dur = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(out, "c.wav")], { encoding: "utf8" }).stdout);
    near(dur, 8, 0.02); // 4 compassos a 120 BPM = 8 s
    near(r.start, 2, 1e-6);

    const page = join(SK, "assets", "example", "index.html");
    const run = spawnSync(process.execPath, [RENDER, page, "--size", "320x180", "--scale", "2", "--duration", "1", "--fps", "10", "--out", join(out, "s.mp4")], { encoding: "utf8", env: process.env });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /supersampling 2x/);
    const probe = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", join(out, "s.mp4")], { encoding: "utf8" }).stdout.trim();
    assert.equal(probe, "320,180");
  } finally { rmSync(out, { recursive: true, force: true }); }
});
