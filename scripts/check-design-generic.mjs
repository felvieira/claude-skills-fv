#!/usr/bin/env node

/**
 * check-design-generic — detecta a assinatura do "default estatistico" em UI gerada.
 *
 * O modo de falha mais comum de UI gerada por IA nao e feiura: e ausencia de decisao.
 * O modelo cai na media do treino — indigo, system-ui, card branco sobre cinza, tudo
 * arredondado igual. `rules/frontend/ui-design.md` proibe isso em prosa; este script
 * transforma a proibicao em verificacao.
 *
 * Uso:
 *   node scripts/check-design-generic.mjs <path...>     # falha (exit 1) se achar
 *   node scripts/check-design-generic.mjs --warn <path> # so reporta (exit 0)
 *   node scripts/check-design-generic.mjs --json <path> # saida estruturada
 *
 * Sem path, varre o cwd. Ignora node_modules, dist, build, .next e afins.
 */

import fs from "fs/promises";
import path from "path";

const EXTENSIONS = new Set([".css", ".scss", ".tsx", ".jsx", ".vue", ".svelte", ".html", ".astro"]);
const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".nuxt", "out",
  "coverage", ".turbo", ".cache", "vendor", "graphify-out",
]);

/**
 * Cada regra descreve UM sinal de "nenhuma decisao estetica foi tomada".
 * `why` explica o problema; `fix` diz o que fazer — mensagem de erro sem saida
 * so gera frustracao.
 */
const RULES = [
  {
    id: "indigo-default",
    severity: "error",
    // Os dois indigos default do Tailwind, o roxo/violeta vizinho e o azul-500.
    pattern: /#(4f46e5|6366f1|4338ca|818cf8|7c3aed|8b5cf6|3b82f6)\b|\b(indigo|violet)-(400|500|600|700)\b/gi,
    why: "indigo/violeta default do Tailwind — a cor que a IA escolhe quando nao escolheu nada",
    fix: "derive o accent da ancora estetica (skill 02). Se voce chegou no indigo, pulou a decisao",
  },
  {
    id: "system-ui-only",
    severity: "error",
    // system-ui/-apple-system como fonte declarada, sem par tipografico proprio.
    pattern: /font-family:\s*(system-ui|-apple-system|BlinkMacSystemFont)[^;]*;/gi,
    why: "system-ui como unica fonte — ausencia de par tipografico",
    fix: "escolha display + body coerentes com a ancora (skill 02). system-ui so como ultimo fallback da pilha",
  },
  {
    id: "ai-gradient",
    severity: "error",
    // O gradiente roxo→rosa que virou cliche de "AI SaaS".
    pattern: /(from-(purple|violet|indigo|fuchsia)-\d{3}\s+to-(pink|rose|fuchsia|purple)-\d{3})|linear-gradient\([^)]*#(8b5cf6|a855f7|d946ef|ec4899)/gi,
    why: "gradiente roxo-para-rosa — cliche visual de 'AI SaaS'",
    fix: "se a ancora pede gradiente, derive-o da paleta propria; senao, superficie solida",
  },
  {
    id: "uniform-radius",
    severity: "warn",
    // Nao ha como saber o raio "certo" sem contexto; o sinal e a repeticao cega.
    pattern: /\brounded-(lg|xl|2xl)\b/g,
    threshold: 12,
    why: "mesmo border-radius repetido em tudo — sem hierarquia de superficie",
    fix: "raio concentrico: externo = interno + padding (skill 52). Nem todo elemento e um card",
  },
  {
    id: "directionless-shadow",
    severity: "warn",
    pattern: /\bshadow-(md|lg|xl|2xl)\b/g,
    threshold: 8,
    why: "shadow default repetido — sombra sem direcao de luz definida",
    fix: "sombra em camadas com direcao consistente, ou borda (skill 52)",
  },
  {
    id: "pure-black-dark",
    severity: "error",
    // Preto puro como superficie: halation, smearing OLED, elevacao morta (skill 57).
    pattern: /(background(-color)?|--\w*bg\w*|--\w*surface\w*)\s*:\s*(#000\b|#000000\b|black\b|rgb\(0,\s*0,\s*0\))/gi,
    why: "preto puro como superficie — causa halation, smearing em OLED e mata elevacao",
    fix: "use #121212 ou equivalente da ancora; elevacao no escuro e superficie mais clara (skill 57)",
  },
  {
    id: "vh-fullscreen",
    severity: "warn",
    // 100vh sem dvh na sequencia: corta atras da barra do browser mobile (skill 56).
    pattern: /\b(100vh|h-screen|min-h-screen)\b/g,
    why: "altura de viewport legada — corta conteudo atras da barra do browser mobile",
    fix: "use dvh (h-dvh / 100dvh) com 100vh so como fallback anterior (skill 56)",
  },
];

function parseArgs(argv) {
  const opts = { warnOnly: false, json: false, paths: [] };
  for (const arg of argv) {
    if (arg === "--warn") opts.warnOnly = true;
    else if (arg === "--json") opts.json = true;
    else if (!arg.startsWith("--")) opts.paths.push(arg);
  }
  if (opts.paths.length === 0) opts.paths.push(".");
  return opts;
}

async function collectFiles(target, acc = []) {
  let stat;
  try {
    stat = await fs.stat(target);
  } catch {
    return acc; // path inexistente nao e erro do checker
  }

  if (stat.isFile()) {
    if (EXTENSIONS.has(path.extname(target))) acc.push(target);
    return acc;
  }

  const entries = await fs.readdir(target, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      await collectFiles(path.join(target, entry.name), acc);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      acc.push(path.join(target, entry.name));
    }
  }
  return acc;
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

/**
 * Regra com `threshold` so reporta acima de N ocorrencias no MESMO arquivo —
 * `rounded-lg` uma vez e escolha; trinta vezes e ausencia de hierarquia.
 */
function scanFile(file, content) {
  const findings = [];

  for (const rule of RULES) {
    const matches = [...content.matchAll(rule.pattern)];
    if (matches.length === 0) continue;

    if (rule.threshold && matches.length < rule.threshold) continue;

    findings.push({
      file,
      rule: rule.id,
      severity: rule.severity,
      count: matches.length,
      line: lineOf(content, matches[0].index),
      sample: matches[0][0].trim().slice(0, 60),
      why: rule.why,
      fix: rule.fix,
    });
  }

  return findings;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const files = [];
  for (const target of opts.paths) await collectFiles(target, files);

  const findings = [];
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    findings.push(...scanFile(file, content));
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  if (opts.json) {
    console.log(JSON.stringify({ scanned: files.length, errors, warns }, null, 2));
    return errors.length > 0 && !opts.warnOnly ? 1 : 0;
  }

  if (findings.length === 0) {
    console.log(`Design check passed (${files.length} arquivos, nenhum sinal de default generico).`);
    return 0;
  }

  console.log(`\nDesign check — ${files.length} arquivos analisados\n`);

  for (const group of [errors, warns]) {
    for (const f of group) {
      const tag = f.severity === "error" ? "ERRO " : "AVISO";
      const times = f.count > 1 ? ` (${f.count}x)` : "";
      console.log(`${tag} ${f.file}:${f.line}${times}`);
      console.log(`      ${f.why}`);
      console.log(`      -> ${f.fix}`);
      console.log(`      encontrado: ${f.sample}\n`);
    }
  }

  console.log(`${errors.length} erro(s), ${warns.length} aviso(s).`);

  if (errors.length > 0 && !opts.warnOnly) {
    console.log("\nUI generica e ausencia de decisao estetica, nao questao de gosto.");
    console.log("Rode a skill 02 (ui-ux-design) e escolha UMA ancora antes de estilizar.");
    return 1;
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("check-design-generic falhou:", error.message);
    process.exit(1);
  });
