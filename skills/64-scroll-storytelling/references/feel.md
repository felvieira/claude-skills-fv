# O eixo de emocao

Uma pagina nao e secoes. E uma sequencia de estados que uma pessoa atravessa com a mao na roda do mouse. O
kit de devices decide como a pagina parece, a gramatica decide o que a pagina e, este arquivo decide o que
ela faz com alguem.

Desenhar a emocao antes dos atos. Uma lista de atos escrita primeiro sera sempre uma lista de coisas que
acontecem, e uma pagina de coisas acontecendo e uma pagina que ninguem consegue descrever depois.

## 1. A curva de emocao

Escrever a curva como artefato proprio, no `BRIEF.md`, antes de qualquer ato existir. Uma linha por ato: a
emocao, depois a coisa na tela que causa ela.

A coluna de emocao e a restricao. A coluna de causa e o unico lugar onde um nome de device pode aparecer,
e aparece em segundo, porque a emocao escolhe o device e nunca o contrario.

Estados uteis, lista aberta: curiosidade, reconhecimento, inquietacao, duvida, tensao, admiracao, deleite,
alivio, intimidade, confianca, resolucao, calma.

**Se dois atos adjacentes produzem a mesma emocao, um deles e enchimento.** Cortar ou mudar o que ele faz.
Toda emocao e definida pelo que veio antes: alivio precisa de tensao na frente, admiracao precisa de
quietude na frente, intimidade precisa de escala na frente.

### Curva de exemplo: marca de bebida enlatada

```
1  Reconhecimento   a propria bancada de cozinha as 7h, no nivel dos olhos
2  Fadiga           os dois potes, a bagunca, segurado parado enquanto o copy nomeia
3  Deleite          um wipe, e o quadro inteiro vira uma lata gelada, condensacao escorrendo
4  Confianca        textura macro numa escala que o olho nao alcanca numa loja
5  Apetite          os sabores viajando de lado, cada um aterrissando inteiro
6  Resolucao        tudo para, uma lata, uma linha, um lugar pra comprar
```

### Curva de exemplo: produto de infraestrutura pra engenheiros

```
1  Pavor familiar   o canal de alerta as 3h, markup real, ja rolando
2  Duvida           o log enche e nada nele explica nada
3  Clareza          um painel resolve o trace inteiro, o ruido cai
4  Controle         o visitante move uma selecao e a superficie responde
5  Competencia      os numeros reais chegam em telemetria que da pra checar
6  Prontidao        um input ao vivo com um cursor dentro, nao um botao
```

Nota: numa pagina inteira de cortes rapidos, o unico ato lento pode ser o pico — o pico e definido por
contraste com a propria pagina, nao por uma quantidade absoluta de espetaculo.

## 2. O pico

Pessoas lembram um momento de pico e o final. O meio comprime numa impressao geral e some. Essa e a regra
peak-end, e e a coisa mais util que se sabe sobre como alguem experimenta uma sequencia.

Todo build projeta **um pico deliberado**. Nomear no `BRIEF.md` como a frase que um visitante diria a um
amigo:

> a tela ficou preta e depois o oceano inteiro acendeu debaixo de mim

Nao "o hero e impressionante". Um momento descrito, com um antes e um depois.

O pico ganha tres coisas, as custas dos outros atos:

| Ganha | Porque |
|---|---|
| O orcamento de asset | O melhor frame gerado ou a unica filmagem real vai aqui |
| O silencio antes | Um ato de quietude, ou um viewport vazio, pra mudanca ter de onde partir |
| O maior espaco de scroll | O maior `data-sc-span` da pagina, e o `data-sc-dwell` que assenta a camera nele |

**Uma pagina com tres picos nao tem nenhum.** Tres atos impressionantes se achatam entre si. Se um segundo
ato esta competindo, rebaixar: span menor, asset mais simples, device mais simples.

**O final precisa resolver.** A ultima sensacao e a que fica. Um final que se dissolve pra um rodape
sobrescreve tudo que o pico fez. Resolucao significa que a pagina chega em algum lugar e para: o divisor
colapsa, o mundo pousa num lugar, a tipografia encolhe pro ajuste mais quieto.

## 3. O teste "e o site onde ___"

Antes de construir, completar a frase:

> e o site onde ___

Depois olhar o que preencheu o espaco.

- "tem um video scrub" e nome de device. Sem gancho de memoria ainda.
- "voce mergulha no fundo do oceano e o leitor de pressao continua subindo" e uma experiencia. Isso e um
  gancho.
- "voce arrasta as letras do logo e elas se encaixam de volta perfeitamente" e uma experiencia.

O espaco em branco precisa ser algo que aconteceu **com o visitante**, do lado dele. Se a frase so faz
sentido pra quem leu a pasta do build, falha.

Essa frase vai no `BRIEF.md`, e o signature move (uniqueness.md §3) normalmente mora dentro dela. Se o
signature move e a frase "e o site onde" apontam pra momentos diferentes, um dos dois e decoracao.

## 4. Estar dentro, nao assistindo

A diferenca entre espectador e participante e se a pagina reconhece que alguem especifico esta ali: quao
rapido essa pessoa esta se movendo, onde esta o ponteiro dela, se ela parou.

Tecnicas concretas:

- **Parallax de ponteiro que move o mundo, nao um card.** `data-sc-spotlight` publica `--sc-mx`/`--sc-my`;
  dirigir o transform de uma camada de fundo com eles em vez de um highlight.
- **Detalhe disparado por permanencia.** Segurar parado num ato e algo mais chega — uma legenda, uma
  segunda linha. Recompensa por parar.
- **Velocidade de scroll modulando intensidade.** Scroll rapido eleva grao, blur, offset cromatico;
  scroll lento assenta.
- **A pagina se dirigindo a "voce" num momento que aterrissa.** Nao o tempo todo — isso e so copywriting.
  Uma linha, na virada emocional, em segunda pessoa.
- **Um rastro de onde o visitante esteve.** Algo que acumula conforme ele viaja.

**Corporificacao e tempero. Uma ou duas por pagina.** Uma pagina que reage a tudo parece assombrada, nao
viva — o visitante para de ler e comeca a cutucar.

Tudo aqui e limitado a `(hover: hover) and (pointer: fine)` e desligado sob reduced motion.

## 5. Ritmo como emocao

Distancia de scroll e tempo emocional. E o unico relogio que este meio tem.

| Ritmo | Le como | Construido com |
|---|---|---|
| Atos curtos, cortes duros | Adrenalina, pulso, impaciencia | Atos abaixo de 1.4vh, sem `pin`, dwell 0 |
| Um pin longo | Respiracao suspensa, pressao, atencao | `data-sc-span` 3+, cues sobrepostos |
| Um viewport vazio antes de um reveal | Silencio antes da queda | Um ato so-de-chao, sem cue ate o proximo |
| Um assentamento lento no meio do ato | O plano aterrissando | `data-sc-dwell` 0.35 a 0.6 com o pico do cue no assentamento |
| Um cue rapido com plateau longo | Confianca, chegada | `data-sc-cue="0.1 0.9 0.08 0.4"` |

Regras:

- **Dar espaco ao pico.** O ato de pico deve ter o maior span da pagina por margem visivel.
- **Comprimir a parte administrativa.** Specs, logistica, FAQ: informacao, nao experiencia. Secoes flow em
  stagger curto, nao atos pinados com dwell.
- **Silencio precisa ser autorado, nao sobra.** Uma tela vazia intencional le como antecipacao; uma nao
  intencional le como pagina que falhou ao carregar. Se estiver usando o viewport vazio antes do pico,
  dizer isso no `BRIEF.md`.

O orcamento de comprimento total (8 a 14 viewport-heights) continua valendo. Ritmo e como esse orcamento e
gasto, nao permissao pra gastar mais.

## 6. O feel check

Um passe de verificacao, rodado depois do Passo 5 do SKILL.md, contra os contact sheets e um scroll ao
vivo. A verificacao tecnica mede se a pagina funciona. Este passe mede se ela faz o que devia fazer.

Rodar nesta ordem, sem reler o `BRIEF.md` antes. O valor esta inteiro em chegar frio:

1. Rolar a pagina do topo ao fim num ritmo de leitura normal. Uma vez, sem parar pra consertar.
2. Escrever o que foi sentido, ato por ato. Uma palavra por ato antes de olhar qualquer outra coisa. Se um
   ato nao produz palavra, nao escrever nada — nada e o achado.
3. So entao abrir o `BRIEF.md` e comparar as duas curvas.

**Onde divergem, a pagina esta errada, nao o brief.** Reescrever a curva pretendida pra bater com o que foi
construido e a mesma falha que reescrever uma linha de fingerprint.

Tres checagens especificas:

- O pico le como pico? No contact sheet deveria ser a maior mudanca visual e ocupar o maior espaco.
- Ha silencio na frente do pico?
- O final resolve? A ultima tela deveria aguentar parada com conteudo nela.

Reportar o diff no output final: a curva pretendida, a curva sentida, e o que foi mudado.
