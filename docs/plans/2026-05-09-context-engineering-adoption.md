# Context Engineering Adoption — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Incorporate Context Engineering formalisms from davidkimai/Context-Engineering (Pareto-lang protocol shells, skill I/O schemas, iteration scoring, atom→field narrative) into the Dev Team Kit without breaking any existing functionality.

**Architecture:** Purely additive — new files in `templates/`, `schemas/`, `programs/`, `scripts/auto-loop/`. Existing skills/subagents/hooks unchanged until pilot validation passes. Gated: pilots (Phase 2) must validate before propagation (Phase 3+).

**Tech Stack:** Node.js ESM (scripts), JSON Schema draft-07 (schemas), Pareto-lang (protocol shells — custom syntax, MD-based), mjs (scoring functions).

---

## Phase 0 — Discovery & Baseline

### Task 0.1: Audit current subagent handoffs

**Files:**
- Read: `.claude/agents/*.md` (all 14 subagents)
- Create: `docs/context-engineering-adoption/baseline.md`

**Step 1:** Read each subagent file and note where input/output is described in free prose vs. structured format.

**Step 2:** Create `docs/context-engineering-adoption/` directory and write `baseline.md`:

```markdown
# Context Engineering Adoption — Baseline

## Subagent Handoff Audit

| Subagent | Input defined? | Output defined? | Schema-ready? |
|---|---|---|---|
| code-reviewer | prose | prose | no |
| ... | | | |

## Key gaps
- [ ] ...

## Target subagents for Phase 2 pilots
1. detective-contracts
2. semgrep-triager
3. code-reviewer
```

**Step 3:** Commit baseline.

```bash
git add docs/context-engineering-adoption/
git commit -m "docs: add context-engineering adoption baseline audit"
```

---

## Phase 1A — Protocol Shell Template (Subagent A)

### Task 1A.1: Create `templates/protocol-shell.md`

**Files:**
- Create: `templates/protocol-shell.md`
- Create: `policies/protocol-shells.md`
- Create: `docs/skill-guides/protocol-shells.md`

**Step 1: Write `templates/protocol-shell.md`**

```markdown
---
version: "1.0"
type: protocol-shell
---

# Protocol Shell: <name>

## Intent
One sentence: what this protocol does.

## Input
```yaml
input:
  field_name: <type>  # description
  field_name_2: <type>
```

## Process
```
/operation.one{param='value'}
/operation.two{param='value'}
/operation.three{}
```

## Output
```yaml
output:
  field_name: <type>  # description
  confidence: high | medium | low
```

## Meta
```yaml
meta:
  version: "1.0.0"
  skill_ref: "skills/NN-name/SKILL.md"
  allowed_tools: [Read, Grep, Glob, Bash]
```
```

**Step 2: Write `policies/protocol-shells.md`**

Rules:
- Use a protocol shell when the subagent has ≥2 callers OR is used in an eval.
- NEVER add a shell to a subagent that has only one caller and no eval.
- Input fields use YAML scalar types: `string`, `path`, `list<string>`, `enum(a|b|c)`, `boolean`, `integer`.
- Output always includes a `confidence` field when the subagent does analysis.
- Versioning: bump `meta.version` patch on any output field change.

**Step 3: Write `docs/skill-guides/protocol-shells.md`** with 2 fully worked examples (detective-contracts + semgrep-triager from Phase 2).

**Step 4: Commit**

```bash
git add templates/protocol-shell.md policies/protocol-shells.md docs/skill-guides/protocol-shells.md
git commit -m "feat: add Pareto-lang protocol shell template and policy"
```

---

## Phase 1B — Schema Infrastructure (Subagent B)

### Task 1B.1: Create `schemas/skill-io/` directory and tooling

**Files:**
- Create: `schemas/skill-io/_meta.json`
- Create: `schemas/skill-io/_template.json`
- Create: `scripts/validate-schema.mjs`
- Modify: `scripts/check-consistency.mjs` (add schema validation call)

**Step 1: Write `schemas/skill-io/_meta.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Dev Team Kit — Skill I/O Schema Meta",
  "description": "All schemas in this directory validate subagent input/output envelopes.",
  "dialect": "json-schema-draft-07",
  "version": "1.0.0"
}
```

**Step 2: Write `schemas/skill-io/_template.json`** (base schema every skill schema extends):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["input", "output"],
  "properties": {
    "input": { "type": "object" },
    "output": {
      "type": "object",
      "required": ["confidence"],
      "properties": {
        "confidence": { "type": "string", "enum": ["high", "medium", "low"] }
      }
    }
  }
}
```

**Step 3: Write `scripts/validate-schema.mjs`**

```js
#!/usr/bin/env node
// Usage: node scripts/validate-schema.mjs schemas/skill-io/detective-contracts.json sample.json
import fs from "fs/promises";
const [,, schemaPath, dataPath] = process.argv;
// ... load JSON, validate with Ajv or manual check, exit 0/1
```

Use only Node built-ins (no npm deps). Implement a simple structural validator (required fields, type check) — no Ajv needed for v1.

**Step 4: Add schema check to `scripts/check-consistency.mjs`**

After the existing checks, add:
```js
// Check: schemas/skill-io/ files are valid JSON
const schemaFiles = await fs.readdir(path.join(root, "schemas/skill-io")).catch(() => []);
for (const f of schemaFiles.filter(n => n.endsWith(".json") && !n.startsWith("_"))) {
  try { JSON.parse(await read(`schemas/skill-io/${f}`)); }
  catch (e) { expect(false, `schemas/skill-io/${f}: invalid JSON — ${e.message}`); }
}
```

**Step 5: Commit**

```bash
git add schemas/ scripts/validate-schema.mjs scripts/check-consistency.mjs
git commit -m "feat: add skill I/O schema infrastructure and validator"
```

---

## Phase 1C — Scoring Functions (Subagent C)

### Task 1C.1: Create `scripts/auto-loop/scoring.mjs`

**Files:**
- Create: `scripts/auto-loop/scoring.mjs`
- Modify: `scripts/auto-loop/circuit-breaker.mjs` (plug scoring into stall detection)
- Create: `scripts/tests/auto-loop/scoring.test.mjs`

**Step 1: Write `scripts/auto-loop/scoring.mjs`**

```js
/**
 * Iteration quality scorer for auto-loop circuit breaker.
 * Returns a score 0.0–1.0. Low scores compound; 3 consecutive < 0.3 = stall risk.
 *
 * Inputs (all optional, degrade gracefully):
 *   diffLines      number   — lines changed in this iteration
 *   testsDelta     number   — net new passing tests (+) or failing (-)
 *   errorClass     string   — "permanent" | "retryable" | "agent-reported" | null
 *   errorEntropy   number   — unique error signatures seen so far (higher = not converging)
 *   iterationNum   number   — current iteration (0-indexed)
 */
export function iterationScore({ diffLines = 0, testsDelta = 0, errorClass = null, errorEntropy = 0, iterationNum = 0 } = {}) {
  let score = 0.5; // neutral baseline

  // Progress signals
  if (diffLines > 0) score += 0.15;
  if (diffLines > 50) score += 0.10;
  if (testsDelta > 0) score += 0.20;
  if (testsDelta < 0) score -= 0.25;

  // Error signals
  if (errorClass === "permanent") score -= 0.40;
  if (errorClass === "retryable") score -= 0.10;
  if (errorEntropy > 3) score -= 0.20;  // thrashing between different errors

  // Decay: no progress late in run
  if (iterationNum > 5 && diffLines === 0) score -= 0.20;

  return Math.max(0, Math.min(1, score));
}

export function shouldStall(scoreHistory, threshold = 0.3, window = 3) {
  if (scoreHistory.length < window) return false;
  const recent = scoreHistory.slice(-window);
  return recent.every(s => s < threshold);
}
```

**Step 2: Write `scripts/tests/auto-loop/scoring.test.mjs`**

Test cases:
- `iterationScore({diffLines: 10, testsDelta: 2})` → score > 0.7
- `iterationScore({diffLines: 0, testsDelta: -1, errorClass: "permanent"})` → score < 0.2
- `shouldStall([0.2, 0.1, 0.15])` → true
- `shouldStall([0.2, 0.1, 0.8])` → false
- `shouldStall([0.2, 0.1])` → false (window not reached)

Run: `node scripts/tests/auto-loop/scoring.test.mjs`
Expected: all 5 assertions pass, exits 0.

**Step 3: Integrate into `circuit-breaker.mjs`**

Find the stall detection logic and add alongside it (not replacing):
```js
import { iterationScore, shouldStall } from "./scoring.mjs";
// ... in checkStall():
const score = iterationScore({ diffLines, testsDelta, errorClass, errorEntropy, iterationNum });
this.scoreHistory.push(score);
if (shouldStall(this.scoreHistory)) {
  return { triggered: true, reason: `low-quality stall (scores: ${this.scoreHistory.slice(-3).join(", ")})` };
}
```

**Step 4: Commit**

```bash
git add scripts/auto-loop/scoring.mjs scripts/auto-loop/circuit-breaker.mjs scripts/tests/auto-loop/scoring.test.mjs
git commit -m "feat: add iteration scoring to auto-loop circuit breaker"
```

---

## Phase 2A — Pilot: `detective-contracts` (Subagent D)

### Task 2A.1: Migrate `detective-contracts` subagent to protocol shell format

**Files:**
- Modify: `.claude/agents/detective-contracts.md`
- Create: `schemas/skill-io/detective-contracts.json`

**Step 1:** Read current `.claude/agents/detective-contracts.md`.

**Step 2:** Prepend a protocol shell block to the existing content (do NOT replace the instructions):

```markdown
## Protocol Shell

```yaml
# protocol: detective-contracts v1.0
intent: "Extract module contracts (API surface, deps, invariants, consumers) from legacy code — read-only"

input:
  module_path: path          # directory or file to analyze
  scope: enum(file|dir|pkg)  # analysis granularity
  depth: enum(shallow|deep)  # shallow=API only, deep=internals

process:
  - /scan.public_api{target=input.module_path}
  - /extract.dependencies{filter='direct_only'}
  - /identify.invariants{confidence_threshold=0.7}
  - /map.consumers{scope=input.scope}
  - /output.contract_doc{format='_detective_sdd/01-modules/<name>.md'}

output:
  contract_path: path        # written file in _detective_sdd/01-modules/
  public_api: list<string>   # exported symbols
  dependencies: list<string> # direct imports
  invariants: list<string>   # identified constraints
  confidence: high|medium|low
```
```

**Step 3:** Create `schemas/skill-io/detective-contracts.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "detective-contracts I/O",
  "type": "object",
  "required": ["input", "output"],
  "properties": {
    "input": {
      "type": "object",
      "required": ["module_path"],
      "properties": {
        "module_path": { "type": "string" },
        "scope": { "type": "string", "enum": ["file", "dir", "pkg"], "default": "dir" },
        "depth": { "type": "string", "enum": ["shallow", "deep"], "default": "shallow" }
      }
    },
    "output": {
      "type": "object",
      "required": ["contract_path", "confidence"],
      "properties": {
        "contract_path": { "type": "string" },
        "public_api": { "type": "array", "items": { "type": "string" } },
        "dependencies": { "type": "array", "items": { "type": "string" } },
        "invariants": { "type": "array", "items": { "type": "string" } },
        "confidence": { "type": "string", "enum": ["high", "medium", "low"] }
      }
    }
  }
}
```

**Step 4: Commit**

```bash
git add .claude/agents/detective-contracts.md schemas/skill-io/detective-contracts.json
git commit -m "feat: add protocol shell and I/O schema to detective-contracts subagent"
```

---

## Phase 2B — Pilot: `semgrep-triager` (Subagent E)

### Task 2B.1: Migrate `semgrep-triager` subagent to protocol shell format

**Files:**
- Modify: `.claude/agents/semgrep-triager.md`
- Create: `schemas/skill-io/semgrep-triager.json`

Same pattern as 2A. Protocol shell:

```yaml
intent: "Classify Semgrep findings as TP/FP/needs-investigation by reading source context"

input:
  sarif_path: path           # SARIF file from semgrep-scanner
  batch_limit: integer       # max findings to process (default 50)
  codebase_root: path        # repo root for source context reads

process:
  - /parse.sarif{path=input.sarif_path}
  - /read.source_context{per_finding=true, lines=10}
  - /classify.finding{categories=['TP','FP','needs-investigation']}
  - /generate.fix_suggestion{for='TP'}
  - /generate.suppression{for='FP', with_justification=true}
  - /output.triage_report{}

output:
  true_positives: list<finding>
  false_positives: list<finding>
  needs_investigation: list<finding>
  confidence: high|medium|low
```

Schema: fields `sarif_path`, `batch_limit`, `codebase_root` in input; `true_positives`, `false_positives`, `needs_investigation` arrays + `confidence` in output.

**Commit:**
```bash
git add .claude/agents/semgrep-triager.md schemas/skill-io/semgrep-triager.json
git commit -m "feat: add protocol shell and I/O schema to semgrep-triager subagent"
```

---

## Phase 2C — Pilot: `code-reviewer` (Subagent F)

### Task 2C.1: Migrate `code-reviewer` subagent to protocol shell format

**Files:**
- Modify: `.claude/agents/code-reviewer.md`
- Create: `schemas/skill-io/code-reviewer.json`

Protocol shell:

```yaml
intent: "Senior code review focused on clean code, DRY, SOLID, correctness, performance and security"

input:
  target: path | diff        # file/dir path or git diff string
  focus: list<enum(correctness|design|readability|performance|security)>
  context: string            # optional: PR description, task summary

process:
  - /read.target{type=input.target}
  - /analyze.correctness{}
  - /analyze.design{principles=['DRY','SOLID','clean-code']}
  - /analyze.security{quick=true}
  - /generate.issues{severity=['critical','major','minor','nitpick']}
  - /output.review{}

output:
  issues: list<issue>        # {severity, category, location, description, suggestion}
  summary: string
  verdict: enum(approve|request-changes|needs-discussion)
  confidence: high|medium|low
```

**Commit:**
```bash
git add .claude/agents/code-reviewer.md schemas/skill-io/code-reviewer.json
git commit -m "feat: add protocol shell and I/O schema to code-reviewer subagent"
```

---

## Phase 3 — Cognitive Programs Layer (Subagent G)

### Task 3.1: Create `programs/` with declarative pipeline definitions

**Files:**
- Create: `programs/README.md`
- Create: `programs/pipeline-discovery.md`
- Create: `programs/detective-spec.md`
- Create: `programs/loop-polishing.md`
- Modify: `skills/09-orchestrator/SKILL.md` (add reference to `programs/`)

**Step 1: Write `programs/README.md`**

Programs = ordered sequences of protocol shells composing a multi-step workflow. Each program references its constituent shells by `protocol:` name.

**Step 2: Write `programs/pipeline-discovery.md`**

```markdown
# Program: pipeline-discovery

## Intent
Full discovery flow: interrogation → PRD → issues → TDD loop → ship.

## Sequence
```
/grill-me{turns='until-convergence', output='requirements'}
→ /to-prd{input=requirements, publish=true, label='needs-triage'}
→ /to-issues{input=prd, slices='vertical', tracker='github'}
→ /loop{agent='claude', polish='standard', tdd=true, per_issue=true}
→ /ship{changelog=true, version_bump='minor'}
```

## Protocol refs
- `/grill-me` → `.claude/commands/grill-me.md`
- `/to-prd` → `.claude/commands/to-prd.md`
- `/to-issues` → `.claude/commands/to-issues.md`
- `/loop` → `scripts/auto-loop/`
- `/ship` → `.claude/commands/ship.md`

## Abort conditions
- grill-me: user types `done` or no new requirements after 3 turns
- loop: circuit breaker trips (stall / low-score 3x / permanent error)
```

**Step 3:** Similar files for `detective-spec.md` and `loop-polishing.md`.

**Step 4:** In `skills/09-orchestrator/SKILL.md`, add to the "Pipeline Selection" section:
```
See `programs/` for declarative program definitions.
Use programs/ as canonical source when composing multi-step pipelines.
```

**Step 5: Commit**

```bash
git add programs/ skills/09-orchestrator/SKILL.md
git commit -m "feat: add programs/ layer with declarative pipeline definitions (cognitive programs)"
```

---

## Phase 4A — Eval Suite (Subagent H)

### Task 4A.1: Create eval golden tests for protocol-shell subagents

**Files:**
- Create: `evals/protocol-shells/README.md`
- Create: `evals/protocol-shells/detective-contracts/golden.json`
- Create: `evals/protocol-shells/semgrep-triager/golden.json`
- Create: `evals/protocol-shells/code-reviewer/golden.json`
- Modify: `.github/workflows/validate.yml` (add schema validation step)

**Step 1:** For each of the 3 piloted subagents, create a `golden.json`:

```json
{
  "subagent": "detective-contracts",
  "schema": "schemas/skill-io/detective-contracts.json",
  "cases": [
    {
      "description": "shallow scan of a single file",
      "input": { "module_path": "src/auth/login.ts", "scope": "file", "depth": "shallow" },
      "expected_output_shape": {
        "contract_path": { "type": "string", "contains": "_detective_sdd/01-modules/" },
        "confidence": { "enum": ["high", "medium", "low"] }
      }
    }
  ]
}
```

**Step 2:** Add to `.github/workflows/validate.yml` (or create if absent):
```yaml
- name: Validate skill I/O schemas
  run: node scripts/validate-schema.mjs --all schemas/skill-io/
```

**Step 3: Commit**

```bash
git add evals/protocol-shells/ .github/
git commit -m "test: add golden eval cases for protocol-shell pilot subagents"
```

---

## Phase 4B — Scoring Integration Validation (Subagent I)

### Task 4B.1: Validate scoring.mjs integration and calibrate threshold

**Files:**
- Read: `scripts/auto-loop/circuit-breaker.mjs`
- Read: `scripts/auto-loop/runner.mjs`
- Modify: `scripts/auto-loop/runner.mjs` (expose diffLines, testsDelta to circuit breaker)

**Step 1:** Verify `circuit-breaker.mjs` from Phase 1C is wired correctly.

**Step 2:** In `runner.mjs`, ensure the iteration result object includes:
```js
{
  diffLines: gitDiff.split('\n').length,
  testsDelta: parseTestDelta(testOutput),
  errorClass: classifyError(lastError),
  errorEntropy: this.errorSignatures.size,
  iterationNum: this.iteration,
}
```

**Step 3:** Run existing smoke tests to confirm nothing regressed:
```bash
node scripts/tests/auto-loop/run-all.mjs
```
Expected: all tests pass (21 existing + 5 new scoring tests = 26 total).

**Step 4: Commit**

```bash
git add scripts/auto-loop/runner.mjs scripts/auto-loop/circuit-breaker.mjs
git commit -m "feat: wire iteration scoring into auto-loop runner and circuit breaker"
```

---

## Phase 5A — WIKI & Narrative (Subagent J)

### Task 5A.1: Update docs with Context Engineering positioning

**Files:**
- Modify: `docs/WIKI.md` (add section "Context Engineering Stack")
- Modify: `docs/skill-guides/context-engineering.md` (expand with Kimai references)
- Modify: `README.md` (add 1 paragraph in "What It Is" section)
- Modify: `README.pt-BR.md` (translate the addition)

**Step 1: Add section to `docs/WIKI.md`** after the existing intro:

```markdown
## Context Engineering Stack

This kit implements context engineering across all 5 levels of the atom→field hierarchy:

| Level | Kimai Concept | Kit Implementation |
|---|---|---|
| Atom | Single prompt | Individual skill (SKILL.md) |
| Molecule | Few-shot examples | Templates + handoff formats |
| Cell | Memory + state | learned-skills/, context-pack, working-set |
| Organ | Multi-agent | Subagents dispatched via Task tool |
| Neural Field | Semantic resonance | Protocol shells + programs/ (orchestrated flows) |

Protocol shells (`templates/protocol-shell.md`) and programs (`programs/`) are the kit's implementation of Kimai's "cognitive programs" — executable sequences with typed I/O that compose into larger workflows.

Reference: [davidkimai/Context-Engineering](https://github.com/davidkimai/Context-Engineering) — frontier research in context design and orchestration.
```

**Step 2:** Expand `docs/skill-guides/context-engineering.md` with:
- Reference to protocol shells policy
- Link to `programs/` directory
- Note on Kimai's taxonomy vs. kit's functional taxonomy

**Step 3:** Add to `README.md` "What It Is" section (after the bullet list):

```markdown
### Built on Context Engineering principles

The kit's architecture maps to the [context engineering hierarchy](https://github.com/davidkimai/Context-Engineering): individual skills are atoms, templates are molecules, learned-skills + working-set are cells, dispatched subagents are organs, and protocol-shell-composed programs are the emergent field layer. See `docs/WIKI.md → Context Engineering Stack`.
```

**Step 4: Commit**

```bash
git add docs/WIKI.md docs/skill-guides/context-engineering.md README.md README.pt-BR.md
git commit -m "docs: add Context Engineering Stack positioning and Kimai taxonomy mapping"
```

---

## Phase 5B — Final Review (Subagent K)

### Task 5B.1: Code review + consistency check

**Step 1:** Run consistency check:
```bash
node scripts/check-consistency.mjs
```
Expected: 0 failures.

**Step 2:** Review each new/modified file for:
- DRY violations (any logic duplicated between scoring.mjs and circuit-breaker.mjs)
- Protocol shell format consistency (all 3 pilots use same YAML structure)
- Schema completeness (all required fields present in each schema)

**Step 3:** Run auto-loop smoke tests:
```bash
node scripts/tests/auto-loop/run-all.mjs
```
Expected: all pass.

**Step 4:** If issues found → fix in place + commit. If clean → proceed to Phase 6.

---

## Phase 6 — Ship

### Task 6.1: CHANGELOG + VERSION + final commit

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `VERSION`

**Step 1:** Add to `CHANGELOG.md` (prepend new entry):

```markdown
## [1.1.0-context-engineering] - 2026-05-09

### Added
- **Protocol Shells (Pareto-lang):** `templates/protocol-shell.md` + `policies/protocol-shells.md` — formal typed I/O format for subagents, inspired by davidkimai/Context-Engineering.
- **Skill I/O Schemas:** `schemas/skill-io/` with JSON Schema draft-07 definitions for `detective-contracts`, `semgrep-triager`, `code-reviewer`. Validator: `scripts/validate-schema.mjs`.
- **Iteration Scoring:** `scripts/auto-loop/scoring.mjs` — `iterationScore()` + `shouldStall()` wired into circuit breaker alongside existing stall detection.
- **Programs Layer:** `programs/` with declarative cognitive program definitions for `pipeline-discovery`, `detective-spec`, `loop-polishing`. Orchestrator (skill 09) updated to reference programs/.
- **Eval golden cases:** `evals/protocol-shells/` with golden.json per piloted subagent.
- **Context Engineering Stack docs:** WIKI, context-engineering guide, README updated with atom→field taxonomy mapping and Kimai reference.

### Changed
- `scripts/auto-loop/circuit-breaker.mjs`: scoring integrated as complementary signal (AND with existing stall detection, not replacing it).
- `scripts/auto-loop/runner.mjs`: exposes `diffLines`, `testsDelta`, `errorEntropy` to circuit breaker.
- `skills/09-orchestrator/SKILL.md`: references `programs/` as canonical pipeline source.
- `.claude/agents/detective-contracts.md`, `semgrep-triager.md`, `code-reviewer.md`: protocol shell prepended (existing instructions preserved).

### Tests
- 5 new scoring tests in `scripts/tests/auto-loop/scoring.test.mjs`.
- 3 eval golden cases in `evals/protocol-shells/`.
- Total auto-loop smoke tests: 21 → 26.
```

**Step 2:** Bump `VERSION` to `1.1.0`.

**Step 3:** Final commit:

```bash
git add CHANGELOG.md VERSION
git commit -m "chore: bump to 1.1.0 — context engineering adoption (protocol shells, schemas, scoring, programs)"
```

---

## Summary

| Phase | Subagents (parallel) | Key output |
|---|---|---|
| 0 | main | `docs/context-engineering-adoption/baseline.md` |
| 1 | A, B, C (parallel) | `templates/protocol-shell.md`, `schemas/skill-io/`, `scripts/auto-loop/scoring.mjs` |
| 2 | D, E, F (parallel) | 3 subagents migrated + schemas |
| 3 | G | `programs/` layer, orchestrator updated |
| 4 | H, I (parallel) | eval golden cases, scoring validated end-to-end |
| 5 | J, K (parallel) | docs/WIKI/README updated, review clean |
| 6 | main | CHANGELOG + VERSION 1.1.0 |

**Total subagents dispatched: 11 (A–K)**
**All phases are additive — zero breaking changes.**
