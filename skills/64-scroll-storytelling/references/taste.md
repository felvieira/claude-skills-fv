# O taste floor

Ler antes de escrever markup, nao depois. Construir sem anunciar o checklist.

Tudo aqui e uma checagem sobre o **resultado renderizado**, nao sobre intencao. "Usei uma escala de
espacamento" nao e evidencia; um valor computado e.

## Espacamento

Ritmo vem do contraste entre apertado e generoso, nunca de um valor repetido ate tudo pesar igual.

- Usar a escala base-4px (`--sc-1` … `--sc-11`, ja no `engine/scrollcraft.css`).
- **Mais espaco acima de um titulo do que abaixo dele.** O vao pertence a fronteira entre secoes, nao ao
  par titulo-e-corpo. Errar isso ao contrario e o erro de espacamento mais comum, e faz a pagina ler como
  lista.
- Padding de secao e fluido (`--sc-section`). Um celular nao deve herdar o ar de desktop.
- Agrupar por proximidade antes de recorrer a um container. Se voce adicionou borda pra mostrar que duas
  coisas sao relacionadas, o espacamento estava errado primeiro.
- **Otico, nao matematico.** Padding computado igual ao redor de uma forma com peso visual desigual parece
  errado. Corrigir contra o render, nao contra o numero.

## Tipografia

- **Duas familias no maximo.** Display carrega voz, texto carrega prosa. Uma terceira e figurino.
- **Tracking aperta conforme o tamanho cresce.** Uma face a 6rem com tracking default le solta e amadora.
- **Medida de corpo 45 a 75ch** (`--sc-measure` e 62ch no engine).
- **Altura de linha inversa a medida.** Linhas mais largas precisam de mais leading.
- **Texto claro sobre escuro precisa de compensacao em tres eixos**: um pouco mais de altura de linha, um
  toque mais de tracking, um degrau a mais de peso.
- `text-wrap: balance` em titulos, `pretty` em corpo.
- Display max ~6rem fora de um momento de hero genuino.
- **Reduzir o hero um degrau abaixo de ~700px.** O floor de `--sc-t-4xl` e um floor de *desktop*; em 390px
  quebra um titulo normal em seis linhas.

**Escolha de fonte.** Inter e desencorajada como default — e a face mais usada em pagina gerada por IA e
le como nao-decisao. Preferir Geist, Archivo, Outfit, Satoshi, Cabinet Grotesk, ou a face propria da marca.
Serifada nao e sinonimo de premium — usar so quando a marca nomeia, ou o trabalho e genuinamente editorial,
luxo ou de heranca.

## Cor

- **Seis papeis, um acento** (canvas, surface, ink, ink-soft, accent, accent-ink — ja tokenizados no
  engine). O acento e dono de uma regiao; acentos espalhados em miniatura sao confete.
- **Travar o acento pra pagina inteira.** Excecao: uma pagina que corta duro entre chao claro e escuro
  carrega um acento de dois estagios (um matiz, duas luminosidades), ainda um acento por chao.
- **Texto secundario e tintado, nunca cinza chapado.**
- **Sem preto puro.** `#000` nao tem ar.
- Contraste medido no render: corpo ≥4.5:1, texto grande ≥3:1.

**Redefinir `--sc-ink` numa subarvore nao re-tinta o texto por baixo dela.** `color` e herdado como valor
computado — texto cujo `color` ja resolveu no `<body>` mantem a tinta do body nao importa o que a secao
redefina o token pra ser. Toda pagina que inverte um chao no meio bate nisso. Restatar `color` onde quer
que o token seja restatado:

```css
.section--light { --sc-ink: #14110C; --sc-ink-soft: #4A443A; color: var(--sc-ink); }
```

**A armadilha da paleta premium-consumer.** Fundo creme, acento latao ou argila, texto quase-preto
espresso e o alcance padrao de toda marca artesanal, de comida, bem-estar e oficio — e faz toda marca
assim parecer identica. Alternativas: prata frio e cromo; verde floresta profundo com osso e ambar;
quase-preto verdadeiro com bronzeado quente; cobalto contra um neutro; oliva com tijolo.

**A armadilha do roxo-de-IA.** Gradiente violeta-pra-azul, glow neon, botao brilhante — nao, a menos que a
marca peca.

## Texto sobre midia

Regra: "sem overlay full-frame". Tres formas certas, dependendo de onde o copy esta:

1. **Um canto** de densidade, do tamanho do bloco de copy (`.sc-scrim--lead`/`.sc-scrim--trail` no engine).
2. **Uma banda** (`.sc-scrim--band`), transparente acima de ~58%. Certo quando o copy ocupa a largura
   inteira do quadro — o que ambas as ancoras de canto viram abaixo de 860px.
3. **Uma coluna** de densidade sob uma coluna de texto, quando o copy ocupa um lado de uma imagem
   full-bleed.

**Mascarar a imagem pra longe do texto** em vez de por qualquer coisa em cima quando um chao fotografico
fica atras de uma coluna de texto — `mask-image` ou um clip que termina onde a coluna comeca da ao tipo um
chao limpo e devolve o contraste total a foto.

**Um scrim nao pode ser filho do texto que protege** — a verificacao esconde o elemento de copy inteiro
(incluindo pseudo-elementos) pra fotografar o frame por baixo, entao um `::before` no bloco de copy fica
escondido junto e o scrim nunca e medido. Colocar num elemento irmao.

**`width` e `height` de `<img>` vem em par.** Sobrescrever so um em CSS deixa o outro resolver pro valor
bruto do atributo HTML — `width: 100%` numa imagem 1920x1080 dentro de uma coluna estreita renderiza ela
1080px de altura. Sobrescrever os dois ou nenhum.

## Profundidade

Cinco ferramentas, usadas juntas:

1. **Sombra com offset e blur.** Coisas erguidas de verdade jogam luz pra baixo. Um halo colorido sem
   offset e decoracao, nao profundidade.
2. **Luz de borda.** Um highlight de 1px no topo (`--sc-edge` no engine) vende uma superficie erguida
   melhor que qualquer blur.
3. **Escala e blur como distancia.**
4. **Sobreposicao.** Um elemento cruzando a fronteira de outro estabelece mais profundidade que qualquer
   sombra.
5. **Grao.** Um chao escuro chapado faz banding em tela real (`.sc-grain` no engine, ~4-5% opacidade).

Tres degraus de elevacao (`--sc-e1/2/3`) e nao mais. Se tudo esta elevado, nada esta.

## Cards

O container preguicoso. Antes de usar um, perguntar o que ele faz que proximidade, uma hairline, ou espaco
nao fariam.

- Nunca uma grade de cards identicos icone+titulo+texto como estrutura de pagina — e o tell mais
  reconhecivel de pagina feita por IA.
- Nunca aninhar cards.
- Nunca tres colunas iguais de feature card. Usar grade assimetrica, zigzag de duas colunas (max duas em
  fila), um rail, ou tipografia simples sobre espaco.
- Uma escala de corner-radius por pagina, mantida.

## Movimento

- `transform` e `opacity` pra qualquer coisa continua. `clip-path` e o terceiro sancionado, pra wipes.
  Nunca animar width, height, margin, padding, top, left; nunca `transition: all`.
- **Nunca `ease-in` em UI.** `ease-out` a 200ms parece mais rapido que `ease-in` a 200ms.
- Transicoes de UI abaixo de 300ms. Hover 120-180ms, botao 100-160ms.
- **Nunca `scale(0)`.** Entrar de `scale(0.95)` + `opacity: 0`.
- Feedback de pressao em tudo pressionavel: `scale(0.97)` ou `translateY(1px)`.
- Stagger de grupo entre 30 e 80ms.
- Reduced motion e **menos e mais suave, nao zero.** Manter a opacidade que carrega compreensao, tirar
  toda mudanca de posicao.

## Estados e conteudo

- Todo elemento interativo tem hover, focus-visible, active e disabled.
- **Focus-visible precisa ser visivel**, tematizado pro acento, com offset.
- **Texto de botao cabe numa linha no desktop.** CTA primario: uma a tres palavras.
- **Um rotulo por intencao.** "Fale conosco" na nav e "Vamos conversar" no rodape sao o mesmo botao com
  dois nomes.
- Copy real, nao lorem. Nomes reais. Numeros reais ou nenhum numero.
- **Sem estatistica inventada.** Precisao falsa (`4.1×`, `92%`, `48k`) e passivo legal, nao elemento de
  design.

## O refuse list

Padroes de categoria, nao proibicao por principio — o brief pode justificar qualquer um deles.

**Estrutura:** cards identicos como estrutura de pagina; cards aninhados; tres colunas iguais de feature;
o template hero-metrico (numero grande, rotulo pequeno, stats de apoio); mais de dois zigzags
imagem-esquerda/texto-direita seguidos.

**Rotulos:** eyebrow acima de todo titulo de secao (max um a cada tres); numero de secao (`01/06`) a menos
que a sequencia em si seja informacao; cue de "scroll", seta, icone de mouse animado; tira de texto
decorativo no rodape do hero.

**Superficie:** gradiente em texto; glow neon; sombra hard-offset zero-blur fora de um mundo genuinamente
neobrutalista; glass/blur decorativo sem funcao; borda colorida acima de 1px em card/callout; monospace
como figurino de "tecnico" sem ser codigo/dado/rotulo; emoji no lugar de icone real; cursor customizado.

**Conteudo:** em dash visivel; dashboard/terminal falso feito de divs; texto embutido em imagem gerada;
verbo de enchimento (elevar, seamless, unleash, next-gen, revolucionar, supercharge); hero que estoura o
viewport; mais de quatro elementos de texto no hero.

## O teste do olho semicerrado

Borrar a pagina ate o detalhe sumir. Ainda deve dar pra nomear o elemento primario, o secundario, e os
grupos principais, nessa ordem. Se tudo vira um campo cinza uniforme, o problema e hierarquia — nenhuma
quantidade de sombra, gradiente ou movimento resolve isso.
