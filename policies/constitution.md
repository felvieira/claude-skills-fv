# Project Constitution

**Objetivo:** estabelecer princípios governantes não-negociáveis que ancoram todas as decisões das skills (`/plan`, `/build`, `/review`, `/ship`). Inspirado em [github/spec-kit](https://github.com/github/spec-kit) — `speckit-constitution`.

**Filosofia:** Constituição é **autoridade hierárquica**. Conflito entre constituição e PRD/plan/task → constituição vence. Para mudar um princípio, abrir mudança explícita à constituição (commit dedicado, não diluição silenciosa em PR de feature).

## Onde mora

- **Repo consumidor:** `memory/constitution.md` na raiz do projeto consumidor
- **Template:** [`templates/constitution-template.md`](../templates/constitution-template.md)
- **Geração:** `/constitution` slash command interativo

## Quando consultar (obrigatório)

| Skill / Command | Checagem obrigatória |
|---|---|
| `/spec`, `/to-prd` | requisitos devem respeitar princípios (ex: se constituição manda TDD, spec precisa ter critérios testáveis) |
| `/plan` (skill 09) | escolhas de arquitetura ancoradas em princípios |
| `/build` (skills 03/04) | implementação respeita gates (test coverage, performance budget) |
| `/review` (skill 11) | review usa constituição como rubric primária |
| `/ship` (skill 24) | deploy só após princípios validados (security, observability) |

## Estrutura mínima

Toda constituição deve cobrir 5 eixos. Se um eixo não se aplica ao projeto, registrar "N/A — justificativa".

### 1. Code Quality

- Convenções de naming, formatting (linter/formatter)
- Hard limit de complexidade ciclomática / arquivo size?
- DRY threshold (quando duplicação vira violação)
- Linguagens permitidas / banidas no projeto

### 2. Testing Standards

- TDD obrigatório ou opcional?
- Cobertura mínima (lines / branches / functions)
- Tipos exigidos: unit / integration / e2e / contract
- Quem escreve testes (autor / par / QA)
- Quando flaky test é tolerável (resposta esperada: nunca)

### 3. User Experience Consistency

- Design system / tokens / componentes obrigatórios
- Acessibilidade: nível WCAG mínimo (A / AA / AAA)
- i18n: locales suportados
- Performance percebida: TTI, LCP, INP budgets

### 4. Performance Requirements

- Latência: p50, p95, p99 por endpoint crítico
- Throughput esperado
- Memória / CPU budgets
- Custos: budget mensal de inferência IA, infra

### 5. Security & Compliance

- Gates obrigatórios: SAST, dependency scan, secrets scan, auth review
- Compliance: SOC2 / GDPR / HIPAA / PCI?
- Dados sensíveis: classificação, retenção, criptografia
- Threat model atualizado quando?

## Anti-padrões

- **Princípios vagos** ("código limpo") sem critério verificável → falha gate de geração da constituição
- **Princípio sem owner** — todo princípio precisa de responsável (pessoa, time ou role)
- **Diluição silenciosa em PR de feature** — alterar princípio dentro de PR de feature é forbidden. Precisa de commit dedicado `chore(constitution): ...`

## Versionamento

- Frontmatter da `constitution.md` carrega `version: x.y.z` semver
- **MAJOR:** mudança que invalida specs/plans existentes (ex: trocar linguagem proibida)
- **MINOR:** adição de princípio novo
- **PATCH:** clarificação sem mudança de comportamento

## Integração com outras policies

- `policies/quality-gates.md` — executa o que a constituição declara
- `policies/source-driven.md` — constituição é fonte canônica
- `policies/prd-validation.md` — 13 checks devem conformar com constituição
- ADRs (`docs/adr/`) — decisões arquiteturais derivam de princípios da constituição

## Inspiração

[github/spec-kit](https://github.com/github/spec-kit) — `/speckit.constitution`. Adaptado para nosso modelo (sem `.specify/`, sem CLI Python; integra com `memory/`, `docs/adr/`, `policies/`).
