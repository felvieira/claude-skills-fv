#!/usr/bin/env node
/**
 * skill-health.mjs — Dashboard de saúde do portfolio.
 *
 * Inspirado em ECC (affaan-m/ECC, MIT) — `/skill-health`. Adaptado pro nosso layout:
 * - skills/NN-name/SKILL.md
 * - agents/*.md
 * - commands/*.md
 * - evals/triggers/*.json (formato JSON com should_trigger / shouldnt_trigger arrays)
 * - policies/*.md (verificação de dead policies)
 *
 * Saída: docs/skill-health.md (regenerado a cada execução)
 *
 * Sem deps. Node ≥18.
 *
 * v2.19.1 fixes:
 * - parser frontmatter corrigido (description: | multiline YAML)
 * - lookup eval por dir (44-zoom-out) e por name (zoom-out)
 * - leitura de .json (não .jsonl) — formato real das fixtures
 * - overlap detection cross-section (skills+agents+commands)
 * - dead policy detection (referências cross-file)
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const ROOT = resolve(process.cwd());
const SKILLS_DIR = join(ROOT, 'skills');
const AGENTS_DIR = join(ROOT, 'agents');
const COMMANDS_DIR = join(ROOT, 'commands');
const POLICIES_DIR = join(ROOT, 'policies');
const EVALS_DIR = join(ROOT, 'evals', 'triggers');
const OUT = join(ROOT, 'docs', 'skill-health.md');

// ─── Frontmatter parser (handles YAML: simple, "quoted", | multiline) ───────
function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const meta = {};
  const lines = m[1].split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const colon = line.indexOf(':');
    if (colon < 0 || /^\s/.test(line)) { i++; continue; }
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value === '|' || value === '|-' || value === '>' || value === '') {
      // Multiline: consume indented lines until next top-level key or end
      const collected = [];
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (/^[A-Za-z_][A-Za-z0-9_-]*\s*:/.test(next)) break;
        // strip leading indent (2+ spaces or tab)
        collected.push(next.replace(/^(\s{2,}|\t)/, ''));
        i++;
      }
      meta[key] = collected.join('\n').trim();
      continue;
    }
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
    i++;
  }
  return meta;
}

// ─── List files in dir matching pattern ─────────────────────────────────────
function listDir(dir, pattern) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => pattern.test(f));
}

// ─── Load entities ──────────────────────────────────────────────────────────
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
      const description = meta.description || '';
      return {
        kind: 'skill',
        dir: d,
        slug: d,                    // chave canônica (NN-name)
        name: meta.name || d,       // nome curto (frontmatter)
        description,
        descLength: description.length,
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
      const description = meta.description || '';
      return {
        kind: 'agent',
        slug: basename(f, '.md'),
        name: meta.name || basename(f, '.md'),
        description,
        descLength: description.length,
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
      const description = meta.description || '';
      return {
        kind: 'command',
        slug: basename(f, '.md'),
        name: meta.name || basename(f, '.md'),
        description,
        descLength: description.length,
        path,
      };
    });
}

// ─── Load eval fixtures (JSON format with should_trigger/shouldnt_trigger) ──
function loadEvals() {
  if (!existsSync(EVALS_DIR)) return {};
  const evals = {};
  for (const f of readdirSync(EVALS_DIR)) {
    if (!f.endsWith('.json')) continue;
    const slug = basename(f, '.json');
    try {
      const data = JSON.parse(readFileSync(join(EVALS_DIR, f), 'utf8'));
      const should = (data.should_trigger || []).length;
      const shouldnt = (data.shouldnt_trigger || []).length;
      // accuracy real só vem do scripts/eval-triggers.mjs — aqui só sabemos que tem fixture
      evals[slug] = {
        path: join(EVALS_DIR, f),
        should_count: should,
        shouldnt_count: shouldnt,
        total: should + shouldnt,
      };
    } catch {}
  }
  return evals;
}

// ─── Extract triggers (clone do eval-triggers.mjs, proven correto) ──────────
function extractTriggers(desc) {
  if (!desc) return [];
  const idx = desc.search(/[Tt]rigger\s+em\s*:/);
  if (idx < 0) return [];
  const tail = desc.slice(idx);
  const stopAt = tail.search(/\n[A-Za-z_][A-Za-z0-9_-]*\s*:/);
  const block = stopAt > 0 ? tail.slice(0, stopAt) : tail;
  const quoted = [...block.matchAll(/["']([^"']{2,80})["']/g)].map(m => m[1].toLowerCase().trim());
  if (quoted.length > 0) return [...new Set(quoted)];
  return [
    ...new Set(
      block
        .replace(/^[Tt]rigger\s+em\s*:/, '')
        .split(/[,\n]/)
        .map(s => s.replace(/["'`.]/g, '').trim().toLowerCase())
        .filter(s => s.length >= 2 && s.length <= 80),
    ),
  ];
}

// ─── Detect overlaps cross-section (skill+agent+command) ────────────────────
function detectOverlap(entities) {
  const triggerMap = new Map();
  for (const e of entities) {
    const triggers = extractTriggers(e.description);
    for (const t of triggers) {
      if (!triggerMap.has(t)) triggerMap.set(t, []);
      triggerMap.get(t).push(`${e.kind}:${e.slug}`);
    }
  }
  const overlaps = [];
  for (const [t, names] of triggerMap.entries()) {
    if (names.length > 1) overlaps.push({ trigger: t, entities: names });
  }
  return overlaps;
}

// ─── Dead policy detection ──────────────────────────────────────────────────
function detectDeadPolicies(allEntities) {
  if (!existsSync(POLICIES_DIR)) return [];
  const policies = listDir(POLICIES_DIR, /\.md$/);
  const corpus = allEntities.map(e => {
    try { return readFileSync(e.path, 'utf8'); } catch { return ''; }
  }).join('\n');
  // Also include all other policies (cross-policy refs)
  const policyCorpus = policies.map(p => {
    try { return readFileSync(join(POLICIES_DIR, p), 'utf8'); } catch { return ''; }
  }).join('\n');
  // GLOBAL.md/CLAUDE.md/AGENTS.md/WIKI.md also reference policies
  const rootFiles = ['GLOBAL.md', 'CLAUDE.md', 'AGENTS.md', 'README.md'];
  const rootCorpus = rootFiles.map(f => {
    try { return readFileSync(join(ROOT, f), 'utf8'); } catch { return ''; }
  }).join('\n');
  const docFiles = ['WIKI.md', 'SKILLS-OVERVIEW.md'];
  const docCorpus = docFiles.map(f => {
    try { return readFileSync(join(ROOT, 'docs', f), 'utf8'); } catch { return ''; }
  }).join('\n');
  const full = corpus + '\n' + policyCorpus + '\n' + rootCorpus + '\n' + docCorpus;

  const dead = [];
  for (const p of policies) {
    const name = basename(p, '.md');
    const escName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match policies/<name>(.md)?, `<name>.md` (backtick), bare <name>.md, OR the bare name as a word
    // (the name itself is informative — e.g. "protocol-shells" used in prose counts as ref)
    const re = new RegExp(`(policies/${escName}(?:\\.md)?|\`${escName}\\.md\`|\\b${escName}\\b)`, 'g');
    const matches = full.match(re) || [];
    const selfFile = readFileSync(join(POLICIES_DIR, p), 'utf8');
    const selfMatches = selfFile.match(re) || [];
    const externalRefs = matches.length - selfMatches.length;
    if (externalRefs <= 0) dead.push({ name, refs: externalRefs });
  }
  return dead;
}

// ─── Report generator ───────────────────────────────────────────────────────
function generateReport() {
  const skills = loadSkills();
  const agents = loadAgents();
  const commands = loadCommands();
  const evals = loadEvals();

  // Cross-section overlap
  const overlaps = detectOverlap([...skills, ...agents, ...commands]);

  // Dead policy detection
  const deadPolicies = detectDeadPolicies([...skills, ...agents, ...commands]);

  // Eval lookup: try slug primary (44-zoom-out), then name (zoom-out)
  const evalFor = (s) => evals[s.slug] || evals[s.name] || null;

  const flagged = {
    weak_description: skills.filter(s => s.descLength < 80),
    no_triggers: skills.filter(s => !s.description.toLowerCase().includes('trigger em')),
    no_evals: skills.filter(s => !evalFor(s)),
    agents_weak: agents.filter(a => a.descLength < 80),
    commands_weak: commands.filter(c => c.descLength < 40),  // commands são mais curtos por natureza
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
  lines.push(`- **Overlaps detectados (cross-section):** ${overlaps.length}`);
  lines.push(`- **Dead policies (zero refs externas):** ${deadPolicies.length}`);
  lines.push('');

  lines.push('## Flags');
  lines.push('');

  lines.push(`### Skills com description curta (<80 chars)`);
  lines.push('');
  if (!flagged.weak_description.length) lines.push('- (nenhuma — todas têm descriptions ricas)');
  else for (const s of flagged.weak_description) lines.push(`- ${s.slug} — \`${s.descLength}\` chars`);
  lines.push('');

  lines.push(`### Skills sem "Trigger em:" no description`);
  lines.push('');
  if (!flagged.no_triggers.length) lines.push('- (todas OK)');
  else for (const s of flagged.no_triggers) lines.push(`- ${s.slug}`);
  lines.push('');

  lines.push(`### Skills sem fixture em \`evals/triggers/\``);
  lines.push('');
  if (!flagged.no_evals.length) lines.push('- (cobertura 100%)');
  else {
    lines.push(`- ${flagged.no_evals.length} skills sem fixture:`);
    for (const s of flagged.no_evals) lines.push(`  - ${s.slug}`);
  }
  lines.push('');

  lines.push(`### Subagents com description curta (<80 chars)`);
  lines.push('');
  if (!flagged.agents_weak.length) lines.push('- (nenhum)');
  else for (const a of flagged.agents_weak) lines.push(`- ${a.slug} — \`${a.descLength}\` chars`);
  lines.push('');

  lines.push(`### Commands com description curta (<40 chars)`);
  lines.push('');
  if (!flagged.commands_weak.length) lines.push('- (nenhum)');
  else for (const c of flagged.commands_weak) lines.push(`- ${c.slug} — \`${c.descLength}\` chars`);
  lines.push('');

  lines.push(`### Triggers compartilhados cross-section (overlap)`);
  lines.push('');
  if (!overlaps.length) lines.push('- (sem overlaps detectados)');
  else for (const o of overlaps.slice(0, 30)) lines.push(`- \`${o.trigger}\` → ${o.entities.join(', ')}`);
  if (overlaps.length > 30) lines.push(`- ...e mais ${overlaps.length - 30} overlaps`);
  lines.push('');

  lines.push(`### Dead policies (zero referências externas)`);
  lines.push('');
  if (!deadPolicies.length) lines.push('- (todas policies têm pelo menos 1 referência externa)');
  else for (const d of deadPolicies) lines.push(`- ${d.name} — candidato a archive ou consolidação`);
  lines.push('');

  lines.push('## Top 10 skills por description quality');
  lines.push('');
  lines.push('| Skill | Chars | Triggers | Fixture |');
  lines.push('|-------|-------|----------|---------|');
  const ranked = skills.slice().sort((a, b) => b.descLength - a.descLength).slice(0, 10);
  for (const s of ranked) {
    const triggers = extractTriggers(s.description).length;
    const e = evalFor(s);
    const fx = e ? `${e.total} prompts` : '—';
    lines.push(`| ${s.slug} | ${s.descLength} | ${triggers} | ${fx} |`);
  }
  lines.push('');

  lines.push('## Ações sugeridas');
  lines.push('');
  if (flagged.weak_description.length) lines.push(`- Estender description curtas via \`/humanize\` ou skill 35 (skill-author)`);
  if (flagged.no_triggers.length) lines.push(`- Adicionar "Trigger em:" no description das skills sem triggers explícitos`);
  if (flagged.no_evals.length) lines.push(`- Criar \`evals/triggers/<slug>.json\` pras skills sem fixture (formato JSON com should_trigger/shouldnt_trigger)`);
  if (flagged.agents_weak.length) lines.push(`- Refinar descriptions dos subagents flagged`);
  if (flagged.commands_weak.length) lines.push(`- Refinar descriptions dos commands flagged`);
  if (overlaps.length > 5) lines.push(`- Revisar overlaps (${overlaps.length}) — considerar consolidação ou triggers mais específicos`);
  if (deadPolicies.length) lines.push(`- Considerar archive/consolidação das policies sem refs externas`);
  const allClean = !flagged.weak_description.length && !flagged.no_triggers.length && !flagged.no_evals.length
    && !flagged.agents_weak.length && !flagged.commands_weak.length && overlaps.length === 0 && deadPolicies.length === 0;
  if (allClean) lines.push('- Portfolio saudável. Continue assim.');
  lines.push('');

  return lines.join('\n');
}

const report = generateReport();
writeFileSync(OUT, report, 'utf8');
console.log(`skill-health report → ${OUT}`);
console.log(`(${report.split('\n').length} lines)`);
