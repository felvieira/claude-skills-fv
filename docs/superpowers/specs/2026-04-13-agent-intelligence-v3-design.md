# Agent Intelligence Upgrade v3 — Developer Experience & Context

**Data:** 2026-04-13
**Status:** aprovado
**Escopo:** 6 features que melhoram a experiência de uso do kit (slash commands, bootstrap, discovery), enriquecem skills de review (personas), e formalizam gestão de contexto.

---

## Visão Geral

| # | Feature | Artefatos principais | Esforço |
|---|---|---|---|
| 1 | Slash Commands | 9 arquivos em `.claude/commands/` | Baixo |
| 2 | Meta-Skill de Descoberta | `docs/skill-guides/skill-discovery.md` | Médio |
| 3 | SessionStart Bootstrap | `session-start.mjs` + `config.json` | Baixo |
| 4 | Agent Personas | 3 arquivos em `personas/` + 3 skill edits | Médio |
| 5 | Context Engineering | policy + skill-guide | Médio |
| 6 | Plugin Validation CI | `.github/workflows/validate-plugin.yml` | Baixo |

---

## Feature 1: Slash Commands

### Problema

O kit tem 32 skills mas nenhuma interface memorável para o usuário. É preciso saber nomes de skills para usá-las.

### Solução

9 commands em `.claude/commands/` que mapeiam fases de desenvolvimento a skills.

| Command | Arquivo | Invoca | Descrição |
|---------|---------|--------|-----------|
| `/spec` | `spec.md` | skill 01 (PO) | Especificar feature com critérios de aceitação |
| `/plan` | `plan.md` | skill 09 (Orchestrator) | Classificar task e montar pipeline |
| `/build` | `build.md` | skills 03/04 (Backend/Frontend) | Implementar com stack do projeto |
| `/test` | `test.md` | skill 05 (QA) | Escrever e rodar testes |
| `/review` | `review.md` | skills 11 + 06 (Reviewer + Security) | Review final + security audit |
| `/simplify` | `simplify.md` | skill 23 (Migration/Refactor) | Simplificar e refatorar código |
| `/ship` | `ship.md` | skills 24 + 07 (Release + Deploy) | Release e deploy |
| `/pipeline` | `pipeline.md` | skill 09 (Orchestrator) | Pipeline completo end-to-end |
| `/best` | `best.md` | skills 11 + 06 + 05 (Reviewer + Security + QA) | Auditoria de boas práticas, arquitetura, clean code e DRY |

**Formato de cada command:**

```yaml
---
description: [descrição curta para o menu de comandos]
---
```

Seguido de instruções em markdown (5-15 linhas) que:
1. Descrevem o objetivo da fase
2. Listam a(s) skill(s) a ativar
3. Definem inputs esperados e output esperado
4. Referenciam policies relevantes

### Artefatos

| Arquivo | Mudança |
|---|---|
| `.claude/commands/spec.md` | Novo |
| `.claude/commands/plan.md` | Novo |
| `.claude/commands/build.md` | Novo |
| `.claude/commands/test.md` | Novo |
| `.claude/commands/review.md` | Novo |
| `.claude/commands/simplify.md` | Novo |
| `.claude/commands/ship.md` | Novo |
| `.claude/commands/pipeline.md` | Novo |
| `.claude/commands/best.md` | Novo |

---

## Feature 2: Meta-Skill de Descoberta

### Problema

O agente não sabe como navegar as 32 skills + 17 policies + 8 hooks do kit sem ler tudo. Falta um mapa mental que diga "para X, use Y."

### Solução

**Arquivo:** `docs/skill-guides/skill-discovery.md`

**Conteúdo:**

**Decision Tree — tipo de task → skill(s) sugerida(s):**
- "nova feature completa" → `/spec` → `/plan` → `/build` → `/test` → `/review` → `/ship`
- "bug/fix" → QA (05) → skill afetada → Security (06) → Reviewer (11)
- "refactor/simplify" → `/simplify` → QA (05) → Reviewer (11)
- "review/deploy" → `/review` → `/ship`
- "dúvida/exploração" → Context Manager (08) → Repo Auditor (18)
- "melhoria de UI" → Design Intelligence (29) → UI/UX (02) → Frontend (04) → QA (05)
- "integração de IA" → AI Integration Architect (25) → Prompt Engineer (26) → Backend (03)
- "documentação" → Documenter (10) → Reviewer (11)

**6 Core Operating Behaviors** — regras universais:
1. **Surface Assumptions** — explicitar suposições antes de agir
2. **Manage Confusion** — usar `policies/confusion-management.md` (STOP-NAME-OPTIONS-WAIT)
3. **Push Back When Warranted** — questionar instruções que contradizem policies ativas
4. **Enforce Simplicity** — YAGNI, DRY, mínimo suficiente
5. **Maintain Scope Discipline** — não expandir scope sem confirmação explícita
6. **Verify Don't Assume** — checar antes de afirmar, usar `policies/search-first.md`

**10 Failure Modes to Avoid:**
1. Gerar código sem pesquisar o codebase primeiro
2. Ignorar policies ativas
3. Adivinhar em vez de perguntar (STOP-NAME-OPTIONS-WAIT)
4. Expandir scope sem confirmação
5. Pular QA ou Security no pipeline
6. Não citar fontes para decisões de framework
7. Repetir reads desnecessários (reuse working set)
8. Aceitar "parece certo" como evidência
9. Não declarar plano antes de executar multi-step
10. Ignorar sinais de context decay

### Artefatos

| Arquivo | Mudança |
|---|---|
| `docs/skill-guides/skill-discovery.md` | Novo |

---

## Feature 3: SessionStart Bootstrap

### Problema

O hook `session-start.mjs` atual injeta apenas `current-focus.md`. O agente começa cada sessão sem saber como navegar o kit — precisa descobrir skills e policies por conta própria.

### Solução

Expandir `session-start.mjs` para injetar também o meta-skill de descoberta, controlado por config.

**Config em `hooks/config.json`:**
```json
"session_bootstrap": {
  "inject_meta_skill": true,
  "meta_skill_path": "docs/skill-guides/skill-discovery.md"
}
```

**Mudanças em `session-start.mjs`:**

Após a leitura existente de `current-focus.md`:
1. Ler config `session_bootstrap` via `readHookConfig("session_bootstrap", defaults)`
2. Se `inject_meta_skill === true`, ler o arquivo apontado por `meta_skill_path`
3. Truncar para max 2000 chars (evitar estouro de contexto)
4. Anexar ao `additionalContext` existente como seção separada

**Integração com hook profiles:**
- Ativo em: standard, strict
- Desativado em: minimal (já desativa session-start via profile)

### Artefatos

| Arquivo | Mudança |
|---|---|
| `hooks/scripts/session-start.mjs` | Modificado |
| `hooks/config.json` | +seção session_bootstrap |

---

## Feature 4: Agent Personas

### Problema

As skills de review (11, 06, 05) definem responsabilidades e checklists, mas não especificam personas ricas com eixos de avaliação e templates de output estruturados. Subagents de review produzem outputs inconsistentes.

### Solução

3 arquivos de persona em `personas/`, cada um com eixos, severity labels e output template.

**`personas/code-reviewer.md`:**

5 eixos de review:
1. **Correctness** — o código faz o que deveria?
2. **Design** — arquitetura limpa, responsabilidades claras, DRY?
3. **Readability** — nomes claros, funções focadas, comentários úteis?
4. **Performance** — N+1, re-renders, bundle size, lazy loading?
5. **Security** — inputs validados, auth correta, secrets protegidos?

Severity labels:
- 🔴 Critical — bloqueia merge
- 🟡 Important — deve corrigir, não bloqueia sozinho
- 🔵 Suggestion — melhoria opcional

Output template:
```markdown
# Code Review — [Feature/PR]

**Status:** ✅ Approved / 🟡 Approved with issues / ❌ Changes requested

## Resumo
[2-3 linhas]

## Findings

### 🔴 Critical
- [file:line] [descrição] — [fix sugerido]

### 🟡 Important
- [file:line] [descrição] — [fix sugerido]

### 🔵 Suggestion
- [file:line] [descrição]

## Decisão
[status final com justificativa]
```

**`personas/security-auditor.md`:**

5 scopes de auditoria:
1. **Authentication/Authorization** — auth flow, tokens, roles
2. **Input Validation** — sanitization, injection, XSS
3. **Data Protection** — encryption, PII, logging
4. **Configuration** — headers, CORS, debug mode, env vars
5. **Dependencies** — npm audit, CVEs, abandoned packages

Severity labels:
- 🔴 Vulnerability — exploitável, bloqueia deploy
- 🟡 Weakness — risco potencial, deve mitigar
- 🔵 Hardening — melhoria de postura

Exige proof-of-concept para findings 🔴 (mostrar como explorar).

Output template similar ao code-reviewer mas com scope em vez de eixo, e campo PoC para criticals.

**`personas/test-engineer.md`:**

Prove-It pattern: "se funciona, prove com teste"

5 tipos de cenário:
1. **Happy Path** — fluxo principal funciona
2. **Error** — erros são tratados graciosamente
3. **Edge Case** — limites e valores extremos
4. **Regression** — bugs anteriores não voltam
5. **Performance** — dentro dos limites aceitáveis

Coverage analysis template:
```markdown
# Test Report — [Feature]

## Cenários Cobertos
- [tipo] [descrição] — ✅ passando

## Gaps Identificados
- [tipo] [descrição] — ⚠ não coberto, risco: [alto/médio/baixo]

## Risco Residual
[avaliação geral]
```

**Skills 11, 06 e 05** recebem uma linha referenciando a persona:
```
Para output estruturado e persona detalhada, ver `personas/<nome>.md`.
```

### Artefatos

| Arquivo | Mudança |
|---|---|
| `personas/code-reviewer.md` | Novo |
| `personas/security-auditor.md` | Novo |
| `personas/test-engineer.md` | Novo |
| `skills/11-reviewer/SKILL.md` | +referência persona |
| `skills/06-security-review/SKILL.md` | +referência persona |
| `skills/05-qa-testing/SKILL.md` | +referência persona |

---

## Feature 5: Context Engineering

### Problema

O kit tem políticas de pesquisa (search-first), retrieval (iterative-retrieval) e custo (cost-optimization), mas falta um modelo formal de hierarquia de contexto e trust levels. O agente trata todo contexto como igualmente confiável.

### Solução

Policy leve com regras + guide detalhado com exemplos.

**Policy (`policies/context-engineering.md`):**

**Hierarquia de 5 níveis (em ordem de autoridade):**
1. **Rules Files** — CLAUDE.md, GLOBAL.md, policies/ (máxima autoridade)
2. **Specs** — design specs, plans, templates (define o que construir)
3. **Source Code** — código real no repo (estado atual)
4. **Errors/Logs** — stack traces, outputs, CI failures (evidência)
5. **Conversation** — histórico do chat (mínima autoridade, sujeito a context decay)

**Trust levels:**
- **Trusted** — rules files, código no repo, outputs de ferramentas do próprio agente
- **Verify** — docs externas, web search results, MCP responses
- **Untrusted** — user input não validado, respostas de IA sem citação

**Regras:**
1. Quando dois níveis conflitam, o de maior autoridade prevalece
2. Contexto "Verify" deve ser confirmado antes de usar como base para decisão
3. Contexto "Untrusted" nunca deve ser usado como fonte única para decisão de segurança
4. Context decay: após 10+ mensagens, reread antes de editar (regra do GLOBAL.md)

**Guide (`docs/skill-guides/context-engineering.md`):**

Conteúdo detalhado:
- Exemplos de cada nível de hierarquia com cenários reais
- Quando usar cada trust level
- **Inline Planning Pattern:** antes de executar task multi-step, emitir plano inline
- **Context packing strategies:**
  - Brain Dump — carregar tudo (para tasks exploratórias)
  - Selective Include — só o necessário (para tasks focadas)
  - Hierarchical Summary — resumir por nível (para sessions longas)
- Integração com policies existentes (iterative-retrieval, search-first, cost-optimization)

### Artefatos

| Arquivo | Mudança |
|---|---|
| `policies/context-engineering.md` | Novo |
| `docs/skill-guides/context-engineering.md` | Novo |

---

## Feature 6: Plugin Validation CI

### Problema

O kit tem plugin manifest mas nenhum CI que valida a estrutura e integridade dos artefatos. Hooks com syntax error ou JSON inválido só são descobertos em runtime.

### Solução

GitHub Actions workflow que valida em push/PR.

**Arquivo:** `.github/workflows/validate-plugin.yml`

**Steps:**
1. Checkout do repo
2. Setup Node.js (LTS)
3. Validar que `hooks/hooks.json` é JSON válido
4. Validar que `hooks/config.json` é JSON válido
5. Verificar que todos os hook scripts referenciados em `hooks.json` existem
6. `node --check` em cada arquivo `.mjs` em `hooks/scripts/` para syntax validation
7. Verificar que `plugin.json` existe e é JSON válido (se presente)

### Artefatos

| Arquivo | Mudança |
|---|---|
| `.github/workflows/validate-plugin.yml` | Novo |

---

## Mudanças Transversais

### README.md

- **Commands:** nova seção listando os 8 slash commands
- **Personas:** mencionar diretório `personas/` com 3 agent personas
- **Governança:** adicionar `policies/context-engineering.md`
- **Skill Guides:** adicionar `skill-discovery.md` e `context-engineering.md`
- **CI:** mencionar workflow de validação
- **Timestamp Log:** entrada 2026-04-13 (segunda entrada do dia)

### hooks/config.json

- Seção `session_bootstrap` (Feature 3)

---

## Ordem de Implementação

1. **Slash Commands** — 8 commands (base de UX)
2. **Meta-Skill de Descoberta** — skill-discovery.md (necessário para bootstrap)
3. **SessionStart Bootstrap** — session-start.mjs + config (depende de #2)
4. **Agent Personas** — 3 personas + 3 skill edits
5. **Context Engineering** — policy + guide
6. **Plugin Validation CI** — workflow
7. **README + timestamp** — atualização final
