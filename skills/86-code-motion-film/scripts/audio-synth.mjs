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
import { writeFileSync } from "node:fs";
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

export function synth({ bpm = 120, seconds = 8, cuts = [], rate = 44100, seed = 1 } = {}) {
  const out = new Float32Array(Math.floor(seconds * rate));
  let rng = seed >>> 0 || 1;
  const noise = () => { rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0; return rng / 2147483648 - 1; }; // deterministico

  const beats = beatGrid(bpm, Math.ceil((seconds * bpm) / 60));
  for (const t of beats) stamp(out, rate, t, 0.25, (x) => 0.9 * Math.sin(TAU * (50 + 90 * Math.exp(-x * 30)) * x) * Math.exp(-x * 14)); // kick
  for (const t of beatGrid(bpm, Math.ceil((seconds * bpm) / 60), 2, 60 / bpm / 2).filter((_, k) => k % 2 === 0)) stamp(out, rate, t, 0.06, (x) => 0.18 * noise() * Math.exp(-x * 60)); // chimbal nas contra-batidas
  const bar = (60 / bpm) * 4;
  const notes = [55, 55, 65.41, 49]; // A1 A1 C2 G1
  for (let b = 0; b * bar < seconds; b++) stamp(out, rate, b * bar, bar * 0.9, (x) => 0.28 * Math.sin(TAU * notes[b % notes.length] * x) * Math.min(1, x * 40) * Math.exp(-x * 1.5)); // baixo
  for (const c of cuts) stamp(out, rate, snapToBeat(c, bpm), 0.12, (x) => 0.35 * Math.sin(TAU * 1760 * x) * Math.exp(-x * 40)); // tick no corte

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
  if (!out) { console.error("Uso: audio-synth.mjs --bpm 120 --seconds 6 [--cuts 0,2,4] --out score.wav [--rate 44100]"); process.exit(2); }
  const { samples, rate } = synth({ bpm: Number(v("--bpm", 120)), seconds: Number(v("--seconds", 8)), cuts: v("--cuts", "").split(",").filter(Boolean).map(Number), rate: Number(v("--rate", 44100)) });
  writeFileSync(resolve(out), encodeWav(samples, rate));
  console.log(`${resolve(out)} — ${(samples.length / rate).toFixed(2)} s @ ${rate} Hz`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
