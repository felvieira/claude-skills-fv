# Daily Token Workflow

Fluxo curto para usar o kit com menos releitura e menos desperdicio de contexto.

## Antes de comecar

1. Ler `docs/repo-audit/current.md` se existir
2. Se o repo mudou muito ou a auditoria nao existir, rodar `Repo Auditor`
3. Montar um `devkit_context_pack` com a tarefa atual

## Durante a execucao

1. Salvar foco e decisoes com `devkit_save_context`
2. Manter arquivos quentes no `devkit_working_set`
3. Evitar reler os mesmos arquivos grandes sem resumir antes
4. Preferir code intelligence antes de `Grep` ou `Read` bruto quando disponivel

## Para retomar ou revisar

1. Rodar `devkit_diff_brief`
2. Ler `docs/context/current-focus.md`
3. Ler `docs/context/working-set.json`
4. Se a sessao foi longa, consultar `devkit_track_cost`

## Sinais de desperdicio

- mesmo arquivo lido 3 vezes
- mesmo padrao de busca repetido varias vezes
- leitura recorrente de arquivos grandes
- reauditar o repo inteiro para tasks locais
- gerar contexto amplo antes de definir escopo minimo

## Resultado esperado

- menos leitura redundante
- handoff mais curto e reutilizavel
- retomada mais rapida entre sessoes
- menor custo medio por task
