#!/usr/bin/env node
/**
 * beats — escuta uma trilha e diz onde cortar: andamento, instante da primeira batida, tempo forte (compasso 1),
 * energia por compasso e onde a musica levanta ou cai (drops). Tambem corta a trilha em compassos inteiros.
 * Sem dependencias alem do ffmpeg (decodifica) e do Node (FFT propria).
 *
 *   node beats.mjs analyze trilha.mp3 [--range 80,160] [--json]
 *   node beats.mjs cut trilha.mp3 --bpm 110 --bar1 0.30 --bars 3-10 --out corte.wav [--fade 0.008]
 *
 * Como funciona: fluxo espectral em log (onsets) -> autocorrelacao para achar o andamento -> refino do andamento
 * e da fase por um pente de batidas -> o tempo forte e a fase (entre 4) em que o grave mais bate -> RMS por compasso.
 * Ideia do fluxo de trabalho (andamento, tempo forte, drops, corte por compassos) inspirada em kaventro/motion-designer (MIT).
 */
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findFfmpeg } from "./deps.mjs";

const SR = 22050, N = 1024, HOP = 256;
const FRAME_S = HOP / SR;
const LATENCY_S = 0.025; // o fluxo espectral aparece ~25 ms antes do ataque (janela de 1024 amostras)

/** FFT radix-2 no lugar (re, im de tamanho potencia de 2). */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

/** Decodifica qualquer audio para Float32 mono a 22050 Hz com o ffmpeg. */
export function decode(file) {
  const ff = findFfmpeg().ffmpeg;
  if (!ff) throw new Error("ffmpeg nao encontrado: rode doctor.mjs --install");
  const r = spawnSync(ff.cmd, ["-v", "error", "-i", resolve(file), "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg nao leu o audio: ${String(r.stderr).trim().split("\n")[0]}`);
  const b = r.stdout;
  return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.byteLength / 4));
}

/** Envelope de onsets (fluxo espectral em log, banda cheia e banda grave) e energia por quadro. */
export function onsets(x) {
  const frames = Math.max(0, Math.floor((x.length - N) / HOP) + 1);
  const win = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  const re = new Float64Array(N), im = new Float64Array(N);
  const bins = N / 2, lowTo = Math.round((150 * N) / SR); // grave: ate ~150 Hz
  const full = new Float64Array(frames), low = new Float64Array(frames), rms = new Float64Array(frames);
  let prev = new Float64Array(bins);
  for (let f = 0; f < frames; f++) {
    let e = 0;
    for (let i = 0; i < N; i++) { const s = x[f * HOP + i]; re[i] = s * win[i]; im[i] = 0; e += s * s; }
    rms[f] = Math.sqrt(e / N);
    fft(re, im);
    const cur = new Float64Array(bins);
    let fl = 0, lw = 0;
    for (let k = 1; k < bins; k++) {
      cur[k] = Math.log1p(10 * Math.hypot(re[k], im[k]));
      const d = cur[k] - prev[k];
      if (d > 0) { fl += d; if (k <= lowTo) lw += d; }
    }
    full[f] = fl; low[f] = lw; prev = cur;
  }
  const norm = (a) => { const mean = a.reduce((s, v) => s + v, 0) / (a.length || 1), sd = Math.sqrt(a.reduce((s, v) => s + (v - mean) ** 2, 0) / (a.length || 1)) || 1; return a.map((v) => Math.max(0, (v - mean) / sd)); };
  return { full: norm(full), low: norm(low), rms, frames };
}

/** Soma interpolada do envelope nos instantes offset + k*periodo. */
export function comb(env, periodFrames, offsetFrames) {
  let s = 0, n = 0;
  for (let p = offsetFrames; p < env.length - 1; p += periodFrames) {
    const i = Math.floor(p), fr = p - i;
    s += env[i] * (1 - fr) + env[i + 1] * fr; n++;
  }
  return n ? s / n : 0;
}

/**
 * Analisa amostras mono (a 22050 Hz). Devolve { bpm, offset, bar1, confidence, beats, bars:[{n,t,db,low}], drops, breaks }.
 * `range` limita o andamento procurado (padrao 80-160, onde nao ha ambiguidade de oitava).
 */
export function analyzeSamples(x, { range = [80, 160] } = {}) {
  const { full, low, rms, frames } = onsets(x);
  if (frames < 200) throw new Error("audio curto demais para achar andamento (menos de ~5 s)");
  // 1) andamento grosso por autocorrelacao do envelope
  let best = { bpm: 0, v: -1 };
  for (let bpm = range[0]; bpm <= range[1]; bpm += 0.25) {
    const lag = 60 / bpm / FRAME_S;
    let s = 0, n = 0;
    for (let i = 0; i + lag < full.length - 1; i += 1) { const j = i + lag, k = Math.floor(j), fr = j - k; s += full[i] * (full[k] * (1 - fr) + full[k + 1] * fr); n++; }
    const v = n ? s / n : 0;
    if (v > best.v) best = { bpm, v };
  }
  if (!(best.bpm > 0)) throw new Error("nao foi possivel estimar o andamento (audio sem batidas claras?)");
  // 2) refino: andamento fino e fase (offset) pelo pente de batidas
  let fine = { bpm: best.bpm, off: 0, v: -1 };
  for (let bpm = best.bpm - 1.5; bpm <= best.bpm + 1.5; bpm += 0.02) {
    const per = 60 / bpm / FRAME_S;
    for (let ph = 0; ph < 96; ph++) {
      const off = (ph / 96) * per, v = comb(full, per, off);
      if (v > fine.v) fine = { bpm, off, v };
    }
  }
  // fase: chimbais e vozes (banda larga) puxam o pente para a contra-batida; o bumbo diz onde esta a batida.
  // Se o grave bate de forma consistente na grade, a fase vem dele; senao, da banda cheia.
  const perFine = 60 / fine.bpm / FRAME_S;
  let lowBest = { off: 0, v: -1 };
  for (let ph = 0; ph < 192; ph++) { const off = (ph / 192) * perFine, v = comb(low, perFine, off); if (v > lowBest.v) lowBest = { off, v }; }
  const phaseFrom = lowBest.v >= 1 ? "grave" : "banda cheia";
  fine.off = phaseFrom === "grave" ? lowBest.off : fine.off;
  const period = 60 / fine.bpm, perF = period / FRAME_S;
  const offset = (((fine.off * FRAME_S + LATENCY_S) % period) + period) % period;
  // 3) tempo forte: das 4 fases possiveis, a em que o grave mais bate
  const beatsN = Math.floor((x.length / SR - offset) / period);
  const score = [0, 0, 0, 0], cnt = [0, 0, 0, 0];
  for (let k = 0; k < beatsN; k++) {
    const p = (offset - LATENCY_S) / FRAME_S + k * perF, i = Math.floor(p);
    if (i + 1 >= low.length) break;
    score[k % 4] += low[i] * (1 - (p - i)) + low[i + 1] * (p - i); cnt[k % 4]++;
  }
  const mean = score.map((s, m) => (cnt[m] ? s / cnt[m] : 0));
  const down = mean.indexOf(Math.max(...mean));
  const others = mean.filter((_, m) => m !== down);
  const confidence = Math.max(0, Math.min(1, (mean[down] - others.reduce((s, v) => s + v, 0) / 3) / (mean[down] + 1e-9)));
  let bar1 = (((offset + down * period) % (period * 4)) + period * 4) % (period * 4); // 1o tempo forte a partir do inicio do audio
  if (bar1 > period * 4 - 0.06) bar1 = 0; // tempo forte a menos de 60 ms antes do inicio: e o proprio inicio
  // 4) energia por compasso (RMS em dB e grave medio)
  const barDur = period * 4, bars = [];
  for (let n = 0; bar1 + (n + 1) * barDur <= x.length / SR + 1e-6; n++) {
    const a = Math.floor((bar1 + n * barDur) / FRAME_S), b = Math.min(rms.length, Math.floor((bar1 + (n + 1) * barDur) / FRAME_S));
    let e = 0, l = 0, c = 0;
    for (let f = a; f < b; f++) { e += rms[f] ** 2; l += low[f]; c++; }
    bars.push({ n: n + 1, t: +(bar1 + n * barDur).toFixed(3), db: +(10 * Math.log10(e / (c || 1) + 1e-12)).toFixed(1), low: +(l / (c || 1)).toFixed(2) });
  }
  // 5) levantadas e quedas: salto de energia contra a media dos 2 compassos anteriores
  const drops = [], breaks = [];
  for (let i = 2; i < bars.length; i++) {
    const ref = (bars[i - 1].db + bars[i - 2].db) / 2, jump = bars[i].db - ref;
    if (jump >= 4.5 && !drops.some((d) => d.bar === bars[i - 1].n)) drops.push({ bar: bars[i].n, t: bars[i].t, jump: +jump.toFixed(1) });
    else if (jump <= -4.5 && !breaks.some((d) => d.bar === bars[i - 1].n)) breaks.push({ bar: bars[i].n, t: bars[i].t, jump: +jump.toFixed(1) });
  }
  return { bpm: +fine.bpm.toFixed(2), offset: +offset.toFixed(3), bar1: +bar1.toFixed(3), phaseFrom, downbeatPhase: down, confidence: +confidence.toFixed(2), duration: +(x.length / SR).toFixed(2), bars, drops, breaks };
}

/** Corta `a-b` compassos (1-indexados a partir de bar1) com fades curtos. Devolve o caminho de saida. */
export function cutBars(file, { bpm, bar1, a, b, out, fade = 0.008 }) {
  const ff = findFfmpeg().ffmpeg;
  if (!ff) throw new Error("ffmpeg nao encontrado: rode doctor.mjs --install");
  const barDur = (60 / bpm) * 4, start = bar1 + (a - 1) * barDur, dur = (b - a + 1) * barDur;
  const filter = `atrim=start=${start.toFixed(6)}:duration=${dur.toFixed(6)},asetpts=PTS-STARTPTS,afade=t=in:d=${fade},afade=t=out:st=${(dur - fade).toFixed(6)}:d=${fade}`;
  const r = spawnSync(ff.cmd, ["-y", "-v", "error", "-i", resolve(file), "-af", filter, resolve(out)], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg falhou no corte: ${String(r.stderr).trim().split("\n")[0]}`);
  return { out: resolve(out), start: +start.toFixed(3), duration: +dur.toFixed(3), bars: b - a + 1 };
}

function main() {
  const a = process.argv.slice(2), cmd = a[0], file = a[1];
  const v = (n, d) => { const i = a.indexOf(n); return i !== -1 ? a[i + 1] : d; };
  const usage = () => { console.error("Uso: beats.mjs analyze trilha [--range 80,160] [--json]\n     beats.mjs cut trilha --bpm 110 --bar1 0.30 --bars 3-10 --out corte.wav [--fade 0.008]"); process.exit(2); };
  if (!file || !existsSync(resolve(file))) usage();
  if (cmd === "analyze") {
    const range = v("--range", "80,160").split(",").map(Number);
    const r = analyzeSamples(decode(file), { range });
    if (a.includes("--json")) return console.log(JSON.stringify(r, null, 2));
    console.log(`andamento ${r.bpm} BPM | 1a batida em ${r.offset}s | compasso 1 em ${r.bar1}s | confianca do tempo forte ${r.confidence} | ${r.duration}s, ${r.bars.length} compassos`);
    console.log("compasso  inicio(s)  energia(dB)  grave");
    for (const b of r.bars) console.log(`${String(b.n).padStart(8)}  ${String(b.t).padStart(9)}  ${String(b.db).padStart(11)}  ${String(b.low).padStart(5)}${r.drops.some((d) => d.bar === b.n) ? "  <- levanta (drop)" : r.breaks.some((d) => d.bar === b.n) ? "  <- cai (break)" : ""}`);
    if (!r.drops.length) console.log("nenhuma levantada forte (>= 4,5 dB): musica estavel ou sem drop.");
  } else if (cmd === "cut") {
    const [lo, hi] = String(v("--bars", "")).split("-").map(Number);
    if (!v("--bpm") || !v("--bar1") || !v("--out") || !lo || !hi) usage();
    const r = cutBars(file, { bpm: Number(v("--bpm")), bar1: Number(v("--bar1")), a: lo, b: hi, out: v("--out"), fade: Number(v("--fade", 0.008)) });
    console.log(`${r.out}: ${r.bars} compassos, ${r.duration}s a partir de ${r.start}s`);
  } else usage();
}

// compara pelo caminho real: process.argv[1] pode vir por link simbolico (macOS /var -> /private/var) e import.meta.url nao; sem isso o script sai em silencio sem rodar
import { realpathSync as realpathMain } from "node:fs";
const isMainModule = (url) => { try { return realpathMain(process.argv[1]) === realpathMain(fileURLToPath(url)); } catch { return process.argv[1] === fileURLToPath(url); } };
if (process.argv[1] && isMainModule(import.meta.url)) { try { main(); } catch (e) { console.error(e.message); process.exit(1); } }
