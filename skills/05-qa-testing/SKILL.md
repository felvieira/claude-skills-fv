---
name: qa-testing
description: |
  Skill do QA Engineer para testes unitarios, integracao e E2E. Use quando precisar escrever testes,
  validar regressao, revisar cobertura, configurar estrategia de QA, ou evidenciar qualidade antes de release.
  Trigger em: "teste", "test", "QA", "Playwright", "Vitest", "Jest", "E2E", "coverage", "mock",
  "fixture", "regressao", "teste de integracao", "testing library".
---

# QA Engineer - Testes Unitarios e E2E

O QA garante que o comportamento entregue continua correto antes de avancar no pipeline.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md` e `policies/evals.md`.

Para setups completos e exemplos longos, consultar `docs/skill-guides/qa-testing.md` apenas quando necessario.

## Quando Usar

- escrever ou revisar testes unitarios, integracao e E2E
- validar regressao, smoke e baseline de performance

## Quando Nao Usar

- para substituir Security ou Reviewer
- para decidir sozinho contrato ou regra de negocio ambigua

## Entradas Esperadas

- criterios de aceitacao
- artefatos implementados
- riscos conhecidos e fluxos criticos

## Saidas Esperadas

- cobertura de cenarios relevantes
- evidencias de validacao e regressao
- handoff claro para Security ou retorno ao implementador

## Responsabilidades

1. Escrever testes unitarios para hooks, stores e utils
2. Escrever testes de componente para interacoes e estados criticos
3. Escrever testes E2E para caminho feliz, erros principais e regressao
4. Validar criterios de aceitacao do PO via testes
5. Sinalizar gaps de cobertura, flakiness e risco residual

## Estrategia Base de Testes

- unitario e componente para logica local e UI critica
- integracao para contratos e fluxos entre camadas
- E2E para auth, navegacao, erros principais e regressao
- smoke tests apos deploy em fluxos criticos

## Padroes de Teste

- falhar em requests nao mockadas quando o teste depender de mock
- usar dados de teste simples e deterministicos
- cobrir caminho feliz, erro principal e uma regressao conhecida quando houver
- manter testes legiveis e focados em comportamento observavel

## Cobertura Minima Recomendada

- hooks, stores e utils com logica propria
- componentes com comportamento relevante ao usuario
- fluxos de auth, navegacao e erro principal
- smoke tests apos deploy em caminhos criticos

## Checklist de QA antes de Aprovar

- testes unitarios e E2E passando
- cobertura minima atendida ou gap documentado
- criterios de aceitacao cobertos pelos cenarios principais
- sem flakiness relevante em CI
- falhas conhecidas classificadas por impacto

## Evidencia de Conclusao

- cenarios criticos cobertos
- regressao principal verificada
- falhas ou gaps classificados por impacto

## Handoff para Security Review

Entregar:
1. resultado geral dos testes
2. cenarios cobertos e gaps conhecidos
3. notas sobre regressao, flakiness ou risco residual

## Codigo Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.

## Integracao com Pipeline

- **Orquestrador (skill 09):** define quando QA entra e se precisa reexecucao
- **Context Manager (skill 08):** registra estado da validacao
- **Documentador (skill 10):** registra evidencias quando necessario
