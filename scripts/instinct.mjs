#!/usr/bin/env node
/**
 * instinct.mjs — Portabilidade de learned-skills entre escopos.
 *
 * Inspirado em ECC (affaan-m/ECC, MIT) — `/instinct-*` family. Adaptado pro nosso
 * formato `.bot/learned-skills/<slug>.md` (ver policies/memory-tiers.md).
 *
 * Subcomandos:
 *   export <out.json> [--scope=project|global] [--min-score=0.5]
 *   import <in.json> [--scope=project|global] [--overwrite]
 *   promote <slug>   [--from=project --to=global]
 *
 * Sem deps. Node ≥18. Roda direto: `node scripts/instinct.mjs <cmd> ...`.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync, renameSync, copyFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { homedir } from 'node:os';

const PROJECT_BOT = resolve(process.cwd(), '.bot', 'learned-skills');
const GLOBAL_BOT = resolve(homedir(), '.claude', '.bot', 'learned-skills');

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: content };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const eq = line.indexOf(':');
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
    meta[k] = v;
  }
  return { meta, body: m[2] };
}

function serialize(meta, body) {
  const lines = ['---'];
  for (const [k, v] of Object.entries(meta)) lines.push(`${k}: ${typeof v === 'string' && v.includes(':') ? `"${v}"` : v}`);
  lines.push('---', '', body.trim(), '');
  return lines.join('\n');
}

function listSkills(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'))
    .map(f => {
      const full = join(dir, f);
      const content = readFileSync(full, 'utf8');
      const { meta, body } = parseFrontmatter(content);
      return { slug: basename(f, '.md'), path: full, meta, body, mtime: statSync(full).mtime.toISOString() };
    });
}

function scopeDir(scope) {
  if (scope === 'global') return GLOBAL_BOT;
  return PROJECT_BOT;
}

function ensureDir(d) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

// ── EXPORT ────────────────────────────────────────────────────────────────
function exportCmd(outFile, opts) {
  const scope = opts.scope || 'project';
  const minScore = Number(opts['min-score'] ?? 0);
  const dir = scopeDir(scope);
  const skills = listSkills(dir).filter(s => Number(s.meta.score ?? 0) >= minScore);
  const bundle = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    scope,
    source: dir,
    count: skills.length,
    skills: skills.map(s => ({ slug: s.slug, meta: s.meta, body: s.body, mtime: s.mtime })),
  };
  writeFileSync(outFile, JSON.stringify(bundle, null, 2), 'utf8');
  console.log(`exported ${skills.length} instincts (scope=${scope}, min-score=${minScore}) → ${outFile}`);
}

// ── IMPORT ────────────────────────────────────────────────────────────────
function importCmd(inFile, opts) {
  const scope = opts.scope || 'project';
  const overwrite = !!opts.overwrite;
  const dir = scopeDir(scope);
  ensureDir(dir);
  const bundle = JSON.parse(readFileSync(inFile, 'utf8'));
  if (!bundle.skills || !Array.isArray(bundle.skills)) {
    console.error('invalid bundle: missing "skills" array');
    process.exit(1);
  }
  let imported = 0, skipped = 0;
  for (const s of bundle.skills) {
    const target = join(dir, `${s.slug}.md`);
    if (existsSync(target) && !overwrite) { skipped++; continue; }
    writeFileSync(target, serialize(s.meta, s.body), 'utf8');
    imported++;
  }
  console.log(`imported ${imported}, skipped ${skipped} (scope=${scope}) from ${inFile}`);
}

// ── PROMOTE ───────────────────────────────────────────────────────────────
function promoteCmd(slug, opts) {
  const from = opts.from || 'project';
  const to = opts.to || 'global';
  const src = join(scopeDir(from), `${slug}.md`);
  if (!existsSync(src)) { console.error(`not found: ${src}`); process.exit(1); }
  const dstDir = scopeDir(to);
  ensureDir(dstDir);
  const dst = join(dstDir, `${slug}.md`);
  if (existsSync(dst)) { console.error(`destination exists: ${dst} (use import --overwrite if intended)`); process.exit(1); }
  const content = readFileSync(src, 'utf8');
  const { meta, body } = parseFrontmatter(content);
  meta.promoted_from = from;
  meta.promoted_at = new Date().toISOString();
  writeFileSync(dst, serialize(meta, body), 'utf8');
  console.log(`promoted ${slug}: ${from} → ${to}`);
  console.log(`  source kept at: ${src} (delete manually if desired)`);
}

// ── CLI parsing ───────────────────────────────────────────────────────────
function parseArgs(argv) {
  const cmd = argv[0];
  const positional = [];
  const opts = {};
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) opts[a.slice(2, eq)] = a.slice(eq + 1);
      else opts[a.slice(2)] = true;
    } else positional.push(a);
  }
  return { cmd, positional, opts };
}

function usage() {
  console.log(`Usage:
  instinct.mjs export <out.json> [--scope=project|global] [--min-score=N]
  instinct.mjs import <in.json>  [--scope=project|global] [--overwrite]
  instinct.mjs promote <slug>    [--from=project --to=global]
  instinct.mjs list              [--scope=project|global]
`);
}

function listCmd(opts) {
  const scope = opts.scope || 'project';
  const dir = scopeDir(scope);
  const skills = listSkills(dir);
  if (!skills.length) { console.log(`no instincts in ${dir}`); return; }
  console.log(`scope=${scope} dir=${dir} count=${skills.length}`);
  console.log('');
  for (const s of skills.sort((a, b) => Number(b.meta.score ?? 0) - Number(a.meta.score ?? 0))) {
    const score = (Number(s.meta.score ?? 0)).toFixed(2);
    const desc = (s.meta.description || '').slice(0, 60);
    console.log(`  ${score}  ${s.slug.padEnd(30)} ${desc}`);
  }
}

const { cmd, positional, opts } = parseArgs(process.argv.slice(2));

switch (cmd) {
  case 'export':
    if (!positional[0]) { usage(); process.exit(1); }
    exportCmd(positional[0], opts); break;
  case 'import':
    if (!positional[0]) { usage(); process.exit(1); }
    importCmd(positional[0], opts); break;
  case 'promote':
    if (!positional[0]) { usage(); process.exit(1); }
    promoteCmd(positional[0], opts); break;
  case 'list':
    listCmd(opts); break;
  default:
    usage();
    if (cmd) process.exit(1);
}
