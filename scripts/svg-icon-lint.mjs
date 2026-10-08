#!/usr/bin/env node
/**
 * svg-icon-lint — confere um conjunto de icones SVG contra as regras da skill 85 (illustration-studio).
 *
 * As regras vem de STYLE/GRID/SHAPES/PALETTE/EXPORT: viewBox 0 0 24 24, traco 2 com pontas e juntas
 * redondas, cantos de retangulo >= 2, margem de seguranca de 2 px, coordenadas inteiras, sem transform,
 * sem id solto, no maximo 12 pontos por caminho, no maximo 1 cor de destaque por icone, e peso de tinta
 * parecido dentro do conjunto. Sem dependencias.
 *
 *   node scripts/svg-icon-lint.mjs <pasta|arquivo.svg>... [--palette palette.json] [--json] [--strict]
 *                                  [--weight-tolerance=50]
 *
 * palette.json: { "ink": "#1f1c19", "paper": "#fbf8f3", "accent": "#c9633d", ... } (papel -> papeis de cor).
 * Com --palette: toda cor usada precisa estar na paleta; ink x paper >= 4.5:1; accent x paper >= 3:1.
 *
 * Limites (nao esconder): analisa o TEXTO do SVG, nao renderiza. O "peso visual" e uma estimativa
 * geometrica (comprimento do traco x largura do traco; o preenchimento de destaque nao conta), nao uma medida de pixels. O teste de
 * apertar os olhos e a revisao lado a lado (CHECK.md) continuam sendo humanos/visuais.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ------------------------------------------------------------------ XML minimo
const ATTR = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

export function parseSvg(text) {
  const clean = text.replace(/<!--[\s\S]*?-->/g, "").replace(/<\?[\s\S]*?\?>/g, "").replace(/<!DOCTYPE[^>]*>/gi, "");
  const root = { tag: "#root", attrs: {}, children: [], parent: null };
  let cur = root;
  for (const m of clean.matchAll(/<\s*(\/?)([A-Za-z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g)) {
    const [, closing, tag, rawAttrs, selfClose] = m;
    if (closing) { if (cur.parent) cur = cur.parent; continue; }
    const attrs = {};
    for (const a of rawAttrs.matchAll(ATTR)) attrs[a[1]] = a[2] ?? a[3] ?? "";
    const node = { tag, attrs, children: [], parent: cur };
    cur.children.push(node);
    if (!selfClose) cur = node;
  }
  return root;
}

// -------------------------------------------------------------------- geometria
const num = (v, d = 0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const isInt = (n) => Math.abs(n - Math.round(n)) < 1e-9;

/** Achata um `d` em polilinhas. Devolve { subpaths: [[x,y]...], anchors: n de pontos de ancoragem, numbers: [valores numericos para checar inteiros] } */
export function flattenPath(d) {
  const tokens = [...String(d).matchAll(/([MmLlHhVvCcSsQqTtAaZz])|(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)/gi)].map((m) => (m[1] ? m[1] : Number(m[2])));
  const arity = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  const subpaths = [];
  const numbers = [];
  let anchors = 0;
  let x = 0, y = 0, sx = 0, sy = 0, lastCtrl = null, lastCmd = "";
  let sub = null;
  let i = 0;
  let cmd = "";
  const pushPoint = (px, py) => { sub.push([px, py]); };
  const startSub = (px, py) => { sub = [[px, py]]; subpaths.push(sub); };

  while (i < tokens.length) {
    if (typeof tokens[i] === "string") { cmd = tokens[i++]; if (cmd === "Z" || cmd === "z") { if (sub) pushPoint(sx, sy); x = sx; y = sy; lastCtrl = null; lastCmd = "Z"; continue; } }
    const up = cmd.toUpperCase();
    const rel = cmd !== up;
    const n = arity[up];
    if (!n) { i++; continue; }
    const args = tokens.slice(i, i + n);
    if (args.length < n || args.some((a) => typeof a !== "number")) break;
    i += n;
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (up === "A") numbers.push(args[0], args[1], rel ? args[5] + ox : args[5], rel ? args[6] + oy : args[6]);
    else if (up === "H") numbers.push(rel ? args[0] + ox : args[0]);
    else if (up === "V") numbers.push(rel ? args[0] + oy : args[0]);
    else args.forEach((a, k) => numbers.push(rel ? a + (k % 2 === 0 ? ox : oy) : a));

    if (up === "M") {
      x = args[0] + ox; y = args[1] + oy; sx = x; sy = y; startSub(x, y); anchors++; lastCtrl = null;
      cmd = rel ? "l" : "L"; // pares seguintes de M sao L
    } else if (up === "L") { x = args[0] + ox; y = args[1] + oy; pushPoint(x, y); anchors++; lastCtrl = null; }
    else if (up === "H") { x = args[0] + ox; pushPoint(x, y); anchors++; lastCtrl = null; }
    else if (up === "V") { y = args[0] + oy; pushPoint(x, y); anchors++; lastCtrl = null; }
    else if (up === "C" || up === "S") {
      let c1;
      if (up === "C") c1 = [args[0] + ox, args[1] + oy];
      else c1 = lastCtrl && /[CS]/.test(lastCmd) ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y];
      const o = up === "C" ? 2 : 0;
      const c2 = [args[o] + ox, args[o + 1] + oy];
      const p = [args[o + 2] + ox, args[o + 3] + oy];
      for (let t = 1; t <= 12; t++) { const u = t / 12, v = 1 - u; pushPoint(v ** 3 * x + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u ** 3 * p[0], v ** 3 * y + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u ** 3 * p[1]); }
      lastCtrl = c2; x = p[0]; y = p[1]; anchors++;
    } else if (up === "Q" || up === "T") {
      let c;
      if (up === "Q") c = [args[0] + ox, args[1] + oy];
      else c = lastCtrl && /[QT]/.test(lastCmd) ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y];
      const o = up === "Q" ? 2 : 0;
      const p = [args[o] + ox, args[o + 1] + oy];
      for (let t = 1; t <= 10; t++) { const u = t / 10, v = 1 - u; pushPoint(v * v * x + 2 * v * u * c[0] + u * u * p[0], v * v * y + 2 * v * u * c[1] + u * u * p[1]); }
      lastCtrl = c; x = p[0]; y = p[1]; anchors++;
    } else if (up === "A") {
      const [rx0, ry0, rot, large, sweep] = args;
      const ex = args[5] + ox, ey = args[6] + oy;
      for (const pt of arcPoints(x, y, rx0, ry0, rot, large, sweep, ex, ey)) pushPoint(pt[0], pt[1]);
      x = ex; y = ey; anchors++; lastCtrl = null;
    }
    lastCmd = up;
  }
  return { subpaths, anchors, numbers };
}

/** Conversao endpoint -> centro do SVG (apendice F.6.5), amostrada em 16 passos. */
function arcPoints(x1, y1, rxIn, ryIn, rotDeg, large, sweep, x2, y2) {
  let rx = Math.abs(rxIn), ry = Math.abs(ryIn);
  if (!rx || !ry || (x1 === x2 && y1 === y2)) return [[x2, y2]];
  const phi = (rotDeg * Math.PI) / 180, cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cos * dx + sin * dy, y1p = -sin * dx + cos * dy;
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
  const sign = large === sweep ? -1 : 1;
  const num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const co = sign * Math.sqrt(Math.max(0, num2 / den));
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2, cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
  const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
  if (!sweep && dth > 0) dth -= 2 * Math.PI;
  if (sweep && dth < 0) dth += 2 * Math.PI;
  const pts = [];
  for (let t = 1; t <= 16; t++) {
    const a = th1 + (dth * t) / 16;
    pts.push([cos * rx * Math.cos(a) - sin * ry * Math.sin(a) + cx, sin * rx * Math.cos(a) + cos * ry * Math.sin(a) + cy]);
  }
  return pts;
}

const polyLength = (pts, closed = false) => { let L = 0; for (let k = 1; k < pts.length; k++) L += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]); if (closed && pts.length > 2) L += Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]); return L; };
const polyArea = (pts) => { let a = 0; for (let k = 0; k < pts.length; k++) { const [x1, y1] = pts[k], [x2, y2] = pts[(k + 1) % pts.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a) / 2; };

// ------------------------------------------------------------------- cores / contraste
export function hexToRgb(hex) {
  const m = String(hex).trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16));
}
const lum = ([r, g, b]) => { const f = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export function contrast(a, b) { const [l1, l2] = [lum(hexToRgb(a)), lum(hexToRgb(b))].sort((p, q) => q - p); return (l1 + 0.05) / (l2 + 0.05); }
const normColor = (c) => { const v = String(c || "").trim().toLowerCase(); if (!v || v === "none" || v === "currentcolor" || v === "transparent") return v; const rgb = hexToRgb(v); return rgb ? `#${rgb.map((n) => n.toString(16).padStart(2, "0")).join("")}` : v; };

// ------------------------------------------------------------------------- analise
const SHAPES = new Set(["path", "circle", "rect", "line", "polyline", "polygon", "ellipse"]);
const INHERIT = ["stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill"];

function collect(node, inherited, out, ctx) {
  const eff = { ...inherited };
  for (const k of INHERIT) if (node.attrs[k] !== undefined) eff[k] = node.attrs[k];
  if (node.attrs.style) for (const decl of node.attrs.style.split(";")) { const [k, v] = decl.split(":").map((s) => s.trim()); if (INHERIT.includes(k)) eff[k] = v; }
  if (node.tag === "g") ctx.groups.push(node);
  if (node.attrs.id) ctx.ids.push(node.attrs.id);
  for (const v of Object.values(node.attrs)) for (const r of String(v).matchAll(/url\(#([^)]+)\)|^#(.+)$/g)) ctx.refs.add(r[1] || r[2]);
  if (node.attrs.transform) ctx.transforms.push(node.tag);
  if (SHAPES.has(node.tag)) out.push({ node, eff });
  for (const c of node.children) collect(c, eff, out, ctx);
}

export function lintSvg(text, { palette = null, file = "" } = {}) {
  const findings = [];
  const add = (level, rule, msg) => findings.push({ level, rule, msg });
  const root = parseSvg(text);
  const svg = root.children.find((c) => c.tag === "svg");
  if (!svg) return { findings: [{ level: "error", rule: "svg", msg: "nao encontrei <svg>" }], metrics: { weight: 0, colors: [] } };

  if (!/^\s*0[\s,]+0[\s,]+24[\s,]+24\s*$/.test(svg.attrs.viewBox || "")) add("error", "viewbox", `viewBox deve ser "0 0 24 24" (achei "${svg.attrs.viewBox ?? "ausente"}")`);

  const shapes = [];
  const ctx = { groups: [], ids: [], refs: new Set(), transforms: [] };
  collect(svg, { fill: "none" }, shapes, ctx);
  // fill/stroke do <svg> raiz herdam: `fill` padrao do SVG e preto, mas icones desta skill declaram fill="none" na raiz
  if (svg.attrs.fill === undefined && !shapes.every((s) => s.node.attrs.fill !== undefined)) add("warn", "root-fill", 'declare fill="none" no <svg> (o padrao do SVG e preto)');

  for (const t of ctx.transforms) add("error", "transform", `<${t}> usa transform: aplique a transformacao nas coordenadas`);
  for (const id of ctx.ids) if (!ctx.refs.has(id)) add("error", "stray-id", `id="${id}" nao e referenciado por nada`);
  for (const g of ctx.groups) if (!g.attrs["data-name"]) add("warn", "group-name", `<g> sem data-name (nomeie cada grupo: data-name="mao", "folha"...)`);

  const colors = new Set();
  const strokeColors = new Set();
  const fillColors = new Set();
  let weight = 0;
  let outOfBounds = 0;

  for (const { node, eff } of shapes) {
    const a = node.attrs;
    const stroke = normColor(eff.stroke);
    const fill = normColor(eff.fill);
    const stroked = stroke && stroke !== "none";
    const filled = fill && fill !== "none";
    if (stroked) { strokeColors.add(stroke); colors.add(stroke); }
    if (filled) { fillColors.add(fill); colors.add(fill); }

    if (stroked) {
      const sw = num(eff["stroke-width"], 1);
      if (sw !== 2) add("error", "stroke-width", `<${node.tag}> com stroke-width ${sw}; o conjunto usa 2`);
      if (eff["stroke-linecap"] !== "round") add("error", "linecap", `<${node.tag}> sem stroke-linecap="round"`);
      if (eff["stroke-linejoin"] !== "round") add("error", "linejoin", `<${node.tag}> sem stroke-linejoin="round"`);
    }

    // ---- pontos, comprimento, area
    let pts = [], length = 0, area = 0, ints = [], anchors = 0, closed = false;
    if (node.tag === "path") {
      const f = flattenPath(a.d || "");
      anchors = f.anchors; ints = f.numbers;
      for (const sp of f.subpaths) { pts.push(...sp); length += polyLength(sp); if (filled) area += polyArea(sp); }
      if (anchors > 12) add("error", "path-points", `<path> com ${anchors} pontos (maximo 12): componha com circulos, retangulos e arcos`);
    } else if (node.tag === "circle") {
      const [cx, cy, r] = [num(a.cx), num(a.cy), num(a.r)];
      ints = [cx, cy, r]; pts = [[cx - r, cy - r], [cx + r, cy + r]]; length = 2 * Math.PI * r; area = Math.PI * r * r;
      if (r > 10) add("warn", "keyline", `circulo com raio ${r}: a keyline do circulo e 20 de diametro (r = 10)`);
    } else if (node.tag === "ellipse") {
      const [cx, cy, rx, ry] = [num(a.cx), num(a.cy), num(a.rx), num(a.ry)];
      ints = [cx, cy, rx, ry]; pts = [[cx - rx, cy - ry], [cx + rx, cy + ry]]; length = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry))); area = Math.PI * rx * ry;
    } else if (node.tag === "rect") {
      const [x, y, w, h] = [num(a.x), num(a.y), num(a.width), num(a.height)];
      const rx = num(a.rx, num(a.ry));
      ints = [x, y, w, h, rx]; pts = [[x, y], [x + w, y + h]]; length = 2 * (w + h); area = w * h;
      if (rx < 2) add("error", "corner", `<rect> com rx=${rx}: cantos nunca sao vivos (use rx >= 2)`);
      if (w > 20 || h > 20) add("warn", "keyline", `retangulo ${w}x${h} excede a area util de 20; keyline do quadrado e 18`);
    } else if (node.tag === "line") {
      const [x1, y1, x2, y2] = [num(a.x1), num(a.y1), num(a.x2), num(a.y2)];
      ints = [x1, y1, x2, y2]; pts = [[x1, y1], [x2, y2]]; length = Math.hypot(x2 - x1, y2 - y1);
    } else { // polyline / polygon
      const list = String(a.points || "").trim().split(/[\s,]+/).map(Number);
      for (let k = 0; k + 1 < list.length; k += 2) pts.push([list[k], list[k + 1]]);
      ints = list; closed = node.tag === "polygon"; length = polyLength(pts, closed); if (filled && closed) area = polyArea(pts);
      if (pts.length > 12) add("error", "path-points", `<${node.tag}> com ${pts.length} pontos (maximo 12)`);
    }

    if (ints.some((n) => !isInt(n))) add("error", "whole-pixels", `<${node.tag}> com coordenada fracionaria (${ints.find((n) => !isInt(n))}): encaixe todo ponto em pixel inteiro`);
    for (const [px, py] of pts) {
      if (px < 2 - 1e-6 || px > 22 + 1e-6 || py < 2 - 1e-6 || py > 22 + 1e-6) { outOfBounds++; break; }
    }
    // Peso = tinta (area do traco). O preenchimento e o destaque, nao o peso do desenho.
    if (stroked) weight += length * num(eff["stroke-width"], 1);
  }
  if (outOfBounds) add("error", "safe-area", `${outOfBounds} forma(s) fora da margem de seguranca (todo ponto precisa ficar entre 2 e 22)`);

  // ---- cor
  const accent = [...fillColors].filter((c) => c !== "currentcolor");
  if (accent.length > 1) add("error", "accent", `${accent.length} cores de preenchimento (${accent.join(", ")}): no maximo 1 destaque por icone`);
  if (strokeColors.size > 1) add("warn", "ink", `mais de uma cor de traco (${[...strokeColors].join(", ")}): linhas usam uma tinta so`);
  if (palette) {
    const allowed = new Set(Object.values(palette).map(normColor).concat(["none", "currentcolor", "transparent"]));
    for (const c of colors) if (!allowed.has(c)) add("error", "palette", `cor ${c} fora da paleta`);
  }
  return { findings, metrics: { weight: Math.round(weight * 10) / 10, colors: [...colors] } };
}

export function lintPalette(palette) {
  const findings = [];
  const roles = Object.entries(palette);
  if (roles.length !== 6) findings.push({ level: "warn", rule: "palette-size", msg: `a paleta tem ${roles.length} cores (a skill pede 6, cada uma com papel)` });
  for (const [role, hex] of roles) if (!hexToRgb(hex)) findings.push({ level: "error", rule: "palette-hex", msg: `${role}: "${hex}" nao e hex valido` });
  if (palette.ink && palette.paper && hexToRgb(palette.ink) && hexToRgb(palette.paper)) {
    const r = contrast(palette.ink, palette.paper);
    if (r < 4.5) findings.push({ level: "error", rule: "contrast", msg: `ink x paper = ${r.toFixed(2)}:1 (AA pede 4.5:1)` });
  }
  if (palette.accent && palette.paper && hexToRgb(palette.accent) && hexToRgb(palette.paper)) {
    const r = contrast(palette.accent, palette.paper);
    if (r < 3) findings.push({ level: "error", rule: "contrast", msg: `accent x paper = ${r.toFixed(2)}:1 (grafico nao textual pede 3:1)` });
  }
  return findings;
}

// ------------------------------------------------------------------------------ CLI
function listSvgs(inputs) {
  const out = [];
  for (const input of inputs) {
    const p = resolve(input);
    if (!existsSync(p)) { console.error(`Nao encontrei: ${input}`); process.exit(2); }
    if (statSync(p).isDirectory()) for (const f of readdirSync(p).sort()) { if (extname(f).toLowerCase() === ".svg") out.push(join(p, f)); }
    else out.push(p);
  }
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const flagVal = (name) => { const i = args.indexOf(name); return i !== -1 ? args[i + 1] : undefined; };
  const inputs = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--palette");
  const tolerance = Number((args.find((a) => a.startsWith("--weight-tolerance=")) || "").split("=")[1] || 50);
  const asJson = args.includes("--json");
  const strict = args.includes("--strict");
  if (!inputs.length) { console.error("Uso: svg-icon-lint.mjs <pasta|arquivo.svg>... [--palette palette.json] [--json] [--strict]"); process.exit(2); }

  let palette = null;
  if (flagVal("--palette")) palette = JSON.parse(readFileSync(resolve(flagVal("--palette")), "utf8").replace(/^﻿/, ""));

  const files = listSvgs(inputs);
  const results = files.map((f) => ({ file: basename(f), ...lintSvg(readFileSync(f, "utf8"), { palette, file: f }) }));

  // peso visual: mediana do conjunto
  const weights = results.map((r) => r.metrics.weight).filter((w) => w > 0).sort((a, b) => a - b);
  const median = weights.length ? weights[Math.floor(weights.length / 2)] : 0;
  if (results.length >= 3 && median) {
    for (const r of results) {
      const dev = Math.abs(r.metrics.weight - median) / median * 100;
      if (dev > tolerance) r.findings.push({ level: "warn", rule: "weight", msg: `peso visual ${r.metrics.weight} desvia ${dev.toFixed(0)}% da mediana do conjunto (${median}); tolerancia ${tolerance}%` });
    }
  }
  const paletteFindings = palette ? lintPalette(palette) : [];

  const errors = results.reduce((n, r) => n + r.findings.filter((f) => f.level === "error").length, 0) + paletteFindings.filter((f) => f.level === "error").length;
  const warns = results.reduce((n, r) => n + r.findings.filter((f) => f.level === "warn").length, 0) + paletteFindings.filter((f) => f.level === "warn").length;

  if (asJson) console.log(JSON.stringify({ files: results, palette: paletteFindings, summary: { icons: results.length, errors, warnings: warns, median_weight: median } }, null, 2));
  else {
    for (const r of results) {
      const status = r.findings.some((f) => f.level === "error") ? "FALHOU" : r.findings.length ? "ok (avisos)" : "ok";
      console.log(`${r.file.padEnd(34)} ${status}   peso ${r.metrics.weight}`);
      for (const f of r.findings) console.log(`   ${f.level === "error" ? "x" : "!"} [${f.rule}] ${f.msg}`);
    }
    for (const f of paletteFindings) console.log(`paleta ${f.level === "error" ? "x" : "!"} [${f.rule}] ${f.msg}`);
    console.log(`\n${results.length} icone(s), ${errors} erro(s), ${warns} aviso(s). Mediana de peso: ${median}.`);
    console.log("Limite: le o texto do SVG; o teste de apertar os olhos e a revisao lado a lado (CHECK.md) seguem visuais.");
  }
  if (strict && errors) process.exit(1);
}

// compara pelo caminho real: process.argv[1] pode vir por link simbolico (macOS /var -> /private/var) e import.meta.url nao; sem isso o script sai em silencio sem rodar
import { realpathSync as realpathMain } from "node:fs";
const isMainModule = (url) => { try { return realpathMain(process.argv[1]) === realpathMain(fileURLToPath(url)); } catch { return process.argv[1] === fileURLToPath(url); } };
if (process.argv[1] && isMainModule(import.meta.url)) main();
