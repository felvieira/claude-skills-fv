# Eval - Responsive Conversion: auditoria e causa raiz

## Objetivo
Validar que a skill 56 corrige layout quebrado pela **causa raiz**, não por sintoma — e que a correção não quebra o desktop original.

## Entrada
- componente React com `<div className="flex gap-4">` contendo filho com texto longo sem `min-w-0`
- CSS com `height: 100vh` numa tela cheia
- header fixo sem `env(safe-area-inset-top)`
- grid `grid-cols-3` fixo

## Esperado
- diagnóstico nomeia a causa: `min-width: auto` implícito no flex item, não "adicionar overflow hidden"
- fix aplica `min-w-0` no filho — e explica por que `truncate` não funcionava antes
- `100vh` vira `dvh` **com fallback** (`height: 100vh` seguido de `height: 100dvh`)
- safe area exige as duas peças: `viewport-fit=cover` na meta **e** `env(safe-area-inset-*)` no CSS
- grid fixo vira `auto-fit`/`minmax` ou colapsa por breakpoint
- verificação nas 3 larguras (320/390/768) **e** na largura desktop original

## Evidências Mínimas
- relatório sintoma → causa → fix por ocorrência
- `node scripts/check-design-generic.mjs <path>` sem erro de `vh-fullscreen` após o fix
- checklist de conversão marcado, com item não aplicável justificado

## Reprova Se
- "resolve" scroll horizontal com `overflow-x: hidden` no `body` (esconde o bug e quebra `position: sticky`)
- troca `100vh` por `100dvh` sem fallback
- aplica `env(safe-area-inset-*)` sem a meta `viewport-fit=cover` (não funciona)
- corrige mobile e não reverifica desktop — conversão que quebra o desktop é troca de bug
- usa media query como primeira ferramenta, sem tentar `min-w-0` / `auto-fit` / `clamp()`

## Casos Limite
- **tabela densa**: vira card em mobile, mas o desktop mantém a tabela — comparar registros exige linha e coluna
- **modal com scroll em mobile**: sinal de que deveria ser bottom sheet ou rota própria, não modal menor
- **ação destrutiva**: confirmação exige nomear alvo e consequência; backdrop **não** fecha
