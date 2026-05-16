---
description: Cross-artifact consistency check (read-only) entre constituição, spec, plan e issues — detecta inconsistências, duplicações, ambiguidades e requisitos órfãos antes de /build
---

# /analyze — Cross-Artifact Consistency Check

**Objetivo:** validar coerência entre os artefatos do pipeline (`memory/constitution.md` → `docs/specs/*.md` → `docs/plan/*.md` ou ADRs → issues do tracker) **antes** de mandar `/build` ou `/auto`. Read-only. Output estruturado, sem modificar arquivos.

Inspirado em [github/spec-kit](https://github.com/github/spec-kit) — `/speckit.analyze`.

**Quando usar:**
- depois de `/to-issues` e antes de `/build`
- antes de release major (`/ship`) como gate adicional
- depois de mudança grande na constituição (ver o que ficou inconsistente)

**Quando NÃO usar:**
- bug fix pontual (overhead desnecessário)
- pipeline ainda incompleto (não tem spec OU plan OU issues) → rode primeiro o que falta

**Skill ativada:** Reviewer (skill 11) em modo "cross-artifact auditor".

## Garantias

- **STRICTLY READ-ONLY** — não modifica nenhum arquivo
- **Constituição é não-negociável** — conflito constituição ↔ outro artefato sempre vira CRITICAL
- **Sem heurística destrutiva** — não sugere apagar/reescrever; apenas reporta

## Pré-requisitos

Detectar artefatos:

```bash
CONSTITUTION="memory/constitution.md"
SPEC_DIR="docs/specs"
PLAN_DIR="docs/plan"
ADR_DIR="docs/adr"

# fallback: se não houver docs/specs, tentar .taskmaster/docs/prd.md
[ -d "$SPEC_DIR" ] || SPEC_FALLBACK=".taskmaster/docs/prd.md"

# issues do tracker
gh issue list --label needs-triage --json number,title,body --limit 100 > /tmp/issues.json 2>/dev/null || true
```

Abortar se faltar qualquer dos 3 (spec, plan, issues) — pedir o usuário rodar o passo que falta. Constituição é **fortemente recomendada** mas não obrigatória.

## Processo (6 passos)

### 1. Carregar artefatos (progressive disclosure)

Não carregue tudo de uma vez. Ler **apenas as seções relevantes** por artefato:

- **Constituição:** seções marcadas "Owner:" + princípios numerados
- **Spec:** Problem Statement, User Stories, Out of Scope, Implementation Decisions
- **Plan/ADRs:** Decisões registradas + status
- **Issues:** título + body + label (não comentários)

### 2. Construir matriz de rastreabilidade

Para cada User Story na spec, mapear:

| User Story | Constituição (princípio relacionado) | Plan/ADR (decisão que afeta) | Issue (#) |
|---|---|---|---|
| US-001 | P3.2 (a11y AA) | ADR-007 (radix-ui) | #42 |
| US-002 | — | — | **órfã** |

Identificar:
- **Stories órfãs:** sem issue correspondente
- **Issues órfãs:** sem story correspondente (scope creep)
- **Stories sem decisão técnica:** plan não cobre como implementar

### 3. Detectar inconsistências (5 classes)

#### CRITICAL — Conflito com constituição
- Spec exige X, constituição proíbe X
- Plan escolhe stack Y, constituição não autoriza Y
- Issue propõe deployment sem security gate da constituição

#### HIGH — Duplicação semântica
- Duas user stories descrevendo o mesmo comportamento com palavras diferentes
- Dois ADRs decidindo a mesma coisa de forma divergente
- Issues que se sobrepõem em escopo

#### HIGH — Ambiguidade não resolvida
- "Fast", "secure", "scalable" sem critério (já cobre `policies/prd-validation.md` check 8)
- Spec usa termo X, plan usa Y para o mesmo conceito (falha glossário)
- AC ausente em user story

#### MEDIUM — Cobertura insuficiente
- User story sem AC verificável
- Requisito sem teste planejado (cruzar com `policies/quality-gates.md`)
- Out of Scope ausente ou vazio

#### LOW — Higiene
- Numeração de requisitos quebrada (REQ-001, REQ-003 sem REQ-002)
- Datas / owners inconsistentes
- ADRs sem status (`accepted` / `proposed` / `superseded`)

### 4. Calcular score de coerência

- **5 CRITICAL = bloqueio total** → não prosseguir para `/build`
- **3+ HIGH = needs-fix** → fixar antes de continuar
- **mix com ≤2 HIGH e MEDIUM/LOW = proceed-with-caution** → autor decide
- **só LOW = ship-it** → pode prosseguir

### 5. Output estruturado

Markdown com seções fixas:

```markdown
# /analyze report — <feature> — <data>

## Resumo
- Artefatos: constituição ✓, specs (3), plans (1), issues (12)
- Score: NEEDS-FIX (1 CRITICAL, 3 HIGH, 5 MEDIUM, 2 LOW)
- Recomendação: bloquear `/build` até resolver CRITICAL + 2 HIGH

## Matriz de rastreabilidade
<tabela>

## Findings

### CRITICAL — Conflito com constituição
1. **Constituição P5.1 exige Semgrep no CI; plan A-3 não menciona SAST.**
   - Arquivos: `memory/constitution.md#5.1`, `docs/plan/feature-x.md#deploy`
   - Sugestão: incluir gate Semgrep em `docs/plan/feature-x.md` ou registrar exceção em ADR.

### HIGH — Duplicação
2. ...

### MEDIUM — Cobertura
3. ...

### LOW — Higiene
4. ...

## Próximos passos
- [ ] resolver findings CRITICAL (manual)
- [ ] resolver HIGH antes de `/build`
- [ ] re-rodar `/analyze` após fixes
```

### 6. Salvar relatório

```bash
mkdir -p docs/analysis
REPORT="docs/analysis/$(date +%Y-%m-%d)-<feature-slug>.md"
# escrever relatório
echo "Relatório salvo em $REPORT"
```

**Não** commitar automaticamente — usuário decide.

## Inputs

- (opcional) `--feature <slug>` filtra spec/plan/issues por slug
- (opcional) `--strict` — trata MEDIUM como bloqueio
- (opcional) `--no-issues` — pula análise do tracker (offline)

## Output esperado

- Relatório em `docs/analysis/YYYY-MM-DD-<slug>.md`
- Resumo no console (não despeja markdown inteiro)
- Exit code: 0 (clean), 1 (warnings), 2 (blocking CRITICAL)

## Policies relevantes

- [`policies/constitution.md`](../../policies/constitution.md) — autoridade não-negociável
- [`policies/prd-validation.md`](../../policies/prd-validation.md) — 13 checks já cobrem ambiguidade
- [`policies/source-driven.md`](../../policies/source-driven.md) — decisões rastreáveis a fontes
- [`policies/quality-gates.md`](../../policies/quality-gates.md) — gates que devem aparecer no plan

## Handoff

- **Score clean:** seguir para `/build` ou `/auto`
- **needs-fix / blocking:** voltar para `/spec` ou `/plan` para fixar findings
- **constituição precisa mudar:** rodar `/constitution` em modo update com commit dedicado

## Inspiração

[github/spec-kit](https://github.com/github/spec-kit) — `/speckit.analyze`. Adaptado para nosso pipeline (specs em `docs/specs/`, issues em GitHub/Linear/Jira, constituição em `memory/`).

**Uso:** `/analyze [--feature <slug>] [--strict] [--no-issues]`
