/**
 * stage — palco de canvas para filmes de seek(t): espaco de design fixo (1920x1080) escalado com letterbox,
 * camera, letras que caem uma a uma, texto digitado, montagem de cenas com corte seco + clarao e grao de filme.
 * Tudo e funcao do tempo (nenhum relogio, nenhum Math.random): o grao vem do numero do quadro.
 *
 *   import { createStage, typed, ease, clamp01, mixHex } from "/_lib/stage.mjs";
 *   const st = createStage({ canvas, w: W, h: H, ink: "#0b0b0c", flash: "#f1efe7", head: '"Segoe UI Black","Arial Black",sans-serif' });
 *   const { ctx, setFont, rr, camera, letters } = st;
 *   window.seek = (t) => st.frame(t, [{ at: 0, draw: (lt, t) => {...} }, { at: 2, draw: ... }], DURATION);
 *
 * Cada cena recebe (tempoLocal, tempoGlobal). A cena desenha em coordenadas de design (dw x dh).
 */
import { mix, spring } from "./motion.mjs";

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const ease = (k) => 1 - Math.pow(1 - clamp01(k), 3);
/** Mistura duas cores #rrggbb; devolve "rgb(r,g,b)". */
export const mixHex = (a, b, k) => {
  const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return `rgb(${A.map((v, i) => Math.round(mix(v, B[i], clamp01(k)))).join(",")})`;
};
/** Texto digitado: os primeiros caracteres de `str` visiveis em `t`, a `cps` caracteres por segundo desde `t0`. */
export const typed = (str, t0, cps, t) => str.slice(0, Math.max(0, Math.min(str.length, Math.floor((t - t0) * cps))));

/** Mola de ataque seco (letras), de assentamento rapido (blocos) e de encaixe (faixas, nos). */
export const SPRINGS = {
  slam: { stiffness: 520, damping: 26, mass: 1 },
  settle: { stiffness: 240, damping: 30, mass: 1 },
  snap: { stiffness: 420, damping: 34, mass: 1 },
};

export function createStage({ canvas, w, h, dw = 1920, dh = 1080, ink = "#000", flash = "#fff", head = "sans-serif", grain = 0.055, fps = 30, flashFrames = 2 }) {
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  const K = Math.min(w / dw, h / dh), OX = (w - dw * K) / 2, OY = (h - dh * K) / 2;

  const setFont = (size, family, ls = 0) => { ctx.font = `${size}px ${family}`; ctx.letterSpacing = `${ls}px`; };
  const rr = (x, y, bw, bh, r) => { ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r); };
  /** Camera: zoom `z` com o ponto (fx, fy) do espaco de design no centro do quadro. Chame dentro de ctx.save(). */
  const camera = (z, fx, fy) => { ctx.translate(dw / 2, dh / 2); ctx.scale(z, z); ctx.translate(-fx, -fy); };

  /** Letras que caem e assentam, uma a uma (uma mola por letra). Devolve a largura total do texto. */
  function letters(text, x, y, size, color, t, o = {}) {
    const { family = head, ls = -0.035 * size, delay = 0, stagger = 0.07, cfg = SPRINGS.slam, drop = -0.85 * size, rot = 0.2, align = "left" } = o;
    setFont(size, family, ls);
    const total = ctx.measureText(text).width, x0 = align === "center" ? x - total / 2 : x;
    for (let i = 0; i < text.length; i++) {
      const lt = t - delay - i * stagger;
      if (lt <= 0 || text[i] === " ") continue;
      const cw = ctx.measureText(text[i]).width, pre = ctx.measureText(text.slice(0, i)).width, s = spring(cfg, lt);
      ctx.save();
      ctx.translate(x0 + pre + cw / 2, y + mix(drop, 0, s) - size * 0.35);
      ctx.rotate((1 - s) * rot * (i % 2 ? 1 : -1));
      ctx.fillStyle = typeof color === "function" ? color(i) : color;
      ctx.fillText(text[i], -cw / 2, size * 0.35);
      ctx.restore();
    }
    ctx.letterSpacing = "0px";
    return total;
  }

  // grao de filme: ladrilho de ruido gerado por uma semente fixa; o deslocamento depende so do numero do quadro
  const tile = document.createElement("canvas"); tile.width = tile.height = 256;
  {
    const tc = tile.getContext("2d"), im = tc.createImageData(256, 256); let r = 12345;
    for (let i = 0; i < im.data.length; i += 4) { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; const v = 96 + ((r >>> 24) % 96); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    tc.putImageData(im, 0, 0);
  }

  /** Pinta o quadro de `t`: escolhe a cena, desenha, aplica o clarao no corte e o grao. `scenes` = [{at, draw(lt, t)}] em ordem. */
  function frame(t, scenes, duration) {
    t = Math.max(0, Math.min(duration - 1e-6, t));
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.letterSpacing = "0px"; ctx.fillStyle = ink; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate(OX, OY); ctx.scale(K, K); ctx.beginPath(); ctx.rect(0, 0, dw, dh); ctx.clip();
    let i = 0; for (let k = 0; k < scenes.length; k++) if (t >= scenes[k].at) i = k;
    const lt = t - scenes[i].at, fl = flashFrames / fps;
    scenes[i].draw(lt, t);
    if (i > 0 && lt < fl) { ctx.globalAlpha = 0.5 * (1 - lt / fl); ctx.fillStyle = flash; ctx.fillRect(0, 0, dw, dh); ctx.globalAlpha = 1; }
    if (grain > 0) {
      ctx.globalAlpha = grain; const f = Math.floor(t * fps), ox = (f * 97) % 256, oy = (f * 61) % 256;
      for (let x = -256 + ox; x < dw; x += 256) for (let y = -256 + oy; y < dh; y += 256) ctx.drawImage(tile, x, y);
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  return { ctx, dw, dh, setFont, rr, camera, letters, frame };
}
