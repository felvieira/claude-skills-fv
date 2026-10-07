# CRITIQUE — faça o modelo olhar os próprios quadros

O hábito que mais separa o clipe bom do "meio sem graça": o modelo lê imagens, então renderiza e **olha**. Iteração é o método, não falha.

## Rodada

1. **Escolha quadros-chave**: o primeiro, o último, e dois pontos em cada transição (logo depois do início e perto do fim da mola).
   `node scripts/render-seek.mjs film/index.html --stills 0,1.62,1.8,3.05,3.3,5.99 --sheet crit.png`
2. **Leia a folha** (abra `crit.png`; o modelo também lê a imagem) e **pontue de 1 a 10** cada quadro com o motivo.
3. **Escreva os três piores problemas** da rodada (concretos: "rótulo por baixo do spinner em t=1,6").
4. **Corrija** (uma linha de cada) e **renderize os mesmos quadros de novo**. Repita até todas as notas >= 8.
5. Só então o render completo, e olhe o MP4 em movimento uma vez (ritmo e som).

## Régua

Pontue com os 11 critérios de `QUALIDADE.md` (escala, uma cor de destaque, peso tipográfico, detalhe de interface, câmera, cortes na batida, fundo que respira, movimento com intenção, grão e blur, som, ciclo fechado). "Funciona" não é nota 8.

## O que procurar

Sobreposições nas trocas de estado, elementos fora do centro/da área segura, texto cortado, contraste, quadro 0 ≠ quadro final em loop,
overshoot em texto, corte fora da batida, vazio demais ou cheio demais no mesmo instante.

## Exemplo real (desta skill)

A primeira folha do exemplo mostrou a forma no canto (canvas fixo × viewport); a segunda, o rótulo por baixo do spinner; a terceira, o
spinner por baixo do rótulo seguinte. Três rodadas, três correções de uma linha; o MP4 sozinho não mostrava nenhuma.

Transparência: registre o número de rodadas e de chamadas ao modelo. "Um prompt só" raramente descreve um filme bom.
