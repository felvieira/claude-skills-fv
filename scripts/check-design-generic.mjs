#!/usr/bin/env node

/**
 * check-design-generic — localiza padrões para revisão contextual.
 * O scanner não conhece a marca, o conteúdo ou a interface renderizada e não
 * determina se uma escolha é um defeito ou se foi gerada por IA.
 *
 * Uso:
 *   node scripts/check-design-generic.mjs <path...>     # avisos, exit 0
 *   node scripts/check-design-generic.mjs --strict <path> # exit 1 se houver aviso
 *   node scripts/check-design-generic.mjs --warn <path> # alias do padrão
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
 * Cada regra localiza um padrão que pode merecer revisão, nunca um defeito por si só.
 */
const RULES = [
  {
    id: "indigo-default",
    severity: "warn",
    // Os dois indigos default do Tailwind, o roxo/violeta vizinho e o azul-500.
    pattern: /#(4f46e5|6366f1|4338ca|818cf8|7c3aed|8b5cf6|3b82f6)\b|\b(indigo|violet)-(400|500|600|700)\b/gi,
    why: "cor indigo/violeta encontrada",
    fix: "confira funcao, identidade e contraste no contexto",
  },
  {
    id: "system-ui-only",
    severity: "warn",
    // Localiza declaracao; nao determina se a pilha tipografica e adequada.
    pattern: /font-family:\s*(system-ui|-apple-system|BlinkMacSystemFont)[^;]*;/gi,
    why: "fonte de sistema declarada",
    fix: "confira legibilidade, idiomas e adequacao ao produto",
  },
  {
    id: "ai-gradient",
    severity: "warn",
    // O gradiente roxo→rosa que virou cliche de "AI SaaS".
    pattern: /(from-(purple|violet|indigo|fuchsia)-\d{3}\s+to-(pink|rose|fuchsia|purple)-\d{3})|linear-gradient\([^)]*#(8b5cf6|a855f7|d946ef|ec4899)/gi,
    why: "gradiente roxo-para-rosa encontrado",
    fix: "avalie sua funcao, identidade e contraste",
  },
  {
    id: "uniform-radius",
    severity: "warn",
    // A contagem apenas indica repeticao para revisao contextual.
    pattern: /\brounded-(lg|xl|2xl)\b/g,
    threshold: 12,
    why: "classes de raio repetidas no arquivo",
    fix: "verifique se repeticao e hierarquia servem aos componentes",
  },
  {
    id: "directionless-shadow",
    severity: "warn",
    pattern: /\bshadow-(md|lg|xl|2xl)\b/g,
    threshold: 8,
    why: "classes de sombra repetidas no arquivo",
    fix: "confira consistencia e separacao das superficies",
  },
  {
    id: "pure-black-dark",
    severity: "warn",
    // Uma superficie preta pode ser intencional e apropriada ao produto.
    pattern: /(background(-color)?|--\w*bg\w*|--\w*surface\w*)\s*:\s*(#000\b|#000000\b|black\b|rgb\(0,\s*0,\s*0\))/gi,
    why: "preto puro usado como superficie",
    fix: "verifique leitura, contraste e distincao de camadas no tema",
  },
  {
    id: "raw-hex-sprawl",
    severity: "warn",
    // Muitos valores podem indicar oportunidade de tokens, conforme o contexto.
    pattern: /#[0-9a-f]{6}\b/gi,
    threshold: 15,
    why: "muitas cores hexadecimais no mesmo arquivo",
    fix: "verifique se tokens compartilhados resolveriam repeticao relevante",
  },
  {
    id: "vh-fullscreen",
    severity: "warn",
    // Localiza 100vh, mesmo quando existe fallback; verificar no navegador.
    pattern: /\b(100vh|h-screen|min-h-screen)\b/g,
    why: "altura de viewport que pode variar em navegadores mobile",
    fix: "confira o comportamento real e use dvh ou conteudo fluido quando necessario",
  },
];

function parseArgs(argv) {
  const opts = { warnOnly: false, strict: false, json: false, paths: [] };
  for (const arg of argv) {
    if (arg === "--warn") opts.warnOnly = true;
    else if (arg === "--strict") opts.strict = true;
    else if (arg === "--json") opts.json = true;
    else if (!arg.startsWith("--")) opts.paths.push(arg);
    else throw new Error(`Opcao desconhecida: ${arg}`);
  }
  if (opts.warnOnly && opts.strict) throw new Error("Use --warn ou --strict, nao ambos.");
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
 * O limiar reduz ruido; repeticao nao comprova falta de hierarquia.
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

  if (files.length === 0) {
    if (opts.json) console.log(JSON.stringify({ scanned: 0, errors: [], warns: [], problem: "Nenhum arquivo visual encontrado." }, null, 2));
    else console.error("Nenhum arquivo visual encontrado nos caminhos informados.");
    return 1;
  }

  const findings = [];
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    findings.push(...scanFile(file, content));
  }

  const errors = findings.filter((f) => f.severity === "error");
  const warns = findings.filter((f) => f.severity === "warn");

  if (opts.json) {
    console.log(JSON.stringify({ scanned: files.length, errors, warns }, null, 2));
    return opts.strict && findings.length > 0 ? 1 : 0;
  }

  if (findings.length === 0) {
    console.log(`Nenhum padrao procurado encontrado em ${files.length} arquivo(s); isso nao comprova qualidade visual.`);
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

  console.log("\nAvisos sao pistas; confirme marca, tarefa e interface antes de mudar o design.");
  return opts.strict && findings.length > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error("check-design-generic falhou:", error.message);
    process.exit(1);
  });
