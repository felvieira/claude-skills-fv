# Eval - Session Summary Basics

## Objetivo
Validar que o Session Summary produz um handoff conciso e util ao encerrar uma sessao de trabalho.

## Entrada
- sessao com: skill Backend criou 3 endpoints, skill QA encontrou 1 bug, bug foi corrigido
- pendencia: deploy nao foi feito

## Esperado
- secao "Concluido" listando os 3 endpoints e a correcao do bug
- secao "Pendencias" com deploy
- secao "Proximo passo" apontando para skill Deploy
- nenhum codigo inline — apenas referencias a arquivos

## Evidencias Minimas
- arquivo salvo em `docs/session/[data]-summary.md`
- resumo com no maximo 30 linhas
- paths de arquivos modificados incluidos

## Casos Limite
- sessao sem nenhum artefato produzido: registrar tentativas, decisoes e motivo da interrupcao
- sessao com muitas tasks: agregar por tema, nao listar cada micro-acao
