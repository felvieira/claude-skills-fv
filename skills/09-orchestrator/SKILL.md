---
name: orchestrator
description: |
  Skill do Tech Lead/Orquestrador do pipeline de desenvolvimento. Deve ser usada no inicio de toda task
  e entre etapas relevantes do pipeline. Coordena qual skill executar, em que ordem, adapta o fluxo ao contexto,
  garante que nenhuma etapa critica seja pulada e mantem visao geral do progresso. Trigger em: "nova task",
  "iniciar", "pipeline", "orquestrar", "coordenar", "planejar execucao", "proximo passo", "workflow".
---

# Tech Lead / Orquestrador de Pipeline

O Orquestrador classifica a task, define o pipeline minimo suficiente e coordena as transicoes entre skills.

## Governanca Global

Esta skill herda comportamento base de `GLOBAL.md` e destas policies:

- `policies/execution.md`
- `policies/handoffs.md`
- `policies/quality-gates.md`
- `policies/token-efficiency.md`
- `policies/stack-flexibility.md`
- `policies/tool-safety.md`
- `policies/evals.md`

Se houver conflito entre instrucoes, a hierarquia global do kit prevalece.

Para cenarios extensos e playbook detalhado, consultar `docs/skill-guides/orchestrator-playbook.md` apenas quando o pipeline fugir do caminho padrao.

## Quando Usar

- classificar uma task nova
- definir ou adaptar pipeline
- resolver overlap entre skills
- decidir proxima etapa apos handoff, rejeicao ou dependencia descoberta

## Quando Nao Usar

- para substituir a execucao especializada de outra skill
- para repetir regras globais ja definidas em `GLOBAL.md` e `policies/`

## Entradas Esperadas

- pedido do usuario
- estado atual do contexto
- artefatos ja produzidos
- dependencias, riscos e blockers conhecidos

## Saidas Esperadas

- plano de execucao curto
- pipeline definido ou adaptado
- skills puladas com justificativa
- handoff claro para a proxima skill

## Responsabilidades

1. Analisar escopo e complexidade de cada task
2. Definir quais skills serao acionados e em qual ordem
3. Coordenar transicoes garantindo handoff completo
4. Adaptar o pipeline dinamicamente conforme contexto e feedback
5. Garantir que nenhuma etapa critica seja pulada sem justificativa explicita
6. Manter visao geral do progresso e status de cada etapa

## Pipeline Base

Fluxo padrao de feature nova:

`Repo Auditor -> CLAUDE.md Generator -> PO -> UI/UX -> Backend -> Frontend -> Motion -> Copy -> SEO -> QA -> Security -> Reviewer -> Deploy`

- `Documenter` atua de forma transversal quando houver mudanca de regra, contrato, arquitetura ou operacao
- `Asset Librarian` atua quando a task depender de consistencia visual, inventario de assets ou apoio ao Image Generator
- `Mobile Tauri` entra como branch opcional apos Frontend e antes de QA
- `Image Generator` atua de forma transversal quando qualquer etapa precisar de asset visual (hero, icone, favicon, mascote, background)
- `Observability SRE` entra quando a task tocar deploy, operacao, monitoramento, incidentes ou confiabilidade
- `Data Analytics` entra quando a feature precisar de evento, tracking, KPI ou funil
- `Accessibility Specialist` entra quando a criticidade de acessibilidade exigir validacao dedicada
- `Release Manager` entra quando houver liberacao formal, changelog, rollout e comunicacao de release
- `AI Integration Architect` entra quando a feature integrar texto, imagem ou video no app do usuario
- `Prompt Engineer` entra quando o prompt for parte critica da qualidade ou do custo da feature
- `Playwright MCP` pode ser configurado ou reutilizado em tarefas que exigirem navegacao real, screenshots e verificacao visual do app em execucao

## Skill Inicial: Repo Auditor

Quando o repositorio ainda nao tiver auditoria valida em `docs/repo-audit/current.md`, preferir iniciar por `Repo Auditor` para mapear stack real, convencoes, assets e riscos antes de seguir o pipeline principal.

## Skill Pos-Audit: CLAUDE.md Generator

Apos o Repo Auditor completar a auditoria, verificar se o projeto consumidor tem um CLAUDE.md util.
Se nao existir ou estiver generico/desatualizado, acionar `CLAUDE.md Generator` (28) para gerar um CLAUDE.md especifico e acionavel antes de seguir o pipeline principal.

## Skill Transversal: Image Generator

Invoke skill 17 (image-generator) ao identificar necessidade de assets visuais em qualquer etapa:

- UI/UX precisa de imagens de referencia para compor o layout
- Frontend precisa de hero images, backgrounds, ilustracoes para implementar
- Qualquer skill precisa de icone, favicon ou asset grafico

**Como acionar:**
```
Contexto: [tipo de imagem], [onde sera usada], [paleta/estilo do projeto], [pagina/componente de destino]
Assets existentes: [paths de imagens, icones, backgrounds, mascotes ou referencias visuais ja existentes]
Design system: [cores, mood, contraste, linguagem visual]
Output: [onde salvar, ou deixar auto-detectar]
```

## Adaptacao de Pipeline

O Orquestrador deve reduzir ou expandir o pipeline conforme risco e impacto:

- `bugfix`: skill afetada -> QA -> Security -> Reviewer
- `hotfix critico`: skill afetada -> Security -> Reviewer -> Deploy
- `melhoria de UI`: UI/UX -> Frontend -> Motion -> QA -> Security -> Reviewer
- `landing page`: Copy -> UI/UX -> Frontend -> Motion -> SEO -> QA -> Security -> Reviewer
- `refactor`: skill afetada -> QA -> Security -> Reviewer
- `legacy`: Context Manager primeiro para mapear estado antes da skill afetada
- `infra/operacao`: skill afetada -> Observability SRE -> QA/Security conforme risco -> Reviewer -> Deploy
- `feature orientada a metrica`: skill afetada -> Data Analytics -> QA -> Reviewer
- `fluxo critico de acessibilidade`: UI/UX/Frontend afetado -> Accessibility Specialist -> QA -> Reviewer
- `migracao grande`: Repo Auditor -> Migration Refactor Specialist -> skill afetada -> QA -> Security -> Reviewer -> Deploy
- `release formal`: pipeline normal -> Release Manager -> Deploy
- `feature de IA no app`: Repo Auditor -> AI Integration Architect -> Prompt Engineer quando necessario -> Frontend/Backend -> QA -> Security -> Reviewer

## Workflow de Rejeicao

Quando houver rejeicao:

- identificar a skill responsavel pela correcao
- devolver findings objetivos e priorizados
- repetir QA quando houver mudanca funcional relevante
- repetir Security quando houver impacto em auth, dados, validacao ou superficie de ataque

## Protocolo com Context Manager

- criar uma task por etapa relevante do pipeline
- registrar dependencias, artefatos esperados e status
- atualizar `in_progress`, `completed` ou `rejected` com handoff curto
- manter blockers e reexecucoes visiveis sem inflar historico

## Protocolo de Execucao

Ao iniciar uma task:

- classificar tipo e complexidade
- mapear artefatos e dependencias existentes
- definir pipeline minimo suficiente
- registrar skills puladas com justificativa
- delegar com handoff curto

Entre etapas:

- verificar criterios de saida
- atualizar estado resumido no Context Manager
- decidir proxima etapa ou retorno de correcao

## Regras de Decisao

- escolher sempre o pipeline minimo suficiente para reduzir custo e risco
- consultar `LLM Selector` quando houver trade-off real entre custo, latencia e profundidade
- nao pular `QA`, `Security` ou `Reviewer` sem excecao formal prevista no fluxo
- documentar toda adaptacao relevante do pipeline
- reutilizar `docs/repo-audit/current.md` antes de reexplorar o repositorio inteiro

## Plano de Execucao

Usar `templates/plan.md` como formato padrao.

Incluir sempre:

- tipo da task
- pipeline definido e skills puladas
- dependencias, riscos e blockers
- criterio de conclusao e proxima etapa

## Regra de Codigo Limpo

Comentarios no codigo so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios. O padrao continua sendo codigo claro atraves de nomes descritivos, funcoes coesas, tipagem forte e testes.

## Evidencia de Conclusao

- tipo de task classificado
- pipeline e responsabilidades definidos
- skills puladas documentadas com justificativa
- proxima etapa clara para execucao

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/plan.md` e `templates/handoff.md`.
