/**
 * Skill 84 (ai-video-direction): motor de briefing, portao de QA mecanico e biblioteca de prompts por tipo.
 * Roda com: node --test scripts/tests/skill-84.test.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { beatRange, checkBriefing } from "../../skills/84-ai-video-direction/scripts/briefing-qa.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SK = join(root, "skills", "84-ai-video-direction");
const QA = join(SK, "scripts", "briefing-qa.mjs");
const json = (p) => JSON.parse(readFileSync(join(SK, p), "utf8"));
const fresh = () => JSON.parse(JSON.stringify(json("templates/briefing-exemplo.json")));
const rules = (b) => checkBriefing(b).findings.filter((f) => f.level === "error").map((f) => f.rule);

test("briefing-qa: o exemplo preenchido passa sem erro nem aviso e o esqueleto vazio reprova", () => {
  assert.deepEqual(checkBriefing(fresh()).findings, []);
  const empty = checkBriefing(json("templates/briefing.json"));
  assert.ok(empty.errors >= 6, `esqueleto vazio deveria reprovar (${empty.errors} erros)`);
  assert.equal(spawnSync(process.execPath, [QA, join(SK, "templates", "briefing-exemplo.json")]).status, 0);
  assert.equal(spawnSync(process.execPath, [QA, join(SK, "templates", "briefing.json")]).status, 1);
});

test("briefing-qa: numero sem fonte e afirmacao proibida sao pegos; numero com fonte passa", () => {
  const b = fresh();
  b.message.promise = "Economize 30% todo mes";
  assert.ok(rules(b).includes("number-source"), "30% sem fonte");
  const will = fresh();
  will.message.promise = "O melhor app para voce";
  assert.ok(rules(will).includes("will-not-say"), "'o melhor app' esta em will_not_say");
  const ok = fresh();
  ok.source_digest.verified_claims = ["Categoriza 3 tipos de gasto automaticamente"];
  ok.message.promise = "Separa 3 tipos de gasto";
  assert.deepEqual(rules(ok), [], "numero presente em verified_claims e aceito");
  const sup = fresh();
  sup.generator_pack.supers.push({ text: "R$ 49,90 por mes" });
  assert.ok(rules(sup).includes("number-source"), "preco no super sem fonte");
});

test("briefing-qa: espinha, beats e fechamento de marca", () => {
  const cases = [
    ["spine", (b) => { b.story_spine.reversal = ""; }],
    ["beat-verb", (b) => { b.beats[1].verb = "sente"; }],
    ["beat-value", (b) => { b.beats[2].value = "curioso"; }],
    ["camera-job", (b) => { b.beats[0].camera_job = "vibe"; }],
    ["beats-count", (b) => { b.beats = b.beats.slice(0, 3); }],
    ["devices", (b) => { b.format.devices = ["live", "ui-insert", "graphic"]; }],
    ["end-lock", (b) => { b.format.end_lock.cta_line = ""; }],
    ["end-card-last", (b) => { b.beats[5].asset_refs = []; }],
    ["logo-first", (b) => { b.beats[0].asset_refs = ["end-01"]; }],
    ["promise-words", (b) => { b.message.promise = "uma promessa longa demais para caber em oito palavras mesmo"; }],
  ];
  for (const [rule, mutate] of cases) {
    const b = fresh();
    mutate(b);
    assert.ok(rules(b).includes(rule), `${rule} deveria ser pego`);
  }
});

test("briefing-qa: interface sem dado inventado, override do cliente, citacao e beats por duracao", () => {
  const cases = [
    ["ui-invent", (b) => { b.assets[0].must_not_invent = ""; }],
    ["ui-source", (b) => { b.assets[0].source = "print do cliente"; }],
    ["override", (b) => { b.meta.category_override = "social"; }],
    ["claims-quote", (b) => { b.idea_card.claims[0].quote = ""; }],
  ];
  for (const [rule, mutate] of cases) {
    const b = fresh();
    mutate(b);
    assert.ok(rules(b).includes(rule), `${rule} deveria ser pego`);
  }
  assert.deepEqual([beatRange(10), beatRange(15), beatRange(20), beatRange(30), beatRange(45)], [[2, 4], [4, 5], [6, 8], [8, 12], null]);
});

test("biblioteca de prompts: os 10 tipos existem, com tempo por plano, e nao carregam dado pessoal", () => {
  const t = readFileSync(join(SK, "templates", "prompts-por-tipo.md"), "utf8");
  const heads = t.match(/^## \d+\. .+$/gm) || [];
  assert.equal(heads.length, 10, heads.join(" | "));
  for (const h of heads) {
    const body = t.slice(t.indexOf(h)).split(/\n## /)[0];
    assert.match(body, /\d+(?:-\d+)?s/, `${h}: sem intervalo de tempo`);
  }
  // o repo e publico: o plano de origem era de pessoas reais, nada disso pode vazar para os modelos
  const all = ["templates/prompts-por-tipo.md", "references/quadro-composto-e-revisao.md", "references/briefing-engine.md"].map((p) => readFileSync(join(SK, p), "utf8")).join("\n");
  for (const nome of ["Felipe", "Annye", "Rebeca", "Gramado", "Panamá", "Punta Cana", "20/06/2026", "Elvis"]) assert.ok(!all.includes(nome), `dado pessoal no kit: ${nome}`);
});

test("skill 84 registra o motor de briefing: SKILL.md cita os arquivos novos e o CI roda este teste", () => {
  const skill = readFileSync(join(SK, "SKILL.md"), "utf8");
  for (const p of ["references/briefing-engine.md", "references/quadro-composto-e-revisao.md", "templates/prompts-por-tipo.md", "templates/briefing.json", "scripts/briefing-qa.mjs"]) {
    assert.ok(existsSync(join(SK, p)), `falta ${p}`);
    assert.ok(skill.includes(p.split("/").pop()), `SKILL.md nao cita ${p}`);
  }
  assert.match(readFileSync(join(root, ".github", "workflows", "validate.yml"), "utf8"), /skill-84\.test\.mjs/);
});
