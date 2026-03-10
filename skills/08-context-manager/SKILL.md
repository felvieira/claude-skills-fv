---
name: context-manager
description: |
  Skill de gerenciamento de contexto e tarefas usando o mecanismo de task, memoria ou checklist disponivel no ambiente,
  com persistencia enxuta entre sessoes quando fizer sentido. Use quando precisar organizar tarefas, acompanhar progresso,
  trocar foco de trabalho, ou manter historico resumido. Trigger em: "criar tarefa", "lista de tarefas", "status",
  "progresso", "trocar foco", "resetar contexto", "o que falta", "proxima tarefa", "historico", "pipeline".
---

# Context Manager - Gerenciamento de Contexto e Tarefas

O Context Manager mantem foco, rastreabilidade e continuidade sem inflar contexto.

## Governanca Global

Esta skill herda comportamento base de `GLOBAL.md` e destas policies:

- `policies/execution.md`
- `policies/persistence.md`
- `policies/token-efficiency.md`
- `policies/handoffs.md`
- `policies/evals.md`

Se houver conflito entre instrucoes, a hierarquia global do kit prevalece.

## Quando Usar

- criar ou reorganizar lista de tarefas
- registrar mudanca de foco, bloqueio ou decisao relevante
- resumir estado atual para continuidade entre sessoes
- manter dependencias entre frentes visiveis

## Quando Nao Usar

- para substituir a logica do Orquestrador
- para persistir conversa operacional longa sem valor futuro
- para registrar detalhes triviais que nao ajudam a proxima etapa

## Entradas Esperadas

- pedido atual do usuario
- plano ou pipeline em execucao
- estado atual das tarefas
- dependencias, bloqueios e decisoes relevantes

## Saidas Esperadas

- lista de tarefas atualizada
- foco atual resumido
- historico enxuto quando houver troca de contexto
- handoff curto para o Orquestrador ou proxima skill

## Responsabilidades

1. Criar listas de tarefas a partir de specs, issues ou pedidos do usuario
2. Atualizar status das tarefas em tempo real conforme progresso
3. Detectar mudanca de foco quando o usuario muda de assunto
4. Resumir e persistir apenas o que ajuda a proxima sessao
5. Tornar dependencias e blockers visiveis

## Ciclo de Vida de uma Tarefa

Usar o mecanismo disponivel no ambiente:

`Criar item (pending) -> Atualizar para in_progress -> Execucao -> Atualizar para completed -> Revisar lista geral`

## Regras de Operacao

- titulo no imperativo e curto
- uma tarefa `in_progress` por vez quando possivel
- no maximo 15 tarefas ativas antes de priorizar ou arquivar
- bloquear ruido e manter so o necessario para continuidade

## Mudanca de Foco

Quando o pedido sair do escopo atual:

- identificar se o novo pedido compete com o trabalho ativo
- confirmar com o usuario apenas se arquivar puder ocultar algo ainda importante
- persistir resumo curto do contexto anterior
- registrar o novo foco com tarefas iniciais

## Persistencia Recomendada

Preferencia de mecanismos:

1. ferramenta nativa de task ou memoria do ambiente
2. arquivo local sob `docs/context/` quando o ambiente for stateful
3. resumo curto em handoff quando nao houver persistencia entre sessoes

Se usar arquivo local, preferir `docs/context/current-focus.md` e `docs/context/history.md`.

## Integracao com Orchestrator

- o Orquestrador decide qual skill executa
- o Context Manager acompanha progresso, dependencias e blockers
- cada etapa concluida gera estado resumido e pronto para handoff

## Evidencia de Conclusao

- lista de tasks coerente com o foco atual
- estado atual resumido sem ruido operacional
- dependencias e blockers visiveis para a proxima etapa

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/handoff.md`.
