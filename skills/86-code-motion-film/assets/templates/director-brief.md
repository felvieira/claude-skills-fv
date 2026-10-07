<!--
TEMPLATE — brief de diretor (camada T2 do PADRAO.md). Texto nosso.
Preencha todos os campos [EDITE: ...] e apague este comentário. A parte <build> já traz o motor da skill 86: só mexa nela com motivo.
Confira com: node skills/86-code-motion-film/scripts/brief-lint.mjs seu-brief.md --strict
-->
<inputs>
Peça-me: [EDITE: o que só eu sei — nome do produto, logo, a frase ou tela principal, a cor de destaque, uma trilha livre de direitos perto de 120 BPM]. Se eu pular algum item, use estes padrões: [EDITE: um valor padrão para cada item acima].
</inputs>

<direction>
Filme de [EDITE: 15] s em [EDITE: 1920x1080]. Sensação: [EDITE: 3 a 5 palavras e uma referência nomeada, ex.: "editorial, quente, preciso — como um lançamento da Linear"].
Paleta: [EDITE: fundo #hex, tinta #hex, uma cor de destaque #hex usada só no ponto focal]. Tipografia: [EDITE: uma família de interface e, se precisar, uma mono].
Câmera: uma câmera contínua sobre um único "mundo"; nunca dois movimentos de câmera ao mesmo tempo. Molas por toda parte, no máximo um sobrepasso mínimo.
Proibido: [EDITE: pelo menos 3 itens, ex.: gradientes na interface, brilhos, explosões de partículas, easing "elástico", tempo morto, qualquer coisa que pareça template].
</direction>

<structure>
[EDITE: 120] BPM, [EDITE: 7] compassos; algo acontece a cada batida.
b0–2: [EDITE: o que se vê no primeiro quadro e como a câmera começa].
b2–9: [EDITE: segunda ideia, com o elemento que se transforma].
b9–16: [EDITE: o momento de maior energia; coincide com a "queda" da música].
b16–28: [EDITE: fechamento]. O último quadro é igual ao primeiro (posição e velocidade do cursor incluídas), para o loop não engasgar.
</structure>

<build>
1. Um arquivo HTML, [EDITE: 1920x1080]. Todo estilo é calculado a partir do tempo dentro de seek(t): sem transições de CSS, sem timers, sem estado carregado entre quadros.
2. As molas são respostas ao degrau em forma fechada (closed-form). Um valor que muda de alvo várias vezes é a soma de uma mola por mudança, então continua função pura do tempo.
3. Texto que troca dentro de um contêiner que se transforma tem entrada e saída com tempos próprios, para nunca se sobrepor.
4. Cenas escritas contra uma função de layout (unidades relativas), não contra pixels fixos; o mesmo filme sai em 16:9, 9:16 e 1:1.
5. Se houver trilha própria, meça o BPM e o primeiro tempo; se não, sintetize na mesma linha do tempo. Todo corte cai numa batida.
6. Renderize com Playwright + ffmpeg (node skills/86-code-motion-film/scripts/render-seek.mjs). Antes do render completo, renderize um quadro por batida em uma folha só, olhe e corrija o que estiver fora da grade, apertado ou ilegível. Repita até todo quadro valer 8 ou mais.
</build>

<gotchas>
Nunca use will-change em algo que a câmera escala, ou o texto renderiza borrado. Quando uma forma preenche a tela, escale-a além dos quatro cantos. O que sai e o que entra precisam de tempos separados. Confira o quadro 0 contra o último quadro.
</gotchas>

<start>
Peça-me os inputs e, antes de escrever qualquer código, mostre-me o mapa de batidas e quatro quadros-chave planejados.
</start>
