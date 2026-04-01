---
name: session-summary
description: |
  Skill de resumo de sessao para handoff entre sessoes. Consolida o que foi feito, decisoes tomadas,
  artefatos produzidos, pendencias e proximos passos. Facilita continuidade sem perder contexto.
  Trigger em: "resumo", "summary", "o que foi feito", "handoff", "encerrar sessao", "passar bastao",
  "continuar depois", "recap".
argument-hint: "[--save | --show]"
allowed-tools: Read, Write, Glob, Grep
---

# Session Summary

O Session Summary consolida o trabalho realizado durante uma sessao para garantir continuidade entre sessoes. Registra acoes, artefatos, decisoes, pendencias e proximos passos, permitindo que outro dev ou agente retome o trabalho sem perder contexto.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/handoffs.md` e `policies/evals.md`.

## Quando Usar

- ao encerrar uma sessao de trabalho
- ao passar contexto para outro dev ou agente
- quando a sessao foi longa e complexa com multiplas skills
- quando retomar trabalho apos pausa prolongada

## Quando Nao Usar

- para substituir documentacao formal do projeto
- para sessoes triviais com apenas 1 comando executado
- para registrar decisoes de arquitetura (usar Documenter)

## Entradas Esperadas

- historico da sessao atual
- artefatos criados ou modificados
- git log recente
- estado do pipeline

## Saidas Esperadas

- resumo em `docs/context/session-YYYY-MM-DD.md`
- atualizacao de `docs/context/current-focus.md`

## Responsabilidades

1. Consolidar acoes realizadas durante a sessao
2. Listar artefatos produzidos ou modificados
3. Registrar decisoes importantes tomadas durante a sessao
4. Identificar pendencias e blockers encontrados
5. Recomendar proximos passos priorizados

## Formato do Resumo

```markdown
# Resumo de Sessao — YYYY-MM-DD

## Pipeline Executado
[nome do pipeline ou descricao]

## O que foi feito
- [acao 1]
- [acao 2]
- [acao 3]

## Artefatos Produzidos
| Artefato | Caminho | Status |
|---|---|---|
| Componente Header | src/components/Header.tsx | criado |
| Teste unitario | tests/header.test.ts | criado |
| Auditoria | docs/repo-audit/current.md | atualizado |

## Decisoes Tomadas
- [decisao 1 e justificativa]
- [decisao 2 e justificativa]

## Pendencias / Blockers
- [ ] [pendencia 1]
- [ ] [pendencia 2]

## Proximos Passos Recomendados
1. [passo 1]
2. [passo 2]
3. [passo 3]
```

## Integracao com Outras Skills

- **Orchestrator (09)**: aciona o Session Summary ao final do pipeline
- **Context Manager (08)**: persiste o resumo e atualiza o foco atual
- **Cost Tracker (30)**: anexa custos da sessao ao resumo quando disponivel

## Evidencia de Conclusao

- resumo salvo em `docs/context/session-YYYY-MM-DD.md`
- `docs/context/current-focus.md` atualizado
- pendencias e proximos passos claros e priorizados

## Handoff

Entregar:

- caminho do resumo da sessao
- estado das pendencias e blockers
- proximos passos priorizados

Seguir `policies/handoffs.md`.

## Codigo Limpo

Manter resumos concisos, objetivos e reutilizaveis para continuidade eficiente entre sessoes.
