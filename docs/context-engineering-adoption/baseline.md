# Context Engineering Adoption — Baseline

## Subagent Handoff Audit

| Subagent | Input defined? | Output defined? | Schema-ready? | Notes |
|---|---|---|---|---|
| code-reviewer | Free prose (no formal input block) | Structured — fenced template with Status, Resumo, Findings (Critical/Important/Suggestion), Decisão | Partial | Output template is explicit with typed severity labels (🔴/🟡/🔵); input is implied by dispatch context only |
| codeql-runner | Structured — bulleted list: repo path, language, optional query suite, optional custom `.ql` | Structured — fenced markdown report with Database, Suite, Summary counts, Top findings, Output paths | Yes | Input section labeled "Inputs" with typed fields; output template is complete with all sections defined |
| debugger | Free prose (bug description implied) | Structured — fenced `Debug Report` template with Bug, Reproduzivel, Evidence Ledger table, Root Cause, Fix diff, Verificacao, Confidence | Partial | Output is the most richly typed of all agents (ledger table, confidence enum, diff format); input has no formal schema |
| detective-adrs | Free prose (dispatched from parent with context) | Structured — per-ADR fenced template with Status, Confidence, Data, Evidence list, Contexto, Decisão, Consequências, Alternativas; plus synthesis in `00-overview.md` and `99-traceability.md` | Partial | Confidence is a typed enum (high/medium/low); output paths are fixed conventions; no formal input schema |
| detective-business-rules | Free prose (domain name implied by dispatch) | Structured — per-domain fenced template with RN-NNN numbered rules, Confidence enum, Evidence list, Quando/Então/Por que, testable DADO/QUANDO/ENTÃO format, Exemplos | Partial | RN numbering and confidence enum are typed conventions; no formal input schema |
| detective-contracts | Structured — mentions scope (module name) from dispatch; "7 Perguntas" protocol frames expected content | Structured — fenced module template with Path, Confidence, Responsabilidade, API Pública, Dependências, Invariantes, Consumidores, Estado Interno, Suspeitas | Yes | Most protocol-driven detective agent; Confidence scoring is typed (high/medium/low with explicit criteria); handoff output is itemized |
| detective-flows | Free prose (flow name from dispatch context) | Structured — fenced flow template with Trigger, Confidence, Módulos, Happy Path (numbered steps with file:line), Edge Cases, Estado Mutado table, Falhas Possíveis, Suspeitas | Partial | Estado Mutado is a typed table (Step × Recurso × Operação); output template is detailed; no formal input schema |
| orchestrator | Free prose (task description) | Structured — fenced `Plano de Execução` with Tipo, Complexidade, Pipeline (numbered), Skills puladas, Blocker/risco, Próxima etapa | Partial | Ambiguity score formula (goal×0.40 + constraints×0.30 + criteria×0.30) is a typed field; output sections are labeled but values are prose |
| sarif-parsing | Structured — bulleted list: SARIF paths, optional baseline SARIF, optional severity filter | Structured — fenced markdown report with Tools, Total, Consensus count, Per-severity breakdown, Per-category, Top files, Diff vs baseline, Output paths | Yes | Input section labeled "Inputs" with typed fields; output template complete with all sections defined; jq snippets show exact data shapes |
| security-auditor | Free prose (feature/PR implied by dispatch) | Structured — fenced `Security Audit` with Status, Resumo, Findings (Vulnerability/Weakness/Hardening each with Scope/Local/Descrição/PoC/Fix), Checklist, Decisão | Partial | Findings use typed sub-fields (Scope enum, Local file:line); Checklist is typed boolean items; input is implicit |
| semgrep-scanner | Structured — bulleted list: repo path, languages (or auto-detect), optional rulesets, optional custom rules dir | Structured — fenced `Semgrep Scan Report` with Duration, Linguagens, Rulesets, Summary counts, Top rules, Top files, Output files, Handoff | Yes | Input section labeled "Inputs" with typed fields; output template is complete; ruleset-to-language mapping table is a typed reference |
| semgrep-triager | Structured — bulleted list: SARIF path, optional FP list, optional context | Structured — fenced `Triagem Semgrep` with Findings total, TP/FP/NI counts, Critical/High sections with F-NNN findings, FPs list, NI list, Statistics | Yes | Input section labeled "Inputs" with typed fields; TP/FP/NI classification is a typed enum; effort field (S/M/L) is typed |
| test-engineer | Free prose (feature name implied by dispatch) | Structured — fenced `Test Report` with Cenários Cobertos table (Tipo/Descrição/Status), Gaps Identificados table (Tipo/Descrição/Risco), Risco Residual | Partial | Output tables are typed with enum-like Tipo column (Happy Path/Error/Edge Case/Regression/Performance) and Risco severity labels; no formal input schema |
| variant-analysis | Structured — bulleted list: bug file:line + description + sink + source, language, optional CWE/OWASP class | Structured — fenced `Variant Analysis` report with Bug original, Padrao, Custom rule path, Variantes (V-N with file:line, snippet, fix diff, owner, priority), Validação, Ação, Handoff | Yes | Input section labeled "Inputs" with typed fields; pattern characterization requires explicit source/sink/mitigation sentence; most approval-gate detail of all agents |

---

## Key gaps

- [ ] **No formal input schema on 8/14 agents** — code-reviewer, debugger, detective-adrs, detective-business-rules, detective-flows, orchestrator, security-auditor, and test-engineer rely entirely on dispatch prose. No typed fields, no required/optional markers, no validation contract.
- [ ] **Inconsistent handoff enumerations** — detective-* agents return 3–5 bullet items; semgrep-* agents return 4–5 bullet items; but the exact field names and types differ per agent. No shared `HandoffPayload` schema exists.
- [ ] **Confidence enum is informally defined per-agent** — detective-contracts, detective-adrs, detective-business-rules, detective-flows all use `high | medium | low` with slightly different criteria. No single canonical definition is shared.
- [ ] **Severity/priority enums are duplicated** — code-reviewer uses 🔴/🟡/🔵 with "Critical/Important/Suggestion"; security-auditor uses 🔴/🟡/🔵 with "Vulnerability/Weakness/Hardening"; semgrep-triager uses Critical/High/Medium/Low. No unified severity taxonomy.
- [ ] **orchestrator ambiguity score formula is inline prose** — the 0.40/0.30/0.30 weighting is defined in the body but no input fields capture `goal`, `constraints`, `criteria` as typed inputs.
- [ ] **No machine-readable schema for any agent** — all I/O descriptions are in natural-language prose/fenced templates. There is no YAML/JSON schema that a routing layer could validate against.
- [ ] **Handoff paths are inconsistent** — some agents specify exact output file paths (`.detective-scan/triage-report.md`, `_detective_sdd/01-modules/<name>.md`), others leave output location implicit (code-reviewer, debugger, orchestrator).
- [ ] **No versioning on any agent definition** — no `version:` field in frontmatter; schema evolution has no contract.

---

## Recommended pilot subagents for Phase 2 (confirm or adjust):

1. **detective-contracts** — Has the most complete I/O protocol of all detective agents: "7 Perguntas" frames a clear input contract, output template is fully typed with fixed sections, confidence scoring criteria are explicit, and handoff enumeration is itemized. Easiest to retrofit a formal schema onto existing structure.
2. **semgrep-triager** — Already has a labeled "Inputs" section with typed fields, a formal TP/FP/NI classification enum, effort field (S/M/L), and a gate mechanism. The triager also has the most explicit approval-gate logic, making it a good test case for structured handoff payloads that carry approval state.
3. **code-reviewer** — High-frequency agent (invoked on every PR/feature). Input gap is the most painful here: reviewers routinely get dispatched without knowing the diff path, PR number, or review scope. Adding a minimal input schema (diff\_source, scope, pr\_id) would provide immediate value and a low-risk pilot since output template is already well-structured.

---

## Baseline metrics

- Subagents with structured I/O (both input and output have defined structure): 4/14 (codeql-runner, sarif-parsing, semgrep-scanner, semgrep-triager — all have labeled "Inputs" sections AND complete output templates)
- Subagents with structured output only (output template defined, input is free prose): 7/14 (code-reviewer, debugger, detective-adrs, detective-business-rules, detective-flows, security-auditor, test-engineer)
- Subagents with partial structure (detective-contracts, orchestrator, variant-analysis have structured output + semi-structured input via protocol or dispatch convention): 3/14
- Subagents with typed fields (any explicit enum, table, or typed value in I/O): 12/14 (all except orchestrator body-text fields and detective-adrs which has no typed input at all)
- Subagents with free-prose I/O (neither input nor output is formally structured): 0/14
- Subagents with a labeled "Inputs" section: 6/14 (codeql-runner, sarif-parsing, semgrep-scanner, semgrep-triager, variant-analysis, detective-contracts via protocol framing)
- Subagents with itemized handoff output: 10/14 (all except code-reviewer, debugger, orchestrator, test-engineer)
