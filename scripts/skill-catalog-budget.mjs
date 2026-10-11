#!/usr/bin/env node
/**
 * skill-catalog-budget.mjs
 *
 * Audita o inventário local das descriptions do catálogo de skills e, somente
 * quando explicitamente solicitado, propõe/aplica uma compactação segura.
 *
 * Importante: caracteres/bytes em SKILL.md são inventário em disco. O host pode
 * filtrar, truncar ou formatar o catálogo; portanto `chars ÷ 4` é proxy, não
 * medição de tokens enviados ao modelo. Um payload observado pode ser fornecido
 * com `--observed <json>` (arquivo contendo `systemMessage` ou uma string).
 *
 *   node scripts/skill-catalog-budget.mjs
 *   node scripts/skill-catalog-budget.mjs --json
 *   node scripts/skill-catalog-budget.mjs --observed session-start.json
 *   node scripts/skill-catalog-budget.mjs --apply --force
 *
 * Teto de design: primeira frase ≤160 chars, ≤12 triggers, total ≤400 chars.
 * A compactação nunca corta um trigger no meio. Sem `--force`, uma skill com
 * trigger usado por fixture positiva e descartado é preservada sem rewrite.
 */
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
  statSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const SKILLS_DIR = join(ROOT, 'skills');
const EVALS_DIR = join(ROOT, 'evals', 'triggers');
const MAX_TOTAL = 400;
const MAX_PURPOSE = 160;
const MAX_TRIGGERS = 12;
const PROXY_CHARS_PER_TOKEN = 4;
const apply = process.argv.includes('--apply');
const force = process.argv.includes('--force');
const jsonOutput = process.argv.includes('--json');

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : null;
}

function utf8Bytes(value) {
  return Buffer.byteLength(value, 'utf8');
}

function proxyTokens(chars) {
  return Math.ceil(chars / PROXY_CHARS_PER_TOKEN);
}

function fold(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function parseDescription(frontmatter) {
  const lines = frontmatter.split('\n');
  const index = lines.findIndex((line) => /^description\s*:/.test(line));
  if (index < 0) return '';
  const first = lines[index].replace(/^description\s*:\s*/, '').trim();
  if (first && !['|', '|-', '>', '>-'].includes(first)) return first.replace(/^['"]|['"]$/g, '');
  const collected = [];
  for (let i = index + 1; i < lines.length; i += 1) {
    if (/^[A-Za-z_][A-Za-z0-9_-]*\s*:/.test(lines[i])) break;
    if (/^\s/.test(lines[i]) || lines[i] === '') collected.push(lines[i].replace(/^\s{2}/, ''));
  }
  return collected.map((line) => line.trim()).filter(Boolean).join(' ');
}

function frontmatterOf(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : '';
}

function extractTriggers(description) {
  if (!description) return [];
  const index = description.search(/[Tt]rigger\s+em\s*:/);
  if (index < 0) return [];
  const tail = description.slice(index).replace(/^[Tt]rigger\s+em\s*:/i, '');
  const quoted = [...tail.matchAll(/["']([^"'\n]{2,160})["']/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  if (quoted.length) return [...new Set(quoted)];
  return [...new Set(tail
    .split(/[,.\n]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 1))];
}

function purposeOf(description) {
  const index = description.search(/[Tt]rigger\s+em\s*:/);
  const raw = (index >= 0 ? description.slice(0, index) : description).replace(/\s+/g, ' ').trim();
  const sentence = raw.split(/(?<=[.!?])\s+/)[0] || raw;
  if (sentence.length <= MAX_PURPOSE) return sentence;
  const clipped = sentence.slice(0, MAX_PURPOSE - 1).replace(/\s+\S*$/, '').trim();
  return `${clipped || sentence.slice(0, MAX_PURPOSE - 1).trim()}…`;
}


function buildDescription(description, skillId) {
  const purpose = purposeOf(description);
  const triggers = extractTriggers(description);
  const fixturePath = join(EVALS_DIR, `${skillId}.json`);
  let positivePrompts = [];
  if (existsSync(fixturePath)) {
    try {
      positivePrompts = JSON.parse(readFileSync(fixturePath, 'utf8')).should_trigger || [];
    } catch {
      positivePrompts = [];
    }
  }
  const coverage = new Map(triggers.map((trigger) => [trigger, 0]));
  for (const trigger of triggers) {
    const normalized = fold(trigger);
    coverage.set(trigger, positivePrompts.filter((prompt) => fold(prompt).includes(normalized)).length);
  }

  const ranked = triggers
    .map((trigger, index) => ({ trigger, index, coverage: coverage.get(trigger) || 0 }))
    .sort((a, b) => b.coverage - a.coverage || a.index - b.index);
  const selected = [];
  for (const candidate of ranked) {
    if (selected.length >= MAX_TRIGGERS) break;
    const proposed = [...selected, candidate.trigger].sort((a, b) => triggers.indexOf(a) - triggers.indexOf(b));
    const triggerLine = `Trigger em: ${proposed.map((trigger) => `"${trigger}"`).join(', ')}.`;
    if (`${purpose} ${triggerLine}`.length <= MAX_TOTAL) selected.push(candidate.trigger);
  }

  const orderedSelected = selected.sort((a, b) => triggers.indexOf(a) - triggers.indexOf(b));
  const triggerLine = orderedSelected.length
    ? `Trigger em: ${orderedSelected.map((trigger) => `"${trigger}"`).join(', ')}.`
    : '';
  const compacted = triggerLine ? `${purpose} ${triggerLine}` : purpose;
  return {
    description: compacted,
    selected: orderedSelected,
    dropped: triggers.filter((trigger) => !orderedSelected.includes(trigger)),
    droppedFixtureTriggers: triggers.filter((trigger) => !orderedSelected.includes(trigger) && (coverage.get(trigger) || 0) > 0),
  };
}

function yamlBlock(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && line.length + 1 + word.length > 96) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return `description: |\n${lines.map((value) => `  ${value}`).join('\n')}\n`;
}

function rewriteFrontmatter(content, newDescription) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return null;
  const lines = match[1].split('\n');
  const descriptionIndex = lines.findIndex((line) => /^description\s*:/.test(line));
  if (descriptionIndex < 0) return null;
  let end = descriptionIndex + 1;
  const multiline = /^description\s*:\s*(\||\|-|>|>-)?\s*$/.test(lines[descriptionIndex]);
  if (multiline) {
    while (end < lines.length && (lines[end] === '' || /^\s/.test(lines[end]))) end += 1;
  }
  const next = [
    ...lines.slice(0, descriptionIndex),
    ...yamlBlock(newDescription).trimEnd().split('\n'),
    ...lines.slice(end),
  ];
  return `---\n${next.join('\n')}\n---${content.slice(match[0].length)}`;
}

function loadSkills() {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter((directory) => /^\d{2}-/.test(directory))
    .map((directory) => {
      const filePath = join(SKILLS_DIR, directory, 'SKILL.md');
      if (!existsSync(filePath)) return null;
      const content = readFileSync(filePath, 'utf8');
      const frontmatter = frontmatterOf(content);
      if (!frontmatter) return null;
      const description = parseDescription(frontmatter);
      const nameMatch = frontmatter.match(/^name\s*:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim().replace(/^['"]|['"]$/g, '') : directory;
      const compacted = buildDescription(description, directory);
      return {
        dir: directory,
        path: filePath,
        content,
        name,
        description,
        chars: description.length,
        bytes: utf8Bytes(description),
        fileBytes: statSync(filePath).size,
        entryChars: name.length + 1 + description.length,
        entryBytes: utf8Bytes(name) + 1 + utf8Bytes(description),
        compacted,
      };
    })
    .filter(Boolean);
}

function readObservedPayload(filePath) {
  if (!filePath) return null;
  try {
    const raw = readFileSync(resolve(ROOT, filePath), 'utf8');
    const parsed = JSON.parse(raw);
    const message = typeof parsed === 'string' ? parsed : parsed.systemMessage || parsed.hookSpecificOutput?.additionalContext || '';
    return {
      source: filePath,
      chars: String(message).length,
      bytes: utf8Bytes(String(message)),
      proxyTokens: proxyTokens(String(message).length),
    };
  } catch (error) {
    return { source: filePath, error: error.message };
  }
}

function buildReport() {
  const skills = loadSkills();
  const inventory = {
    skills: skills.length,
    descriptionChars: skills.reduce((total, skill) => total + skill.chars, 0),
    descriptionBytes: skills.reduce((total, skill) => total + skill.bytes, 0),
    catalogEntryChars: skills.reduce((total, skill) => total + skill.entryChars, 0),
    catalogEntryBytes: skills.reduce((total, skill) => total + skill.entryBytes, 0),
    skillFileBytes: skills.reduce((total, skill) => total + skill.fileBytes, 0),
  };
  const proposed = {
    descriptionChars: skills.reduce((total, skill) => total + skill.compacted.description.length, 0),
    catalogEntryChars: skills.reduce((total, skill) => total + skill.name.length + 1 + skill.compacted.description.length, 0),
    droppedFixtureTriggers: skills.reduce((total, skill) => total + skill.compacted.droppedFixtureTriggers.length, 0),
  };
  const observed = readObservedPayload(argValue('--observed'));
  return { skills, inventory, proposed, observed };
}

function printHuman(report) {
  const { inventory, proposed, observed, skills } = report;
  const descriptionSave = inventory.descriptionChars - proposed.descriptionChars;
  const catalogSave = inventory.catalogEntryChars - proposed.catalogEntryChars;
  console.log(`skills=${inventory.skills}`);
  console.log(`description_inventory_chars=${inventory.descriptionChars} disk_bytes=${inventory.descriptionBytes} proxy_tokens=${proxyTokens(inventory.descriptionChars)} (proxy; not measured host payload)`);
  console.log(`catalog_entry_inventory_chars=${inventory.catalogEntryChars} disk_bytes=${inventory.catalogEntryBytes} proxy_tokens=${proxyTokens(inventory.catalogEntryChars)} (name+description; proxy)`);
  console.log(`skill_file_disk_bytes=${inventory.skillFileBytes}`);
  console.log(`host_payload=not_observed${observed ? `; observed_chars=${observed.chars ?? 'error'} observed_bytes=${observed.bytes ?? 'error'} observed_proxy_tokens=${observed.proxyTokens ?? 'error'}` : ' (pass --observed <json> to measure captured systemMessage)'}`);
  console.log(`over_${MAX_TOTAL}=${skills.filter((skill) => skill.chars > MAX_TOTAL).length}`);
  console.log('');
  console.log('slug'.padEnd(36), 'now'.padStart(6), 'after'.padStart(6), 'save'.padStart(6), 'fixture-drop'.padStart(13));
  for (const skill of skills.slice().sort((a, b) => b.chars - a.chars)) {
    if (skill.chars > MAX_TOTAL || skill.compacted.droppedFixtureTriggers.length || apply) {
      console.log(
        skill.dir.padEnd(36),
        String(skill.chars).padStart(6),
        String(skill.compacted.description.length).padStart(6),
        String(skill.chars - skill.compacted.description.length).padStart(6),
        String(skill.compacted.droppedFixtureTriggers.length).padStart(13),
      );
    }
  }
  console.log('');
  console.log(`proposed_description_save=${descriptionSave} chars (~${proxyTokens(descriptionSave)} proxy tokens/turn)`);
  console.log(`proposed_catalog_entry_save=${catalogSave} chars (~${proxyTokens(catalogSave)} proxy tokens/turn)`);
  console.log(`proposed_fixture_trigger_drops=${proposed.droppedFixtureTriggers} (review before apply)`);
  if (!apply) console.log('dry-run. No SKILL.md was rewritten; --apply was not requested.');
}

function applyChanges(report) {
  let saved = 0;
  let skipped = 0;
  for (const skill of report.skills) {
    if (!skill.compacted.description || skill.compacted.description === skill.description) continue;
    if (skill.compacted.droppedFixtureTriggers.length && !force) {
      skipped += 1;
      continue;
    }
    const rewritten = rewriteFrontmatter(skill.content, skill.compacted.description);
    if (!rewritten) continue;
    writeFileSync(skill.path, rewritten, 'utf8');
    saved += skill.chars - skill.compacted.description.length;
  }
  console.log(`applied_chars_saved=${saved} (~${proxyTokens(saved)} proxy tokens/turn)`);
  console.log(`skipped_fixture_risk=${skipped}; use --force only after eval review`);
}

const report = buildReport();
if (jsonOutput) {
  console.log(JSON.stringify({
    inventory: {
      skills: report.inventory.skills,
      descriptionChars: report.inventory.descriptionChars,
      descriptionBytes: report.inventory.descriptionBytes,
      descriptionProxyTokens: proxyTokens(report.inventory.descriptionChars),
      catalogEntryChars: report.inventory.catalogEntryChars,
      catalogEntryBytes: report.inventory.catalogEntryBytes,
      catalogEntryProxyTokens: proxyTokens(report.inventory.catalogEntryChars),
      skillFileBytes: report.inventory.skillFileBytes,
    },
    proposed: report.proposed,
    observed: report.observed,
    skills: report.skills.map((skill) => ({
      slug: skill.dir,
      name: skill.name,
      chars: skill.chars,
      bytes: skill.bytes,
      fileBytes: skill.fileBytes,
      compactedChars: skill.compacted.description.length,
      compactedDescription: skill.compacted.description,
      selectedTriggers: skill.compacted.selected,
      droppedTriggers: skill.compacted.dropped,
      droppedFixtureTriggers: skill.compacted.droppedFixtureTriggers,
    })),
  }, null, 2));
} else {
  printHuman(report);
}
if (apply) applyChanges(report);
