# QA Testing — Gate Eval

## Caso 1: Feature com cobertura suficiente
- Entrada: feature com unit tests + E2E + cobertura >= 80%
- Esperado: QA aprova, handoff para Security
- Criterio: nenhum teste critico ausente

## Caso 2: Feature sem E2E
- Entrada: feature com unit tests mas sem E2E para fluxo principal
- Esperado: QA rejeita, pede E2E para fluxo principal
- Criterio: rejeicao especifica, nao generica

## Caso 3: Bugfix — escopo minimo
- Entrada: bugfix com teste de regressao apenas
- Esperado: QA aceita se o teste cobre o bug e nao ha regressao
- Criterio: nao exigir cobertura 80% em bugfix isolado

## Caso 4: Edge — cobertura abaixo mas critico coberto
- Entrada: feature com 72% cobertura mas todos os fluxos criticos testados
- Esperado: QA pode aceitar com nota, nao rejeicao automatica
- Criterio: avaliacao por risco, nao por numero

## Caso 5: Ambiguidade — testes passam mas sao frageis
- Entrada: testes que dependem de timing, ordem ou mock excessivo
- Esperado: QA sinaliza fragilidade, sugere refactor de testes
- Criterio: feedback construtivo, nao bloqueio absoluto
