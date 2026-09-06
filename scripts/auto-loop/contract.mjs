/**
 * contract.mjs — optional formal task contract for /loop runs that cross a
 * pipeline/loop/handoff boundary (policies/goal-driven-execution.md).
 *
 * JSON, not YAML: the kit has zero runtime deps outside mcp-server/, and JSON
 * is a strict subset of YAML that Node parses natively — no library needed
 * for what this contract actually uses (see policies/pre-code-ladder.md).
 *
 * Schema: schemas/task-contract.schema.json
 */

import { readFileSync } from 'fs';

/**
 * loadContract(path) → { contract_version, goal, done_when, escalate_when, ... } | null
 * Throws only on malformed JSON or missing required fields — never silently
 * degrades, because a broken --contract flag should fail loud, not run the
 * loop without the guardrails the user asked for.
 */
export function loadContract(path) {
  if (!path) return null;
  const raw = readFileSync(path, 'utf-8');
  const contract = JSON.parse(raw);
  if (typeof contract.contract_version !== 'number') {
    throw new Error(`Contract at ${path} is missing required field: contract_version`);
  }
  if (typeof contract.goal !== 'string' || !contract.goal.trim()) {
    throw new Error(`Contract at ${path} is missing required field: goal`);
  }
  if (!Array.isArray(contract.done_when) || contract.done_when.length === 0) {
    throw new Error(`Contract at ${path} is missing required field: done_when (non-empty array)`);
  }
  contract.escalate_when = Array.isArray(contract.escalate_when) ? contract.escalate_when : [];
  contract.constraints = Array.isArray(contract.constraints) ? contract.constraints : [];
  contract.inputs = Array.isArray(contract.inputs) ? contract.inputs : [];
  return contract;
}

/**
 * contractStopInstruction(contract) — same shape as stop-when.mjs's
 * STOP_INSTRUCTION, but reports each done_when criterion individually plus
 * escalate_when as a separate, higher-priority signal (an agent shouldn't
 * have to choose between "not done" and "should escalate").
 */
export function contractStopInstruction(contract) {
  const doneLines = contract.done_when.map((c, i) => `${i + 1}. ${c}`).join('\n');
  const escalateLines = contract.escalate_when.length
    ? contract.escalate_when.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : '(none declared)';
  return `
## Task Contract (v${contract.contract_version})
Goal: ${contract.goal}
${contract.constraints.length ? `Constraints:\n${contract.constraints.map((c) => `- ${c}`).join('\n')}\n` : ''}
Done when ALL of these are true:
${doneLines}

Escalate (stop and ask, don't invent a workaround) if ANY of these become true:
${escalateLines}

At the end of your output, on their own lines, write exactly:
CONTRACT_DONE: true|false
CONTRACT_ESCALATE: true|false
If CONTRACT_ESCALATE is true, also write:
ESCALATE_REASON: <which condition fired>
`.trim();
}

/**
 * checkContractSignal(output) → { done, escalate, escalateReason } | null
 * Mirrors stop-when.mjs's checkStopWhen — returns null if the markers aren't
 * present (agent output didn't follow the contract instruction, or no
 * contract was loaded this run).
 */
export function checkContractSignal(output) {
  if (!output) return null;
  const doneMatch = output.match(/^CONTRACT_DONE:\s*(true|false)\s*$/im);
  const escalateMatch = output.match(/^CONTRACT_ESCALATE:\s*(true|false)\s*$/im);
  if (!doneMatch && !escalateMatch) return null;
  const escalate = escalateMatch ? escalateMatch[1].toLowerCase() === 'true' : false;
  const reasonMatch = output.match(/^ESCALATE_REASON:\s*(.+)$/im);
  return {
    done: doneMatch ? doneMatch[1].toLowerCase() === 'true' : false,
    escalate,
    escalateReason: escalate && reasonMatch ? reasonMatch[1].trim() : '',
  };
}
