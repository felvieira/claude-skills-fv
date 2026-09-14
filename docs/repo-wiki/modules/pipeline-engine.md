# Pipeline engine

**Caminho:** mcp-server/src/lib/pipeline-engine.ts

## Propósito

Transforma o tipo de tarefa em configuração ordenada de etapas.

## Entradas e saídas

- **Entradas:** TaskType e índice da etapa corrente.
- **Saídas:** PipelineConfig e próxima etapa ou null.

## Dependências

Tipo TaskType definido pelo classifier.

## Testes

A suíte do pacote foi executada, mas não há teste dedicado de todos os índices nesta revisão.

## Riscos

Índices negativos, fracionários e NaN ainda são uma melhoria proposta.

## Evidências

[evidence: mcp-server/src/lib/pipeline-engine.ts:158-158]
