# O eixo de estrutura

## 1. A armadilha do template

O repo original desta skill documenta quatro builds do autor: uma marca de cafe proteico, uma marca
pessoal, uma empresa de paisagismo, e um produto de observabilidade de agentes. Quatro industrias, quatro
mundos visuais diferentes — e ainda assim o dono achou que pareciam templates entre si. A evidencia:

Os quatro abrem com um `scrub` full-bleed sob uma barra fixa minima com wordmark e um CTA. Os quatro
ancoram o titulo do hero no canto lead com cue greet e linhas kinetic. Os quatro rodam um ato `pin` de
tipografia onde linhas fazem crossfade. Os quatro passam pra uma secao flow, um rail `pan` de cards com
tilt em cada card, e fecham num `pin` curto com spotlight no stage e um CTA magnetico. Os quatro caem entre
13.6 e 13.8 viewport-heights, em 6 ou 7 atos, com exatamente uma cor de acento.

O que de fato variou foi a ordem dos atos do meio e a paleta.

O kit de devices e um eixo **estetico**. Ele muda como a pagina parece. Nao tem opiniao sobre o que a
pagina **e**, entao todo build ali recorreu ao mesmo formato, porque o formato nunca foi uma decisao que
alguem tomou.

> O mundo visual muda como a pagina PARECE. A gramatica muda o que a pagina E.
> Um build que so muda o mundo visual e um re-skin.

Este arquivo e o eixo de estrutura. Ler depois da entrevista e antes da tabela de score. Tem tres partes
nao-opcionais: escolher uma **gramatica**, inventar um **signature move**, passar pelo **fingerprint gate**.

---

## 2. Gramaticas de pagina

Uma gramatica e a logica organizadora da pagina: o que uma secao e, pra que serve o chrome, como o
visitante sabe onde esta, e o que e o final. Duas paginas na mesma gramatica vao parecer parentes por mais
distantes que estejam as paletas.

Cada gramatica abaixo nomeia o que ela **proibe**. As proibicoes sao o ponto — sao o que impede o build de
derivar de volta pro padrao filmic no meio do caminho.

Escolher uma. Nao misturar duas: uma pagina em capitulos com um mundo continuo por baixo e um filmic
one-shot com titulos extras.

---

### 2.1 Filmic one-shot

O esqueleto original, agora uma escolha entre oito, nao mais o estilo-padrao.

**Serve:** um argumento linear com um arco emocional. Produto de consumo, lancamento, qualquer coisa onde
o visitante deve se sentir carregado em vez de navegando.

**O scroll parece:** um filme que voce empurra. Continuo, sem costura, cada ato passando o bastao antes do
ultimo sair.

**Proibe:** sequencia visivel (numero de capitulo, indice, leitor de progresso); cortes duros entre chaos;
qualquer chrome que sugira ferramenta; mais de um ponto de entrada.

**Nav/hero/close:** barra fixa minima, wordmark e um CTA. Hero scrub full-bleed, titulo kinetic ancorado no
canto com cue greet. Close pinado com spotlight e CTA magnetico.

**Se apoia em:** `scrub`, `pin`, `drift`, `kinetic`. **Proibe:** nada estrutural — e por isso que e o
padrao pra onde tudo deriva. **Usar quando a entrevista de fato justificar, e dizer no relatorio por que
as outras sete nao serviram.**

---

### 2.2 Chaptered editorial

A pagina e uma materia impressa. Capitulos sao a unidade, nao atos.

**Serve:** substancia longa. Um metodo, um manifesto, uma historia de fundador, um produto respaldado por
pesquisa.

**O scroll parece:** virar paginas. Intertitulos de parada total entre capitulos, depois spreads
assimetricos densos. Cortes duros, nao crossfades.

**Proibe:** `drift` continuo (cada capitulo e uma mudanca dura de chao); hero scrub full-bleed; atos de
tipografia crossfade pinados; CTA magnetico; copy de hero centralizado.

**Nav/hero/close:** sem barra fixa. Um folio na margem, numero e titulo do capitulo. O hero e uma **pagina
de titulo**: tipografia no fundo papel, sem midia acima da dobra. O close e uma placa de colofão, tipo
pequeno.

**Se apoia em:** `flow` + `in`, `reveal` em limites de capitulo, `parallax` numa coluna de midia, `count`
pra numeros reais em prosa. **Proibe:** `scrub` alem de um capitulo, `spotlight`, `magnet`.

---

### 2.3 Live surface

A pagina se comporta como o produto. Nao um screenshot dele, nao uma div fingindo: a superficie de fato,
rodando, com scroll dirigindo o estado dela.

**Serve:** software, ferramenta, dashboard, editor. Se o pitch honesto e "veja o que ele faz", esta e a
gramatica.

**O scroll parece:** operar algo. Paineis populam, um log enche, um grafico avanca.

**Proibe:** qualquer chrome de marketing — sem barra wordmark+CTA, sem scrim, sem fotografia full-bleed,
sem pilha de titulos kinetic. Copy vive no idioma da propria superficie: rotulo, tooltip, status.

**Nav/hero/close:** chrome de app substitui nav (sidebar, tabs, status bar). O hero e a superficie ja num
estado, nao um titulo. O close e um **input real** — linha de comando, campo, primeiro passo — nao um
botao magnetico.

**Se apoia em:** `pin` (a superficie segura enquanto o estado avanca), `count` em telemetria real, pointer
devices onde o produto real teria. **Proibe:** `scrub`, `kinetic`, `spotlight`, `drift` alem de duas
paradas.

**A regra de honestidade:** taste.md proibe dashboard falso e terminal falso, e isso vale aqui tambem. A
superficie tem que ser markup real rodando logica real (ou dado de amostra claramente rotulado como tal).
O que continua proibido e a pintura de uma superficie — imagem ou divs fingindo algo que roda.

---

### 2.4 Continuous world

Um canvas so, fixo pro scroll inteiro, e a pagina viaja atraves dele. Waypoints, nao secoes.

> **Esta gramatica exige o modo worldflight** (`data-sc-mode="worldflight"` no motor — ver comentario de
> cabecalho em `engine/scrollcraft.js`). Construir com atos pinados no lugar disso nao e uma versao menor
> desta gramatica, e uma pagina diferente e pior. Nao usar atos `scrub` aqui, por maior que se faca o span.

**Serve:** uma jornada com geografia real. Cadeia de suprimento, processo com etapas fisicas, um lugar.

**O scroll parece:** se mover atraves de um espaco unico que nunca corta.

**Proibe:** limite de secao de qualquer tipo. Sem blocos `sc-section`, sem atos, sem segundo stage, sem
passos de `drift` (uma grade continua pra toda a viagem, autorada no mundo, nao interpolada entre pernas).

**Nav/hero/close:** a nav e um **mapa** clicavel. O hero e uma posicao de estabelecimento dentro do mundo.
O close e chegar a um lugar no mesmo canvas.

**Esta e a mais cara.** Uma unica jornada de camera continua e a coisa mais fragil que da pra construir.
Escolher esta gramatica so quando o brief for literalmente sobre viajar por um lugar.

---

### 2.5 Typographic poster

Tipografia e a imagem. Midia e minima ou ausente; contraste de escala faz o trabalho que a fotografia
faria.

**Serve:** uma marca cujo asset e uma frase. Manifesto, agencia com identidade verbal forte, lancamento com
uma unica alegacao. Tambem a resposta certa quando nao ha bom asset e gerar produziria oito frames
plausiveis e esqueciveis.

**O scroll parece:** palavras chegando em pesos radicalmente diferentes. Uma palavra a 40vw, depois um
paragrafo a 16px, depois silencio.

**Proibe:** chao fotografico, `scrub`, scrim (nada pra fazer scrim), card de qualquer tipo, movimento
decorativo.

**Nav/hero/close:** o wordmark faz parte da composicao, em escala de composicao. O hero e uma palavra ou
linha unica em escala extrema. O close inverte a pagina inteira: a menor tipografia do site.

**Se apoia em:** `kinetic` (a unica gramatica onde split por caractere pode fazer sentido), `pin` com
escala dirigida por `--sc-p`, `reveal` como wipe sobre letterforms. **Proibe:** `scrub`, `pan` de cards,
`tilt`, `parallax` em texto.

---

### 2.6 Gallery / catalog

Objetos numa colecao caminhavel. Etiquetas de museu, nao copy de marketing.

**Serve:** um range. Produto com variantes, portfolio, cardapio, biblioteca de materiais, case studies.

**O scroll parece:** caminhar por uma sala. Deriva lateral com scroll vertical, objetos entrando e saindo
no proprio ritmo, cada um rotulado com fato em vez de venda.

**Proibe:** ato `pin` argumentativo de tipografia; um unico hero claim; copy scrim sobre midia; persuasao
no rotulo do objeto. Um rotulo le `Cedro. Secado ao ar por 18 meses.` e nao `Um artesanato que voce sente.`

**Nav/hero/close:** a nav e um **indice de objetos** clicavel. O hero e o objeto um, ja rotulado, sem
tratamento de titulo separado. O close e o ultimo objeto ou uma placa de contato tipografada exatamente
como um rotulo.

**Se apoia em:** `pan` como espinha, `reveal` por objeto, `tilt` em objetos que o visitante pegaria, `count`
pra specs reais. **Proibe:** titulos `kinetic`, `spotlight`, `magnet`, mais de um `scrub`.

---

### 2.7 Split stage

Duas colunas em tensao pela pagina inteira, resolvidas pelo scroll.

**Serve:** qualquer argumento com dois lados. Antes e depois, custo e economia, manual e automatizado.

**O scroll parece:** ver uma balanca se inclinar. As duas metades sempre presentes, ambas se movem, a
pagina vai a algum lugar especifico: o momento em que um lado vence.

**Proibe:** qualquer coisa full-bleed antes do resolve; copy centralizado; hero ancorado no canto; close
simetrico. Nenhuma coluna pode ser decorativa.

**Nav/hero/close:** sem barra. O **divisor e o chrome**, carregando os rotulos dos dois lados e o progresso
do argumento. O close e o **colapso**: o divisor viaja pra uma borda, uma coluna toma a largura toda, e o
CTA vive na coluna vencedora.

**Se apoia em:** `pin` com posicao do divisor dirigida por `--sc-p`, `reveal` por lado, `count` pra figuras
de comparacao reais. **Proibe:** `pan`, `spotlight`, `magnet`, mais de um `scrub`, `drift`.

---

### 2.8 Rhythmic cutlist

Atos curtos de corte duro em velocidade. Sem pin, sem dwell, sem crossfade.

**Serve:** marca de energia. Streetwear, esporte, evento, musica, bebida, marca jovem.

**O scroll parece:** um corte por segundo. Doze a vinte secoes curtas em vez de seis longas.

**Proibe:** qualquer ato acima de ~1.4 viewport-heights; `data-sc-dwell` acima de 0.1; `pin` inteiramente;
janelas de cue sobrepostas; easing lento.

**Nav/hero/close:** a barra e alta, nao minima — full-width, alto contraste, possivelmente um marquee. O
hero corta pra proxima em menos de um viewport. O close e abrupto: o ultimo corte e o CTA, full bleed, sem
spotlight.

**Se apoia em:** `flow` + `in` em stagger curto, `reveal` em quase toda secao, passos de `drift` duros
entre chaos adjacentes. **Proibe:** `pin`, `spotlight`, `magnet`, `dwell`, `parallax`.

**O problema do pico, e como resolver.** Esta gramatica proibe `pin` e `dwell`, mas o pico de toda pagina
precisa do maior espaco e do maior "hold" (ver feel.md). A solucao: **segurar no chrome fixo**, nao num
ato. A barra alta que a gramatica ja pede e um elemento persistente que nao pertence a nenhum ato — ela
pode se desdobrar, rodar uma coreografia longa e segurar o tempo que o pico precisar, dirigida por scroll
de pagina em vez de `--sc-p` de um ato, enquanto os atos por baixo continuam cortando em velocidade total.
**Regra geral: quando a gramatica proibe o device que o pico quer, mover o pico pra fora da pilha de atos
em vez de quebrar a gramatica.**

---

## 3. O signature move

Todo build inventa **uma interacao bespoke que existe so naquele site.** Nao no kit de devices, nao em
build anterior, nao um parametro mudado. Codada na pagina, com `data-sc-*` de nomeacao propria ou JS inline
lendo `--sc-p`. O motor permanece intocado, sempre.

### O que conta

- **Scroll-como-playhead sobre um trilho persistente.** Um trilho horizontal fino fixo na borda, presente a
  pagina inteira, desenhando um waveform ou rota real. Posicao de scroll e o playhead.
- **Um wordmark que o ponteiro consegue separar.** As letras seguem o cursor com massas diferentes e se
  reencaixam perfeitamente ao soltar.
- **Um desenho de linha que se constroi sozinho.** Um SVG tecnico cujo `stroke-dashoffset` e dirigido por
  `--sc-p`.
- **Um recibo corrente.** Um painel fixo que acumula uma linha a cada alegacao que o visitante passa, so
  funciona com numeros reais.
- **Um controle que regrada a pagina inteira.** Um handle de hora-do-dia, temperatura, nivel de carga: um
  input, e toda imagem/chao/acento da pagina muda junto.

### O que nao conta

Spotlight recolorido. `data-sc-tilt="9"` em vez de `6`. Uma curva de easing diferente. Mais cards no rail.
Um terceiro ato `scrub`. Qualquer coisa que o motor ja faz com um nome de classe diferente.

**Teste:** descrever o move pra alguem que ja viu outros builds. Se a pessoa nao consegue distinguir de
algo que o kit ja faz, nao e um signature move.

---

## 4. O fingerprint gate

Quando ha builds anteriores desta skill num mesmo workspace de cliente ou agencia, manter um registro
(`FINGERPRINTS.md`, no workspace do projeto) e checar cada build novo contra cada linha existente nestas
seis dimensoes: **gramatica, tratamento de nav, hero device, formato da sequencia de atos, padrao de
close, signature move.**

**O gate: um build novo precisa diferir de CADA linha existente em pelo menos 4 das 6.** Individualmente
contra cada linha, nao em media.

A dimensao 6 (signature move) e gratis por definicao. Entao o gate na pratica pede 3 a mais das 5
restantes contra cada linha, e um build que so muda gramatica e mundo visual falha.

**Se o build planejado falhar o gate, mudar o plano, nao o registro.** Reescrever uma linha do
fingerprint pra encaixar um build novo e a unica coisa que torna esse arquivo inutil.

---

## 5. Range estetico

Premium-minimal e uma escolha, nao o traje-padrao desta skill.

| Familia | Le como | Ganho por |
|---|---|---|
| Brutalista | Direto, estrutural, sem estilo de proposito | Ferramenta, infra, anti-marketing |
| Maximalista | Denso, em camadas, alto, generoso | Cultura, evento, comida |
| Playful | Saltitante, colorido, informal | Infantil, jogo, app de consumo, comunidade |
| Retro | Especifico de uma decada | Marca de heranca, musica |
| Denso | Voltado a informacao, tipo pequeno, alta contagem | Dado, catalogo, financas |
| Editorial | Papel, folio, medida, contencao | Substancia longa |
| Premium-minimal | Quieto, escuro, um acento, ar | Luxo, e so quando pedido |

O que nao flexiona: o "taste floor" (ver taste.md). Espacamento e ritmo, metrica de tipografia, contraste
medido no render, movimento construido de `transform` e `opacity`, foco visivel em tudo, reduced motion
que preserva significado, copy real e numeros reais valem em toda familia estetica.

Duas armadilhas permanecem banidas em toda familia: a paleta artesanal creme-e-latao (ver taste.md, Cor) e
gradientes violeta-pra-azul de IA. Ambos sao o que uma pagina busca quando ninguem decidiu.
