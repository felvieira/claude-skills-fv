<inputs>
Peça-me: o texto do botão e a cor de destaque. Se eu pular algum item, use "Pagar" e o laranja #c9633d.
</inputs>

<direction>
Filme de 6 s em 1280x720, em loop. Sensação: calmo, preciso, de interface de produto bem-feito.
Paleta: fundo #fbf8f3, tinta #1f1c19, uma cor de destaque #c9633d usada só na forma que se transforma. Tipografia: uma família de interface (system-ui) em peso 600.
Câmera: parada; quem se move é a forma. Molas por toda parte, no máximo um sobrepasso mínimo.
Proibido: gradientes, brilhos, partículas, easing elástico, tempo morto, texto empilhado sobre o spinner.
</direction>

<structure>
120 BPM, 3 compassos; uma mudança de estado a cada 3 batidas.
b0–3: botão em pílula com o rótulo. Estado inicial = estado final.
b3–6: o botão vira um círculo escuro; o rótulo some antes de o spinner entrar.
b6–9: o círculo vira um cartão com o rótulo novo; o spinner sai antes do rótulo entrar.
b9–12: o cartão volta a ser o botão. O último quadro é igual ao primeiro, para o loop não engasgar.
</structure>

<build>
1. Um arquivo HTML, 1280x720. Todo estilo é calculado a partir do tempo dentro de seek(t): sem transições de CSS, sem timers, sem estado carregado entre quadros.
2. As molas são respostas ao degrau em forma fechada (closed-form). Um valor que muda de alvo várias vezes é a soma de uma mola por mudança (track), então continua função pura do tempo.
3. Texto que troca dentro de um contêiner que se transforma tem entrada e saída com tempos próprios.
4. Escrito contra layout() em unidades relativas: o mesmo filme sai em 16:9, 9:16 e 1:1.
5. Os instantes das mudanças são travados na grade de 120 BPM (snapToBeat).
6. Renderize com Playwright + ffmpeg (render-seek). Antes do render completo, renderize quadros-chave em uma folha, olhe e corrija até todo quadro valer 8 ou mais.
</build>

<gotchas>
O canvas lê o tamanho do quadro do viewport, nunca um número fixo. Rótulo e spinner nunca coexistem: escalone a saída de um e a entrada do outro. Confira o quadro 0 contra o último.
</gotchas>

<start>
Peça-me os inputs e, antes de escrever qualquer código, mostre-me o mapa de batidas e quatro quadros-chave planejados.
</start>
