#!/usr/bin/env node
// Calcula apenas pares de cores opacas; a classificação do texto é informada pelo usuário.
import { pathToFileURL } from 'node:url';

export function parseColor(value) {
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) throw new Error('Use cores opacas #RGB ou #RRGGBB.');
  const hex = value.slice(1);
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}

export function contrastRatio(foreground, background) {
  const luminance = (color) => parseColor(color).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function evaluate(foreground, background, type = 'normal') {
  const thresholds = { normal: 4.5, large: 3, ui: 3 };
  if (!Object.hasOwn(thresholds, type)) throw new Error('Tipo deve ser normal, large ou ui.');
  const ratio = contrastRatio(foreground, background);
  return { foreground, background, type, ratio: Number(ratio.toFixed(3)), minimum: thresholds[type], passes: ratio >= thresholds[type], scope: 'Somente duas cores opacas; não comprova acessibilidade da interface.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [foreground, background, type = 'normal'] = process.argv.slice(2);
  try {
    if (!foreground || !background || process.argv.length > 5) throw new Error('Uso: node contrast.mjs "#RRGGBB" "#RRGGBB" [normal|large|ui]');
    const result = evaluate(foreground, background, type);
    console.log(JSON.stringify(result, null, 2));
    if (!result.passes) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
