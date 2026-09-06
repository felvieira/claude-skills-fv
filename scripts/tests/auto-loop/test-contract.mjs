#!/usr/bin/env node
/**
 * test-contract.mjs — Smoke tests for auto-loop/contract.mjs
 *
 * Usage: node scripts/tests/auto-loop/test-contract.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { loadContract, contractStopInstruction, checkContractSignal } from '../../auto-loop/contract.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

const tmp = mkdtempSync(join(tmpdir(), 'al-contract-'));
function writeTempContract(obj) {
  const p = join(tmp, `${Math.random().toString(36).slice(2)}.json`);
  writeFileSync(p, JSON.stringify(obj));
  return p;
}

// ─── Test 1: loadContract() — no path returns null ───────────────────────────
console.log('\nTest 1: loadContract() with no path');
{
  assert('null path → null', loadContract(null) === null);
  assert('empty string path → null', loadContract('') === null);
}

// ─── Test 2: loadContract() — valid contract ─────────────────────────────────
console.log('\nTest 2: loadContract() with a valid contract');
{
  const p = writeTempContract({
    contract_version: 1,
    goal: 'Add CSV export',
    constraints: ['preserve public API'],
    done_when: ['tests pass', 'CSV matches fixture'],
    escalate_when: ['schema change needed'],
  });
  const c = loadContract(p);
  assert('contract_version preserved', c.contract_version === 1);
  assert('goal preserved', c.goal === 'Add CSV export');
  assert('done_when has 2 items', c.done_when.length === 2);
  assert('escalate_when has 1 item', c.escalate_when.length === 1);
  assert('constraints has 1 item', c.constraints.length === 1);
}

// ─── Test 3: loadContract() — optional fields default to empty arrays ────────
console.log('\nTest 3: loadContract() with only required fields');
{
  const p = writeTempContract({
    contract_version: 2,
    goal: 'Minimal contract',
    done_when: ['it works'],
  });
  const c = loadContract(p);
  assert('escalate_when defaults to []', Array.isArray(c.escalate_when) && c.escalate_when.length === 0);
  assert('constraints defaults to []', Array.isArray(c.constraints) && c.constraints.length === 0);
  assert('inputs defaults to []', Array.isArray(c.inputs) && c.inputs.length === 0);
}

// ─── Test 4: loadContract() — missing required fields throws loudly ──────────
console.log('\nTest 4: loadContract() rejects malformed contracts');
{
  const cases = [
    { obj: { goal: 'x', done_when: ['y'] }, missing: 'contract_version' },
    { obj: { contract_version: 1, done_when: ['y'] }, missing: 'goal' },
    { obj: { contract_version: 1, goal: 'x' }, missing: 'done_when' },
    { obj: { contract_version: 1, goal: 'x', done_when: [] }, missing: 'done_when (empty array)' },
  ];
  for (const { obj, missing } of cases) {
    const p = writeTempContract(obj);
    let threw = false;
    try {
      loadContract(p);
    } catch (err) {
      threw = true;
      assert(`throws mentioning "${missing.split(' ')[0]}"`, err.message.includes(missing.split(' ')[0]), err.message);
    }
    assert(`rejects contract missing ${missing}`, threw);
  }
}

// ─── Test 5: contractStopInstruction() — formats all fields ──────────────────
console.log('\nTest 5: contractStopInstruction()');
{
  const c = loadContract(writeTempContract({
    contract_version: 3,
    goal: 'Ship the thing',
    constraints: ['no new deps'],
    done_when: ['lint passes', 'tests pass'],
    escalate_when: ['breaking change required'],
  }));
  const instr = contractStopInstruction(c);
  assert('includes contract version', instr.includes('v3'));
  assert('includes goal', instr.includes('Ship the thing'));
  assert('includes constraint', instr.includes('no new deps'));
  assert('includes both done_when items', instr.includes('lint passes') && instr.includes('tests pass'));
  assert('includes escalate_when item', instr.includes('breaking change required'));
  assert('includes CONTRACT_DONE marker instruction', instr.includes('CONTRACT_DONE'));
  assert('includes CONTRACT_ESCALATE marker instruction', instr.includes('CONTRACT_ESCALATE'));
}

// ─── Test 6: contractStopInstruction() — no escalate_when shows placeholder ──
console.log('\nTest 6: contractStopInstruction() with no escalate_when');
{
  const c = loadContract(writeTempContract({
    contract_version: 1,
    goal: 'x',
    done_when: ['y'],
  }));
  const instr = contractStopInstruction(c);
  assert('shows "(none declared)"', instr.includes('(none declared)'));
}

// ─── Test 7: checkContractSignal() — done, no escalate ───────────────────────
console.log('\nTest 7: checkContractSignal() — done true, escalate false');
{
  const r = checkContractSignal('some output\nCONTRACT_DONE: true\nCONTRACT_ESCALATE: false');
  assert('done=true', r.done === true, JSON.stringify(r));
  assert('escalate=false', r.escalate === false, JSON.stringify(r));
  assert('escalateReason empty', r.escalateReason === '', JSON.stringify(r));
}

// ─── Test 8: checkContractSignal() — escalate with reason ────────────────────
console.log('\nTest 8: checkContractSignal() — escalate true with reason');
{
  const r = checkContractSignal('output\nCONTRACT_DONE: false\nCONTRACT_ESCALATE: true\nESCALATE_REASON: schema change needed');
  assert('done=false', r.done === false, JSON.stringify(r));
  assert('escalate=true', r.escalate === true, JSON.stringify(r));
  assert('escalateReason captured', r.escalateReason === 'schema change needed', JSON.stringify(r));
}

// ─── Test 9: checkContractSignal() — no markers returns null ─────────────────
console.log('\nTest 9: checkContractSignal() — no markers present');
{
  assert('no markers → null', checkContractSignal('just some agent output, no markers') === null);
  assert('empty string → null', checkContractSignal('') === null);
  assert('null → null', checkContractSignal(null) === null);
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────
try { rmSync(tmp, { recursive: true, force: true, maxRetries: 3 }); } catch {}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
