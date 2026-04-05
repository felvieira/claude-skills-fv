# Token Economy Roadmap

## Objetivo
Melhorar o kit para reduzir releitura, evitar contexto desnecessario e ajudar o dev a usar IA com mais consistencia no dia a dia.

## Fase 1
- status: concluida
- corrigir hooks para ler `.bot/hooks/config.json` no modo instalado e `hooks/config.json` no repo do kit
- reduzir a injecao de learned skills para resumo curto em vez de corpo completo
- validar essas garantias em `scripts/check-consistency.mjs`

## Fase 2
- status: concluida
- criar `devkit_context_pack` para montar contexto minimo por tarefa
- criar `devkit_diff_brief` para resumir diff e retomada de sessao
- melhorar `devkit_track_cost` com sinais reais de uso: leituras repetidas, arquivos grandes, tools acionadas, APIs externas

## Fase 3
- status: concluida
- criar `working-set` persistente por sessao com arquivos quentes, decisoes e proximos passos
- detectar repeticao de exploracao e sugerir reuse de artefatos ou learned skills
- adicionar perfis de setup (`lean`, `daily-dev`, `research`) e modo nao interativo

## Criterio de sucesso
- menos contexto injetado automaticamente sem perda de acuracia
- menos releitura manual para retomar trabalho
- menor custo medio para tasks repetitivas e exploracao de codigo
