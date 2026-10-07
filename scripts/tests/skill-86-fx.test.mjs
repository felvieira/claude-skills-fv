/**
 * Skill 86: efeitos como funcoes puras do tempo (fx.mjs) e coerencia dos guias de decisao.
 * Roda com: node --test scripts/tests/skill-86-fx.test.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { ambient, confetti, countUp, dashFor, hash, irisRadius, kenBurns, noise, shake, stagger, stepOf, wipeRect } from "../../skills/86-code-motion-film/scripts/fx.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SK = join(root, "skills", "86-code-motion-film");
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b} (±${eps})`);

test("hash e noise: deterministicos, no intervalo e continuos", () => {
  for (let i = 0; i < 500; i++) { const h = hash(i, 3); assert.ok(h >= 0 && h < 1); assert.equal(h, hash(i, 3)); }
  assert.notEqual(hash(1, 1), hash(1, 2), "semente muda o resultado");
  const spread = new Set(Array.from({ length: 200 }, (_, i) => Math.floor(hash(i, 5) * 10))).size;
  assert.ok(spread >= 9, `distribuicao pobre (${spread}/10 faixas)`);
  for (let x = 0; x < 20; x += 0.37) { const n = noise(x, 2); assert.ok(n >= -1 && n <= 1); assert.equal(n, noise(x, 2)); }
  let maxJump = 0;
  for (let x = 0; x < 30; x += 0.01) maxJump = Math.max(maxJump, Math.abs(noise(x + 0.01, 4) - noise(x, 4)));
  assert.ok(maxJump < 0.2, `ruido deveria ser suave (salto ${maxJump})`);
  assert.equal(stepOf(0.49, 2), 0); assert.equal(stepOf(0.5, 2), 1); assert.equal(stepOf(-1, 2), 0);
});

test("stagger e countUp: extremos exatos e ordem dos itens", () => {
  assert.equal(stagger(0, 0, 0, 0.1, 0.4), 0);
  assert.equal(stagger(9, 0, 3, 0.1, 0.4), 1);
  assert.ok(stagger(0.3, 0, 0, 0.1, 0.4) > stagger(0.3, 0, 2, 0.1, 0.4), "o primeiro item chega antes do terceiro");
  near(countUp(0, 0, 2, 38, 4.2), 38); near(countUp(2, 0, 2, 38, 4.2), 4.2); near(countUp(99, 0, 2, 38, 4.2), 4.2);
  assert.ok(countUp(1, 0, 2, 0, 100) > 50, "ease-out: passa da metade antes da metade do tempo");
});

test("shake: zero fora da janela, amplitude cai ate assentar", () => {
  assert.deepEqual(shake(-0.1, 0, 0.5), { x: 0, y: 0, r: 0 });
  assert.deepEqual(shake(0.5, 0, 0.5), { x: 0, y: 0, r: 0 });
  const mag = (t) => { const s = shake(t, 0, 1, 20, 3); return Math.hypot(s.x, s.y); };
  const early = Math.max(...[0.02, 0.05, 0.08, 0.11].map(mag)), late = Math.max(...[0.85, 0.88, 0.91, 0.94].map(mag));
  assert.ok(early > late * 4, `deveria cair (inicio ${early}, fim ${late})`);
  assert.deepEqual(shake(0.2, 0, 1, 20, 3), shake(0.2, 0, 1, 20, 3));
});

test("ambient: o loop fecha (t = 0 e t = duracao dao o mesmo) e a amplitude e limitada", () => {
  for (const d of [6, 15]) {
    const a = ambient(0, d, 8, 2), b = ambient(d, d, 8, 2);
    near(a.x, b.x, 1e-9); near(a.y, b.y, 1e-9); near(a.r, b.r, 1e-12);
  }
  let max = 0;
  for (let t = 0; t < 15; t += 0.05) { const v = ambient(t, 15, 8, 2); max = Math.max(max, Math.abs(v.x), Math.abs(v.y)); }
  assert.ok(max > 1 && max < 8 * 2.5, `amplitude fora do esperado: ${max}`);
});

test("dashFor, wipeRect, irisRadius e kenBurns: pontas exatas", () => {
  assert.deepEqual(dashFor(100, 0), { dash: [100, 100], offset: 100 });
  assert.deepEqual(dashFor(100, 1), { dash: [100, 100], offset: 0 });
  assert.deepEqual(wipeRect(0.5, "left", 200, 100), { x: 0, y: 0, w: 100, h: 100 });
  assert.deepEqual(wipeRect(0.25, "right", 200, 100), { x: 150, y: 0, w: 50, h: 100 });
  assert.deepEqual(wipeRect(1, "top", 200, 100), { x: 0, y: 0, w: 200, h: 100 });
  assert.deepEqual(wipeRect(0.5, "bottom", 200, 100), { x: 0, y: 50, w: 200, h: 50 });
  assert.throws(() => wipeRect(0.5, "diagonal", 1, 1), /lado invalido/);
  assert.equal(irisRadius(0, 100, 50, 200, 100), 0);
  near(irisRadius(1, 0, 0, 300, 400), 500);
  near(irisRadius(1, 100, 50, 200, 100), Math.hypot(100, 50));
  const a = { s: 1, x: 0, y: 0 }, b = { s: 1.2, x: 40, y: -20 };
  assert.deepEqual(kenBurns(0, 1, 5, a, b), a);
  assert.deepEqual(kenBurns(9, 1, 5, a, b), b);
  near(kenBurns(3, 1, 5, a, b).s, 1.1);
});

test("confetti: forma fechada, cai com a gravidade, some no fim e nao existe antes do inicio", () => {
  const o = { x: 500, y: 300, seed: 4 };
  assert.deepEqual(confetti(7, 0.4, 0, o), confetti(7, 0.4, 0, o));
  assert.equal(confetti(7, -0.1, 0, o).a, 0);
  assert.equal(confetti(7, 9, 0, o).a, 0);
  const late = confetti(3, 1.4, 0, o), mid = confetti(3, 0.7, 0, o);
  assert.ok(late.y > mid.y, "a gravidade vence: mais tarde, mais embaixo");
  assert.ok(late.a < mid.a || mid.a === 1, "desvanece no fim");
  const hues = new Set(Array.from({ length: 40 }, (_, i) => confetti(i, 0.5, 0, o).hue));
  assert.ok(hues.size > 15, "cores variadas");
});

test("guias de decisao: arquivos existem, SKILL.md os cita e sao ligados a funcoes que existem", () => {
  const skill = readFileSync(join(SK, "SKILL.md"), "utf8");
  for (const f of ["TIPOS.md", "ESTILOS.md", "EFEITOS.md", "AGENTES.md"]) {
    assert.ok(existsSync(join(SK, "references", f)), `falta references/${f}`);
    assert.ok(skill.includes(f), `SKILL.md nao cita ${f}`);
  }
  const efeitos = readFileSync(join(SK, "references", "EFEITOS.md"), "utf8");
  for (const fn of ["hash", "noise", "stepOf", "stagger", "countUp", "shake", "ambient", "dashFor", "wipeRect", "irisRadius", "kenBurns", "confetti"]) assert.ok(efeitos.includes(fn), `EFEITOS.md nao documenta ${fn}`);
  const estilos = readFileSync(join(SK, "references", "ESTILOS.md"), "utf8");
  for (const hex of estilos.match(/#[0-9a-fA-F]{6}\b/g) || []) assert.match(hex, /^#[0-9a-fA-F]{6}$/);
  assert.ok((estilos.match(/^## /gm) || []).length >= 7, "ESTILOS.md deveria ter os estilos mais a secao de escolha");
});
