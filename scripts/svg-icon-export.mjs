#!/usr/bin/env node
/**
 * svg-icon-export — gera os entregaveis de um conjunto de icones (EXPORT.md da skill 85):
 * sprite SVG (<symbol>), componentes React e uma folha de contato HTML (16/24/48 px sobre a grade).
 * Sem dependencias. Roda o linter antes; se houver erro, nao exporta (use --force para ignorar).
 *
 *   node scripts/svg-icon-export.mjs <pasta-de-svgs> --out <pasta> [--palette palette.json] [--force]
 *                                    [--png]   # tenta tirar um PNG da folha com Chrome/Edge headless, se achar um
 *
 * Saidas em <out>: sprite.svg, Icons.tsx, contact-sheet.html (+ contact-sheet.png com --png).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { lintSvg, parseSvg } from "./svg-icon-lint.mjs";

const pascal = (s) => s.replace(/^\d+[-_]?/, "").split(/[-_\s]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join("") || "Icon";
const slug = (s) => s.replace(/^\d+[-_]?/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Conteudo interno do <svg> (sem a tag raiz). */
export function innerSvg(text) {
  const m = text.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>\s*$/i);
  return (m ? m[1] : "").replace(/^\s*\n/, "").trim();
}

/** Atributos de estilo da tag raiz (fill, stroke...) que os filhos herdam; a folha de contato precisa deles. */
export function rootStyleAttrs(text) {
  const m = text.match(/<svg\b([^>]*)>/i);
  const out = [];
  for (const a of (m ? m[1] : "").matchAll(/([\w:-]+)\s*=\s*("[^"]*"|'[^']*')/g)) if (/^(fill|stroke|stroke-[a-z]+)$/.test(a[1])) out.push(`${a[1]}=${a[2]}`);
  return out.join(" ");
}

const REACT_ATTR ={ class: "className", "stroke-width": "strokeWidth", "stroke-linecap": "strokeLinecap", "stroke-linejoin": "strokeLinejoin", "fill-rule": "fillRule", "clip-rule": "clipRule", "stroke-miterlimit": "strokeMiterlimit", "stroke-opacity": "strokeOpacity", "fill-opacity": "fillOpacity" };
export function toJsx(inner) {
  return inner.replace(/(\s)([a-z][a-z-]*)=/g, (all, sp, name) => `${sp}${REACT_ATTR[name] ?? name}=`);
}

function findBrowser() {
  const cands = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].filter(Boolean);
  return cands.find((p) => existsSync(p));
}

function sheetHtml(items, palette) {
  const paper = palette?.paper || "#fbf8f3", ink = palette?.ink || "#1f1c19", line = palette?.line || "#e9e2d8";
  // Os filhos herdam fill/stroke da raiz; ao reembrulhar, a raiz precisa levar os mesmos atributos.
  const guides = `<g fill="none" stroke="${line}" stroke-width=".08">${Array.from({ length: 25 }, (_, k) => `<path d="M${k} 0V24M0 ${k}H24"/>`).join("")}<circle cx="12" cy="12" r="10" stroke="#b4532d" stroke-width=".12"/><rect x="3" y="3" width="18" height="18" stroke="#b4532d" stroke-width=".12"/><rect x="2" y="2" width="20" height="20" stroke="#6f6a62" stroke-width=".08" stroke-dasharray=".4 .4"/></g>`;
  const cell = (it) => `
    <figure><div class="sizes">${[16, 24, 48].map((s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" ${it.rootAttrs} aria-label="${it.name} ${s}px">${it.inner}</svg>`).join("")}</div>
    <div class="grid"><svg width="96" height="96" viewBox="0 0 24 24">${guides}<g ${it.rootAttrs}>${it.inner}</g></svg></div>
    <figcaption>${it.name}</figcaption></figure>`;
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Folha de contato</title>
<style>body{margin:0;padding:24px;background:${paper};color:${ink};font:13px/1.4 ui-monospace,Consolas,monospace}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
figure{margin:0;padding:12px;border:1px solid ${line};border-radius:8px;background:#fff}
.sizes{display:flex;gap:12px;align-items:center;margin-bottom:8px}.grid{background:#fff}
figcaption{margin-top:6px;opacity:.7}h1{font-size:14px;margin:0 0 4px}p{margin:0 0 16px;opacity:.7}</style>
<h1>Folha de contato — ${items.length} icone(s)</h1><p>16 / 24 / 48 px e grade de 24 px: circulo 20 (laranja), quadrado 18, margem de seguranca 2 (tracejado). Pontue 1-10 e corrija o que ficar abaixo de 8.</p>
<main>${items.map(cell).join("")}</main></html>
`;
}

function main() {
  const args = process.argv.slice(2);
  const val = (n) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : undefined; };
  const src = args.find((a, i) => !a.startsWith("--") && !["--out", "--palette"].includes(args[i - 1]));
  const out = val("--out");
  if (!src || !out) { console.error("Uso: svg-icon-export.mjs <pasta-de-svgs> --out <pasta> [--palette palette.json] [--force] [--png]"); process.exit(2); }
  const palette = val("--palette") ? JSON.parse(readFileSync(resolve(val("--palette")), "utf8").replace(/^\uFEFF/, "")) : null;

  const dir = resolve(src);
  const files = readdirSync(dir).filter((f) => extname(f).toLowerCase() === ".svg").sort();
  if (!files.length) { console.error(`Nenhum .svg em ${dir}`); process.exit(2); }

  const items = files.map((f) => {
    const text = readFileSync(join(dir, f), "utf8");
    return { file: f, name: slug(basename(f, ".svg")), component: pascal(basename(f, ".svg")), text, inner: innerSvg(text), rootAttrs: rootStyleAttrs(text), lint: lintSvg(text, { palette }) };
  });
  const bad = items.filter((it) => it.lint.findings.some((x) => x.level === "error"));
  if (bad.length && !args.includes("--force")) {
    console.error(`Recusado: ${bad.length} icone(s) com erro de regra (${bad.map((b) => b.file).join(", ")}). Rode svg-icon-lint.mjs ou use --force.`);
    process.exit(1);
  }
  const dup = items.map((i) => i.name).filter((n, k, a) => a.indexOf(n) !== k);
  if (dup.length) { console.error(`Nomes duplicados apos normalizar: ${[...new Set(dup)].join(", ")}`); process.exit(1); }

  mkdirSync(resolve(out), { recursive: true });
  const o = (f) => join(resolve(out), f);

  // sprite: ids so existem aqui (o <symbol> precisa deles); os SVGs de origem seguem sem id
  writeFileSync(o("sprite.svg"), `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${items.map((it) => `  <symbol id="icon-${it.name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n${it.inner.split("\n").map((l) => `    ${l.trim()}`).join("\n")}\n  </symbol>`).join("\n")}\n</svg>\n`);

  writeFileSync(o("Icons.tsx"), `// Gerado por scripts/svg-icon-export.mjs — nao edite a mao.\nimport type { SVGProps } from "react";\n\ntype IconProps = SVGProps<SVGSVGElement> & { size?: number };\n\n${items.map((it) => `export const ${it.component}Icon = ({ size = 24, ...props }: IconProps) => (\n  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>\n${it.inner.split("\n").map((l) => `    ${toJsx(l.trim())}`).join("\n")}\n  </svg>\n);\n`).join("\n")}\nexport const icons = { ${items.map((it) => `${it.component}Icon`).join(", ")} };\n`);

  writeFileSync(o("contact-sheet.html"), sheetHtml(items, palette));
  const produced = ["sprite.svg", "Icons.tsx", "contact-sheet.html"];

  if (args.includes("--png")) {
    const browser = findBrowser();
    if (!browser) console.error("--png: nao achei Chrome/Edge (defina CHROME_PATH). A folha HTML foi gerada; abra no navegador.");
    else {
      const r = spawnSync(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1100,900", `--screenshot=${o("contact-sheet.png")}`, pathToFileURL(o("contact-sheet.html")).href], { encoding: "utf8", timeout: 60000 });
      if (existsSync(o("contact-sheet.png"))) produced.push("contact-sheet.png"); else console.error(`--png falhou (${r.status}). Abra contact-sheet.html no navegador.`);
    }
  }
  console.log(`${items.length} icone(s) -> ${resolve(out)}: ${produced.join(", ")}`);
}

// compara pelo caminho real: process.argv[1] pode vir por link simbolico (macOS /var -> /private/var) e import.meta.url nao; sem isso o script sai em silencio sem rodar
import { realpathSync as realpathMain } from "node:fs";
const isMainModule = (url) => { try { return realpathMain(process.argv[1]) === realpathMain(fileURLToPath(url)); } catch { return process.argv[1] === fileURLToPath(url); } };
if (process.argv[1] && isMainModule(import.meta.url)) main();
