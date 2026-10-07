/**
 * fx — efeitos como funcoes puras do tempo, para filmes seek(t). Nenhum usa relogio nem Math.random:
 * o "acaso" vem de hash(i, semente), entao o mesmo instante dá sempre o mesmo quadro.
 *
 *   import { hash, noise, stagger, countUp, shake, ambient, dashFor, wipeRect, irisRadius, kenBurns, confetti } from "/_lib/fx.mjs";
 *
 * Todos devolvem numeros/objetos simples; quem desenha (canvas ou DOM) decide como aplicar.
 */
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (k) => 1 - Math.pow(1 - clamp01(k), 3);
const smooth = (k) => { const x = clamp01(k); return x * x * (3 - 2 * x); };
const TAU = Math.PI * 2;

/** Numero fixo em [0, 1) para um inteiro e uma semente. */
export function hash(i, seed = 0) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(seed | 0, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruido suave em [-1, 1]; alimente com `t * taxa` para deriva. */
export function noise(x, seed = 0) {
  const i = Math.floor(x), f = smooth(x - i);
  const a = hash(i, seed) * 2 - 1, b = hash(i + 1, seed) * 2 - 1;
  return a + (b - a) * f;
}

/** Numero do passo a `taxa` por segundo: para efeitos que mudam aos saltos (tremida, embaralhar). */
export const stepOf = (t, rate) => Math.floor(Math.max(0, t) * rate);

/** Progresso 0..1 do item `i` num grupo escalonado. Mantenha n*gap abaixo de ~0,5 s para o grupo ainda ler como um gesto. */
export function stagger(t, t0, i, gap, dur, ease = easeOut) {
  return ease((t - t0 - i * gap) / dur);
}

/** Numero que conta de `from` a `to` entre t0 e t0+dur. Use com algarismos de largura fixa para nao tremer. */
export function countUp(t, t0, dur, from, to, ease = easeOut) {
  return from + (to - from) * ease((t - t0) / dur);
}

/** Impacto que assenta: {x, y, r} em pixels/radianos, zero antes de t0 e depois de t0+dur. */
export function shake(t, t0, dur, amp = 12, seed = 1) {
  const k = (t - t0) / dur;
  if (k <= 0 || k >= 1) return { x: 0, y: 0, r: 0 };
  const env = (1 - k) * (1 - k), s = Math.floor(k * dur * 60);
  return { x: amp * env * (hash(s, seed) * 2 - 1), y: amp * env * (hash(s, seed + 7) * 2 - 1), r: (amp / 600) * env * (hash(s, seed + 13) * 2 - 1) };
}

/**
 * Movimento ambiente (respirar, camera na mao) que FECHA O LOOP: soma de senos com numero inteiro de ciclos em `duration`,
 * entao ambient(0) == ambient(duration). `cycles` e a lista de ciclos inteiros por filme (varios, primos entre si, soam organicos).
 */
export function ambient(t, duration, amp = 6, seed = 1, cycles = [1, 2, 3]) {
  const w = (t / duration) * TAU, wave = (salt) => cycles.reduce((s, c, k) => s + Math.sin(w * c + hash(k, seed + salt) * TAU) / (k + 1), 0) / 1.5;
  return { x: amp * wave(0), y: amp * wave(31), r: (amp / 800) * wave(57) };
}

/** Para tracar um caminho aos poucos no canvas: ctx.setLineDash(d.dash); ctx.lineDashOffset = d.offset. `length` = comprimento do caminho. */
export function dashFor(length, p) {
  return { dash: [length, length], offset: length * (1 - clamp01(p)) };
}

/** Retangulo de recorte que revela a partir de um lado: from = "left" | "right" | "top" | "bottom". */
export function wipeRect(p, from, w, h) {
  const k = clamp01(p);
  switch (from) {
    case "left": return { x: 0, y: 0, w: w * k, h };
    case "right": return { x: w * (1 - k), y: 0, w: w * k, h };
    case "top": return { x: 0, y: 0, w, h: h * k };
    case "bottom": return { x: 0, y: h * (1 - k), w, h: h * k };
    default: throw new Error(`wipeRect: lado invalido "${from}"`);
  }
}

/** Raio do circulo (centro cx,cy) que revela o quadro w x h: 0 em p=0, cobre tudo em p=1. */
export function irisRadius(p, cx, cy, w, h) {
  const far = Math.max(Math.hypot(cx, cy), Math.hypot(w - cx, cy), Math.hypot(cx, h - cy), Math.hypot(w - cx, h - cy));
  return far * smooth(p);
}

/** Empurrao lento sobre uma foto: interpola {s, x, y} de `from` a `to` entre t0 e t1. */
export function kenBurns(t, t0, t1, from, to) {
  const k = smooth((t - t0) / (t1 - t0));
  return { s: from.s + (to.s - from.s) * k, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
}

/** Peca `i` de uma explosao de confete, em forma fechada (sem simular quadro a quadro): {x, y, r, a, hue}. */
export function confetti(i, t, t0, { x = 0, y = 0, seed = 1, speed = 520, gravity = 900, life = 1.6 } = {}) {
  const tau = t - t0;
  if (tau < 0 || tau > life) return { x, y, r: 0, a: 0, hue: 0 };
  const ang = -Math.PI / 2 + (hash(i, seed) - 0.5) * Math.PI * 1.1, sp = speed * (0.45 + hash(i, seed + 3) * 0.75);
  return {
    x: x + Math.cos(ang) * sp * tau,
    y: y + Math.sin(ang) * sp * tau + 0.5 * gravity * tau * tau,
    r: (hash(i, seed + 5) * 2 - 1) * 14 * tau,
    a: clamp01((life - tau) / (life * 0.4)),
    hue: Math.floor(hash(i, seed + 9) * 360),
  };
}
