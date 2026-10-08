#!/usr/bin/env node
/**
 * audio-synth — trilha sintetizada NA MESMA LINHA DO TEMPO da imagem, sem dependencias (WAV mono 16 bits).
 *
 * Kick nas batidas, chimbal nas contra-batidas, baixo por compasso e um "tick" de acento em cada corte.
 * E propositalmente simples: serve para provar o encaixe (corte travado no BPM) e como rascunho de
 * ritmo; trilha final de verdade = musica fornecida (medir o BPM) ou sintese mais rica.
 *
 *   node audio-synth.mjs --bpm 120 --seconds 6 --cuts 0,2,4 --out score.wav [--rate 44100]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beatGrid, snapToBeat } from "./motion.mjs";

const TAU = Math.PI * 2;

/** Soma `fn(i/rate - t0)` em out a partir de t0, por `len` segundos. */
function stamp(out, rate, t0, len, fn) {
  const start = Math.max(0, Math.floor(t0 * rate));
  const end = Math.min(out.length, Math.floor((t0 + len) * rate));
  for (let i = start; i < end; i++) out[i] += fn(i / rate - t0);
}

const inRanges = (beat, ranges) => ranges.some(([a, b]) => beat >= a && beat < b);

/** Eventos de design de som (cada um e uma funcao do tempo local x desde o inicio do evento). */
const EVENT_LEN = { impact: 1.4, riser: 1.0, click: 0.1, type: 0.05, whoosh: 0.6, chime: 1.0, clap: 0.25 };
function eventFn(type, len, noise) {
  switch (type) {
    case "impact": return (x) => 0.95 * Math.sin(TAU * (38 + 70 * Math.exp(-x * 9)) * x) * Math.exp(-x * 3.2) + 0.3 * noise() * Math.exp(-x * 16); // pancada grave + estalo
    case "riser": return (x) => { const k = x / len; return 0.3 * k * k * (0.5 * noise() + Math.sin(TAU * (300 + 3700 * k * k) * x)); }; // sobe ate o corte; termina seco
    case "click": return (x) => 0.32 * Math.sin(TAU * 1800 * x) * Math.exp(-x * 90) + 0.1 * noise() * Math.exp(-x * 260);
    case "type": return (x) => 0.1 * noise() * Math.exp(-x * 450) + 0.09 * Math.sin(TAU * 3100 * x) * Math.exp(-x * 320);
    case "whoosh": return (x) => { const k = x / len; return 0.26 * Math.sin(Math.PI * k) ** 2 * (0.7 * noise() + 0.3 * Math.sin(TAU * (500 + 2600 * k) * x)); };
    case "chime": return (x) => 0.3 * (Math.sin(TAU * 880 * x) * Math.exp(-x * 5) + (x > 0.07 ? Math.sin(TAU * 1318.5 * (x - 0.07)) * Math.exp(-(x - 0.07) * 5) : 0));
    case "clap": return (x) => 0.33 * noise() * (Math.exp(-x * 26) + (x > 0.012 ? Math.exp(-(x - 0.012) * 26) : 0));
    default: return () => 0;
  }
}

/**
 * Trilha sintetizada. Sem `drums`, bumbo em toda batida e chimbal nas contra-batidas (comportamento original).
 * Com `drums: [[batidaIni, batidaFim], ...]` a bateria so toca nesses trechos (ex.: cena de impacto), `clap: [[...]]` bate
 * nos tempos 2 e 4, `bass: false|[[ini,fim]]` limita o baixo e `events: [{t, type, len?}]` posiciona efeitos
 * (impact, riser, click, type, whoosh, chime, clap) em segundos.
 */
export function synth({ bpm = 120, seconds = 8, cuts = [], rate = 44100, seed = 1, drums, clap, bass = true, events = [] } = {}) {
  const out = new Float32Array(Math.floor(seconds * rate));
  let rng = seed >>> 0 || 1;
  const noise = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 2147483648 - 1; }; // deterministico

  const nBeats = Math.ceil((seconds * bpm) / 60);
  const beats = beatGrid(bpm, nBeats);
  for (const [k, t] of beats.entries()) if (!drums || inRanges(k, drums)) stamp(out, rate, t, 0.25, (x) => 0.9 * Math.sin(TAU * (50 + 90 * Math.exp(-x * 30)) * x) * Math.exp(-x * 14)); // kick
  for (const [k, t] of beatGrid(bpm, nBeats, 2, 60 / bpm / 2).entries()) if (k % 2 === 0 && (!drums || inRanges(k / 2, drums))) stamp(out, rate, t, 0.06, (x) => 0.18 * noise() * Math.exp(-x * 60)); // chimbal nas contra-batidas
  const bar = (60 / bpm) * 4;
  const notes = [55, 55, 65.41, 49]; // A1 A1 C2 G1
  for (let b = 0; b * bar < seconds; b++) if (bass === true || (Array.isArray(bass) && inRanges(b * 4, bass))) stamp(out, rate, b * bar, bar * 0.9, (x) => 0.28 * Math.sin(TAU * notes[b % notes.length] * x) * Math.min(1, x * 40) * Math.exp(-x * 1.5)); // baixo
  if (clap) for (const [k, t] of beats.entries()) if (k % 2 === 1 && inRanges(k, clap)) stamp(out, rate, t, EVENT_LEN.clap, eventFn("clap", EVENT_LEN.clap, noise));
  for (const c of cuts) stamp(out, rate, snapToBeat(c, bpm), 0.12, (x) => 0.35 * Math.sin(TAU * 1760 * x) * Math.exp(-x * 40)); // tick no corte
  for (const e of events) { const len = e.len ?? EVENT_LEN[e.type] ?? 0.3; stamp(out, rate, e.t, len, eventFn(e.type, len, noise)); }

  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  if (peak > 0.95) for (let i = 0; i < out.length; i++) out[i] *= 0.95 / peak;
  return { samples: out, rate };
}

export function encodeWav(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf;
}

function main() {
  const a = process.argv.slice(2);
  const v = (n, d) => { const i = a.indexOf(n); return i !== -1 ? a[i + 1] : d; };
  const out = v("--out");
  if (!out) { console.error("Uso: audio-synth.mjs --bpm 120 --seconds 6 [--cuts 0,2,4] --out score.wav [--rate 44100]\n     audio-synth.mjs --score partitura.json --out score.wav   # {bpm, seconds, drums:[[b0,b1]], clap:[[b0,b1]], bass, cuts, events:[{t, type}]}"); process.exit(2); }
  const file = v("--score") ? JSON.parse(readFileSync(resolve(v("--score")), "utf8").replace(/^﻿/, "")) : null;
  const { samples, rate } = synth(file ?? { bpm: Number(v("--bpm", 120)), seconds: Number(v("--seconds", 8)), cuts: v("--cuts", "").split(",").filter(Boolean).map(Number), rate: Number(v("--rate", 44100)) });
  writeFileSync(resolve(out), encodeWav(samples, rate));
  console.log(`${resolve(out)} — ${(samples.length / rate).toFixed(2)} s @ ${rate} Hz`);
}

// compara pelo caminho real: process.argv[1] pode vir por link simbolico (macOS /var -> /private/var) e import.meta.url nao; sem isso o script sai em silencio sem rodar
import { realpathSync as realpathMain } from "node:fs";
const isMainModule = (url) => { try { return realpathMain(process.argv[1]) === realpathMain(fileURLToPath(url)); } catch { return process.argv[1] === fileURLToPath(url); } };
if (process.argv[1] && isMainModule(import.meta.url)) main();
