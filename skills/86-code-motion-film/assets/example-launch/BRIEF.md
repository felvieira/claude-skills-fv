<inputs>
Peça-me: o nome do produto, o comando que se digita no terminal, a métrica de antes e depois (valor e unidade), a frase final e a cor de destaque. Se eu pular algum item, use Relay, "relay ship", 38,0 s para 4,2 s, "ship without the wait." e o verde-limão #c6ff3d.
</inputs>

<direction>
Filme de lançamento de 15 s em 1920x1080, em loop. Sensação: terminal que vira keynote; seco, rápido, confiante; uma ideia nova a cada 2 s e nenhum quadro vazio.
Paleta: tinta #0b0b0c, papel #f1efe7, uma cor de destaque #c6ff3d usada só no que está acontecendo agora (cursor, progresso, número final, ponto da marca). Tipografia: grotesca pesada (Segoe UI Black, com Arial Black como reserva) para tudo o que é título, a 40–60% da altura do quadro; mono (Consolas) só para terminal e legendas pequenas.
Câmera: uma câmera contínua por cena (empurra devagar para dentro, segue o elemento ativo); cortes secos apenas nas batidas de maior energia, com um clarão de 2 quadros. Nunca dois movimentos de câmera ao mesmo tempo.
Proibido: gradientes, brilhos, explosões de partículas, easing elástico, sombra pesada, tempo morto, texto pequeno demais para ler em tela de celular, qualquer coisa que pareça template.
</direction>

<structure>
120 BPM, 30 batidas (15 s); algo acontece a cada batida.
b0–4: terminal preto; o comando é digitado, enter, quatro linhas de resultado entram, um riser sobe até o corte.
b4–8: corte seco em verde-limão; "SHIP" cai letra a letra, "FASTER." entra embaixo na batida 6.
b8–16: corte para papel; cartão escuro com cinco etapas (Build, Test, Review, Deploy, Live); o progresso corre e cada etapa fecha com um som; a câmera acompanha.
b16–22: corte para preto; o número cai de 38,0 para 4,2 e trava; barras de execuções descem até a última, em verde.
b22–28: quatro faixas gigantes (BUILD, TEST, SHIP, REPEAT) entram de lados alternados e assentam em grade.
b28–30: cartão final com a marca e a frase digitada; tudo some e sobra só o prompt do terminal. O último quadro é igual ao primeiro (prompt e cursor sólido), para o loop não engasgar.
</structure>

<build>
1. Um arquivo HTML, composto em 1920x1080 (outros tamanhos escalam). Todo estilo é calculado a partir do tempo dentro de seek(t): sem transições de CSS, sem timers, sem estado carregado entre quadros; o grão de filme é função do número do quadro.
2. As molas são respostas ao degrau em forma fechada (closed-form). Um valor que muda de alvo várias vezes é a soma de uma mola por mudança (track). Letras e linhas usam molas diferentes: ataque seco, assentamento rápido, sem sobrepasso em texto pequeno.
3. Texto que sai e texto que entra têm tempos separados; nada se sobrepõe sobre o mesmo elemento.
4. Cenas escritas contra uma função de layout; as cenas são desenhadas num espaço de 1920x1080 com câmera própria.
5. Os cortes e cada som de interface caem na grade de 120 BPM; a trilha é sintetizada na mesma linha do tempo, com bateria só a partir da batida 4, riser antes de cada corte e um impacto em cada corte.
6. Renderize com Playwright + ffmpeg (render-seek) com motion blur de 4 subquadros. Antes do render completo, renderize quadros-chave em uma folha, olhe e corrija até todo quadro valer 8 ou mais.
</build>

<gotchas>
Fonte pesada ausente no sistema cai para uma fonte fina e quebra a hierarquia: confira o quadro, não só o código. Texto que cresce com a câmera precisa de margem de segurança. Dígitos em fonte proporcional fazem o número tremer: use avanço fixo por dígito. O cursor do terminal tem de estar sólido no primeiro e no último quadro.
</gotchas>

<start>
Peça-me os inputs e, antes de escrever qualquer código, mostre-me o mapa de batidas e quatro quadros-chave planejados.
</start>
