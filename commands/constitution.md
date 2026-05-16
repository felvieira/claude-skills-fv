---
description: Cria ou atualiza memory/constitution.md com princípios governantes do projeto (code quality, testing, UX, performance, security)
---

# /constitution — Princípios Governantes do Projeto

**Objetivo:** criar/atualizar `memory/constitution.md` no repo consumidor. Os 5 eixos da constituição (Code Quality, Testing, UX, Performance, Security) viram fonte canônica que `/spec`, `/plan`, `/build`, `/review` e `/ship` consultam.

**Quando usar:**
- bootstrap de projeto novo (depois de `/setup` / `/repo-audit`)
- mudança organizacional (novo framework de compliance, novo budget de custo)
- onboarding de skills do kit num projeto existente sem princípios formais

**Quando NÃO usar:**
- ajuste micro de um princípio existente → editar `memory/constitution.md` direto + commit `chore(constitution): ...`
- decisão arquitetural localizada → vai pra `docs/adr/` não pra constituição

**Skill ativada:** PO (skill 01) em modo "governance authoring".

**Pré-requisitos:**
- repo audit feito (`docs/repo-audit/current.md`) — pra detectar stack e propor defaults sensatos
- glossário (`docs/glossary.md` ou `CONTEXT.md`) opcional, usado pra naming

## Processo

### Passo 1 — Detectar estado atual

```bash
# Existe constituição?
test -f memory/constitution.md && echo "EXISTE" || echo "AUSENTE"
```

- **Existe:** modo `update` — `AskUserQuestion` oferece: Review / Add principle / Modify principle / Bump version / Cancel
- **Ausente:** modo `bootstrap` — segue para passo 2

### Passo 2 — Discovery por eixo (5 mini-entrevistas)

Para cada eixo, perguntar 2-4 perguntas **com defaults baseados no repo audit** (não pergunte stack se `package.json` mostra; não pergunte se TDD existe se há testes).

**Eixo 1 — Code Quality:**
- Linter e formatter atuais? (deduzir de `.eslintrc`, `pyproject.toml`, etc.)
- Limite de complexidade ciclomática aceitável?
- Linguagens proibidas no projeto?

**Eixo 2 — Testing Standards:**
- TDD obrigatório / opcional / por módulo crítico?
- Coverage mínimo aceitável?
- Como tratar flaky tests?

**Eixo 3 — UX Consistency:**
- Design system existente? Qual?
- WCAG nível mínimo?
- Locales obrigatórios?
- Performance percebida budgets (LCP/INP/CLS)?

**Eixo 4 — Performance:**
- p50/p95/p99 alvos para endpoints críticos?
- Budget de custo mensal (IA + infra)?

**Eixo 5 — Security & Compliance:**
- Gates obrigatórios em CI?
- Framework de compliance aplicável?
- Classificação de dados sensíveis?

### Passo 3 — Gerar arquivo

1. Ler [`templates/constitution-template.md`](../../templates/constitution-template.md)
2. Substituir placeholders com respostas
3. Para campos sem resposta: marcar `TBD — owner: ?` (não inventar números)
4. Frontmatter: `version: 0.1.0`, `last_updated: <hoje>`, `owners: [@usuário]`

### Passo 4 — Validar princípios

Antes de escrever, checar anti-padrões em [`policies/constitution.md`](../../policies/constitution.md):
- Princípio vago sem critério verificável? → rejeitar, pedir refino
- Princípio sem owner? → rejeitar
- Conflito entre eixos? (ex: "TDD obrigatório" + "coverage 0%" — incoerente) → reportar

### Passo 5 — Escrever + commit

```bash
mkdir -p memory
# escrever memory/constitution.md
git add memory/constitution.md
git commit -m "chore(constitution): bootstrap v0.1.0"
```

### Passo 6 — Ancorar nas skills

Adicionar referência em:
- `CLAUDE.md` do projeto consumidor — bloco "Constituição: ver `memory/constitution.md`"
- Se houver ADRs (`docs/adr/`), checar se algum entra em conflito → reportar

## Inputs

- repo audit (opcional mas recomendado)
- glossário do projeto (opcional)
- decisões prévias do usuário sobre tooling/compliance

## Output esperado

- `memory/constitution.md` criado/atualizado
- commit `chore(constitution): ...`
- relatório curto: quais eixos foram preenchidos, quais ficaram `TBD`, próximos passos
- (se `update`) diff dos princípios alterados + bump de versão semver

## Policies relevantes

- [`policies/constitution.md`](../../policies/constitution.md) — autoridade hierárquica, anti-padrões, versionamento
- [`policies/source-driven.md`](../../policies/source-driven.md) — constituição é fonte canônica
- [`policies/prd-validation.md`](../../policies/prd-validation.md) — 13 checks devem conformar com constituição

## Handoff

- `/spec` ou `/to-prd` — agora com constituição como guard
- `/repo-audit --apply-constitution` (futuro) — flagar violações existentes

## Inspiração

[github/spec-kit](https://github.com/github/spec-kit) — `/speckit.constitution`. Adaptado sem CLI Python e sem `.specify/`.

**Uso:** `/constitution [opcional: foco de eixo, ex: "só security"]`
