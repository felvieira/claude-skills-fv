# Gotchas completos

Falhas vistas construindo e usando esta skill. A lista curta está no `SKILL.md`; aqui está tudo.

- **Canvas com tamanho fixo × viewport diferente**: a forma saiu fora do centro e o MP4 "rodou sem erro". Só a folha de quadros mostrou.
- **`file://` bloqueia `import` de módulo no Chromium**: por isso o renderizador serve a pasta numa porta local efêmera e mapeia `/_lib/` para `scripts/`.
- **Sobreposição nas trocas de estado**: rótulo ainda visível por baixo do spinner em t=1,6 e spinner sobrando por baixo do rótulo seguinte em t=3,1.
- **`xstack` do ffmpeg exige 2+ entradas**: folha de um quadro só precisa de caminho próprio (`-vf scale`).
- **"Chromium ok" não é "Chromium abre"**: o Playwright novo usa um *headless shell* separado e uma instalação interrompida deixa só o executável completo.
- **`Unable to update lock ... __dirlock`** derruba o `playwright install` no meio (visto no Windows, em disco secundário): o doctor remove o lock obsoleto e tenta de novo (até 3 vezes).
- **O Node acha `node_modules` de pastas-pai**, então um Playwright global esconde a falta do pacote no projeto. `PLAYWRIGHT_DIR` e a pasta de ferramentas são resolvidos
- **Cor com `NaN` não dá erro: o canvas ignora o `fillStyle` e usa o anterior.** Na animação de receita o líquido ficou invisível (desenhado na cor do papel) porque uma função de mistura recebeu um array onde esperava hex. Só a folha de quadros mostrou. Funções de cor aceitam hex **ou** [r,g,b], e vale conferir um pixel.
- **Sinal invertido na altura de uma camada** fez um cubo de gelo atravessar o fundo do copo; e camadas de líquido têm de somar a altura do copo. Confira o último quadro de cada etapa.
- **Reproduzir um pedido curto da galeria não é copiar a frase**: 92% das entradas são frases de uma linha (30 delas a mesma). Escreva um brief próprio na camada certa (`PADRAO.md`) e verifique com `brief-lint`.
- **Filme que muda conforme a ordem do seek engana a folha de quadros.** `check-film.mjs` pega estado preso, loop aberto e erro de página antes de qualquer olhar. Loop é "o quadro **depois** do último (`t = DURATION`) igual ao primeiro", não "o último quadro": um pulso preso à batida difere no último quadro por construção e só recomeça no primeiro.
- **Render que roda não é filme bom.** Os dois primeiros exemplos eram provas de pipeline: texto médio, sem câmera, nada que alguém mostraria. Meça pela régua de `references/QUALIDADE.md` e parta do `assets/example-launch`.
- **Sem esforço alto o resultado vira "texto centralizado em gradiente"**: dê referência e peça os quadros-chave antes do código final.
