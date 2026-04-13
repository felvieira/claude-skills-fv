# Agent Intelligence v3 — Developer Experience & Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 features that improve developer UX (slash commands, bootstrap, discovery), enrich review skills (personas), formalize context management, and add CI validation.

**Architecture:** 9 slash commands in `.claude/commands/` map development phases to skills. A meta-skill discovery file provides a decision tree for task routing. Session bootstrap injects the discovery map at session start. 3 agent personas with structured output templates enrich review subagents. A context engineering policy formalizes hierarchy and trust levels. A GitHub Actions workflow validates plugin integrity.

**Tech Stack:** Markdown (commands, personas, policies, guides), Node.js ESM (session-start.mjs), YAML (GitHub Actions)

---

## File Structure

### New Files (18)

| File | Responsibility |
|---|---|
| `.claude/commands/spec.md` | Slash command: specify feature |
| `.claude/commands/plan.md` | Slash command: classify and plan pipeline |
| `.claude/commands/build.md` | Slash command: implement with stack |
| `.claude/commands/test.md` | Slash command: write and run tests |
| `.claude/commands/review.md` | Slash command: final review + security |
| `.claude/commands/simplify.md` | Slash command: simplify and refactor |
| `.claude/commands/ship.md` | Slash command: release and deploy |
| `.claude/commands/pipeline.md` | Slash command: end-to-end pipeline |
| `.claude/commands/best.md` | Slash command: best practices audit |
| `docs/skill-guides/skill-discovery.md` | Meta-skill: decision tree + behaviors + failure modes |
| `personas/code-reviewer.md` | Persona: 5 review axes + severity labels + output template |
| `personas/security-auditor.md` | Persona: 5 audit scopes + PoC requirement + output template |
| `personas/test-engineer.md` | Persona: 5 scenario types + coverage template |
| `policies/context-engineering.md` | Policy: 5-level hierarchy + 3 trust levels |
| `docs/skill-guides/context-engineering.md` | Guide: examples + packing strategies + inline planning |
| `.github/workflows/validate-plugin.yml` | CI: JSON validation + script syntax check |

### Modified Files (5)

| File | Change |
|---|---|
| `hooks/scripts/session-start.mjs` | Add meta-skill injection via config |
| `hooks/config.json` | Add `session_bootstrap` section |
| `skills/11-reviewer/SKILL.md` | Add persona reference line |
| `skills/06-security-review/SKILL.md` | Add persona reference line |
| `skills/05-qa-testing/SKILL.md` | Add persona reference line |
| `README.md` | Add commands section, personas, governance, guides, CI, timestamp |

---

### Task 1: Slash Commands (9 files)

**Files:**
- Create: `.claude/commands/spec.md`
- Create: `.claude/commands/plan.md`
- Create: `.claude/commands/build.md`
- Create: `.claude/commands/test.md`
- Create: `.claude/commands/review.md`
- Create: `.claude/commands/simplify.md`
- Create: `.claude/commands/ship.md`
- Create: `.claude/commands/pipeline.md`
- Create: `.claude/commands/best.md`

- [ ] **Step 1: Create `.claude/commands/` directory and `spec.md`**

```markdown
---
description: Especificar feature com critérios de aceitação (skill 01 — PO)
---

# /spec — Especificação de Feature

**Objetivo:** Transformar uma ideia ou requisito em especificação formal com critérios de aceitação claros.

**Skill ativada:** 01 — PO (Feature Spec)

**Input esperado:** Descrição da feature, contexto de negócio, público-alvo.

**Output esperado:** Spec com user stories, critérios de aceitação numerados, prioridade e riscos.

**Policies relevantes:**
- `policies/execution.md` — escopo e qualidade
- `policies/confusion-management.md` — STOP-NAME-OPTIONS-WAIT se requisito ambíguo

**Uso:** `/spec [descrição da feature ou contexto]`
```

- [ ] **Step 2: Create `plan.md`**

```markdown
---
description: Classificar task e montar pipeline mínimo suficiente (skill 09 — Orchestrator)
---

# /plan — Planejamento de Pipeline

**Objetivo:** Analisar a task, classificar tipo (feature, bugfix, refactor, etc.) e montar o pipeline mínimo suficiente.

**Skill ativada:** 09 — Orchestrator

**Input esperado:** Descrição da task ou spec já criada.

**Output esperado:** Pipeline ordenado com skills necessárias, modelo sugerido por etapa, e critérios de done.

**Policies relevantes:**
- `policies/model-routing.md` — tier certo por etapa
- `policies/search-first.md` — pesquisa antes de planejar
- `policies/source-driven.md` — decisões baseadas em fontes

**Uso:** `/plan [descrição da task ou referência à spec]`
```

- [ ] **Step 3: Create `build.md`**

```markdown
---
description: Implementar com stack do projeto (skills 03/04 — Backend/Frontend)
---

# /build — Implementação

**Objetivo:** Implementar a feature ou fix usando backend e/ou frontend conforme a stack do projeto.

**Skills ativadas:**
- 03 — Backend Engineer (APIs, contratos, auth, banco)
- 04 — Frontend Engineer (React/Next.js, estado, UI)

**Input esperado:** Spec ou plan com requisitos claros, arquivos-alvo identificados.

**Output esperado:** Código implementado, testável, seguindo patterns do projeto.

**Policies relevantes:**
- `policies/search-first.md` — pesquisar codebase antes de implementar
- `policies/anti-rationalization.md` — não racionalizar atalhos
- `policies/stack-flexibility.md` — respeitar stack existente

**Uso:** `/build [descrição do que implementar ou referência ao plan]`
```

- [ ] **Step 4: Create `test.md`**

```markdown
---
description: Escrever e rodar testes (skill 05 — QA Engineer)
---

# /test — Testes

**Objetivo:** Escrever testes unitários, integração e/ou E2E e validar que o código funciona.

**Skill ativada:** 05 — QA Engineer

**Input esperado:** Código implementado, critérios de aceitação, fluxos críticos.

**Output esperado:** Testes passando, cobertura de cenários (happy path, erro, edge case), gaps documentados.

**Policies relevantes:**
- `policies/quality-gates.md` — cobertura mínima
- `policies/anti-rationalization.md` — não pular testes "triviais"

**Uso:** `/test [descrição do que testar ou referência aos arquivos]`
```

- [ ] **Step 5: Create `review.md`**

```markdown
---
description: Review final + security audit (skills 11 + 06 — Reviewer + Security)
---

# /review — Review Final

**Objetivo:** Validação completa antes de deploy — qualidade de código, segurança, documentação e pipeline.

**Skills ativadas:**
- 11 — Reviewer (gate final de qualidade)
- 06 — Security Reviewer (OWASP, headers, auth, DRY)

**Input esperado:** Código implementado e testado, evidências de QA.

**Output esperado:** Relatório de aprovação ou rejeição com findings priorizados e skills responsáveis.

**Policies relevantes:**
- `policies/quality-gates.md` — critérios de aprovação
- `policies/handoffs.md` — formato de entrega entre skills

**Uso:** `/review [escopo do review ou referência ao PR/branch]`
```

- [ ] **Step 6: Create `simplify.md`**

```markdown
---
description: Simplificar e refatorar código (skill 23 — Migration & Refactor)
---

# /simplify — Simplificação e Refatoração

**Objetivo:** Reduzir complexidade, eliminar duplicação, melhorar legibilidade sem mudar comportamento.

**Skill ativada:** 23 — Migration & Refactor Specialist

**Input esperado:** Arquivo(s) ou módulo(s) alvo, motivo da simplificação.

**Output esperado:** Código refatorado, mais limpo e DRY, com testes garantindo que comportamento não mudou.

**Policies relevantes:**
- `policies/search-first.md` — entender dependências antes de refatorar
- `policies/anti-rationalization.md` — não simplificar demais nem de menos

**Uso:** `/simplify [arquivo ou módulo a simplificar]`
```

- [ ] **Step 7: Create `ship.md`**

```markdown
---
description: Release e deploy (skills 24 + 07 — Release Manager + Deploy)
---

# /ship — Release e Deploy

**Objetivo:** Preparar release (changelog, versão, notas) e executar deploy.

**Skills ativadas:**
- 24 — Release Manager (changelog, versão, release notes, rollout)
- 07 — Deploy Engineer (CI/CD, containers, rollback)

**Input esperado:** Código aprovado pelo Reviewer, evidências de QA e Security.

**Output esperado:** Release criada, deploy executado, rollback plan documentado.

**Policies relevantes:**
- `policies/quality-gates.md` — zero findings críticos
- `policies/handoffs.md` — checklist de entrega

**Uso:** `/ship [versão ou escopo do release]`
```

- [ ] **Step 8: Create `pipeline.md`**

```markdown
---
description: Pipeline completo end-to-end (skill 09 — Orchestrator)
---

# /pipeline — Pipeline Completo

**Objetivo:** Executar o ciclo completo de desenvolvimento: spec → plan → build → test → review → ship.

**Skill ativada:** 09 — Orchestrator (coordena todas as etapas)

**Fluxo:**
1. `/spec` — especificar com critérios de aceitação
2. `/plan` — classificar e montar pipeline
3. `/build` — implementar backend e/ou frontend
4. `/test` — escrever e rodar testes
5. `/review` — review final + security
6. `/ship` — release e deploy

**Input esperado:** Descrição completa da feature ou requisito.

**Output esperado:** Feature entregue end-to-end com evidências de cada etapa.

**Policies relevantes:**
- Todas as policies do kit são aplicáveis conforme a etapa
- `policies/model-routing.md` — modelo certo por fase

**Uso:** `/pipeline [descrição da feature]`
```

- [ ] **Step 9: Create `best.md`**

```markdown
---
description: Auditoria de boas práticas, arquitetura, clean code e DRY (skills 11 + 06 + 05)
---

# /best — Auditoria de Boas Práticas

**Objetivo:** Verificar se o sistema segue boas práticas de arquitetura, clean code, DRY, SOLID e segurança.

**Skills ativadas:**
- 11 — Reviewer (qualidade, DRY, SOLID, clean code)
- 06 — Security Reviewer (segurança, headers, OWASP)
- 05 — QA Engineer (cobertura de testes, gaps)

**Eixos de avaliação:**
1. **Arquitetura** — separação de responsabilidades, escalabilidade, patterns consistentes
2. **Clean Code** — nomes descritivos, funções focadas, sem magic numbers, imports organizados
3. **DRY** — zero duplicação, abstrações reutilizáveis, schemas compartilhados
4. **SOLID** — cada módulo com responsabilidade única, extensível, interfaces enxutas
5. **Segurança** — OWASP Top 10, headers, auth, secrets, dependências

**Input esperado:** Escopo (arquivo, módulo, feature ou repo inteiro).

**Output esperado:** Relatório com findings priorizados (🔴 Critical / 🟡 Important / 🔵 Suggestion) e ações recomendadas.

**Policies relevantes:**
- `policies/quality-gates.md`
- `policies/anti-rationalization.md`
- `policies/search-first.md`

**Uso:** `/best [escopo — arquivo, módulo ou "repo inteiro"]`
```

- [ ] **Step 10: Commit**

```bash
git add .claude/commands/spec.md .claude/commands/plan.md .claude/commands/build.md .claude/commands/test.md .claude/commands/review.md .claude/commands/simplify.md .claude/commands/ship.md .claude/commands/pipeline.md .claude/commands/best.md
git commit -m "feat: add 9 slash commands mapping dev phases to skills"
```

---

### Task 2: Meta-Skill de Descoberta

**Files:**
- Create: `docs/skill-guides/skill-discovery.md`

- [ ] **Step 1: Create `docs/skill-guides/skill-discovery.md`**

```markdown
# Skill Discovery — Meta-Skill de Navegação

Este guia é o mapa mental do kit. Quando não souber qual skill usar, comece aqui.

## Decision Tree — Tipo de Task → Skill(s) Sugerida(s)

| Tipo de Task | Caminho Recomendado |
|---|---|
| **Nova feature completa** | `/spec` → `/plan` → `/build` → `/test` → `/review` → `/ship` |
| **Bug / fix** | QA (05) → skill afetada (03/04) → Security (06) → Reviewer (11) |
| **Refactor / simplify** | `/simplify` → QA (05) → Reviewer (11) |
| **Review / deploy** | `/review` → `/ship` |
| **Dúvida / exploração** | Context Manager (08) → Repo Auditor (18) |
| **Melhoria de UI** | Design Intelligence (29) → UI/UX (02) → Frontend (04) → QA (05) |
| **Integração de IA** | AI Integration Architect (25) → Prompt Engineer (26) → Backend (03) |
| **Documentação** | Documenter (10) → Reviewer (11) |
| **Auditoria de boas práticas** | `/best` (Reviewer 11 + Security 06 + QA 05) |
| **Landing page** | Copy (13) → Design Intelligence (29) → UI/UX (02) → Frontend (04) → SEO (14) |
| **Release formal** | Reviewer (11) → Observability (20) → Release Manager (24) → Deploy (07) |

## Slash Commands — Atalhos Rápidos

| Command | O que faz |
|---|---|
| `/spec` | Especificar feature com critérios de aceitação |
| `/plan` | Classificar task e montar pipeline |
| `/build` | Implementar com stack do projeto |
| `/test` | Escrever e rodar testes |
| `/review` | Review final + security audit |
| `/simplify` | Simplificar e refatorar código |
| `/ship` | Release e deploy |
| `/pipeline` | Pipeline completo end-to-end |
| `/best` | Auditoria de boas práticas, arquitetura, clean code e DRY |

## 6 Core Operating Behaviors

Regras universais que todo agente usando este kit deve seguir:

1. **Surface Assumptions** — explicitar suposições antes de agir. Nunca assumir silenciosamente.
2. **Manage Confusion** — ao detectar confusão, usar `policies/confusion-management.md` (STOP-NAME-OPTIONS-WAIT). Não adivinhar.
3. **Push Back When Warranted** — questionar instruções que contradizem policies ativas. O agente não é um executor cego.
4. **Enforce Simplicity** — YAGNI, DRY, mínimo suficiente. Complexidade precisa de justificativa explícita.
5. **Maintain Scope Discipline** — não expandir scope sem confirmação explícita do usuário. Um fix não vira refactor.
6. **Verify Don't Assume** — checar antes de afirmar. Usar `policies/search-first.md` antes de implementar.

## 10 Failure Modes to Avoid

Erros comuns que degradam a qualidade das entregas:

1. **Gerar código sem pesquisar o codebase primeiro** — sempre usar search-first antes de implementar
2. **Ignorar policies ativas** — policies existem por razão, não são opcionais
3. **Adivinhar em vez de perguntar** — usar STOP-NAME-OPTIONS-WAIT quando confuso
4. **Expandir scope sem confirmação** — scope creep é o maior inimigo de entregas rápidas
5. **Pular QA ou Security no pipeline** — nenhuma entrega sai sem validação
6. **Não citar fontes para decisões de framework** — usar `policies/source-driven.md`
7. **Repetir reads desnecessários** — reutilizar working set, repo-audit, current-focus
8. **Aceitar "parece certo" como evidência** — verificar com testes, logs ou ferramentas
9. **Não declarar plano antes de executar multi-step** — emitir plano inline antes de agir
10. **Ignorar sinais de context decay** — após 10+ mensagens, re-read antes de editar

## Integração com Outras Policies

- `policies/search-first.md` — pesquisa obrigatória antes de implementar
- `policies/iterative-retrieval.md` — retrieval progressivo para subagents
- `policies/anti-rationalization.md` — tabelas de racionalizações por skill
- `policies/source-driven.md` — hierarquia de fontes para decisões
- `policies/confusion-management.md` — protocolo STOP-NAME-OPTIONS-WAIT
- `policies/model-routing.md` — modelo certo por fase
- `policies/cost-optimization.md` — economia de tokens
```

- [ ] **Step 2: Commit**

```bash
git add docs/skill-guides/skill-discovery.md
git commit -m "feat: add skill discovery meta-skill with decision tree and operating behaviors"
```

---

### Task 3: SessionStart Bootstrap

**Files:**
- Modify: `hooks/scripts/session-start.mjs`
- Modify: `hooks/config.json` (add `session_bootstrap` section)

- [ ] **Step 1: Add `session_bootstrap` section to `hooks/config.json`**

Add after the `simplify_ignore` section at the end of the JSON:

```json
"session_bootstrap": {
  "inject_meta_skill": true,
  "meta_skill_path": "docs/skill-guides/skill-discovery.md"
}
```

The full config.json should have this new key as a sibling of `simplify_ignore`.

- [ ] **Step 2: Modify `hooks/scripts/session-start.mjs` to inject meta-skill**

Replace the entire file with:

```javascript
#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { isHookDisabled, readHookConfig, resolveBotPath } from './utils.mjs';

const BOOTSTRAP_DEFAULTS = {
  inject_meta_skill: true,
  meta_skill_path: 'docs/skill-guides/skill-discovery.md',
};
const MAX_META_SKILL_CHARS = 2000;

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  if (isHookDisabled('session-start')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const parts = [];

  // --- Current focus ---
  if (existsSync('.bot/docs/context/current-focus.md')) {
    try {
      const focus = readFileSync('.bot/docs/context/current-focus.md', 'utf-8');
      const firstLine = focus.split('\n').find(l => l.trim() && !l.startsWith('#')) || '';
      if (firstLine) parts.push(`Last focus: "${firstLine.trim()}"`);
    } catch {}
  }

  // --- Meta-skill bootstrap ---
  const config = readHookConfig('session_bootstrap', BOOTSTRAP_DEFAULTS);
  if (config.inject_meta_skill && config.meta_skill_path) {
    const candidates = [
      resolveBotPath(config.meta_skill_path),
      config.meta_skill_path,
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        try {
          let content = readFileSync(candidate, 'utf-8');
          if (content.length > MAX_META_SKILL_CHARS) {
            content = content.slice(0, MAX_META_SKILL_CHARS) + '\n[...truncated]';
          }
          parts.push(`[Skill Discovery]\n${content}`);
        } catch {}
        break;
      }
    }
  }

  const additionalContext = parts.length > 0
    ? `[DevTeamKit] Session started. ${parts.join('\n\n')} Read .bot/docs/context/current-focus.md for session state. Kit rules: .bot/GLOBAL.md.`
    : '[DevTeamKit] Session started. Read .bot/docs/context/current-focus.md for session state. Kit rules: .bot/GLOBAL.md.';

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { additionalContext },
  }));
});
```

Key changes:
- Imports `readHookConfig` and `resolveBotPath` from utils.mjs
- Reads `session_bootstrap` config with defaults
- Resolves meta-skill path from both `.bot/` prefix and direct path
- Truncates to 2000 chars to avoid context overflow
- Composes output from parts array

- [ ] **Step 3: Verify syntax**

Run: `node --check hooks/scripts/session-start.mjs`
Expected: No output (clean syntax)

- [ ] **Step 4: Commit**

```bash
git add hooks/scripts/session-start.mjs hooks/config.json
git commit -m "feat: session-start bootstrap injects skill discovery meta-skill on session start"
```

---

### Task 4: Agent Personas

**Files:**
- Create: `personas/code-reviewer.md`
- Create: `personas/security-auditor.md`
- Create: `personas/test-engineer.md`
- Modify: `skills/11-reviewer/SKILL.md` (add persona reference)
- Modify: `skills/06-security-review/SKILL.md` (add persona reference)
- Modify: `skills/05-qa-testing/SKILL.md` (add persona reference)

- [ ] **Step 1: Create `personas/code-reviewer.md`**

```markdown
# Code Reviewer — Agent Persona

## Identidade

Você é um code reviewer senior e meticuloso. Seu papel é encontrar problemas antes que cheguem a produção. Você não implementa — você valida, questiona e exige evidências.

## 5 Eixos de Review

### 1. Correctness
O código faz o que deveria? Lógica correta, edge cases tratados, contratos respeitados.

### 2. Design
Arquitetura limpa, responsabilidades claras, DRY, SOLID, sem god classes ou funções que fazem tudo.

### 3. Readability
Nomes claros, funções focadas, comentários apenas quando explicam contexto não óbvio, imports organizados.

### 4. Performance
Sem N+1, sem re-renders desnecessários, bundle size controlado, lazy loading onde faz sentido.

### 5. Security
Inputs validados, auth correta, secrets protegidos, headers configurados.

## Severity Labels

- 🔴 **Critical** — bloqueia merge. Risco real de bug em produção, perda de dados ou vulnerabilidade.
- 🟡 **Important** — deve corrigir antes de merge, mas não bloqueia sozinho se houver justificativa.
- 🔵 **Suggestion** — melhoria opcional. Bom ter, mas não obrigatório.

## Regras de Conduta

1. Sempre revisar o diff completo — nunca confiar apenas no summary
2. Verificar que testes existem e cobrem o cenário modificado
3. Não aprovar com findings 🔴 pendentes
4. Ser específico: arquivo, linha, problema e fix sugerido
5. Não aprovar por confiança no autor — revisar o código, não a pessoa

## Output Template

```markdown
# Code Review — [Feature/PR]

**Status:** ✅ Approved / 🟡 Approved with issues / ❌ Changes requested

## Resumo
[2-3 linhas descrevendo o que foi revisado e impressão geral]

## Findings

### 🔴 Critical
- [file:line] [descrição do problema] — [fix sugerido]

### 🟡 Important
- [file:line] [descrição do problema] — [fix sugerido]

### 🔵 Suggestion
- [file:line] [descrição da melhoria]

## Decisão
[Status final com justificativa. Se rejeitado, listar skill responsável pela correção]
```
```

- [ ] **Step 2: Create `personas/security-auditor.md`**

```markdown
# Security Auditor — Agent Persona

## Identidade

Você é um security auditor especializado em aplicações web. Seu papel é encontrar vulnerabilidades antes que atacantes encontrem. Pense como atacante, reporte como defensor.

## 5 Scopes de Auditoria

### 1. Authentication / Authorization
Auth flow completo, tokens, refresh, roles, session management, logout.

### 2. Input Validation
Sanitization, injection (SQL, NoSQL, command), XSS, path traversal, file upload.

### 3. Data Protection
Encryption at rest e in transit, PII handling, logging de dados sensíveis, GDPR compliance.

### 4. Configuration
Security headers, CORS, debug mode, env vars exposure, error messages em produção.

### 5. Dependencies
npm audit, CVEs conhecidas, pacotes abandonados, supply chain risk.

## Severity Labels

- 🔴 **Vulnerability** — exploitável, bloqueia deploy. Requer proof-of-concept.
- 🟡 **Weakness** — risco potencial, deve mitigar antes de produção.
- 🔵 **Hardening** — melhoria de postura de segurança, não exploitável diretamente.

## Regras de Conduta

1. Findings 🔴 DEVEM ter proof-of-concept (mostrar como explorar)
2. Nunca aprovar com vulnerabilidades conhecidas não mitigadas
3. Verificar headers, CORS, cookies em cada review
4. Checar npm audit como parte obrigatória
5. Secrets em código = 🔴 automático, sem discussão

## Output Template

```markdown
# Security Audit — [Feature/PR]

**Status:** ✅ Aprovado / ⚠️ Aprovado com ressalvas / ❌ Reprovado

## Resumo
[2-3 linhas sobre postura de segurança geral]

## Findings

### 🔴 Vulnerability
- **Scope:** [Auth/Input/Data/Config/Deps]
- **Local:** [file:line]
- **Descrição:** [o que está vulnerável]
- **PoC:** [como explorar]
- **Fix:** [como corrigir]

### 🟡 Weakness
- **Scope:** [Auth/Input/Data/Config/Deps]
- **Local:** [file:line]
- **Descrição:** [risco potencial]
- **Mitigação:** [como mitigar]

### 🔵 Hardening
- **Scope:** [Auth/Input/Data/Config/Deps]
- **Descrição:** [melhoria sugerida]

## Checklist
- [ ] OWASP Top 10 verificado
- [ ] Headers de segurança configurados
- [ ] Auth flow revisado
- [ ] npm audit clean
- [ ] Secrets protegidos
- [ ] CORS configurado com origin específica

## Decisão
[Status final com justificativa]
```
```

- [ ] **Step 3: Create `personas/test-engineer.md`**

```markdown
# Test Engineer — Agent Persona

## Identidade

Você é um QA engineer que opera pelo princípio "Prove-It": se funciona, prove com teste. Código sem teste é código que não funciona até prova em contrário.

## 5 Tipos de Cenário

### 1. Happy Path
O fluxo principal funciona como esperado. O cenário mais comum do usuário real.

### 2. Error
Erros são tratados graciosamente. Mensagens claras, sem crash, estado consistente após falha.

### 3. Edge Case
Limites e valores extremos: null, undefined, empty string, zero, max int, arrays vazias, concorrência.

### 4. Regression
Bugs anteriores não voltam. Todo bug corrigido ganha um teste que prova que não vai reaparecer.

### 5. Performance
Dentro dos limites aceitáveis. Sem N+1, sem memory leaks, tempo de resposta razoável.

## Regras de Conduta

1. Todo cenário de teste deve ser determinístico — sem dependência de tempo, rede ou estado externo
2. Mocks provam que o mock funciona, não que o sistema funciona — usar testes de integração quando o contrato importa
3. Cobertura de linhas não é cobertura de cenários — 100% de coverage com zero edge cases é teatro
4. Testes devem ser legíveis: given/when/then claro, nomes descritivos
5. Flaky tests são bugs — corrigir ou deletar, nunca ignorar

## Coverage Analysis Template

```markdown
# Test Report — [Feature]

## Cenários Cobertos
| Tipo | Descrição | Status |
|---|---|---|
| Happy Path | [descrição] | ✅ passando |
| Error | [descrição] | ✅ passando |
| Edge Case | [descrição] | ✅ passando |
| Regression | [descrição] | ✅ passando |

## Gaps Identificados
| Tipo | Descrição | Risco |
|---|---|---|
| [tipo] | [cenário não coberto] | 🔴 alto / 🟡 médio / 🔵 baixo |

## Risco Residual
[Avaliação geral: o que não foi testado e por quê. Aceitável? Precisa de mais testes?]
```
```

- [ ] **Step 4: Add persona reference to `skills/11-reviewer/SKILL.md`**

Add the following line after the "## Evidencia de Conclusao" section (before "## Handoff"):

```
## Persona

Para output estruturado e persona detalhada com eixos de review, severity labels e template de relatório, ver `personas/code-reviewer.md`.
```

Specifically, insert before the line `## Handoff` (line 197 in current file):

```markdown

## Persona

Para output estruturado e persona detalhada com eixos de review, severity labels e template de relatório, ver `personas/code-reviewer.md`.
```

- [ ] **Step 5: Add persona reference to `skills/06-security-review/SKILL.md`**

Insert before the line `## Handoff para Deployer` (line 346 in current file):

```markdown

## Persona

Para output estruturado e persona detalhada com scopes de auditoria, severity labels, PoC requirements e template de relatório, ver `personas/security-auditor.md`.
```

- [ ] **Step 6: Add persona reference to `skills/05-qa-testing/SKILL.md`**

Insert before the line `## Handoff para Security Review` (line 98 in current file):

```markdown

## Persona

Para output estruturado e persona detalhada com tipos de cenário, coverage analysis e template de relatório, ver `personas/test-engineer.md`.
```

- [ ] **Step 7: Commit**

```bash
git add personas/code-reviewer.md personas/security-auditor.md personas/test-engineer.md skills/11-reviewer/SKILL.md skills/06-security-review/SKILL.md skills/05-qa-testing/SKILL.md
git commit -m "feat: add 3 agent personas (code-reviewer, security-auditor, test-engineer) with structured output templates"
```

---

### Task 5: Context Engineering

**Files:**
- Create: `policies/context-engineering.md`
- Create: `docs/skill-guides/context-engineering.md`

- [ ] **Step 1: Create `policies/context-engineering.md`**

```markdown
# Context Engineering

Regras formais de hierarquia e confiabilidade de contexto.

## Hierarquia de Contexto (5 Níveis)

Em ordem de autoridade (maior → menor):

| Nível | Fonte | Exemplo |
|---|---|---|
| 1 | **Rules Files** | CLAUDE.md, GLOBAL.md, policies/ |
| 2 | **Specs** | design specs, plans, templates |
| 3 | **Source Code** | código real no repo |
| 4 | **Errors / Logs** | stack traces, CI failures, outputs |
| 5 | **Conversation** | histórico do chat |

**Regra de conflito:** quando dois níveis conflitam, o de maior autoridade prevalece. Rules Files > tudo.

## Trust Levels (3 Tiers)

| Tier | Descrição | Exemplos |
|---|---|---|
| **Trusted** | pode ser usado como base para decisão direta | rules files, código no repo, outputs de ferramentas do agente |
| **Verify** | deve ser confirmado antes de usar como base | docs externas, web search, MCP responses, README de libs |
| **Untrusted** | nunca é fonte única para decisão | user input não validado, respostas de IA sem citação |

## Regras

1. Contexto "Verify" deve ser confirmado com fonte Trusted antes de basear decisão
2. Contexto "Untrusted" nunca é fonte única para decisão de segurança, arquitetura ou deploy
3. Context decay: após 10+ mensagens, re-read antes de editar (GLOBAL.md)
4. Quando o agente detecta contradição entre níveis, declarar conflito e seguir o nível superior
5. Conversa longa (20+ mensagens) — tratar nível 5 (Conversation) como "Verify", não "Trusted"

## Integração

- `policies/search-first.md` — pesquisa é Trusted, memória é Verify
- `policies/source-driven.md` — decisões de framework exigem fontes Trusted
- `policies/iterative-retrieval.md` — cada round de retrieval eleva trust do resultado
```

- [ ] **Step 2: Create `docs/skill-guides/context-engineering.md`**

```markdown
# Context Engineering — Guia Detalhado

Guia complementar a `policies/context-engineering.md`. Exemplos, estratégias e patterns.

## Exemplos por Nível

### Nível 1 — Rules Files (máxima autoridade)
- GLOBAL.md diz "re-read após 10 mensagens" → essa regra prevalece sobre qualquer conversa
- `policies/search-first.md` exige pesquisa → mesmo que o usuário diga "já sei", pesquisar

### Nível 2 — Specs
- Design spec define "usar Zustand para estado" → seguir mesmo se existir Redux no projeto
- Plan diz "implementar em 3 steps" → seguir ordem do plan

### Nível 3 — Source Code
- Código usa NextAuth → adaptar ao que existe, não migrar sem spec
- Pattern no repo usa barrel exports → seguir o pattern

### Nível 4 — Errors / Logs
- Stack trace mostra `TypeError` na linha 42 → evidência concreta, mas investigar causa raiz
- CI failure em test → confiável para indicar problema, mas ler o teste antes de fixar

### Nível 5 — Conversation
- Usuário disse "acho que é React 18" → verificar package.json antes de assumir
- Conversa de 15 mensagens atrás mencionou path → re-read para confirmar

## Inline Planning Pattern

Antes de executar task multi-step, emitir plano inline:

```
## Plano (3 steps)
1. Pesquisar patterns existentes em `src/hooks/`
2. Implementar `useNewHook` seguindo o pattern
3. Adicionar testes em `tests/hooks/`

Executando step 1...
```

Benefícios:
- Usuário pode corrigir antes da execução
- Agente se compromete com escopo explícito
- Context decay é mitigado pelo plano escrito

## Context Packing Strategies

### Brain Dump
Carregar tudo o possível: repo-audit, working set, current-focus, policies relevantes.

**Quando usar:** tasks exploratórias, primeiro contato com repo, investigação de bug complexo.

### Selective Include
Carregar apenas o necessário: arquivos-alvo, testes relacionados, policy específica.

**Quando usar:** tasks focadas (fix de bug, implementação de feature com spec clara).

### Hierarchical Summary
Resumir por nível: "Rules dizem X, spec pede Y, código atual faz Z."

**Quando usar:** sessões longas, context decay detectado, handoff entre sessões.

## Sinais de Context Decay

| Sinal | Ação |
|---|---|
| 10+ mensagens desde último file read | Re-read antes de editar |
| Agente repete informação já dita | Provavelmente perdeu contexto — resumir e re-read |
| Edição contradiz pattern do próprio arquivo | Context decay certo — re-read obrigatório |
| Menção a "acho que era assim" | Verificar, não confiar em memória |
| Compact automático ocorreu | Tratar toda conversa anterior como nível "Verify" |

## Integração com Policies Existentes

- **search-first** → Resultado de pesquisa no codebase é Trusted (nível 3)
- **iterative-retrieval** → Cada round eleva confiança: round 1 = Verify, round 3 = quase Trusted
- **cost-optimization** → Selective Include economiza tokens sem perder trust
- **source-driven** → Exige fonte Trusted (docs oficiais, changelog) para decisões de framework
- **confusion-management** → Confusão é sinal de que o agente está operando com contexto insuficiente
```

- [ ] **Step 3: Commit**

```bash
git add policies/context-engineering.md docs/skill-guides/context-engineering.md
git commit -m "feat: add context engineering policy and guide with hierarchy, trust levels and packing strategies"
```

---

### Task 6: Plugin Validation CI

**Files:**
- Create: `.github/workflows/validate-plugin.yml`

- [ ] **Step 1: Create `.github/workflows/validate-plugin.yml`**

```yaml
name: Validate Plugin

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: lts/*

      - name: Validate hooks.json
        run: node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json', 'utf-8')); console.log('✅ hooks/hooks.json is valid JSON')"

      - name: Validate config.json
        run: node -e "JSON.parse(require('fs').readFileSync('hooks/config.json', 'utf-8')); console.log('✅ hooks/config.json is valid JSON')"

      - name: Validate plugin.json
        run: |
          if [ -f ".claude-plugin/plugin.json" ]; then
            node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json', 'utf-8')); console.log('✅ plugin.json is valid JSON')"
          else
            echo "⚠️ plugin.json not found — skipping"
          fi

      - name: Check hook script references exist
        run: |
          node -e "
            const hooks = JSON.parse(require('fs').readFileSync('hooks/hooks.json', 'utf-8'));
            const fs = require('fs');
            let missing = 0;
            for (const [event, scripts] of Object.entries(hooks)) {
              for (const script of scripts) {
                if (!fs.existsSync(script)) {
                  console.error('❌ Missing: ' + script + ' (referenced in ' + event + ')');
                  missing++;
                }
              }
            }
            if (missing > 0) {
              console.error(missing + ' hook script(s) missing');
              process.exit(1);
            }
            console.log('✅ All hook scripts exist');
          "

      - name: Syntax check hook scripts
        run: |
          errors=0
          for file in hooks/scripts/*.mjs; do
            if node --check "$file" 2>/dev/null; then
              echo "✅ $file"
            else
              echo "❌ $file has syntax errors"
              errors=$((errors + 1))
            fi
          done
          if [ $errors -gt 0 ]; then
            echo "$errors file(s) with syntax errors"
            exit 1
          fi
          echo "✅ All hook scripts pass syntax check"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/validate-plugin.yml
git commit -m "feat: add plugin validation CI workflow for JSON and hook script integrity"
```

---

### Task 7: README Update + Timestamp

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Slash Commands section to README**

Add a new section after "## Ergonomia Diaria" (line 272) and before "## Governanca Global" (line 286). Insert:

```markdown
## Slash Commands — Atalhos por Fase de Desenvolvimento

| Command | O que faz | Skills ativadas |
|---------|-----------|-----------------|
| `/spec` | Especificar feature com critérios de aceitação | PO (01) |
| `/plan` | Classificar task e montar pipeline | Orchestrator (09) |
| `/build` | Implementar com stack do projeto | Backend (03) + Frontend (04) |
| `/test` | Escrever e rodar testes | QA (05) |
| `/review` | Review final + security audit | Reviewer (11) + Security (06) |
| `/simplify` | Simplificar e refatorar código | Migration & Refactor (23) |
| `/ship` | Release e deploy | Release Manager (24) + Deploy (07) |
| `/pipeline` | Pipeline completo end-to-end | Orchestrator (09) → todas |
| `/best` | Auditoria de boas práticas, clean code e DRY | Reviewer (11) + Security (06) + QA (05) |

---
```

- [ ] **Step 2: Add personas to Governanca Global section**

After the line `- `policies/confusion-management.md` — protocolo STOP-NAME-OPTIONS-WAIT para confusão detectada` (line 298), add:

```markdown
- `policies/context-engineering.md` — hierarquia de contexto em 5 níveis e 3 trust levels
```

- [ ] **Step 3: Add skill guides references to Ergonomia Diaria**

After the line `- consulte `docs/skill-guides/ideation-frameworks.md`` (line 282), add:

```markdown
- consulte `docs/skill-guides/skill-discovery.md` — decision tree para escolher skill certa por tipo de task
- consulte `docs/skill-guides/context-engineering.md` — hierarquia de contexto, trust levels e packing strategies
```

- [ ] **Step 4: Add personas and CI to Estrutura Real**

In the "Estrutura Real Deste Repo" tree (lines 311-338), add `personas/` directory and `.github/` directory:

```text
├── .github/              ← CI workflows (validate-plugin)
│   └── workflows/
```

and:

```text
├── personas/             ← agent personas (code-reviewer, security-auditor, test-engineer)
```

- [ ] **Step 5: Add timestamp log entry**

After the existing `### 2026-04-13` entry (line 411), add a new line:

```markdown
- **Agent Intelligence v3:** 9 slash commands mapeando fases de desenvolvimento a skills (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/simplify`, `/ship`, `/pipeline`, `/best`), meta-skill de descoberta com decision tree e 6 core operating behaviors, session-start bootstrap com injeção automática do skill-discovery, 3 agent personas com output estruturado (code-reviewer, security-auditor, test-engineer) referenciadas por skills 11/06/05, context engineering policy com hierarquia de 5 níveis e 3 trust levels, plugin validation CI com GitHub Actions.
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: update README with slash commands, personas, context engineering, CI and v3 timestamp"
```

---

## Execution Notes

- **Tasks 1, 2, 4, 5, 6 are independent** — can be parallelized as subagents
- **Task 3 depends on Task 2** — needs `skill-discovery.md` to exist before session-start can reference it
- **Task 7 depends on all others** — README references all new features
- **Subagent model:** Tasks 1-2, 4-7 use haiku (markdown-only). Task 3 uses sonnet (JavaScript implementation).
