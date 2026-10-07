# ESTILOS — uma decisão inteira

Um estilo é uma decisão completa: tela, tipografia, destaque, como as coisas se movem, o que a câmera faz e **um movimento-assinatura** pelo qual o filme é lembrado. Ofereça ao
usuário dois ou três que combinem com o produto (cada um com um quadro de amostra renderizado de verdade), e construa em um só. A interface real do produto nunca é redesenhada por
um estilo: o estilo veste o palco em volta.

Ponha os tokens como constantes no topo da página (veja `assets/example-launch/index.html`). Todo estilo mantém as regras duras: determinístico, legível no celular, uma cor de
destaque com um só significado. Molas por papel vêm de `SPRINGS` em `skills/86-code-motion-film/scripts/stage.mjs` (`slam`, `settle`, `snap`) e dos `presets` de `motion.mjs`.

## Nativo da marca

**Quando:** o produto tem visual forte e próprio. Tela, destaque e tipografia saem dos tokens dele; o palco é a cor de fundo do app, um tom mais claro ou mais escuro.
**Movimento:** o que as molas do próprio app sugerem (leia o código de animação dele). **Assinatura:** a forma mais reconhecível do app (cartão, balão, aba) leva o filme de cena em cena.

## Tinta e limão — seco e confiante

Exemplo: `assets/example-launch` ("Relay").

```js
const INK = "#0b0b0c", PAPER = "#f1efe7", ACCENT = "#c6ff3d", DIM = "#8a8a8f";
```
Fonte grotesca pesada em escala de quadro (40–60% da altura) e mono só para terminal e legendas. Letras caem uma a uma com `SPRINGS.slam`; blocos assentam com `settle`; cortes secos
na batida com clarão de 2 quadros. **Assinatura:** o terminal que vira keynote e o prompt do começo que reaparece no fim.

## Papel e tinta — editorial, conduzido por texto

```js
const BG = "#fbfaf7", INK = "#111111", INK2 = "#6a6a70", ACCENT = "#e5482d";
```
Branco quente, quase preto e um destaque. Entre as batidas de interface, uma linha única e enorme (até seis palavras, 120–180 px, espaçamento fechado) preenche o quadro; as palavras
pousam uma por batida e o espaço de cada uma é reservado antes, para a linha nunca deslocar. **Assinatura:** um ponto final na cor de destaque que fecha toda linha e vira o ponto do logotipo.

## Meia-noite — focado e luminoso

```js
const BG = "#0a0e14", INK = "#e9edf3", INK2 = "#8793a5", ACCENT = "#6ea8ff", ACCENT2 = "#ffb454";
```
Tela escura, o app no tema escuro, texto claro com algarismos de largura fixa. O destaque significa *agora* (a hora atual, o que acabou de mudar): valores novos chegam nele e esfriam
para o neutro. Movimentos limpos (`snap`, quase sem sobrepasso), câmera em linhas retas. Gradientes suaves sobre fundo escuro formam faixas ("banding") no H.264: mantenha fundos
chapados. **Assinatura:** uma linha de luz (a linha do "agora") que atravessa todas as cenas.

## Bloco de cor — vivo e brincalhão

```js
const BG = ["#ffc933", "#3b6bff", "#ff5c93"], INK = "#101010";
```
A cor do palco muda nas barras do compasso (uma cortina que acompanha o dispositivo, nunca um corte para o preto) e o dispositivo fica sobre cor chapada com sombra dura e deslocada.
Molas mais saltitantes, movimentos de escala maiores, legendas como adesivos. **Assinatura:** a cor de cada cena nova é a cor do botão que acabou de ser tocado.

## Guia de campo — terroso e editorial

```js
const BG = "#ece5d6", INK = "#1d2a24", INK2 = "#55604f", ACCENT = "#d9572a", LINE = "rgba(29,42,36,.18)";
```
Papel com curvas de nível desenhadas na cor `LINE`; uma serifa nos títulos ao lado da sans do app. Caminhos se desenham ao longo do comprimento (`dashFor` de `fx.mjs`), números contam
(`countUp`), a câmera segue uma rota. **Assinatura:** a linha de rota: desenha o logotipo, atravessa o mapa e sublinha a frase final.

## Como escolher

| Produto | Boas escolhas |
|---|---|
| finanças, saúde, família | Nativo da marca, Guia de campo |
| ferramenta de desenvolvedor, profissional, produtividade | Tinta e limão, Meia-noite |
| viagem, comida, ar livre | Guia de campo, Bloco de cor |
| comunidade, jogos | Bloco de cor, Meia-noite |
| lançamento de consumo, rede social | Bloco de cor, Papel e tinta |
| marca guiada por design | Nativo da marca, Papel e tinta |

Regra: **um estilo por filme**, com a assinatura escolhida no brief e dita por que serve àquele produto. Estilo nunca justifica um efeito que esconda o texto.

Ideias de organização (estilo como decisão completa, assinatura, tabela de escolha) inspiradas em kaventro/motion-designer (MIT); paletas, tokens e textos são próprios.
