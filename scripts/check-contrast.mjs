#!/usr/bin/env node

/**
 * check-contrast — calcula o contraste real dos tokens de cor, nos DOIS temas.
 *
 * As skills 02, 22 e 57 declaram "4.5:1 para texto, 3:1 para texto grande e UI".
 * Declarar nao verifica nada. Este script extrai os tokens de cor do CSS e
 * computa o ratio WCAG de cada par texto/superficie — inclusive no tema escuro,
 * que e onde a maioria das paletas falha (passa no claro, quebra no escuro).
 *
 * Uso:
 *   node scripts/check-contrast.mjs <arquivo.css...>   # falha (exit 1) abaixo do minimo
 *   node scripts/check-contrast.mjs --warn <css>       # so reporta
 *   node scripts/check-contrast.mjs --json <css>       # saida estruturada
 *
 * Le custom properties (--text-*, --bg-*, --surface-*, --muted, --accent...) e
 * pareia texto contra superficie dentro do mesmo bloco/tema.
 */

import fs from "fs/promises";
import path from "path";

const AA_NORMAL = 4.5; // texto corpo
const AA_LARGE = 3.0;  // >=18pt (ou >=14pt bold), icone, borda de UI

// ---------------------------------------------------------------------------
// Cor: parsing e luminancia relativa (WCAG 2.x)
// ---------------------------------------------------------------------------

const NAMED = {
  black: [0, 0, 0], white: [255, 255, 255],
  red: [255, 0, 0], green: [0, 128, 0], blue: [0, 0, 255],
  gray: [128, 128, 128], grey: [128, 128, 128],
};

function parseColor(raw) {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();

  if (NAMED[value]) return NAMED[value];

  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];

  return null; // hsl/oklch/var() ficam fora deste passe — melhor pular que errar
}

/** Luminancia relativa conforme WCAG 2.x. */
function luminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

// ---------------------------------------------------------------------------
// Extracao de tokens por tema
// ---------------------------------------------------------------------------

const TEXT_HINT = /(^|-)(text|foreground|fg|muted|body|heading|label|placeholder)($|-)/;
const SURFACE_HINT = /(^|-)(bg|background|surface|card|panel|canvas|paper)($|-)/;

/**
 * Superficie semantica (--status-error-bg, --accent-bg) so e usada com o texto
 * da MESMA familia (--status-error, --accent) — nunca com o texto padrao.
 * Parear cegamente gera falso positivo, e checker ruidoso o time desliga.
 */
const SEMANTIC_FAMILY = /^--(.*?)-(bg|background|surface)(-hover|-active|-subtle)?$/;

function familyOf(tokenName) {
  const m = tokenName.match(SEMANTIC_FAMILY);
  return m ? m[1] : null;
}

/** Superficie neutra e o fundo geral da tela: pareia com qualquer texto. */
function isNeutralSurface(tokenName) {
  return /^--(bg|background|surface|card|panel|canvas|paper)(-\w+)?$/.test(tokenName);
}

/**
 * Um "escopo" e um bloco de declaracoes que representa um tema:
 * :root, [data-theme="dark"], .dark, @media (prefers-color-scheme: dark).
 * Tokens de temas diferentes nunca sao pareados entre si.
 */
function extractScopes(css) {
  const scopes = [];
  // Remove comentarios antes de casar seletores — senao o comentario acima do
  // bloco vira parte do nome do escopo e o relatorio fica ilegivel.
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let match;

  while ((match = blockRe.exec(clean)) !== null) {
    // Só o ultimo seletor da lista, sem at-rules penduradas.
    const selector = match[1].trim().replace(/\s+/g, " ").split(/[;}]/).pop().trim().slice(0, 60);
    const body = match[2];

    const tokens = [];
    const declRe = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let decl;
    while ((decl = declRe.exec(body)) !== null) {
      const name = decl[1];
      const color = parseColor(decl[2]);
      if (color) tokens.push({ name, color, raw: decl[2].trim() });
    }

    if (tokens.length > 0) scopes.push({ selector, tokens });
  }

  return scopes;
}

/** Rotula o escopo como claro/escuro para o relatorio dizer onde falhou. */
function themeOf(selector, precededByDarkMedia) {
  const s = selector.toLowerCase();
  if (precededByDarkMedia) return "dark";
  if (s.includes('data-theme="dark"') || s.includes(".dark") || s.includes("[data-mode=dark]")) return "dark";
  if (s.includes('data-theme="light"') || s.includes(".light")) return "light";
  return "light";
}

function analyzeScope(scope, theme, file) {
  const texts = scope.tokens.filter((t) => TEXT_HINT.test(t.name));
  const surfaces = scope.tokens.filter((t) => SURFACE_HINT.test(t.name));

  const results = [];
  for (const text of texts) {
    for (const surface of surfaces) {
      // Superficie semantica so pareia com texto da mesma familia.
      const family = familyOf(surface.name);
      if (family && !isNeutralSurface(surface.name)) {
        const textBase = text.name.replace(/^--/, "");
        if (!textBase.startsWith(family)) continue;
      }

      const ratio = contrastRatio(text.color, surface.color);
      // Token "muted"/"placeholder" e secundario por design: cobrado no piso de 3:1.
      const isSecondary = /(muted|placeholder|disabled|subtle|tertiary)/.test(text.name);
      const required = isSecondary ? AA_LARGE : AA_NORMAL;

      results.push({
        file,
        theme,
        selector: scope.selector,
        text: text.name,
        surface: surface.name,
        ratio: Number(ratio.toFixed(2)),
        required,
        pass: ratio >= required,
      });
    }
  }
  return results;
}

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { warnOnly: false, json: false, paths: [] };
  for (const arg of argv) {
    if (arg === "--warn") opts.warnOnly = true;
    else if (arg === "--json") opts.json = true;
    else if (!arg.startsWith("--")) opts.paths.push(arg);
  }
  return opts;
}

async function collectCss(target, acc = []) {
  let stat;
  try {
    stat = await fs.stat(target);
  } catch {
    return acc;
  }
  if (stat.isFile()) {
    if (/\.(css|scss)$/.test(target)) acc.push(target);
    return acc;
  }
  const entries = await fs.readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "dist", "build", ".next"].includes(entry.name)) continue;
      await collectCss(path.join(target, entry.name), acc);
    } else if (/\.(css|scss)$/.test(entry.name)) {
      acc.push(path.join(target, entry.name));
    }
  }
  return acc;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.paths.length === 0) opts.paths.push(".");

  const files = [];
  for (const target of opts.paths) await collectCss(target, files);

  const all = [];
  for (const file of files) {
    const css = await fs.readFile(file, "utf8");

    // Marca escopos dentro de @media dark para rotular o tema corretamente.
    const darkMediaRanges = [];
    const mediaRe = /@media[^{]*prefers-color-scheme:\s*dark[^{]*\{/gi;
    let m;
    while ((m = mediaRe.exec(css)) !== null) darkMediaRanges.push(m.index);

    for (const scope of extractScopes(css)) {
      const scopeIndex = css.indexOf(scope.selector);
      const inDarkMedia = darkMediaRanges.some((start) => scopeIndex > start && scopeIndex < start + 2000);
      all.push(...analyzeScope(scope, themeOf(scope.selector, inDarkMedia), file));
    }
  }

  const failures = all.filter((r) => !r.pass);

  if (opts.json) {
    console.log(JSON.stringify({ scanned: files.length, pairs: all.length, failures }, null, 2));
    return failures.length > 0 && !opts.warnOnly ? 1 : 0;
  }

  if (all.length === 0) {
    console.log(`Contrast check: nenhum par texto/superficie encontrado em ${files.length} arquivo(s).`);
    console.log("Tokens em hsl()/oklch()/var() nao sao avaliados neste passe.");
    return 0;
  }

  const themes = [...new Set(all.map((r) => r.theme))];

  if (failures.length === 0) {
    console.log(`Contrast check passed (${all.length} pares, temas: ${themes.join(", ")}).`);
    return 0;
  }

  console.log(`\nContrast check — ${all.length} pares avaliados (temas: ${themes.join(", ")})\n`);
  for (const f of failures) {
    console.log(`FALHA ${f.file} [${f.theme}] ${f.selector}`);
    console.log(`      ${f.text} sobre ${f.surface}: ${f.ratio}:1 (minimo ${f.required}:1)`);
  }
  console.log(`\n${failures.length} par(es) abaixo do minimo WCAG AA.`);

  if (!opts.warnOnly) {
    console.log("\nContraste precisa passar nos DOIS temas — passar no claro nao garante o escuro.");
    return 1;
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("check-contrast falhou:", error.message);
    process.exit(1);
  });
