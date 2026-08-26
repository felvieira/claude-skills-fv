# O kit de devices

Dez formas do scroll mudar a pagina. Cada uma e uma resposta diferente pra "o que a mao do visitante faz
de fato aqui."

Escolher por beat, nunca por pagina inteira. A regra de variedade do SKILL.md vale: quatro ou mais
familias, nunca o mesmo device duas vezes seguidas.

Todo ato publica `--sc-p` (0 a 1) no proprio elemento, entao qualquer coisa que voce quiser dirigir e que
o kit nao cobre, da pra dirigir via CSS com `calc()` contra essa variavel. Tentar isso antes de pedir um
device novo.

---

## 1. `scrub`: a roda do mouse e um scrubber

O device-ancora. Um movimento de camera pre-renderizado toca sob a mao do visitante, um frame por
"clique" da roda. E a coisa que as pessoas printam e mandam pra outras, entao gastar o melhor asset aqui.

```html
<section data-sc-act="scrub" data-sc-span="2.6" data-sc-dwell="0.35" data-sc-drift="#0A0806">
  <div data-sc-stage>
    <img class="sc-stage__poster" src="assets/01-hero.webp" alt="">
    <video data-sc-scrub data-sc-src="assets/01.mp4"
           data-sc-src-mobile="assets/01-m.mp4" playsinline muted></video>
    <div class="sc-scrim"></div>
    <div class="sc-copy sc-copy--lead" data-sc-cue="0.08 0.62 0.34">
      <h1 class="sc-display sc-display--xl" data-sc-kinetic="lines">Titulo do hero</h1>
    </div>
  </div>
</section>
```

- `data-sc-span`: comprimento do ato em viewport-heights. 2.2 a 3.0 pra um hero. Abaixo de 1.8 o clipe voa
  rapido demais; acima de 3.5 o visitante comeca a desconfiar que a pagina travou.
- `data-sc-dwell` (0 a 0.6): remapeia o tempo pra camera se assentar no meio do ato, exatamente onde o
  copy atinge o pico, e se mover mais rapido nas bordas. E a diferenca entre um clipe que toca e um plano
  que aterrissa.
- `data-sc-src` (nao `src`): o motor busca o clipe como Blob pra escrubar sem precisar de suporte a HTTP
  range, e pula a busca inteira sob reduced motion.
- O poster e um segurador de frame ao vivo. Ele fica visivel ate um frame real de video pintar, porque iOS
  mantem um video mudo que nunca tocou em branco mesmo depois de buscado.

**No maximo dois atos scrub por pagina.** O terceiro deixa de ser surpresa, e e a coisa mais pesada da
pagina.

### Tempo do clipe nao e tempo do cue

O bug mais danoso deste device, e invisivel em qualquer screenshot tirado isoladamente. Um stage pinado
fica visivel na tela **um viewport antes** do seu pin comecar (deslizando pra dentro) e **um viewport
depois** dele terminar (deslizando pra fora). O progresso do ato (`p`) e 0 durante toda a entrada e 1
durante toda a saida. Entao um clipe dirigido por `p` fica congelado no primeiro frame enquanto desliza
pra dentro, e congelado no ultimo frame enquanto desliza pra fora — o visitante estava escrubando um filme
com a mao, o filme para, e a pagina inteira desliza uma foto parada por cima dele.

O motor por isso mapeia o clipe atraves de **toda a vida visivel do stage**, nao atraves do seu percurso
pinado, e isso e o **padrao**. Ambas as pontas sao limitadas a scroll que de fato existe. Cues continuam
usando `p`, porque cues pertencem ao pin.

**Combinar com `data-sc-dwell`.** Dwell se move rapido nas bordas e se assenta no meio — exatamente o
formato que esse mapeamento quer: o movimento rapido cai nos dois slides, o assentamento cai dentro do pin
onde esta o copy.

---

## 2. `pin`: o frame segura, o conteudo avanca

O cavalo de batalha, e o efeito premium mais barato que existe. O stage gruda por alguns viewport-heights
enquanto estados de copy se revezam dentro dele. Usar quando o beat e um argumento, nao uma imagem.

```html
<section data-sc-act="pin" data-sc-span="3" data-sc-drift="#12100E">
  <div data-sc-stage>
    <p class="sc-lede" data-sc-cue="0.02 0.34">Primeira linha.</p>
    <p class="sc-lede" data-sc-cue="0.30 0.66">Segunda linha.</p>
    <p class="sc-lede" data-sc-cue="0.62">Linha final, segura ate o fim.</p>
  </div>
</section>
```

**Span util minimo e ~1.2.** O percurso de um ato pinado e `max(altura - viewport, 1)`, entao num span de
1 ou menos isso e um pixel: progresso pula de 0 a 1 entre dois cliques de roda e todo cue/reveal/animacao
dirigida por `--sc-p` dentro do ato engasga em vez de rodar. Se o beat de fato quer menos que uma tela de
percurso, e um ato `flow`, nao um pinado.

Janelas de cue se sobrepoem por design — a linha que esta saindo ainda esta esmaecendo enquanto a proxima
chega, entao o visitante nunca encontra espaco vazio. Sobrepor por ~15% do ato.

### O contrato do cue

`data-sc-cue="from [to [rampIn [rampOut]]]"`, tudo em progresso do ato (0 a 1).

| Forma | Comportamento |
|---|---|
| `"0.2"` | entra em 0.2 e **segura ate o fim do ato** |
| `"0.1 0.6"` | entra, plateau, sai. Rampas default 30% da janela cada |
| `"0 0.78 0"` | **greet**: ja em opacidade total quando o ato comeca, depois esmaece |
| `"0.1 0.9 0.15 0.4"` | entrada rapida, saida longa e lenta |
| `"0 1 0 0"` | **greet and hold**: total em p=0, sem rampa em nenhuma ponta |

Regras que a verificacao pega:

- **Cue de hero precisa da forma greet.** `"0 0.7"` sobe do nada, o que significa que a primeira tela que
  todo visitante ve nao tem titulo nela.
- **O cue do ultimo ato precisa segurar.** Um valor so. Um CTA de fechamento num cue de dois valores
  esmaece antes da pagina terminar.
- **So o ultimo ato pode segurar.** O motor so "estaciona" um cue quando o ato ja esta um viewport e um
  quarto fora de alcance, entao um cue de valor unico num ato **do meio** fica aceso durante todo o slide
  de despin: a linha viaja um viewport inteiro pra cima e sobrepoe a secao seguinte. Todo ato exceto o
  ultimo fecha seu cue final com uma janela de dois valores terminando em 1.
- **Chao ou greet.** Um stage pinado fica totalmente visivel cerca de um viewport **antes** do seu proprio
  progresso sair de 0, entao qualquer ato pinado cujo primeiro conteudo seja um cue simples de dois valores
  mostra um stage vazio por todo esse percurso. Dar ao ato um chao que ja esta la (uma imagem, um frame
  segurado, uma cor que ja esta trabalhando) ou um primeiro cue na forma greet.

---

## 3. `pan`: scroll vertical, percurso lateral

Movimento lateral le como *amplitude* onde vertical le como *argumento*. Usar pra um range, uma lista, uma
timeline. Nao usar pra hierarquia — o primeiro item de um rail nao e lido como o mais importante.

```html
<section data-sc-act="pan" data-sc-span="3.2">
  <div data-sc-stage>
    <div class="pf-rail" data-sc-pan="0.08">
      <article>...</article>
      <article>...</article>
      <article>...</article>
    </div>
  </div>
</section>
```

O motor mede `scrollWidth` contra o viewport e percorre exatamente o overflow. Span: ~1 viewport-height
por item, mais 1.

**Medir o overflow, nao assumir.** O motor percorre exatamente `scrollWidth - viewport`; um rail mais
estreito que o viewport percorre **zero** e o ato vira um stage pinado segurando uma tela parada pelo span
inteiro. Isso e dependente de largura — pode ser correto no celular e morto no desktop ao mesmo tempo, e a
suite de verificacao automatizada **nao pega isso**. Medir manualmente:

```js
document.querySelector(".rail").scrollWidth - innerWidth  // precisa ser positivo e saudavel
```

Se poucos itens nao alcancam meio viewport de overflow, a correcao nao e card mais largo, e **mais rail**:
colocar o titulo do ato como primeiro item e uma nota de fechamento como ultimo.

**Copy de card e lido cortado.** Itens entram e saem pelas bordas do viewport, entao um titulo fica
meio-visivel a maior parte da vida dele. Manter titulos de card a uma ou duas palavras curtas.

**Reduced motion:** o transform do rail nao e decoracao, e a navegacao — o motor lida com isso
automaticamente, virando o stage numa regiao `overflow-x: auto` nativa com snap de proximidade.

---

## 4. `reveal`: um wipe e uma mudanca de estado

`clip-path` comendo a partir de uma borda. Custa nada e le como transformacao — certo pro beat onde algo
vira outra coisa. Errado pra so introduzir uma imagem, onde um cue basta.

```html
<figure data-sc-reveal="up" data-sc-reveal-at="0.15 0.55">
  <img src="assets/03.webp" alt="…">
</figure>
```

`up` `down` `left` `right` `iris`. Reservar `iris` pra ~uma vez por pagina — e o mais alto dos cinco.

**`clip-path` e relativo a border box, nao a tinta.** Um reveal em tipografia com `line-height` abaixo de 1
tem uma border box mais curta que os glifos, entao o wipe corta ascendentes/descendentes fora. Dar espaco
ao elemento (`line-height: 1` + padding) ou colocar `data-sc-reveal` num wrapper.

---

## 5. `kinetic`: tipografia que se monta

Divide um titulo em linhas, palavras ou caracteres e escalona a revelacao pela janela do cue.

```html
<h2 class="sc-display sc-display--lg" data-sc-cue="0.1 0.7" data-sc-kinetic="lines">
  Titulo que se monta.
</h2>
```

Linhas quase sempre e certo; palavras pra uma frase curta de impacto; caracteres quase nunca, porque isso
transforma leitura em espera. Cada unidade desliza de tras de uma mascara — mascaras de linha reservam
espaco pra descendentes; uma mascara presa a line box corta a cauda de g, y, p, j.

Split de linha mede line boxes reais, entao roda de novo depois de `document.fonts.ready`.

**No maximo um titulo kinetic por ato.**

---

## 6. `parallax`: camadas em ritmos diferentes

Profundidade por movimento diferencial. Sutil ou nada — alem de ~200px de percurso total para de ler como
profundidade e comeca a ler como bug.

```html
<div class="pf-layer pf-layer--back" data-sc-parallax="-1.4">…</div>
<div class="pf-layer pf-layer--mid"  data-sc-parallax="-0.6">…</div>
<div class="pf-layer pf-layer--front" data-sc-parallax="0.35">…</div>
```

A taxa e em centenas de pixels, nao fracoes de viewport (`rate * (p - 0.5) * 100` px). Negativo se move
mais rapido que o scroll, empurrando o elemento pra tras. Tres camadas e suficiente; cinco e um diorama.
Nunca colocar texto de corpo numa camada de parallax.

---

## 7. `count`: numeros que aterrissam

```html
<span class="sc-nums" data-sc-count="0 4200" data-sc-count-at="0.1 0.5">0</span>
```

Formatacao inferida do alvo: decimais das casas decimais, separador de milhar acima de 10.000 ou sempre
que o proprio alvo ja for escrito com um. O elemento recebe `tabular-nums`.

**So numeros reais.** Um contador e uma alegacao de verdade com movimento junto. Se a marca nao tem numero
verificado, nao ha contador — decidir isso antes de desenhar um ato em volta de um numero, nao depois.

---

## 8. `flow` + `in`: secoes normais, bem feitas

Nem tudo deve ser pinado. Secoes normais em fluxo de documento, com reveal-on-entry.

```html
<section class="sc-section">
  <div class="sc-wrap sc-stack" data-sc-stagger="70">
    <h2 class="sc-display sc-display--md">Titulo</h2>
    <p class="sc-body">…</p>
  </div>
</section>
```

Dispara **uma vez**, na entrada, via IntersectionObserver. Conteudo que se esconde de novo ao rolar pra
cima e defeito, nao efeito. Stagger entre 30 e 80ms.

---

## 9. Pointer devices: interatividade que nao e scroll

```html
<div class="pf-card" data-sc-tilt="7">…</div>
<a class="pf-cta" data-sc-magnet="0.28">CTA</a>
<section data-sc-spotlight>…</section>
```

- `tilt`: rotacao 3D em direcao ao ponteiro. 5 a 9 graus. Acima de 12 vira brinquedo.
- `magnet`: o elemento deriva em direcao ao ponteiro. 0.2 a 0.35. So no CTA primario.
- `spotlight`: publica `--sc-mx`/`--sc-my` pra uma luz que segue o ponteiro sobre a superficie.

Todos os tres sao limitados a `(hover: hover) and (pointer: fine)` e desligados sob reduced motion — touch
nunca dispara um hover falso. `magnet`, `parallax` e `cue` escrevem `transform`; nao podem compartilhar
elemento.

---

## 10. `drift`: o chao se move junto

Nao e um ato, e uma propriedade de atos — o que faz a pagina parecer um lugar continuo em vez de uma pilha
de slides.

```html
<section data-sc-act="scrub" data-sc-drift="#0A0806"> …
<section data-sc-act="pin"   data-sc-drift="#161210"> …
```

O chao da pagina interpola entre os valores conforme cada ato assume. Tres a cinco paradas por pagina,
passos pequenos.

**Drift pertence ao primeiro ato cujo progresso esta estritamente entre 0 e 1.** Isso e certo quando os
atos sao longos o bastante pra so um estar parcialmente em progresso por vez. Numa pagina de muitos cortes
curtos, pintar o chao por secao em vez de interpolar.

---

## Compondo um ato

Devices se empilham dentro de um ato. Um stage pinado pode segurar um clipe escrubando, uma camada de
parallax, um titulo kinetic e um spotlight ao mesmo tempo. O limite e atencao, nao o motor: **uma coisa
deve ser o motivo do ato existir**, o resto e suporte.
