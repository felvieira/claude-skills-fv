/**
 * motion.mjs — matematica de movimento PURA (funcao do tempo), sem relogio, sem estado.
 *
 * Por que: um filme renderizado por codigo so e deterministico se todo valor for f(t). Mola simulada
 * quadro a quadro depende dos quadros anteriores (nao da para renderizar o quadro 812 sozinho, e dois
 * renders divergem); mola em forma fechada nao. Funciona no navegador (import de modulo) e no Node.
 */

/** Presets de movimento (massa 1). A escolha e por papel do elemento, nao por gosto. */
export const presets = {
  snappy: { stiffness: 400, damping: 30, mass: 1 }, // botoes, toggles, bordas de ataque (leve sobrepasso)
  default: { stiffness: 170, damping: 26, mass: 1 }, // cartoes, containers, camera (quase critico)
  heavy: { stiffness: 120, damping: 20, mass: 2 }, // tipografia grande, objetos 3D, logo (lento, pesado)
  playful: { stiffness: 300, damping: 12, mass: 1 }, // mascotes, adesivos (sobrepasso visivel)
  type: { stiffness: 200, damping: 2 * Math.sqrt(200), mass: 1 }, // criticamente amortecido: sem sobrepasso, para texto
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Razao de amortecimento: <1 oscila, 1 critico, >1 super-amortecido. */
export function dampingRatio({ stiffness, damping, mass = 1 }) {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

/**
 * Resposta ao degrau de uma mola (0 -> 1), velocidade inicial 0, em forma FECHADA.
 * t em segundos desde o inicio da mola; t <= 0 devolve 0.
 */
export function spring(cfg, t) {
  if (!(t > 0)) return 0;
  const { stiffness, mass = 1 } = cfg;
  const w0 = Math.sqrt(stiffness / mass);
  const z = dampingRatio(cfg);
  if (Math.abs(z - 1) < 1e-9) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
  }
  const s = Math.sqrt(z * z - 1);
  const r1 = -w0 * (z - s);
  const r2 = -w0 * (z + s);
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

/**
 * Valor que muda de alvo varias vezes SEM reiniciar a mola: uma mola por mudanca, cada uma comecando
 * no seu instante, somadas. O movimento fica continuo e o quadro N renderiza sem simular 0..N-1.
 *
 *   track(0, [{at: 0.5, to: 100}, {at: 1.2, to: 40}], presets.default)(t)
 */
export function track(initial, changes, cfg = presets.default) {
  const steps = [];
  let prev = initial;
  for (const c of [...changes].sort((a, b) => a.at - b.at)) {
    steps.push({ at: c.at, delta: c.to - prev, cfg: c.spring ?? cfg });
    prev = c.to;
  }
  return (t) => steps.reduce((v, s) => v + s.delta * spring(s.cfg, t - s.at), initial);
}

/** Primeiro instante em que a mola fica dentro de `eps` do alvo e nao sai mais (busca em passos de 1/240 s). */
export function settleTime(cfg, eps = 0.001, horizon = 10) {
  let last = 0;
  for (let t = 0; t <= horizon; t += 1 / 240) if (Math.abs(spring(cfg, t) - 1) > eps) last = t;
  return last + 1 / 240;
}

/** Sobrepasso maximo (fracao acima do alvo; 0.05 = 5%). */
export function overshoot(cfg, horizon = 5) {
  let m = 0;
  for (let t = 0; t <= horizon; t += 1 / 480) m = Math.max(m, spring(cfg, t) - 1);
  return m;
}

/** Interpolacao linear com mola: mix(a, b, spring(cfg, t - at)). */
export const mix = (a, b, k) => a + (b - a) * k;

/** Progresso 0..1 de um intervalo [from, to] (para fades e wipes lineares). */
export const progress = (t, from, to) => clamp((t - from) / (to - from), 0, 1);

// ----------------------------------------------------------------------------- batidas

/** Instantes (s) das `count` primeiras batidas a `bpm` (grade de 1/4). `sub` divide a batida (2 = colcheias). */
export function beatGrid(bpm, count, sub = 1, offset = 0) {
  const step = 60 / bpm / sub;
  return Array.from({ length: count * sub }, (_, i) => offset + i * step);
}

/** Encaixa um instante na batida mais proxima (cortes travados no BPM). */
export function snapToBeat(t, bpm, sub = 1) {
  const step = 60 / bpm / sub;
  return Math.round(t / step) * step;
}

/** Quantas batidas cabem em `seconds` e se a duracao fecha em compassos de 4. */
export function barsFor(seconds, bpm) {
  const beats = (seconds * bpm) / 60;
  return { beats, bars: beats / 4, whole: Math.abs(beats / 4 - Math.round(beats / 4)) < 1e-9 };
}

/** Pulso 0..1 que decai depois de cada batida: bom para escalas/brilhos presos ao ritmo. */
export function pulse(t, bpm, decay = 6) {
  const step = 60 / bpm;
  const since = t - Math.floor(t / step) * step;
  return Math.exp(-decay * since);
}

// ----------------------------------------------------------------------------- formatos

/** Layout em unidades relativas: escreva as cenas contra isto, nao contra pixels fixos (16:9, 9:16, 1:1). */
export function layout(width, height) {
  const portrait = height > width;
  const u = Math.min(width, height) / 100; // 1u = 1% do lado menor
  return { width, height, portrait, u, cx: width / 2, cy: height / 2, safe: { x: width * 0.06, y: height * (portrait ? 0.08 : 0.06) } };
}
