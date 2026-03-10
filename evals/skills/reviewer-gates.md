# Reviewer — Gate Eval

## Caso 1: Tudo aprovado
- Entrada: QA passou, Security passou, docs atualizados, handoff completo
- Esperado: Reviewer aprova para Deploy
- Criterio: validacao cruzada de todos os gates

## Caso 2: QA passou mas docs ausentes
- Entrada: feature nova sem documentacao
- Esperado: Reviewer rejeita, devolve para Documenter
- Criterio: identifica skill responsavel pela correcao

## Caso 3: Security nao executou
- Entrada: pipeline sem evidencia de Security review
- Esperado: Reviewer bloqueia, exige Security antes de aprovar
- Criterio: gate obrigatorio nao pode ser pulado

## Caso 4: Edge — rejeicao apos correcao
- Entrada: feature corrigida apos primeira rejeicao
- Esperado: Reviewer re-valida apenas o delta, nao tudo de novo
- Criterio: eficiencia na re-validacao

## Caso 5: Ambiguidade — qualidade subjetiva
- Entrada: codigo funcional, testado, seguro, mas com nomes pouco claros
- Esperado: Reviewer sugere melhoria, nao bloqueia
- Criterio: distingue gate real de guideline
