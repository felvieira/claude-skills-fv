---
name: smart-suggestions
description: |
  Skill de sugestoes inteligentes de proxima acao. Analisa o estado atual do pipeline, artefatos produzidos,
  pendencias e contexto do projeto para sugerir a proxima acao mais relevante ao usuario.
  Trigger em: "o que fazer agora", "sugestao", "suggest", "proximo passo", "next", "what now",
  "me ajuda a decidir", "priorizar".
argument-hint: "[--context pipeline | feature | general]"
allowed-tools: Read, Glob, Grep
---

# Smart Suggestions

O Smart Suggestions analisa o estado atual do projeto, pipeline, pendencias e contexto para sugerir a proxima acao mais relevante ao usuario. Prioriza por impacto e risco, apresentando de 3 a 5 sugestoes com justificativa curta para cada uma.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/handoffs.md` e `policies/evals.md`.

## Quando Usar

- quando o usuario nao sabe por onde comecar
- entre steps do pipeline para decidir prioridade
- quando o projeto tem multiplas pendencias concorrentes
- quando retomando sessao anterior e precisa de direcao

## Quando Nao Usar

- para substituir o Orchestrator na definicao de pipeline
- para decisoes de negocio fora do escopo tecnico
- quando o usuario ja sabe exatamente o que quer fazer

## Entradas Esperadas

- estado do pipeline atual
- repo audit (se existir em `docs/repo-audit/current.md`)
- git log recente
- session summaries anteriores (em `docs/context/`)
- pendencias registradas
- `memory/constitution.md` (se existir — usar para sugerir gates faltantes)

## Heuristicas de sugestao (Spec-Driven Development)

Detectar oportunidades de aplicar os novos commands quando contexto bate:

| Contexto detectado | Sugestao prioritaria |
|---|---|
| Projeto maduro sem `memory/constitution.md` | `/constitution` (bootstrap governance) |
| Spec recente sem checks marcados | `/checklist <spec_path>` antes de `/plan` |
| Spec + plan + issues mas nenhum `docs/analysis/` recente | `/analyze` antes de `/build` |
| `/build` em andamento sem TDD e constituicao exige | rodar skill 37 antes de continuar |
| Constituicao atualizada (commit recente em `memory/`) | `/analyze` para detectar artefatos invalidados |
| `docs/specs/*.md` ou `docs/prd/*.md` sem AC quantitativos | revisitar com `/checklist` |

## Saidas Esperadas

- lista priorizada de 3-5 sugestoes com justificativa curta

## Responsabilidades

1. Analisar estado atual do projeto e pipeline
2. Identificar gaps e oportunidades de melhoria
3. Priorizar sugestoes por impacto e risco
4. Apresentar sugestoes com contexto e justificativa
5. Adaptar sugestoes ao tipo de projeto e stack detectada

## Fontes de Contexto

| Fonte | O que extrai |
|---|---|
| Repo Audit | gaps de stack, testes, docs e seguranca |
| Git log | trabalho recente, momentum, areas ativas |
| Session Summaries | pendencias, proximos passos, blockers |
| Pipeline state | onde parou, quais skills ja rodaram |
| CLAUDE.md | se o projeto esta configurado para o kit |

## Padroes de Sugestao

- Projeto sem audit -> "Rodar Repo Auditor primeiro para mapear o estado atual"
- CLAUDE.md generico ou ausente -> "Rodar CLAUDE.md Generator para configurar o projeto"
- Sem testes detectados -> "Criar estrategia de testes com QA Testing"
- Interface desatualizada ou sem design system -> "Rodar Design Intelligence para avaliar UI"
- Codigo sem review recente -> "Executar Security Review + Reviewer para garantir qualidade"

## Integracao com Outras Skills

- **Orchestrator (09)**: usa as sugestoes para decidir proximo pipeline ou step
- **Context Manager (08)**: fornece estado atual e historico de sessoes
- **Repo Auditor (18)**: fornece gaps e riscos do projeto

## Evidencia de Conclusao

- sugestoes apresentadas com justificativa clara
- usuario escolheu uma sugestao ou descartou com motivo

## Handoff

Entregar:

- lista de sugestoes priorizadas
- contexto e fontes usadas para gerar as sugestoes
- skill recomendada para a sugestao escolhida

Seguir `policies/handoffs.md`.

## Codigo Limpo

Manter sugestoes objetivas, priorizadas e com justificativa concisa para decisao rapida.
