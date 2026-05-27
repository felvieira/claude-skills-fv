#!/usr/bin/env node
/**
 * skill-health.mjs — Dashboard de saúde do portfolio de skills.
 *
 * Inspirado em ECC (affaan-m/ECC, MIT) — `/skill-health`. Adaptado pro nosso layout:
 * - skills/NN-name/SKILL.md
 * - agents/*.md
 * - commands/*.md
 * - evals/triggers/*.jsonl (se houver — alimentado por scripts/eval-triggers.mjs)
 *
 * Saída: docs/skill-health.md (regenerado a cada execução)
 *
 * Sem deps. Node ≥18.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const ROOT = resolve(process.cwd());
const SKILLS_DIR = join(ROOT, 'skills');
const AGENTS_DIR = join(ROOT, 'agents');
const COMMANDS_DIR = join(ROOT, 'commands');
const EVALS_DIR = join(ROOT, 'evals', 'triggers');
const OUT = join(ROOT, 'docs', 'skill-health.md');

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const meta = {};
  let key = null, multiline = '';
  for (const line of m[1].split('\n')) {
    if (multiline !== '' && (line.startsWith(' ') || line.startsWith('\t'))) {
      multiline += ' ' + line.trim();
      meta[key] = multiline;
      continue;
    }
    if (multiline) { meta[key] = multiline.trim(); multiline = ''; key = null; }
    const eq = line.indexOf(':');
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (v === '|' || v === '') { key = k; multiline = ''; continue; }
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    meta[k] = v;
  }
  return meta;
}

function listDir(dir, pattern) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => pattern.test(f));
}

function loadSkills() {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter(d => /^\d{2}-/.test(d))
    .map(d => {
      const skillFile = join(SKILLS_DIR, d, 'SKILL.md');
      if (!existsSync(skillFile)) return null;
      const content = readFileSync(skillFile, 'utf8');
      const meta = parseFrontmatter(content);
      const stats = statSync(skillFile);
      return {
        dir: d,
        name: meta.name || d,
        description: meta.description || '',
        descLength: (meta.description || '').length,
        path: skillFile,
        size: content.length,
        mtime: stats.mtime,
      };
    })
    .filter(Boolean);
}

function loadAgents() {
  return listDir(AGENTS_DIR, /\.md$/)
    .map(f => {
      const path = join(AGENTS_DIR, f);
      const content = readFileSync(path, 'utf8');
      const meta = parseFrontmatter(content);
      return {
        name: basename(f, '.md'),
        description: meta.description || '',
        descLength: (meta.description || '').length,
        path,
      };
    });
}

function loadCommands() {
  return listDir(COMMANDS_DIR, /\.md$/)
    .map(f => {
      const path = join(COMMANDS_DIR, f);
      const content = readFileSync(path, 'utf8');
      const meta = parseFrontmatter(content);
      return {
        name: basename(f, '.md'),
        description: meta.description || '',
        descLength: (meta.description || '').length,
        path,
      };
    });
}

function loadEvals() {
  if (!existsSync(EVALS_DIR)) return {};
  const evals = {};
  for (const f of readdirSync(EVALS_DIR)) {
    if (!f.endsWith('.jsonl')) continue;
    const slug = basename(f, '.jsonl');
    try {
      const lines = readFileSync(join(EVALS_DIR, f), 'utf8').split('\n').filter(Boolean);
      const total = lines.length;
      let hits = 0;
      for (const l of lines) {
        try {
          const obj = JSON.parse(l);
          if (obj.expected === true || obj.match === true) hits++;
        } catch {}
      }
      evals[slug] = { total, hits, accuracy: total ? hits / total : null };
    } catch {}
  }
  return evals;
}

function extractTriggers(desc) {
  const m = desc.match(/Trigger em:\s*([^.]+)/i);
  if (!m) return [];
  return m[1]
    .split(/,\s*/)
    .map(s => s.replace(/["'.]/g, '').trim().toLowerCase())
    .filter(Boolean);
}

function detectOverlap(skills) {
  const triggerMap = new Map();
  for (const s of skills) {
    const triggers = extractTriggers(s.description);
    for (const t of triggers) {
      if (!triggerMap.has(t)) triggerMap.set(t, []);
      triggerMap.get(t).push(s.name);
    }
  }
  const overlaps = [];
  for (const [t, names] of triggerMap.entries()) {
    if (names.length > 1) overlaps.push({ trigger: t, skills: names });
  }
  return overlaps;
}

function generateReport() {
  const skills = loadSkills();
  const agents = loadAgents();
  const commands = loadCommands();
  const evals = loadEvals();
  const overlaps = detectOverlap(skills);

  const flagged = {
    weak_description: skills.filter(s => s.descLength < 80),
    no_triggers: skills.filter(s => !s.description.toLowerCase().includes('trigger em')),
    no_evals: skills.filter(s => !evals[s.name] && !evals[s.dir]),
    low_accuracy: Object.entries(evals)
      .filter(([_, e]) => e.accuracy !== null && e.accuracy < 0.7)
      .map(([slug, e]) => ({ slug, ...e })),
  };

  const lines = [];
  lines.push(`# Skill Portfolio Health`);
  lines.push('');
  lines.push(`> Regenerado automaticamente por \`scripts/skill-health.mjs\` em ${new Date().toISOString()}.`);
  lines.push(`> Não editar manualmente — alterações são sobrescritas.`);
  lines.push('');
  lines.push('## Sumário');
  lines.push('');
  lines.push(`- **Skills:** ${skills.length}`);
  lines.push(`- **Subagents:** ${agents.length}`);
  lines.push(`- **Commands:** ${commands.length}`);
  lines.push(`- **Eval fixtures:** ${Object.keys(evals).length}`);
  lines.push(`- **Overlaps detectados:** ${overlaps.length}`);
  lines.push('');

  lines.push('## Flags');
  lines.push('');
  lines.push(`### ⚠️ Description curta (<80 chars)`);
  lines.push('');
  if (!flagged.weak_description.length) lines.push('- (nenhuma)');
  else for (const s of flagged.weak_description) lines.push(`- ${s.dir} — \`${s.descLength}\` chars`);
  lines.push('');

  lines.push(`### ⚠️ Sem triggers explícitos no description`);
  lines.push('');
  if (!flagged.no_triggers.length) lines.push('- (todas OK)');
  else for (const s of flagged.no_triggers) lines.push(`- ${s.dir}`);
  lines.push('');

  lines.push(`### ⚠️ Sem eval fixture em \`evals/triggers/\``);
  lines.push('');
  if (!flagged.no_evals.length) lines.push('- (cobertura total)');
  else {
    lines.push(`- ${flagged.no_evals.length} skills sem fixture. Criar uma por skill com \`scripts/eval-triggers.mjs\``);
    for (const s of flagged.no_evals.slice(0, 10)) lines.push(`  - ${s.dir}`);
    if (flagged.no_evals.length > 10) lines.push(`  - ...e mais ${flagged.no_evals.length - 10}`);
  }
  lines.push('');

  lines.push(`### ⚠️ Eval accuracy <70%`);
  lines.push('');
  if (!flagged.low_accuracy.length) lines.push('- (nenhuma)');
  else for (const e of flagged.low_accuracy) lines.push(`- ${e.slug}: ${(e.accuracy * 100).toFixed(0)}% (${e.hits}/${e.total})`);
  lines.push('');

  lines.push(`### ⚠️ Triggers compartilhados entre skills (overlap)`);
  lines.push('');
  if (!overlaps.length) lines.push('- (sem overlaps detectados)');
  else for (const o of overlaps.slice(0, 15)) lines.push(`- \`${o.trigger}\` → ${o.skills.join(', ')}`);
  lines.push('');

  lines.push('## Skills (top 10 por description quality)');
  lines.push('');
  lines.push('| Skill | Description chars | Triggers | Eval accuracy |');
  lines.push('|-------|-------------------|----------|---------------|');
  const ranked = skills.slice().sort((a, b) => b.descLength - a.descLength).slice(0, 10);
  for (const s of ranked) {
    const triggers = extractTriggers(s.description).length;
    const e = evals[s.name] || evals[s.dir];
    const acc = e?.accuracy !== null && e?.accuracy !== undefined ? `${(e.accuracy * 100).toFixed(0)}%` : '—';
    lines.push(`| ${s.dir} | ${s.descLength} | ${triggers} | ${acc} |`);
  }
  lines.push('');

  lines.push('## Ações sugeridas');
  lines.push('');
  if (flagged.weak_description.length) lines.push(`- Estender description curtas via \`/humanize\` ou skill 35 (skill-author)`);
  if (flagged.no_triggers.length) lines.push(`- Adicionar "Trigger em:" no description das skills sem triggers explícitos`);
  if (flagged.no_evals.length) lines.push(`- Criar \`evals/triggers/<slug>.jsonl\` pras skills sem fixture`);
  if (flagged.low_accuracy.length) lines.push(`- Refinar description das skills com accuracy <70% (overlap ou trigger fraco)`);
  if (overlaps.length) lines.push(`- Revisar overlaps — considerar consolidação ou triggers mais específicos`);
  if (!flagged.weak_description.length && !flagged.no_triggers.length && !flagged.no_evals.length && !flagged.low_accuracy.length && !overlaps.length) {
    lines.push('- Portfolio saudável. Continue assim.');
  }
  lines.push('');

  return lines.join('\n');
}

const report = generateReport();
writeFileSync(OUT, report, 'utf8');
console.log(`skill-health report → ${OUT}`);
console.log(`(${report.split('\n').length} lines)`);
