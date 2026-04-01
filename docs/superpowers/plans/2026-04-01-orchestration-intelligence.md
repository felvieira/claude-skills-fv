# Orchestration Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 7 features (Hook System, Context Guard, Commit Trailers, Deep Interview, Pre-execution Gate, Keyword Sanitization, Learned Skills) that add lifecycle intelligence to the Dev Team Kit with native Claude Code hooks + platform-agnostic policy/MCP fallback.

**Architecture:** Hybrid — native `.mjs` hook scripts for Claude Code lifecycle events, `policies/hooks.md` as fallback for Copilot/Windsurf/Gemini, and 4 new MCP tools for programmatic access from any client. Implementation order follows dependency graph: F1 → F6 → F2 → F3 → F4 → F5 → F7.

**Tech Stack:** Node.js ESM (`.mjs`), TypeScript (MCP server, existing), Zod (input validation, existing), bash (install.sh)

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `hooks/hooks.json` | Kit-level registry of lifecycle hooks → events → scripts |
| `hooks/config.json` | Configurable thresholds (context guard, gate scores) |
| `hooks/scripts/session-start.mjs` | SessionStart: injects session state reminder |
| `hooks/scripts/pre-tool-enforcer.mjs` | PreToolUse: reminds to re-read before editing in long sessions |
| `hooks/scripts/persistent-mode.mjs` | Stop: blocks stop when pipeline is active |
| `hooks/scripts/context-guard-stop.mjs` | Stop: blocks stop when context usage is high |
| `hooks/scripts/keyword-detector.mjs` | UserPromptSubmit: sanitizes input, matches skill triggers + learned skills |
| `hooks/scripts/pre-execution-gate.mjs` | UserPromptSubmit: detects vague prompts, enriches from repo-audit |
| `hooks/scripts/post-tool-verifier.mjs` | PostToolUse: detects debugging patterns for learned skill extraction |
| `templates/commit-trailers.md` | Template with 6 trailers + examples + usage rules |
| `templates/deep-interview.md` | Template for ambiguity-scored interview + ontology tracking |
| `policies/hooks.md` | Platform-agnostic fallback rules for all 7 features |

### Modified files

| File | Change |
|------|--------|
| `skills/01-po-feature-spec/SKILL.md` | Add Ambiguity Scoring + Deep Interview Protocol sections |
| `skills/09-orchestrator/SKILL.md` | Add Pre-execution Gate section in Protocolo de Execucao |
| `skills/11-reviewer/SKILL.md` | Add Commit Trailers section in approval protocol |
| `policies/quality-gates.md` | Add trailer rule for commits with trade-offs |
| `GLOBAL.md` | Add Context Guard reference to Context Decay Awareness |
| `setup/install.sh` | Add hooks copy step + learned-skills/ mkdir + settings.json merge |
| `mcp-server/src/index.ts` | Add 4 tools before `// START SERVER` at line 1083 |
| `README.md` | Add Hooks section + update MCP tool count to 29 |

---

## Task 1: F1 — Hook System Infrastructure

**Files:**
- Create: `hooks/hooks.json`
- Create: `hooks/config.json`
- Create: `hooks/scripts/session-start.mjs`
- Create: `hooks/scripts/pre-tool-enforcer.mjs`
- Create: `hooks/scripts/persistent-mode.mjs`

- [ ] **Step 1.1: Create hooks/hooks.json**

```json
{
  "UserPromptSubmit": [
    "hooks/scripts/pre-execution-gate.mjs",
    "hooks/scripts/keyword-detector.mjs"
  ],
  "PreToolUse": [
    "hooks/scripts/pre-tool-enforcer.mjs"
  ],
  "Stop": [
    "hooks/scripts/context-guard-stop.mjs",
    "hooks/scripts/persistent-mode.mjs"
  ],
  "SessionStart": [
    "hooks/scripts/session-start.mjs"
  ],
  "PostToolUse": [
    "hooks/scripts/post-tool-verifier.mjs"
  ]
}
```

- [ ] **Step 1.2: Create hooks/config.json**

```json
{
  "context_guard": {
    "warn_threshold": 0.60,
    "block_threshold": 0.75,
    "max_blocks_per_session": 2
  },
  "pre_execution_gate": {
    "enrich_threshold": 0.40,
    "block_threshold": 0.70,
    "max_guided_questions": 2
  },
  "keyword_detector": {
    "max_learned_skills_per_session": 3,
    "informational_context_window": 80
  }
}
```

- [ ] **Step 1.3: Create hooks/scripts/session-start.mjs**

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let contextNote = '';
  if (existsSync('.bot/docs/context/current-focus.md')) {
    try {
      const focus = readFileSync('.bot/docs/context/current-focus.md', 'utf-8');
      const firstLine = focus.split('\n').find(l => l.trim() && !l.startsWith('#')) || '';
      if (firstLine) contextNote = ` Last focus: "${firstLine.trim()}"`;
    } catch {}
  }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      additionalContext: `[DevTeamKit] Session started.${contextNote} Read .bot/docs/context/current-focus.md for session state. Kit rules: .bot/GLOBAL.md.`
    }
  }));
});
```

- [ ] **Step 1.4: Create hooks/scripts/pre-tool-enforcer.mjs**

```javascript
#!/usr/bin/env node
import { readFileSync } from 'fs';

const WRITE_TOOLS = ['Edit', 'Write', 'NotebookEdit', 'mcp__Desktop_Commander__write_file', 'mcp__Desktop_Commander__edit_block'];

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(_input); } catch {}
  const toolName = input.tool_name || '';

  if (WRITE_TOOLS.includes(toolName)) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        additionalContext: `[PreToolUse] About to write. GLOBAL.md Context Decay Awareness: if this session has 10+ messages, re-read the target file before editing to avoid stale-state regressions.`
      }
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
});
```

- [ ] **Step 1.5: Create hooks/scripts/persistent-mode.mjs**

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  const stateFile = '.bot/docs/context/pipeline-active.json';
  if (existsSync(stateFile)) {
    try {
      const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
      if (state.active && state.pipeline) {
        process.stdout.write(JSON.stringify({
          continue: false,
          hookSpecificOutput: {
            additionalContext: `[PersistentMode] Pipeline "${state.pipeline}" is active (step ${state.current_step || '?'}/${state.total_steps || '?'}). Complete the current pipeline stage before stopping. To force stop, delete .bot/docs/context/pipeline-active.json.`
          }
        }));
        process.exit(0);
      }
    } catch {}
  }
  process.stdout.write(JSON.stringify({ continue: true }));
});
```

- [ ] **Step 1.6: Commit**

```bash
cd D:/Repos/claude-skills-fv
git add hooks/
git commit -m "feat: add hook system infrastructure — hooks.json, config.json, session-start, pre-tool-enforcer, persistent-mode"
```

---

## Task 2: F6 — Keyword Sanitization

**Files:**
- Create: `hooks/scripts/keyword-detector.mjs`

- [ ] **Step 2.1: Create hooks/scripts/keyword-detector.mjs**

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

// ── Sanitization ─────────────────────────────────────────────────────────────

function sanitize(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')          // code blocks
    .replace(/`[^`]+`/g, '')                 // inline code
    .replace(/https?:\/\/\S+/g, '')          // URLs
    .replace(/(?:[A-Za-z]:)?(?:\/|\\)[\w./\\-]+\.\w+/g, '') // file paths
    .replace(/\s+at\s+\w[\w.<>]+\s*\([^)]*\)/g, '')         // stack traces
    .replace(/<[^>]+>/g, '')                 // XML/HTML tags
    .replace(/\{[\s\S]{0,500}?\}/g, '');     // JSON blocks (up to 500 chars)
}

// ── Informational intent check ────────────────────────────────────────────────

const INFORMATIONAL_PATTERNS = [
  /o que [eé]/i, /como funciona/i, /explica/i, /explain/i,
  /what is/i, /how does/i, /what does/i, /tell me about/i,
  /what\s+(?:is|are|does)/i, /como usar/i, /para que serve/i,
];

function isInformational(text, keyword, windowSize = 80) {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return false;
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(text.length, idx + keyword.length + windowSize);
  const window = text.slice(start, end);
  return INFORMATIONAL_PATTERNS.some(p => p.test(window));
}

// ── Skill trigger loader ──────────────────────────────────────────────────────

function loadSkillTriggers() {
  const skills = [];
  const skillsDir = existsSync('.bot/skills') ? '.bot/skills' : 'skills';
  if (!existsSync(skillsDir)) return skills;

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(skillsDir, entry.name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    try {
      const content = readFileSync(skillFile, 'utf-8');
      const triggerMatch = content.match(/Trigger em:\s*"([^"]+)"/);
      if (!triggerMatch) continue;
      const triggers = triggerMatch[1].split(',').map(t => t.trim().toLowerCase());
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : entry.name;
      skills.push({ id: entry.name, name, triggers });
    } catch {}
  }
  return skills;
}

// ── Learned skill loader ──────────────────────────────────────────────────────

function loadLearnedSkills() {
  const learned = [];
  const learnedDir = existsSync('.bot/learned-skills') ? '.bot/learned-skills' : null;
  if (!learnedDir) return learned;

  for (const file of readdirSync(learnedDir)) {
    if (!file.endsWith('.md')) continue;
    try {
      const content = readFileSync(join(learnedDir, file), 'utf-8');
      const triggersMatch = content.match(/^triggers:\s*\[([^\]]+)\]/m);
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*(.+)$/m);
      if (!triggersMatch || !nameMatch) continue;
      const triggers = triggersMatch[1].split(',').map(t => t.replace(/['"]/g, '').trim().toLowerCase());
      learned.push({
        name: nameMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : '',
        triggers,
        content,
      });
    } catch {}
  }
  return learned;
}

// ── Session dedup tracker ─────────────────────────────────────────────────────

function getSessionInjected() {
  try {
    return JSON.parse(readFileSync('.bot/.hook-session.json', 'utf-8')).injected || [];
  } catch {
    return [];
  }
}

function saveSessionInjected(list) {
  try {
    const { writeFileSync, mkdirSync } = await import('fs');
    writeFileSync('.bot/.hook-session.json', JSON.stringify({ injected: list }));
  } catch {}
}

// ── Main ──────────────────────────────────────────────────────────────────────

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', async () => {
  let input = {};
  try { input = JSON.parse(_input); } catch {}
  const prompt = input.prompt || '';
  const clean = sanitize(prompt);

  const injectedThisSession = getSessionInjected();
  const additionalContextParts = [];

  // ── Learned skills (higher priority) ──
  const learnedSkills = loadLearnedSkills();
  let learnedCount = injectedThisSession.filter(n => n.startsWith('learned:')).length;
  const maxLearned = 3;

  for (const ls of learnedSkills) {
    if (learnedCount >= maxLearned) break;
    const key = `learned:${ls.name}`;
    if (injectedThisSession.includes(key)) continue;
    const matched = ls.triggers.some(t => {
      if (!clean.toLowerCase().includes(t)) return false;
      return !isInformational(clean, t);
    });
    if (matched) {
      additionalContextParts.push(`[LearnedSkill: ${ls.name}] ${ls.description}\n${ls.content}`);
      injectedThisSession.push(key);
      learnedCount++;
    }
  }

  // ── Official skill triggers ──
  const skills = loadSkillTriggers();
  for (const skill of skills) {
    const matched = skill.triggers.some(t => {
      if (!clean.toLowerCase().includes(t)) return false;
      return !isInformational(clean, t);
    });
    if (matched) {
      additionalContextParts.push(`[SkillDetected: ${skill.id}] Trigger matched for "${skill.name}". Use this skill for the current task.`);
      break; // Only inject first matched skill to avoid noise
    }
  }

  // Save session state
  if (injectedThisSession.length > 0) {
    try {
      const { writeFileSync } = await import('fs');
      writeFileSync('.bot/.hook-session.json', JSON.stringify({ injected: injectedThisSession }));
    } catch {}
  }

  if (additionalContextParts.length > 0) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        additionalContext: additionalContextParts.join('\n\n---\n\n')
      }
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
});
```

- [ ] **Step 2.2: Verify sanitization logic manually**

Run this test snippet to verify sanitization:
```bash
node -e "
const text = 'o que e o deploy skill? fix bug em \`security.ts\` at https://app.com/review';
function sanitize(t) {
  return t
    .replace(/\`\`\`[\s\S]*?\`\`\`/g, '')
    .replace(/\`[^\`]+\`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/(?:[A-Za-z]:)?(?:\/|\\\\)[\\w./\\\\-]+\\.\\w+/g, '')
    .replace(/<[^>]+>/g, '');
}
console.log(sanitize(text));
"
```

Expected output: `o que e o deploy skill? fix bug em  at ` — inline code and URL stripped.

- [ ] **Step 2.3: Commit**

```bash
git add hooks/scripts/keyword-detector.mjs
git commit -m "feat: add keyword-detector hook with input sanitization and learned skill injection"
```

---

## Task 3: F2 — Context Guard

**Files:**
- Create: `hooks/scripts/context-guard-stop.mjs`
- Modify: `mcp-server/src/index.ts` (add `devkit_context_guard` tool before line 1083)
- Modify: `GLOBAL.md` (add reference in Context Decay Awareness section)

- [ ] **Step 3.1: Create hooks/scripts/context-guard-stop.mjs**

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(_input); } catch {}

  // Never block context-limit stops (prevents compaction deadlock)
  if (input.reason === 'context_limit' || input.stop_reason === 'context_limit') {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Load config
  let cfg = { warn_threshold: 0.60, block_threshold: 0.75, max_blocks_per_session: 2 };
  try {
    const raw = JSON.parse(readFileSync('hooks/config.json', 'utf-8'));
    if (raw.context_guard) cfg = { ...cfg, ...raw.context_guard };
  } catch {}

  // Track blocks this session
  const blockFile = '.bot/.context-guard-blocks.json';
  let blocks = 0;
  try { blocks = JSON.parse(readFileSync(blockFile, 'utf-8')).count || 0; } catch {}

  if (blocks >= cfg.max_blocks_per_session) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Check token usage if provided by Claude Code
  const inputTokens = input.input_tokens;
  const contextWindow = input.context_window;

  if (inputTokens && contextWindow) {
    const usage = inputTokens / contextWindow;
    if (usage > cfg.block_threshold) {
      try {
        mkdirSync('.bot', { recursive: true });
        writeFileSync(blockFile, JSON.stringify({ count: blocks + 1 }));
      } catch {}
      process.stdout.write(JSON.stringify({
        continue: false,
        hookSpecificOutput: {
          additionalContext: `[ContextGuard] Context at ${Math.round(usage * 100)}% (threshold: ${Math.round(cfg.block_threshold * 100)}%). Run /compact before stopping. Block ${blocks + 1}/${cfg.max_blocks_per_session}.`
        }
      }));
      process.exit(0);
    }
  }

  // Fallback: always inject reminder
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      additionalContext: `[ContextGuard] Stopping. If context feels high (10+ messages since last /compact), consider /compact first. If pipeline is active, complete current stage.`
    }
  }));
});
```

- [ ] **Step 3.2: Add devkit_context_guard to mcp-server/src/index.ts**

In `mcp-server/src/index.ts`, insert before `// ============================================================================\n// START SERVER`:

```typescript
server.registerTool(
  "devkit_context_guard",
  {
    title: "Context Guard",
    description: "Checks context usage and advises whether to compact before stopping. Call before ending long sessions.",
    inputSchema: {
      input_tokens: z.number().describe("Current input token count"),
      context_window: z.number().describe("Model context window size"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ input_tokens, context_window }) => {
    const usage = input_tokens / context_window;
    const usagePercent = Math.round(usage * 100);
    const should_compact = usage > 0.60;
    const should_block_stop = usage > 0.75;

    let message = `Context usage: ${usagePercent}%.`;
    if (should_block_stop) {
      message += ` HIGH — run /compact before stopping to preserve session state.`;
    } else if (should_compact) {
      message += ` WARN — consider running /compact soon.`;
    } else {
      message += ` OK — safe to continue or stop.`;
    }

    return {
      content: [{ type: "text" as const, text: JSON.stringify({
        usage_percent: usagePercent,
        should_compact,
        should_block_stop,
        message,
      }, null, 2) }],
    };
  },
);
```

- [ ] **Step 3.3: Update GLOBAL.md — add Context Guard reference**

In `GLOBAL.md`, find the Context Decay Awareness section and append:

```
- Quando contexto estiver alto (>75%), executar /compact antes de parar — ver `policies/hooks.md` secao Context Guard
- Em Claude Code, o hook `context-guard-stop.mjs` faz isso automaticamente
```

- [ ] **Step 3.4: Build MCP and verify new tool compiles**

```bash
cd D:/Repos/claude-skills-fv/mcp-server
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3.5: Commit**

```bash
cd D:/Repos/claude-skills-fv
git add hooks/scripts/context-guard-stop.mjs mcp-server/src/index.ts GLOBAL.md mcp-server/dist/
git commit -m "feat: add context guard hook + devkit_context_guard MCP tool + GLOBAL.md reference"
```

---

## Task 4: F3 — Commit Trailers

**Files:**
- Create: `templates/commit-trailers.md`
- Modify: `skills/11-reviewer/SKILL.md` (add Commit Trailers section)
- Modify: `policies/quality-gates.md` (add trailer rule)
- Modify: `mcp-server/src/index.ts` (add `devkit_suggest_trailers`)

- [ ] **Step 4.1: Create templates/commit-trailers.md**

```markdown
# Commit Trailers — Template

Trailers preservam decisoes arquiteturais no git history. Adicionar apos a descricao do commit.

## Trailers Disponiveis

| Trailer | Quando usar |
|---------|-------------|
| `Constraint:` | Restricao externa que limitou a solucao |
| `Rejected:` | Alternativa considerada e descartada (formato: `alternativa \| motivo`) |
| `Directive:` | Decisao de design intencional e permanente |
| `Confidence:` | Nivel de certeza (low/medium/high + evidencia) |
| `Scope-risk:` | Risco de impacto em outras areas (low/medium/high + motivo) |
| `Not-tested:` | O que ficou sem teste e por que |

## Regras de Aplicacao

- **Opcional** em commits triviais (typo, rename, formatting, docs simples)
- **Recomendado** em commits com decisao de design ou trade-off
- **Obrigatorio** quando Reviewer identifica trade-off ou risco explicito

## Formato

```
tipo: descricao curta da mudanca

Descricao opcional da implementacao em prosa.

Constraint: restricao que influenciou a decisao
Rejected: alternativa descartada | motivo em uma linha
Directive: decisao de design intencional
Confidence: high | coberto por e2e
Scope-risk: low | mudanca isolada no adapter
Not-tested: cenario X | motivo pelo qual nao foi testado
```

## Exemplo Real

```
feat: add streaming endpoint for AI chat

Implement SSE-based streaming for real-time token delivery.

Constraint: Vercel serverless tem timeout de 30s — chunked response obrigatorio
Rejected: WebSocket | complexidade de infra desproporcional para MVP
Directive: stream via ReadableStream nativo, sem lib extra
Confidence: high | coberto por integration test
Scope-risk: medium | middleware de auth ajustado para streaming
```

## Exemplo Minimo (apenas o que se aplica)

```
fix: resolve race condition in auth token refresh

Constraint: NextAuth nao expoe metodo de refresh manual — necessario workaround via cookies
Confidence: medium | testado manualmente, sem e2e automatizado ainda
Not-tested: refresh em SSR simultaneo | requere mock de request paralelo
```
```

- [ ] **Step 4.2: Add Commit Trailers section to skills/11-reviewer/SKILL.md**

After the existing "Evidencia de Conclusao" section in `skills/11-reviewer/SKILL.md`, add:

```markdown
## Commit Trailers

Ao aprovar, identificar se o commit envolve trade-off ou decisao arquitetural. Se sim, sugerir trailers usando `templates/commit-trailers.md`.

**Quando sugerir trailers obrigatoriamente:**
- solucao foi limitada por restricao externa (`Constraint:`)
- alternativa foi descartada (`Rejected:`)
- algo ficou sem teste por razao valida (`Not-tested:`)
- mudanca tem risco de impacto lateral (`Scope-risk: medium+`)

**Como sugerir:**
1. identificar os trailers aplicaveis ao contexto do review
2. propor draft do commit message com trailers preenchidos
3. o dev ajusta e commita — nao e obrigatorio aceitar todos os sugeridos

Usar `devkit_suggest_trailers` (MCP) para gerar sugestao automatica com base no diff.
```

- [ ] **Step 4.3: Add trailer rule to policies/quality-gates.md**

Append to `policies/quality-gates.md`:

```markdown
## Regra de Commit Trailers

Commits com decisao arquitetural, trade-off ou risco lateral DEVEM incluir trailers relevantes.

Aplicar `templates/commit-trailers.md`:
- `Constraint:` quando restricao externa limitou opcoes
- `Rejected:` quando alternativa foi desconsiderada
- `Not-tested:` quando algo ficou fora da cobertura por motivo valido
- `Scope-risk:` quando mudanca pode impactar outros modulos

Nao aplicar em commits triviais (typo, rename, lint, docs simples).
```

- [ ] **Step 4.4: Add devkit_suggest_trailers to mcp-server/src/index.ts**

Insert before the `devkit_context_guard` tool (or after, before `// START SERVER`):

```typescript
server.registerTool(
  "devkit_suggest_trailers",
  {
    title: "Suggest Commit Trailers",
    description: "Analyzes a diff summary and decisions to suggest relevant git commit trailers",
    inputSchema: {
      diff_summary: z.string().describe("Short description of what changed in the diff"),
      decisions: z.array(z.string()).optional().describe("Design decisions made during implementation"),
      rejected_alternatives: z.array(z.string()).optional().describe("Alternatives that were considered and rejected (format: 'alternative | reason')"),
      constraints: z.array(z.string()).optional().describe("External constraints that limited the solution"),
      not_tested: z.array(z.string()).optional().describe("Scenarios not covered by tests and why"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ diff_summary, decisions, rejected_alternatives, constraints, not_tested }) => {
    const trailers: Array<{ type: string; value: string }> = [];

    if (constraints && constraints.length > 0) {
      constraints.forEach(c => trailers.push({ type: "Constraint", value: c }));
    }
    if (rejected_alternatives && rejected_alternatives.length > 0) {
      rejected_alternatives.forEach(r => trailers.push({ type: "Rejected", value: r }));
    }
    if (decisions && decisions.length > 0) {
      decisions.forEach(d => trailers.push({ type: "Directive", value: d }));
    }
    if (not_tested && not_tested.length > 0) {
      not_tested.forEach(n => trailers.push({ type: "Not-tested", value: n }));
    }

    const trailerLines = trailers.map(t => `${t.type}: ${t.value}`).join('\n');
    const commitMessage = trailers.length > 0
      ? `${diff_summary}\n\n${trailerLines}`
      : diff_summary;

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ trailers, commit_message: commitMessage }, null, 2) }],
    };
  },
);
```

- [ ] **Step 4.5: Build and verify**

```bash
cd D:/Repos/claude-skills-fv/mcp-server && npm run build
```

Expected: no errors.

- [ ] **Step 4.6: Commit**

```bash
cd D:/Repos/claude-skills-fv
git add templates/commit-trailers.md skills/11-reviewer/SKILL.md policies/quality-gates.md mcp-server/src/index.ts mcp-server/dist/
git commit -m "feat: add commit trailers — template, reviewer section, quality gate rule, devkit_suggest_trailers MCP tool"
```

---

## Task 5: F4 — Deep Interview + Ambiguity Scoring

**Files:**
- Create: `templates/deep-interview.md`
- Modify: `skills/01-po-feature-spec/SKILL.md` (add Ambiguity Scoring + Deep Interview Protocol)
- Modify: `mcp-server/src/index.ts` (add `devkit_ambiguity_score`)

- [ ] **Step 5.1: Create templates/deep-interview.md**

```markdown
# Deep Interview — Template

Use quando ambiguity score > 0.7 ou quando o briefing claramente precisar de mais contexto antes de montar pipeline.

## Formula de Ambiguidade

```
ambiguity = 1 - (goal * 0.40 + constraints * 0.30 + criteria * 0.30)
```

**Variante Brownfield** (projeto existente com codebase conhecida):
```
ambiguity = 1 - (goal * 0.30 + constraints * 0.25 + criteria * 0.25 + context_clarity * 0.20)
```

## Score por Dimensao (0-1)

| Dimensao | Score 0 (vago) | Score 1 (concreto) |
|----------|----------------|---------------------|
| `goal` | "melhorar o app" | "adicionar filtro de preco na listagem de produtos" |
| `constraints` | nenhuma restricao | "max 500ms, sem breaking change na API v2" |
| `criteria` | "que funcione bem" | "filtro retorna em <500ms e persiste na URL" |
| `context_clarity` | sem referencia a codigo | file paths, componentes, endpoints mencionados |

## Thresholds

| Score | Acao |
|-------|------|
| < 0.4 | Prosseguir — briefing claro |
| 0.4–0.7 | Enrich Mode — inferir do contexto e confirmar |
| > 0.7 | Guided Enrich — uma pergunta focada com opcoes |

## Estrutura de Rodada

```
Rodada [N]/5:

Pergunta: [pergunta focada com 3 opcoes de resposta]
Ontologia atual: { entidades: [...], campos: [...], relacionamentos: [...] }
Stability ratio: [0-1]
Score pos-rodada: [recalcular]
```

## Protocolo de Entrevista

1. Calcular score inicial antes de comecar
2. Fazer UMA pergunta por rodada — preferencialmente multipla escolha
3. Apos cada resposta: extrair ontologia e calcular stability ratio
4. Stability ratio = overlap de entidades entre rodada N e N-1
5. Se stability > 0.8 por 2 rodadas consecutivas → ontologia estavel, parar
6. Se score < 0.4 em qualquer rodada → parar, briefing suficiente
7. Apos 5 rodadas sem estabilidade → avisar que escopo precisa de mais trabalho

## Exemplo de Rodada

```
Rodada 1/5:
Score inicial: 0.72 (goal: 0.3, constraints: 0.0, criteria: 0.0)

Pergunta: "O filtro de preco e para qual contexto?"
  A) Listagem de produtos do e-commerce (lado publico)
  B) Dashboard admin de gestao de preco (lado interno)
  C) Outro — descreva

[usuario responde A]

Ontologia: { entidades: [Produto, Filtro, Listagem], campos: [preco_min, preco_max], relacionamentos: [Listagem usa Filtro] }
Stability ratio: N/A (primeira rodada)
Score pos-rodada: 0.55 (goal: 0.7, constraints: 0.0, criteria: 0.2)
```

## Handoff apos Entrevista

Ao concluir, entregar para Orchestrator:
- score final
- briefing enriquecido com tudo que foi inferido + confirmado
- ontologia final (entidades e relacionamentos chave)
- constraints e criterios capturados
```

- [ ] **Step 5.2: Add Ambiguity Scoring + Deep Interview sections to skills/01-po-feature-spec/SKILL.md**

Append to `skills/01-po-feature-spec/SKILL.md` before the "Codigo Limpo" section:

```markdown
## Ambiguity Scoring

Antes de iniciar a spec, calcular o ambiguity score para decidir se o briefing e suficiente.

**Formula:**
```
ambiguity = 1 - (goal * 0.40 + constraints * 0.30 + criteria * 0.30)
```

**Variante Brownfield** (codebase conhecida):
```
ambiguity = 1 - (goal * 0.30 + constraints * 0.25 + criteria * 0.25 + context_clarity * 0.20)
```

**Thresholds:**
- `score < 0.4` → prosseguir direto
- `score 0.4-0.7` → enrich mode (inferir do repo-audit e confirmar)
- `score > 0.7` → iniciar Deep Interview

Usar `devkit_ambiguity_score` (MCP) para calcular programaticamente.

## Deep Interview Protocol

Acionar quando `score > 0.7`. Seguir `templates/deep-interview.md`.

**Principios:**
- Uma pergunta por rodada, preferencialmente multipla escolha
- Sistema infere e confirma — nunca devolve "escreva mais"
- Max 5 rodadas, parar quando stability ratio > 0.8 por 2 rodadas
- Fail-forward: apos 5 rodadas sem estabilidade, prosseguir com melhor entendimento

**Enrich Mode** (score 0.4-0.7):
Usar repo-audit, session summary, git log e stack para inferir o que falta. Apresentar:
```
"Entendi que voce quer [X]. Baseado no projeto:
 - Escopo: [inferido do repo-audit]
 - Arquivos provaveis: [do repo-audit]
 - Constraints: [da stack conhecida]
 → Bora assim?
 → Quer ajustar ou detalhar algo?
 → Ou era outra coisa?"
```
```

- [ ] **Step 5.3: Add devkit_ambiguity_score to mcp-server/src/index.ts**

Insert before `// START SERVER`:

```typescript
server.registerTool(
  "devkit_ambiguity_score",
  {
    title: "Ambiguity Score",
    description: "Calculates how ambiguous a task description is and recommends whether to proceed, enrich, or run Deep Interview",
    inputSchema: {
      description: z.string().describe("Task or feature description from the user"),
      is_brownfield: z.boolean().optional().describe("True if this is an existing codebase (adds context_clarity dimension)"),
      mentioned_files: z.array(z.string()).optional().describe("File paths mentioned in the description"),
      constraints: z.array(z.string()).optional().describe("Constraints explicitly mentioned"),
      criteria: z.array(z.string()).optional().describe("Success criteria explicitly mentioned"),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ description, is_brownfield, mentioned_files, constraints, criteria }) => {
    // Score goal (0-1): presence of concrete action + subject + scope
    const hasVerb = /add|create|fix|remove|update|refactor|implement|build|change|improve|migrate/i.test(description);
    const hasNoun = description.split(' ').length > 3;
    const hasScope = /in\s+\w+|on\s+\w+|for\s+\w+|when\s+\w+|at\s+\w+/i.test(description);
    const goalScore = ((hasVerb ? 0.4 : 0) + (hasNoun ? 0.3 : 0) + (hasScope ? 0.3 : 0));

    // Score constraints (0-1)
    const constraintScore = Math.min(1, (constraints?.length || 0) * 0.4 + (description.match(/max|min|must|cannot|without|no more than|at least/gi)?.length || 0) * 0.2);

    // Score criteria (0-1)
    const criteriaScore = Math.min(1, (criteria?.length || 0) * 0.5 + (description.match(/when|then|should|must|expect|verify|returns?|loads? in/gi)?.length || 0) * 0.2);

    let score: number;
    const dimensions: Record<string, number> = {
      goal: Math.round(goalScore * 100) / 100,
      constraints: Math.round(constraintScore * 100) / 100,
      criteria: Math.round(criteriaScore * 100) / 100,
    };

    if (is_brownfield) {
      // context_clarity: file paths mentioned = high clarity
      const contextScore = Math.min(1, (mentioned_files?.length || 0) * 0.5 + (description.match(/\b\w+\.(ts|js|py|go|rs|md)\b/g)?.length || 0) * 0.3);
      dimensions.context_clarity = Math.round(contextScore * 100) / 100;
      score = 1 - (goalScore * 0.30 + constraintScore * 0.25 + criteriaScore * 0.25 + contextScore * 0.20);
    } else {
      score = 1 - (goalScore * 0.40 + constraintScore * 0.30 + criteriaScore * 0.30);
    }

    score = Math.max(0, Math.min(1, Math.round(score * 100) / 100));

    const action = score < 0.40 ? "proceed" : score < 0.70 ? "warn" : "block";

    const suggestedQuestions: string[] = [];
    if (dimensions.goal < 0.5) suggestedQuestions.push("O que exatamente precisa ser feito? (acao + objeto + contexto)");
    if (dimensions.constraints < 0.3) suggestedQuestions.push("Ha restricoes tecnicas ou de negocio? (performance, compatibilidade, prazo)");
    if (dimensions.criteria < 0.3) suggestedQuestions.push("Como saberemos que está pronto? (critério verificável)");
    if (is_brownfield && (dimensions.context_clarity || 0) < 0.3) suggestedQuestions.push("Quais arquivos ou componentes serao afetados?");

    return {
      content: [{ type: "text" as const, text: JSON.stringify({ score, dimensions, action, suggested_questions: suggestedQuestions }, null, 2) }],
    };
  },
);
```

- [ ] **Step 5.4: Build and verify**

```bash
cd D:/Repos/claude-skills-fv/mcp-server && npm run build
```

Expected: no errors.

- [ ] **Step 5.5: Commit**

```bash
cd D:/Repos/claude-skills-fv
git add templates/deep-interview.md skills/01-po-feature-spec/SKILL.md mcp-server/src/index.ts mcp-server/dist/
git commit -m "feat: add deep interview template, ambiguity scoring to PO skill, devkit_ambiguity_score MCP tool"
```

---

## Task 6: F5 — Pre-execution Gate

**Files:**
- Create: `hooks/scripts/pre-execution-gate.mjs`
- Modify: `skills/09-orchestrator/SKILL.md` (add Pre-execution Gate section)

- [ ] **Step 6.1: Create hooks/scripts/pre-execution-gate.mjs**

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';

// ── Concrete signal detection ─────────────────────────────────────────────────

const CONCRETE_SIGNALS = [
  // File paths
  /(?:[A-Za-z]:)?(?:\/|\\)[\w./\\-]+\.\w+/,
  /\bsrc\/\S+/,
  /\.(?:ts|tsx|js|jsx|py|go|rs|rb|java|cs|md)\b/,
  // Issue/PR numbers
  /#\d+/,
  /\bissue\s+\d+/i,
  /\bpr\s+\d+/i,
  // Symbols (camelCase, PascalCase, snake_case with underscore)
  /\b[a-z][a-zA-Z0-9]{3,}[A-Z][a-zA-Z0-9]+\b/, // camelCase
  /\b[A-Z][a-zA-Z0-9]{3,}\b/,                    // PascalCase
  /\b\w+_\w+_\w+\b/,                              // snake_case (3+ parts)
  // Numbered steps
  /^\s*(?:1\.|step\s+1)/im,
  /- \[ \]/,
  // Acceptance criteria
  /\b(?:DADO|QUANDO|ENTAO|GIVEN|WHEN|THEN)\b/i,
  // Error references
  /\b(?:TypeError|Error|Exception|ENOENT|undefined is not)/i,
  /at\s+\w[\w.<>]+\s*\(/,
  // Code blocks
  /```/,
  // Escape prefix
  /^(?:force:|!)/,
];

function hasConcreteSignal(text) {
  return CONCRETE_SIGNALS.some(p => p.test(text));
}

// ── Simple ambiguity scoring ──────────────────────────────────────────────────
// Lightweight version for hook — no MCP call. Uses heuristics only.

function scoreAmbiguity(text) {
  const lower = text.toLowerCase();

  // Goal: has action verb + subject + scope
  const hasVerb = /\b(?:add|create|fix|remove|update|refactor|implement|build|change|improve|migrate|make|do|implement|faz|cria|adiciona|remove|corrige|melhora|refatora)\b/i.test(text);
  const words = text.trim().split(/\s+/).length;
  const hasScope = /\b(?:in|on|for|when|at|na|no|em|para|quando)\s+\w+/i.test(text);
  const goalScore = (hasVerb ? 0.4 : 0) + (words > 4 ? 0.3 : 0) + (hasScope ? 0.3 : 0);

  // Constraints: explicit constraints mentioned
  const constraintScore = Math.min(1, (lower.match(/\b(?:max|min|must|cannot|without|no more|at least|sem|nao pode|precisa|obrigatorio)\b/g) || []).length * 0.35);

  // Criteria: verifiable outcomes
  const criteriaScore = Math.min(1, (lower.match(/\b(?:when|then|should|returns?|loads?|displays?|shows?|retorna|carrega|mostra|quando|entao)\b/g) || []).length * 0.25);

  const ambiguity = 1 - (goalScore * 0.40 + constraintScore * 0.30 + criteriaScore * 0.30);
  return Math.max(0, Math.min(1, ambiguity));
}

// ── Enrich from repo-audit ────────────────────────────────────────────────────

function readRepoAuditSnippet() {
  const paths = ['.bot/docs/repo-audit/current.md', 'docs/repo-audit/current.md'];
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        const content = readFileSync(p, 'utf-8');
        // Return first 500 chars as snippet
        return content.slice(0, 500);
      } catch {}
    }
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(_input); } catch {}
  const prompt = (input.prompt || '').trim();

  // 1. Bypass if concrete signal found
  if (hasConcreteSignal(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // 2. Score ambiguity
  const score = scoreAmbiguity(prompt);

  // 3. Route by threshold
  const cfg = { enrich_threshold: 0.40, block_threshold: 0.70 };
  try {
    const raw = JSON.parse(readFileSync('hooks/config.json', 'utf-8'));
    if (raw.pre_execution_gate) Object.assign(cfg, raw.pre_execution_gate);
  } catch {}

  if (score < cfg.enrich_threshold) {
    // Clear — pass through
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const auditSnippet = readRepoAuditSnippet();
  const auditHint = auditSnippet
    ? `\n\nContexto do projeto (repo-audit):\n${auditSnippet}`
    : '';

  if (score < cfg.block_threshold) {
    // ENRICH MODE — warn + inject context
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        additionalContext: `[PreExecutionGate] Prompt com ambiguidade media (score: ${score.toFixed(2)}). Antes de montar pipeline, inferir escopo do repo-audit e confirmar com o usuario usando 3 opcoes: "Bora assim? / Quer ajustar? / Ou era outra coisa?".${auditHint}`
      }
    }));
  } else {
    // GUIDED ENRICH — block + one focused question
    process.stdout.write(JSON.stringify({
      continue: false,
      hookSpecificOutput: {
        additionalContext: `[PreExecutionGate] Prompt vago (score: ${score.toFixed(2)}). Antes de agir, fazer UMA pergunta focada com opcoes multipla escolha para capturar a intencao. Usar o minimo de contexto disponivel (repo-audit, session) para inferir o resto. Oferecer sempre: "Bora assim? / Quer ajustar? / Ou era outra coisa?". Prefixo "force:" ou "!" bypassa este gate.${auditHint}`
      }
    }));
  }
});
```

- [ ] **Step 6.2: Add Pre-execution Gate section to skills/09-orchestrator/SKILL.md**

In `skills/09-orchestrator/SKILL.md`, insert in the "Protocolo de Execucao" section, before "Ao iniciar uma task:":

```markdown
## Pre-execution Gate

Antes de classificar e montar pipeline, avaliar se o prompt tem contexto suficiente.

**Sinais concretos que bypassam o gate** (qualquer um destes = contexto suficiente):
- file path (`src/lib/auth.ts`, `#423`, `.ts`, `.py` com diretorio)
- numero de issue/PR (`#123`, `issue 42`)
- simbolo de codigo (camelCase, PascalCase, snake_case longo)
- steps numerados ou checklists (`1.`, `2.`, `- [ ]`)
- acceptance criteria (DADO/QUANDO/ENTAO, GIVEN/WHEN/THEN)
- referencia a erro (stack trace, TypeError, ENOENT)
- bloco de codigo (triple backtick)
- prefixo de escape (`force:` ou `!`)

**Fluxo quando nao ha sinais concretos:**

1. calcular ambiguity score (goal × 0.40 + constraints × 0.30 + criteria × 0.30)
2. `score < 0.4` → prosseguir normalmente
3. `score 0.4-0.7` → ENRICH: inferir escopo do repo-audit, confirmar com 3 opcoes
4. `score > 0.7` → GUIDED ENRICH: fazer 1 pergunta com multipla escolha, inferir o resto

**Principio:** Captura minima, enriquecimento maximo. Nunca devolver "escreva mais" — o sistema infere e confirma.

Em Claude Code, o hook `pre-execution-gate.mjs` faz isso automaticamente. Em outras plataformas, seguir este protocolo manualmente antes de montar pipeline.
```

- [ ] **Step 6.3: Commit**

```bash
cd D:/Repos/claude-skills-fv
git add hooks/scripts/pre-execution-gate.mjs skills/09-orchestrator/SKILL.md
git commit -m "feat: add pre-execution gate hook (capture & enrich) + orchestrator protocol section"
```

---

## Task 7: F7 — Learned Skills

**Files:**
- Create: `hooks/scripts/post-tool-verifier.mjs`
- Modify: `mcp-server/src/index.ts` (add `devkit_learned_skills`)
- Modify: `setup/install.sh` (add hooks copy + learned-skills mkdir + settings.json hooks merge)

- [ ] **Step 7.1: Create hooks/scripts/post-tool-verifier.mjs**

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

// ── Debugging pattern detection ───────────────────────────────────────────────

function detectDebuggingPattern(input) {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};
  const toolResponse = input.tool_response || {};

  // Patterns indicating non-trivial debugging
  const responseText = JSON.stringify(toolResponse);
  const inputText = JSON.stringify(toolInput);

  const hasDebuggingComment = /o problema era|a causa era|descobri que|the issue was|root cause|found that/i.test(responseText + inputText);
  const isWriteTool = ['Edit', 'Write'].includes(toolName);

  return { hasDebuggingComment, isWriteTool, toolName };
}

// ── Session edit tracker ──────────────────────────────────────────────────────

function getEditHistory() {
  try {
    return JSON.parse(readFileSync('.bot/.edit-history.json', 'utf-8'));
  } catch {
    return {};
  }
}

function saveEditHistory(history) {
  try {
    mkdirSync('.bot', { recursive: true });
    writeFileSync('.bot/.edit-history.json', JSON.stringify(history));
  } catch {}
}

// ── Quality gate check ────────────────────────────────────────────────────────

function passesQualityGate(editHistory) {
  // Check: required real debugging effort (3+ edits to same file OR edits across 3+ files)
  const files = Object.keys(editHistory);
  const multipleEditsToOneFile = files.some(f => editHistory[f] >= 3);
  const manyFilesEdited = files.length >= 3;
  return multipleEditsToOneFile || manyFilesEdited;
}

// ── Main ──────────────────────────────────────────────────────────────────────

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(_input); } catch {}

  const { hasDebuggingComment, isWriteTool, toolName } = detectDebuggingPattern(input);

  // Track edit history per file
  if (isWriteTool && input.tool_input?.file_path) {
    const history = getEditHistory();
    const filePath = input.tool_input.file_path;
    history[filePath] = (history[filePath] || 0) + 1;
    saveEditHistory(history);
  }

  // Check if we should prompt for learned skill extraction
  if (hasDebuggingComment && isWriteTool) {
    const history = getEditHistory();
    if (passesQualityGate(history)) {
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          additionalContext: `[LearnedSkills] Debugging pattern detected. If this solution is: (1) not Googleable, (2) specific to this codebase, and (3) required real debugging effort — save it as a learned skill in .bot/learned-skills/ using the format in the kit. Use devkit_learned_skills MCP tool or create the .md file directly.`
        }
      }));
      process.exit(0);
    }
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
```

- [ ] **Step 7.2: Add devkit_learned_skills to mcp-server/src/index.ts**

Insert before `// START SERVER`:

```typescript
server.registerTool(
  "devkit_learned_skills",
  {
    title: "Learned Skills",
    description: "List, get, or save project-specific learned skills from .bot/learned-skills/",
    inputSchema: {
      action: z.enum(["list", "get", "save"]).describe("Action to perform"),
      name: z.string().optional().describe("Skill name (required for get/save)"),
      content: z.string().optional().describe("Full markdown content for save action"),
      project_path: z.string().optional().describe("Consumer project root path"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  async ({ action, name, content, project_path }) => {
    const base = project_path || process.cwd();
    const learnedDir = path.join(base, ".bot", "learned-skills");

    if (action === "list") {
      try {
        await fs.promises.mkdir(learnedDir, { recursive: true });
        const files = await fs.promises.readdir(learnedDir);
        const skills = await Promise.all(
          files.filter(f => f.endsWith(".md")).map(async (file) => {
            const raw = await fs.promises.readFile(path.join(learnedDir, file), "utf-8");
            const nameMatch = raw.match(/^name:\s*(.+)$/m);
            const descMatch = raw.match(/^description:\s*(.+)$/m);
            const triggersMatch = raw.match(/^triggers:\s*\[([^\]]+)\]/m);
            const typeMatch = raw.match(/^type:\s*(.+)$/m);
            return {
              file,
              name: nameMatch?.[1]?.trim() || file.replace(".md", ""),
              description: descMatch?.[1]?.trim() || "",
              triggers: triggersMatch?.[1]?.split(",").map((t: string) => t.replace(/['"]/g, "").trim()) || [],
              type: typeMatch?.[1]?.trim() || "expertise",
            };
          })
        );
        return { content: [{ type: "text" as const, text: JSON.stringify({ skills, directory: learnedDir }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ skills: [], directory: learnedDir, error: String(err) }, null, 2) }] };
      }
    }

    if (action === "get" && name) {
      const filePath = path.join(learnedDir, `${name}.md`);
      try {
        const raw = await fs.promises.readFile(filePath, "utf-8");
        return { content: [{ type: "text" as const, text: JSON.stringify({ name, content: raw, path: filePath }, null, 2) }] };
      } catch {
        return { content: [{ type: "text" as const, text: JSON.stringify({ name, content: null, path: filePath, exists: false }, null, 2) }] };
      }
    }

    if (action === "save" && name && content) {
      await fs.promises.mkdir(learnedDir, { recursive: true });
      const filePath = path.join(learnedDir, `${name}.md`);
      await fs.promises.writeFile(filePath, content, "utf-8");
      return { content: [{ type: "text" as const, text: JSON.stringify({ saved: true, path: filePath }, null, 2) }] };
    }

    return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Invalid action or missing required parameters" }, null, 2) }] };
  },
);
```

- [ ] **Step 7.3: Add hooks install step to setup/install.sh**

In `setup/install.sh`, after the MCP server build block (after line ~141), add:

```bash
# ---------------------------------------------------------------------------
# Step 2b: Install hooks + create learned-skills/
# ---------------------------------------------------------------------------
step "Step 2b/7: Installing hooks"

# Copy hooks to .bot/hooks/
if [[ -d "$SCRIPT_DIR/hooks" ]]; then
  safe_copy_dir "$SCRIPT_DIR/hooks" "$BOT_DIR/hooks"
  ok "Copied hooks/ to .bot/hooks/"
fi

# Create learned-skills/ directory (empty — project-specific)
mkdir -p "$BOT_DIR/learned-skills"
ok "Created .bot/learned-skills/ (project-specific skill memory)"

# Register hooks in .claude/settings.json
CLAUDE_CFG="$TARGET_DIR/.claude/settings.json"
if [[ -f "$BOT_DIR/hooks/hooks.json" ]] && [[ -f "$CLAUDE_CFG" ]]; then
  info "Registering hooks in .claude/settings.json..."
  node -e "
    const fs = require('fs');
    const hooksReg = JSON.parse(fs.readFileSync('$BOT_DIR/hooks/hooks.json', 'utf8'));
    const settings = JSON.parse(fs.readFileSync('$CLAUDE_CFG', 'utf8'));
    const hooks = settings.hooks || {};
    for (const [event, scripts] of Object.entries(hooksReg)) {
      hooks[event] = hooks[event] || [];
      for (const script of scripts) {
        const cmd = { type: 'command', command: 'node .bot/' + script };
        const exists = hooks[event].some(h => h.command === cmd.command);
        if (!exists) hooks[event].push(cmd);
      }
    }
    settings.hooks = hooks;
    fs.writeFileSync('$CLAUDE_CFG', JSON.stringify(settings, null, 2) + '\n');
  " && ok "Hooks registered in .claude/settings.json" || warn "Failed to register hooks — add manually from hooks/hooks.json"
elif [[ -f "$BOT_DIR/hooks/hooks.json" ]]; then
  warn ".claude/settings.json not found — hooks not auto-registered. Add from .bot/hooks/hooks.json manually."
fi
```

- [ ] **Step 7.4: Build MCP server**

```bash
cd D:/Repos/claude-skills-fv/mcp-server && npm run build
```

Expected: no errors.

- [ ] **Step 7.5: Commit**

```bash
cd D:/Repos/claude-skills-fv
git add hooks/scripts/post-tool-verifier.mjs mcp-server/src/index.ts mcp-server/dist/ setup/install.sh
git commit -m "feat: add learned skills — post-tool-verifier hook, devkit_learned_skills MCP tool, install.sh hooks registration"
```

---

## Task 8: Policies, README, and Final Commit

**Files:**
- Create: `policies/hooks.md`
- Modify: `README.md` (add Hooks section, update MCP tool count)

- [ ] **Step 8.1: Create policies/hooks.md**

```markdown
# Hooks Policy

## Objetivo
Definir regras de comportamento nos lifecycle events do agente. Para Claude Code: implementadas como hooks nativos em `hooks/scripts/`. Para outras plataformas (Copilot, Windsurf, Gemini CLI): seguir estas regras como instrucoes de comportamento.

## Context Guard

Antes de encerrar qualquer sessao:
- Se contexto estiver > 75% (muitas mensagens, arquivos grandes lidos, respostas longas): executar `/compact` antes de parar
- Se contexto estiver > 90%: compactar imediatamente, nao esperar pedido
- Nao parar no meio de pipeline ativo sem compactar e registrar estado

Em Claude Code: `context-guard-stop.mjs` faz isso automaticamente.

## Pre-execution Gate

Antes de montar pipeline para task nova, verificar se o prompt tem sinais concretos:
- file path, issue number, simbolo de codigo, steps numerados, acceptance criteria, stack trace, codigo
- Prefixo `force:` ou `!` bypassa o gate

Se nao ha sinais concretos:
- score < 0.4: prosseguir normalmente
- score 0.4-0.7: ENRICH — inferir escopo do repo-audit e confirmar com 3 opcoes
- score > 0.7: GUIDED ENRICH — fazer uma pergunta com multipla escolha, inferir o resto

Principio: nunca devolver "escreva mais". Inferir e confirmar.

Em Claude Code: `pre-execution-gate.mjs` faz isso automaticamente.

## Keyword Sanitization

Antes de acionar skill por trigger keyword:
- Ignorar keywords dentro de code blocks, inline code, URLs, file paths, stack traces
- Verificar se o contexto ao redor (80 chars) indica pergunta informacional ("o que e", "como funciona")
- Se for pergunta sobre a skill: responder — nao executar a skill
- Acionar skill apenas quando intencao e claramente de acao

Em Claude Code: `keyword-detector.mjs` faz isso automaticamente.

## Learned Skills

Ao resolver problema nao-trivial durante debugging:
- Avaliar 3 criterios: (1) nao e Googleavel, (2) especifico deste codebase, (3) exigiu debugging real (3+ tentativas ou 3+ arquivos)
- Se os 3 passam: salvar em `.bot/learned-skills/` com formato:
  ```
  ---
  name: [slug-do-insight]
  description: [uma linha sobre o problema]
  triggers: ["keyword1", "keyword2"]
  learned_at: [YYYY-MM-DD]
  type: expertise | workflow
  ---
  ## Insight
  ## Solucao
  ## Arquivos afetados
  ```
- Em sessoes futuras: ao detectar trigger de learned skill, injetar como contexto antes de agir
- Max 3 learned skills injetadas por sessao

Em Claude Code: `post-tool-verifier.mjs` detecta padroes e sugere extracao automaticamente.

## Persistent Mode

Quando pipeline esta ativo, nao parar ate concluir a etapa atual:
- Verificar se `.bot/docs/context/pipeline-active.json` existe e `active: true`
- Se sim: completar o stage atual antes de parar
- Para forcar parada: deletar `.bot/docs/context/pipeline-active.json`

Em Claude Code: `persistent-mode.mjs` bloqueia o stop automaticamente.

## Pre-tool Enforcer

Antes de editar arquivo em sessao longa (10+ mensagens):
- Re-ler o arquivo alvo antes de editar (Context Decay Awareness do GLOBAL.md)
- Validar que o conteudo lido ainda e o atual

Em Claude Code: `pre-tool-enforcer.mjs` injeta este lembrete automaticamente.
```

- [ ] **Step 8.2: Update README.md — add Hooks section after MCP Server section**

In `README.md`, after the MCP Server section (around line 54), add:

```markdown
## Hook System — Lifecycle Intelligence (Claude Code)

O kit inclui hooks nativos para Claude Code que interceptam lifecycle events e injetam inteligencia automaticamente. Em outras plataformas (Copilot, Windsurf, Gemini CLI), as mesmas regras estao em `policies/hooks.md`.

| Hook | Evento | O que faz |
|------|--------|-----------|
| `pre-execution-gate` | UserPromptSubmit | Detecta prompt vago, infere contexto e confirma antes de agir |
| `keyword-detector` | UserPromptSubmit | Sanitiza input e injeta skill ou learned skill relevante |
| `context-guard-stop` | Stop | Bloqueia stop quando contexto > 75%, sugere /compact |
| `persistent-mode` | Stop | Bloqueia stop quando pipeline esta ativo |
| `pre-tool-enforcer` | PreToolUse | Lembra de re-ler arquivo antes de editar em sessao longa |
| `session-start` | SessionStart | Restaura estado da sessao anterior |
| `post-tool-verifier` | PostToolUse | Detecta debugging patterns e sugere extracao de learned skill |

**Como os hooks sao instalados:**
O `install.sh` copia `hooks/` para `.bot/hooks/` e registra automaticamente no `.claude/settings.json`.

**Learned Skills:** `.bot/learned-skills/` acumula conhecimento especifico do projeto — insights nao-Googleaveis descobertos durante debugging. Injetados automaticamente em sessoes futuras via keyword matching.
```

- [ ] **Step 8.3: Update MCP tool count in README.md**

Find `25 tools` in README.md and update to `29 tools` (added 4: context_guard, ambiguity_score, suggest_trailers, learned_skills).

Also update the MCP table to reflect Persistence count is now 7+4=11... wait, no. Let me recount:
- Knowledge: 12 tools (unchanged)
- Execution: 6 tools (unchanged)
- Persistence: 7 existing + context_guard + learned_skills = 9
- New Knowledge tools: ambiguity_score + suggest_trailers = 2

So Knowledge becomes 14, Execution stays 6, Persistence becomes 9. Total: 29.

Update the table in README.md:

```markdown
| Bloco | Tools | Exemplos |
|-------|-------|----------|
| **Knowledge** | 14 | Classifica task, monta pipeline, scoring de ambiguidade, trailers de commit |
| **Execution** | 6 | Busca concorrentes (Brave), scraping (Firecrawl/Playwright), gera imagens (fal.ai) |
| **Persistence** | 9 | Salva/recupera artefatos e contexto, rastreia custo, consolida sessao, learned skills |
```

And update the badge at top: `![Skills](https://img.shields.io/badge/mcp--tools-29-1d4ed8)`

- [ ] **Step 8.4: Final MCP build**

```bash
cd D:/Repos/claude-skills-fv/mcp-server && npm run build
```

Expected: no errors.

- [ ] **Step 8.5: Final commit and push**

```bash
cd D:/Repos/claude-skills-fv
git add policies/hooks.md README.md mcp-server/dist/
git commit -m "feat: add hooks policy (platform-agnostic fallback) and update README with hook system + 29 MCP tools"
git push
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|------------------|------|
| hooks.json + config.json | Task 1 |
| session-start.mjs | Task 1 |
| pre-tool-enforcer.mjs | Task 1 |
| persistent-mode.mjs | Task 1 |
| keyword-detector.mjs with sanitization | Task 2 |
| context-guard-stop.mjs | Task 3 |
| devkit_context_guard MCP tool | Task 3 |
| GLOBAL.md Context Guard reference | Task 3 |
| templates/commit-trailers.md | Task 4 |
| skills/11-reviewer — Commit Trailers section | Task 4 |
| policies/quality-gates.md — trailer rule | Task 4 |
| devkit_suggest_trailers MCP tool | Task 4 |
| templates/deep-interview.md | Task 5 |
| skills/01-po — Ambiguity Scoring + Deep Interview | Task 5 |
| devkit_ambiguity_score MCP tool | Task 5 |
| pre-execution-gate.mjs (Capture & Enrich) | Task 6 |
| skills/09-orchestrator — Pre-execution Gate section | Task 6 |
| post-tool-verifier.mjs | Task 7 |
| devkit_learned_skills MCP tool | Task 7 |
| install.sh hooks copy + learned-skills mkdir | Task 7 |
| policies/hooks.md (platform-agnostic fallback) | Task 8 |
| README.md Hooks section + MCP count | Task 8 |

All 22 spec requirements are covered. No gaps.

**Type consistency:** All MCP tools use `z.string()`, `z.number()`, `z.boolean()`, `z.array(z.string())`, `z.enum()` consistent with existing tools. Hook scripts all use same stdin/stdout JSON protocol.

**No placeholders found.**
