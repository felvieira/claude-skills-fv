# Persistence Policy

## Objetivo
Persistir apenas o que gera valor entre sessoes.

## Persistir
- foco atual
- decisoes importantes
- trade-offs
- blockers
- dependencias entre frentes
- proximos passos
- status resumido das etapas
- auditoria reutilizavel do repositorio quando houver valor recorrente

## Nao Persistir
- conversa operacional longa
- raciocinio descartado
- exploracao sem resultado
- checklist gigante sem valor futuro
- repeticao de contexto ja estabelecido

## Formato Ideal
Cada item persistido deve caber em 1 a 3 linhas.

## Rotina
- atualizar quando houver mudanca de fase
- atualizar quando houver decisao relevante
- atualizar quando surgir blocker real
- limpar ruido ao trocar de foco

## Auditoria de Repositorio
- quando existir `docs/repo-audit/current.md`, reutilizar esse resumo antes de reexplorar o repo inteiro
- atualizar a auditoria quando stack, convencoes, assets, testes, deploy ou observabilidade mudarem de forma relevante
- em repos que instalarem o kit em `.bot/`, aplicar a mesma regra para `.bot/docs/repo-audit/current.md`
