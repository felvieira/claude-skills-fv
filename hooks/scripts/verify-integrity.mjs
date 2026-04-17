#!/usr/bin/env node
/**
 * verify-integrity.mjs
 *
 * Verifies SHA-256 checksums of installed hook scripts against a manifest
 * written by install.sh at `.bot/hooks/.integrity.json`.
 *
 * Usage:
 *   node hooks/scripts/verify-integrity.mjs            # check mode (default)
 *   node hooks/scripts/verify-integrity.mjs --write    # write manifest (run by install.sh)
 *   node hooks/scripts/verify-integrity.mjs --silent   # check mode, no output on success
 *
 * Exit codes:
 *   0 — all hashes match (or manifest missing + --silent)
 *   1 — one or more hooks tampered / missing
 *   2 — manifest not found (check mode, non-silent)
 */

import fs     from 'fs';
import path   from 'path';
import crypto from 'crypto';

const MANIFEST_NAMES = ['.integrity.json', 'hooks/.integrity.json'];

const args    = process.argv.slice(2);
const WRITE   = args.includes('--write');
const SILENT  = args.includes('--silent');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

/** Find the hooks/scripts directory — works both in kit root and .bot/ install */
function findHooksDir() {
  const candidates = [
    path.join(process.cwd(), '.bot', 'hooks', 'scripts'),
    path.join(process.cwd(), 'hooks', 'scripts'),
  ];
  return candidates.find(d => fs.existsSync(d)) ?? null;
}

/** Find the manifest file */
function findManifest() {
  const hooksDir = findHooksDir();
  if (!hooksDir) return null;
  const base = path.dirname(hooksDir); // hooks/
  const manifestPath = path.join(base, '.integrity.json');
  return fs.existsSync(manifestPath) ? manifestPath : null;
}

/** Collect all .mjs files in the hooks/scripts dir */
function collectHookFiles(hooksDir) {
  try {
    return fs.readdirSync(hooksDir)
      .filter(f => f.endsWith('.mjs'))
      .sort()
      .map(f => ({ name: f, fullPath: path.join(hooksDir, f) }));
  } catch {
    return [];
  }
}

// ─── Write mode ───────────────────────────────────────────────────────────────

function writeManifest() {
  const hooksDir = findHooksDir();
  if (!hooksDir) {
    process.stderr.write('[verify-integrity] hooks/scripts/ not found\n');
    process.exit(1);
  }

  const files = collectHookFiles(hooksDir);
  if (files.length === 0) {
    process.stderr.write('[verify-integrity] No .mjs files found in hooks/scripts/\n');
    process.exit(1);
  }

  const manifest = {
    generated:  new Date().toISOString(),
    hooks_dir:  hooksDir,
    checksums:  {},
  };

  for (const { name, fullPath } of files) {
    const hash = sha256(fullPath);
    if (hash) manifest.checksums[name] = hash;
  }

  const manifestPath = path.join(path.dirname(hooksDir), '.integrity.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`[verify-integrity] Manifest written: ${manifestPath} (${files.length} hooks)`);
}

// ─── Check mode ───────────────────────────────────────────────────────────────

function checkManifest() {
  const manifestPath = findManifest();
  if (!manifestPath) {
    if (!SILENT) {
      process.stderr.write('[verify-integrity] Integrity manifest not found — run with --write after install\n');
    }
    process.exit(SILENT ? 0 : 2);
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch {
    process.stderr.write('[verify-integrity] Failed to parse integrity manifest\n');
    process.exit(1);
  }

  const hooksDir = findHooksDir();
  if (!hooksDir) {
    process.stderr.write('[verify-integrity] hooks/scripts/ not found\n');
    process.exit(1);
  }

  const checksums = manifest.checksums ?? {};
  const failures  = [];
  const missing   = [];

  for (const [name, expectedHash] of Object.entries(checksums)) {
    const fullPath = path.join(hooksDir, name);
    const actualHash = sha256(fullPath);

    if (actualHash === null) {
      missing.push(name);
    } else if (actualHash !== expectedHash) {
      failures.push({ name, expected: expectedHash.slice(0, 16), actual: actualHash.slice(0, 16) });
    }
  }

  if (failures.length === 0 && missing.length === 0) {
    if (!SILENT) {
      console.log(`[verify-integrity] ✅ All ${Object.keys(checksums).length} hooks verified`);
    }
    process.exit(0);
  }

  // Report failures
  if (missing.length > 0) {
    process.stderr.write(`[verify-integrity] ❌ Missing hooks (${missing.length}):\n`);
    for (const name of missing) {
      process.stderr.write(`  - ${name}\n`);
    }
  }
  if (failures.length > 0) {
    process.stderr.write(`[verify-integrity] ❌ Tampered hooks (${failures.length}):\n`);
    for (const { name, expected, actual } of failures) {
      process.stderr.write(`  - ${name}  expected:${expected}…  actual:${actual}…\n`);
    }
  }
  process.stderr.write('[verify-integrity] Run install.sh to reinstall hooks\n');
  process.exit(1);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (WRITE) {
  writeManifest();
} else {
  checkManifest();
}
