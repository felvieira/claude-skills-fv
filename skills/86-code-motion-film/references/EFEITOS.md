# EFEITOS — funções do tempo, nunca relógio

Todo efeito é uma função de `t`: por isso busca, loop e render funcionam como o resto do filme. O "acaso" vem de `hash(i, semente)`, **nunca** de `Math.random`
(`check-film.mjs` reprova). Importe na página com `import { ... } from "/_lib/fx.mjs"`. Leia esta lista, não o arquivo.

## Tempo e acaso (`skills/86-code-motion-film/scripts/fx.mjs`)

| Chamada | Devolve |
|---|---|
| `hash(i, semente)` | número fixo em [0, 1) para um inteiro |
| `noise(x, semente)` | ruído suave em [-1, 1]; alimente com `t * taxa` para deriva |
| `stepOf(t, taxa)` | número do passo a `taxa` por segundo, para efeitos que mudam aos saltos |
| `stagger(t, t0, i, intervalo, dur)` | progresso 0..1 do item `i` num grupo escalonado; mantenha `n × intervalo` abaixo de ~0,5 s |
| `countUp(t, t0, dur, de, para)` | número que conta até o valor; use algarismos de largura fixa |

## Câmera e impacto

| Chamada | Efeito |
|---|---|
| `camera(z, fx, fy)` (`stage.mjs`) | zoom em torno de um ponto do espaço de design, dentro de `ctx.save()` |
| `kenBurns(t, t0, t1, de, para)` | empurrão e deslocamento lentos sobre uma foto: `{s, x, y}` |
| `shake(t, t0, dur, amp, semente)` | impacto que assenta: `{x, y, r}`, zero fora da janela |
| `ambient(t, duração, amp, semente)` | respiração/mão na câmera que **fecha o loop** (ciclos inteiros); some só se você reduzir `amp` |

## Formas e revelações

| Chamada | Efeito |
|---|---|
| `dashFor(comprimento, p)` | traça um caminho aos poucos: `ctx.setLineDash(d.dash); ctx.lineDashOffset = d.offset` |
| `wipeRect(p, "left"/"right"/"top"/"bottom", w, h)` | retângulo de recorte que revela a partir de um lado (`ctx.rect` + `ctx.clip`) |
| `irisRadius(p, cx, cy, w, h)` | raio do círculo que revela o quadro (`ctx.arc` + `ctx.clip`) |
| `confetti(i, t, t0, {x, y, semente})` | peça `i` de uma explosão, em forma fechada: `{x, y, r, a, hue}` |

## Texto (`stage.mjs`)

| Chamada | Efeito |
|---|---|
| `letters(texto, x, y, tamanho, cor, t, opções)` | letras que caem e assentam uma a uma (uma mola por letra) |
| `typed(texto, t0, cps, t)` | o texto digitado até agora; pareie com um cursor sólido no primeiro e no último quadro |

## Textura e luz

- **Grão de filme**: `createStage({ grain: 0.055 })` já aplica ruído em função do número do quadro (`grain: 0` desliga). Valores de 0,04 a 0,12; acima disso o texto sofre.
- **Clarão no corte**: `createStage` já faz um clarão de 2 quadros na troca de cena (`flash`, `flashFrames`).
- **Movimento rápido**: `render-seek --blur 4` (motion blur por subquadros) em vez de borrar à mão.
- **Vinheta, linhas de varredura, vazamento de luz, glitch (separação RGB, tremor, fatias)**: não vêm prontos. Escreva-os como função de `t` na própria página, com `hash` para o que
  for aleatório; um efeito de glitch vive num elemento interno e volta ao estado neutro quando acaba. Se servir a outros filmes, entre em `fx.mjs` com teste.

## Gosto

- **Um efeito-assinatura por vídeo vale mais que cinco.** Escolha-o no brief e diga por que serve àquele assunto.
- Em filme de produto, a interface **é** o efeito: nada de glitch, grão pesado, brilho, partículas ou confete sobre o app. Vinheta, título, clipe musical e cartela final podem usar.
- Efeitos marcam momentos: glitch num corte, confete no resultado, tremor no drop. Os constantes (grão, vinheta, vazamento) ficam discretos; vazamento de luz só em material quente ou nostálgico.
- Texto sobre gravação fica sobre uma placa ou faixa escurecida e continua legível no tamanho de um celular.
- Um efeito novo entra primeiro na página do filme como função de `t`; se servir a outros, vai para `fx.mjs` **com teste** (`scripts/tests/skill-86-fx.test.mjs`) e para esta lista na mesma mudança.

Estrutura da lista (efeitos agrupados por tempo/câmera/forma/texto/textura e a regra do efeito-assinatura) inspirada em kaventro/motion-designer (MIT); funções e textos próprios.
