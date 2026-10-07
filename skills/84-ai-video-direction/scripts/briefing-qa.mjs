#!/usr/bin/env node
/**
 * briefing-qa — portao mecanico do motor de briefing (references/briefing-engine.md).
 * Confere o que da para PROVAR sem julgamento: fato com fonte, espinha completa, beats filmaveis,
 * fechamento de marca. O julgamento (o evento e bom? a dor e visivel?) continua sendo da revisao.
 *
 *   node briefing-qa.mjs briefing.json [--json]      # exit 1 se houver erro
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CAMERA_JOBS = new Set(["hook", "performance", "object-detail", "device", "geography", "transformation", "dialogue-coverage", "impact"]);
const CATEGORIES = new Set(["publicitario", "social", "educacional", "documental", "narrativo", "musical", "evento"]);
// verbos que nao se filmam: o corpo nao "sente" nada visivel
const UNFILMABLE = /^(sent[eiao]\w*|perceb\w*|lembr\w*|am[ao]\w*|ador\w*|emocion\w*|nostalg\w*|refleti\w*|compreend\w*|entend\w*)$/i;
const NUM = /\d+(?:[.,]\d+)?%?/g;

const text = (v) => (v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.map(text).join(" ") : typeof v === "object" ? Object.values(v).map(text).join(" ") : String(v));
const words = (s) => String(s || "").trim().split(/\s+/).filter(Boolean);
const blank = (v) => !text(v).trim();

/** Faixa de beats por duracao (secao 3.8 do motor). */
export function beatRange(sec) {
  if (sec <= 12) return [2, 4];
  if (sec <= 17) return [4, 5];
  if (sec <= 25) return [6, 8];
  if (sec <= 30) return [8, 12];
  return null;
}

export function checkBriefing(b) {
  const f = [];
  const add = (level, rule, msg) => f.push({ level, rule, msg });
  const meta = b.meta || {}, idea = b.idea_card || {}, dig = b.source_digest || {}, mk = b.market_frame || {};
  const msg = b.message || {}, fmt = b.format || {}, sp = b.story_spine || {}, cast = b.cast_world || {};
  const beats = Array.isArray(b.beats) ? b.beats : [], assets = Array.isArray(b.assets) ? b.assets : [];
  const pack = b.generator_pack || {};

  // --- categoria e override
  if (!CATEGORIES.has(fmt.category)) add("error", "category", `format.category invalida: "${fmt.category}" (use ${[...CATEGORIES].join(" | ")})`);
  if (meta.category_override && meta.category_override !== fmt.category) add("error", "override", `o cliente forcou "${meta.category_override}" mas o roteador ficou em "${fmt.category}": obedeca o override e registre override_risk`);
  if (meta.category_override && fmt.category === meta.category_override && blank(fmt.override_risk) && fmt.category !== "publicitario") add("warn", "override-risk", "override do cliente sem override_risk: registre se o material nao sustenta a categoria");

  // --- fatos com fonte
  for (const [i, c] of (idea.claims || []).entries()) if (blank(c && c.quote)) add("error", "claims-quote", `idea_card.claims[${i}] sem citacao literal (quote)`);
  if (blank(mk.wedge)) add("warn", "wedge", 'market_frame.wedge vazio: sem cunha verificada, escreva "filmar a dor, nao a superioridade"');
  const corpus = text([dig.verified_claims, dig.proof, dig.offer]);
  const tokens = (s) => (String(s).match(NUM) || []).map((t) => t.replace(",", "."));
  const known = new Set(tokens(corpus));
  const spoken = [["message.promise", msg.promise], ...(pack.supers || []).map((s, i) => [`generator_pack.supers[${i}]`, text(s && s.text !== undefined ? s.text : s)]), ...(pack.vo || []).map((s, i) => [`generator_pack.vo[${i}]`, text(s && s.text !== undefined ? s.text : s)])];
  for (const [where, s] of spoken) for (const t of tokens(s)) if (!known.has(t)) add("error", "number-source", `${where} usa "${t}" que nao aparece em verified_claims, proof ou offer (numero sem fonte)`);
  const banned = [...(msg.will_not_say || []), ...(mk.do_not_say || [])].map((s) => text(s).toLowerCase().trim()).filter((s) => s.length > 3);
  for (const [where, s] of spoken) for (const bw of banned) if (String(s).toLowerCase().includes(bw)) add("error", "will-not-say", `${where} contem "${bw}", que esta em will_not_say/do_not_say`);

  // --- mensagem
  if (blank(msg.event)) add("error", "message", "message.event vazio: sem um evento filmavel nao ha comercial");
  if (words(msg.promise).length > 8) add("error", "promise-words", `message.promise tem ${words(msg.promise).length} palavras (maximo 8)`);
  if (blank(msg.cta)) add("warn", "cta", "message.cta vazio (verbo + objeto)");

  // --- espinha
  for (const k of ["event", "goal", "obstacle", "tactic", "reversal", "value_shift"]) if (blank(sp[k])) add("error", "spine", `story_spine.${k} vazio: a espinha precisa das cinco pecas mais o evento`);
  if (!blank(sp.value_shift) && !/→|->/.test(sp.value_shift)) add("warn", "spine-shift", 'story_spine.value_shift deveria ter o formato "antes → depois"');

  // --- beats
  const sec = Number(meta.duration_sec);
  if (!Number.isFinite(sec) || sec < 5 || sec > 60) add("error", "duration", `meta.duration_sec invalida: ${meta.duration_sec}`);
  else {
    const r = beatRange(sec);
    if (r && (beats.length < r[0] || beats.length > r[1])) add("error", "beats-count", `${beats.length} beats para ${sec} s (esperado ${r[0]} a ${r[1]})`);
  }
  for (const [i, bt] of beats.entries()) {
    const id = `beats[${i}]`;
    const verb = String(bt.verb || "").trim().split(/\s+/)[0] || "";
    if (!verb) add("error", "beat-verb", `${id} sem verbo`);
    else if (UNFILMABLE.test(verb)) add("error", "beat-verb", `${id}: "${verb}" nao se filma; troque por uma acao do corpo ("solta o ombro e larga a fatura")`);
    if (!/→|->/.test(String(bt.value || ""))) add("error", "beat-value", `${id} sem valor "antes → depois": beat que nao muda valor e cobertura, nao cena`);
    if (!CAMERA_JOBS.has(bt.camera_job)) add("error", "camera-job", `${id}.camera_job invalido: "${bt.camera_job}"`);
  }
  const needVo = beats.filter((x) => x.needs_vo).length;
  if (beats.length && needVo > beats.length / 2) add("warn", "vo-heavy", `${needVo} de ${beats.length} beats dependem de voz off: a historia deve se entender sem ela`);

  // --- dispositivos e fechamento
  if ((fmt.devices || []).length > 2) add("error", "devices", `${fmt.devices.length} dispositivos (maximo 2)`);
  const kind = (id) => (assets.find((a) => a.id === id) || {}).kind;
  if (fmt.category === "publicitario") {
    const e = fmt.end_lock || {};
    if (!e.card || !e.wordmark || blank(e.cta_line)) add("error", "end-lock", "publicitario fecha com cartela + marca + chamada (end_lock.card, wordmark e cta_line)");
    if (beats.length) {
      const last = beats[beats.length - 1], first = beats[0];
      if (!(last.asset_refs || []).some((id) => kind(id) === "end-card")) add("error", "end-card-last", "o ultimo beat do publicitario precisa referenciar um asset end-card");
      if ((first.asset_refs || []).some((id) => kind(id) === "end-card")) add("error", "logo-first", "marca/cartela no primeiro beat: os 2 primeiros segundos sao a dor visivel");
    }
  }

  // --- interface
  const ui = assets.filter((a) => a.kind === "ui-capture");
  if (cast.product_role === "ui-insert" && !ui.length) add("warn", "ui-asset", "product_role ui-insert sem nenhum asset ui-capture");
  for (const a of ui) {
    if (blank(a.must_not_invent)) add("error", "ui-invent", `asset ${a.id}: interface sem must_not_invent (tela mostra forma, nao dado falso)`);
    if (!(dig.visual || {}).ui_available && /print/i.test(String(a.source || ""))) add("error", "ui-source", `asset ${a.id} cita print do cliente mas visual.ui_available e falso`);
  }
  return { findings: f, errors: f.filter((x) => x.level === "error").length, warnings: f.filter((x) => x.level === "warn").length };
}

function main() {
  const a = process.argv.slice(2);
  const file = a.find((x) => !x.startsWith("--"));
  if (!file) { console.error("Uso: briefing-qa.mjs briefing.json [--json]"); process.exit(2); }
  const r = checkBriefing(JSON.parse(readFileSync(resolve(file), "utf8").replace(/^﻿/, "")));
  if (a.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.findings) console.log(`${x.level === "error" ? "ERRO" : "aviso"} [${x.rule}] ${x.msg}`);
    console.log(`briefing: ${r.errors} erro(s), ${r.warnings} aviso(s)${r.errors ? "" : " — segue o motor."}`);
  }
  process.exit(r.errors ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
