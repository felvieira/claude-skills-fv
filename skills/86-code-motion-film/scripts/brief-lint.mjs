#!/usr/bin/env node
/**
 * brief-lint — confere se um brief de filme segue o PADRAO interno da skill 86 (references/PADRAO.md).
 *
 *   node brief-lint.mjs <brief.md|.txt|.xml> [--profile director|quick] [--json] [--strict]
 *
 * Perfis:
 *  - director: brief em tags (<inputs> <direction> <structure> <build> <gotchas> <start>) para filme de verdade.
 *  - quick: brief compacto (um paragrafo + RULES/CRAFT) com {{placeholders}} ja resolvidos.
 * Sem --profile: "director" se houver tags XML do padrao, senao "quick".
 *
 * Limite: confere a PRESENCA e a forma das partes que o corpus mostra separarem os briefs que rendem filme dos que
 * rendem "texto centralizado em gradiente". Nao julga gosto nem se a ideia e boa.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const tag = (text, name) => (text.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i")) || [])[1] ?? null;
const count = (re, s) => (s.match(re) || []).length;

export function lintBrief(text, { profile } = {}) {
  const findings = [];
  const add = (level, rule, msg) => findings.push({ level, rule, msg });
  const hasTags = ["inputs", "direction", "structure", "build"].some((t) => tag(text, t) !== null);
  const kind = profile || (hasTags ? "director" : "quick");

  const unresolved = [...new Set(text.match(/\{\{[A-Za-z_]+\}\}/g) || [])];
  // placeholders sao legitimos DENTRO de <inputs> (como defaults) e no template; no brief final, nao
  const outsideInputs = text.replace(/<inputs>[\s\S]*?<\/inputs>/i, "");
  const left = [...new Set(outsideInputs.match(/\{\{[A-Za-z_]+\}\}/g) || [])];
  if (left.length) add("error", "placeholders", `${left.length} {{placeholder}} sem preencher: ${left.slice(0, 6).join(", ")}`);
  const edit = text.match(/\[EDITE[^\]]*\]/g) || [];
  if (edit.length) add("error", "template-fields", `${edit.length} campo(s) [EDITE: ...] do template sem preencher`);

  if (kind === "director") {
    for (const t of ["inputs", "direction", "structure", "build", "start"]) if (tag(text, t) === null) add("error", `tag-${t}`, `falta a tag <${t}>`);
    if (tag(text, "gotchas") === null) add("warn", "tag-gotchas", "falta <gotchas>: o que costuma dar errado (sobreposicao de texto, loop que engasga, will-change borrando texto...)");

    const inputs = tag(text, "inputs") ?? "";
    if (inputs && !/ask me|ask the user|pergunte|peça|peca/i.test(inputs)) add("error", "inputs-ask", "<inputs> deve pedir ao usuario o que e dele (produto, texto, cor, trilha) em vez de inventar");
    if (inputs && !/default|if i skip|se eu pular|padrao|padrão|e\.g\.|ex\.:|por exemplo/i.test(inputs)) add("warn", "inputs-defaults", "<inputs> sem defaults: se o usuario pular um item o filme nao tem o que usar");

    const dir = tag(text, "direction") ?? "";
    if (dir) {
      const banned = (dir.match(/(?:^|\n)\s*(?:banned|never|proibido|nunca)\s*:?\s*([^\n]+)/i) || [])[1] || "";
      if (!banned) add("error", "direction-banned", "<direction> sem lista de proibidos (Banned: ...): e o que mais separa o filme proprio do template");
      else if (banned.split(/,|;| e | and /).filter((x) => x.trim()).length < 3) add("warn", "direction-banned", "lista de proibidos com menos de 3 itens");
      const hex = count(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi, dir);
      if (hex < 2 && !/\b(palette|paleta|one accent|uma cor|accent|acento)\b/i.test(dir)) add("warn", "direction-palette", "sem paleta nem regra de acento (hex ou 'one accent color')");
      if (!/\b(font|fonte|type\b|tipografia|typeface|geist|inter|serif|grotesque|mono)\b/i.test(dir)) add("warn", "direction-type", "sem tipografia definida");
      if (!/\b(camera|câmera|zoom|pan|dolly)\b/i.test(dir)) add("warn", "direction-camera", "sem regra de camera (uma camera continua; nunca dois movimentos de camera ao mesmo tempo)");
    }

    const st = tag(text, "structure") ?? "";
    if (st) {
      const marks = count(/\bb\d+\s*[–-]\s*\d+|\bf\d+\s*[–-]\s*\d+|\b\d+[.:]\d{2}\s*[–-]\s*\d+[.:]\d{2}|\bbeat\s*\d+|\bbar\s*\d+|→|->|\bS\d+\b|\b\d+\s*s\b/gi, st);
      if (!/\bbpm\b|\bbeats?\b|\bbars?\b|\bf\d+|\bframes?\b|\bseconds?\b|\b\d+\s*s\b/i.test(st)) add("error", "structure-time", "<structure> sem mapa de tempo (BPM/compassos/batidas, faixas de quadros ou segundos)");
      else if (marks < 3) add("warn", "structure-steps", "<structure> com menos de 3 marcos: descreva o que acontece em cada trecho");
    }

    const build = tag(text, "build") ?? "";
    if (build) {
      if (!/\bseek\s*\(/i.test(build)) add("error", "build-seek", "<build> deve mandar escrever o filme como seek(t): cada quadro f(tempo), sem estado entre quadros");
      if (!/no css transition|no timers?|no state|sem transi|sem timer|sem estado|nothing depends on|pure function|funcao pura|função pura/i.test(build)) add("error", "build-determinism", "<build> sem a regra de determinismo (nada de CSS transition/timer/estado entre quadros)");
      if (!/closed[- ]form|forma fechada/i.test(build)) add("warn", "build-springs", "sem molas em forma fechada (uma mola por mudanca de alvo, soma de molas)");
      if (!/one frame per beat|per beat|stills?|quadros? (por|a cada) batida|quadros?-chave|folha de quadros|em uma folha|contact sheet|critique|critica|crítica/i.test(build)) add("warn", "build-critique", "sem laco de critica (renderizar quadros-chave e corrigir antes do render completo)");
      if (!/playwright|ffmpeg|render-seek|remotion|hyperframes/i.test(build)) add("warn", "build-render", "nao diz como renderiza (Playwright + ffmpeg, Remotion ou HyperFrames)");
    }

    const start = tag(text, "start") ?? "";
    if (start && !/ask me|ask for|pergunte|peça|peca|pe[cç]a/i.test(start)) add("error", "start-ask", "<start> deve mandar pedir os inputs antes de tudo");
    if (start && !/show me|mostre|beat map|mapa de batidas|stills?|quadros/i.test(start)) add("error", "start-show", "<start> deve mandar MOSTRAR o mapa de batidas e quadros-chave antes de construir o filme completo");
  } else {
    if (!/\b\d+\s*[- ]?\s*(s\b|sec|second|segundo|min)/i.test(text)) add("error", "quick-duration", "sem duracao (ex.: 15 s)");
    if (!/\b(banned|never|no [a-z]+|sem [a-z]+|nunca|proibido)\b/i.test(text)) add("error", "quick-rules", "sem regras do que NAO fazer");
    if (!/\b(palette|paleta|colou?rs?|cores?|#[0-9a-f]{3,6})\b/i.test(text)) add("warn", "quick-palette", "sem cores");
    if (!/\b(music|musica|música|audio|áudio|sound|som|bpm|silent|sem som|no voiceover)\b/i.test(text)) add("warn", "quick-audio", "nao diz nada sobre som (com trilha? sem?)");
    if (text.length < 120) add("warn", "quick-short", "brief muito curto: vira o filme generico (texto centralizado em gradiente); acrescente estilo, regras e referencia");
  }

  const loops = /\bloop/i.test(text);
  if (loops && !/last frame|first frame|ultimo quadro|último quadro|primeiro quadro/i.test(text)) add("warn", "loop-closure", "fala em loop mas nao exige ultimo quadro = primeiro (cursor e velocidade incluidos)");
  return { kind, findings, chars: text.length, template_placeholders: unresolved.length };
}

function main() {
  const args = process.argv.slice(2);
  const flag = (n) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : undefined; };
  const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--profile");
  if (!file) { console.error("Uso: brief-lint.mjs <brief> [--profile director|quick] [--json] [--strict]"); process.exit(2); }
  if (!existsSync(resolve(file))) { console.error(`Nao encontrei ${file}`); process.exit(2); }
  const r = lintBrief(readFileSync(resolve(file), "utf8").replace(/^﻿/, ""), { profile: flag("--profile") });
  const errors = r.findings.filter((f) => f.level === "error").length;
  if (args.includes("--json")) console.log(JSON.stringify({ ...r, errors, warnings: r.findings.length - errors }, null, 2));
  else {
    console.log(`brief (${r.kind}, ${r.chars} caracteres): ${errors} erro(s), ${r.findings.length - errors} aviso(s)`);
    for (const f of r.findings) console.log(`  ${f.level === "error" ? "x" : "!"} [${f.rule}] ${f.msg}`);
    if (!r.findings.length) console.log("  segue o padrao.");
  }
  if (args.includes("--strict") && errors) process.exit(1);
}

// compara pelo caminho real: process.argv[1] pode vir por link simbolico (macOS /var -> /private/var) e import.meta.url nao; sem isso o script sai em silencio sem rodar
import { realpathSync as realpathMain } from "node:fs";
const isMainModule = (url) => { try { return realpathMain(process.argv[1]) === realpathMain(fileURLToPath(url)); } catch { return process.argv[1] === fileURLToPath(url); } };
if (process.argv[1] && isMainModule(import.meta.url)) main();
