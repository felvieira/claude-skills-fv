<inputs>
Peça-me: o nome do drinque, os três ingredientes com as medidas e a cor de destaque. Se eu pular algum item, use Negroni, 30 ml de gin, 30 ml de Campari, 30 ml de vermute doce e o vermelho #c8102e.
</inputs>

<direction>
Explicativo de receita de 12 s em 1280x720, do copo vazio ao drinque pronto. Sensação: editorial, claro, de bar de bairro caprichado; uma coisa nova a cada 2 s.
Paleta: papel #f6efe4, tinta #1f1c19, uma cor de destaque #c8102e usada só no líquido e na medida que está entrando. Tipografia: uma família de interface (system-ui) em peso 600 para as medidas e 400 para as legendas.
Câmera: parada, copo no centro; quem se move é o líquido. Molas por toda parte, sem sobrepasso no texto.
Proibido: fotos, sombras pesadas, gradientes na interface, partículas, easing elástico, tempo morto, medida inventada.
</direction>

<structure>
120 BPM, 6 compassos; uma etapa a cada 4 batidas.
b0–4: título do drinque e copo vazio.
b4–8: três cubos de gelo caem e assentam.
b8–12: gin entra, 30 ml aparece ao lado e some antes da próxima medida.
b12–16: Campari entra, 30 ml.
b16–20: vermute doce entra, 30 ml.
b20–23: a colher mexe e as três camadas viram uma cor só.
b23–24: casca de laranja no copo e o nome do drinque de volta. Fim.
</structure>

<build>
1. Um arquivo HTML, 1280x720. Todo estilo é calculado a partir do tempo dentro de seek(t): sem transições de CSS, sem timers, sem estado carregado entre quadros.
2. As molas são respostas ao degrau em forma fechada (closed-form). O nível de cada líquido, a mistura de cor e a opacidade de cada medida são funções puras do tempo (track).
3. A medida que entra e a que sai têm tempos próprios: nunca duas medidas na tela ao mesmo tempo.
4. Escrito contra layout() em unidades relativas, para sair também em 9:16 e 1:1.
5. As etapas caem na grade de 120 BPM (snapToBeat); trilha sintetizada na mesma linha do tempo com um tick por etapa.
6. Renderize com Playwright + ffmpeg (render-seek). Antes do render completo, renderize quadros-chave em uma folha, olhe e corrija até todo quadro valer 8 ou mais.
</build>

<gotchas>
O canvas lê o tamanho do quadro do viewport. Camadas de líquido têm de somar exatamente a altura do copo; confira no último quadro de cada etapa. Texto de medida nunca sobrepõe o jato.
</gotchas>

<start>
Peça-me os inputs e, antes de escrever qualquer código, mostre-me o mapa de batidas e quatro quadros-chave planejados.
</start>
