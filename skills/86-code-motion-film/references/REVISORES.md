# REVISORES — olhar o filme com olhos limpos

`CRITIQUE.md` descreve o laço; este arquivo descreve **quem olha, com que folha e o que reporta**. Imagem é o que mais pesa numa sessão e fica nela até o fim, então
a leitura dos quadros vai para revisores com contexto limpo, que devolvem **linhas de texto**. Se o seu agente não delega, faça as mesmas passadas você mesmo, uma
faixa por vez, e anote em texto.

## Antes de olhar: provar que o filme é determinístico

Olhar quadro de um filme que muda conforme a ordem do seek é perda de tempo. Rode primeiro:

```bash
node skills/86-code-motion-film/scripts/check-film.mjs film/index.html           # --no-loop se o filme não é loop
```

| Verificação | Falha quando | Causa usual |
|---|---|---|
| fonte limpa | há `Math.random`, `Date.now`, `setTimeout`/`requestAnimationFrame` ou `transition`/`animation` CSS nos arquivos | efeito escrito "do jeito web"; calcule a partir de `t` |
| sem erro de página | algum quadro, a cada 0,1 s, lança erro | chave que falta, símbolo ausente, conta com `undefined` antes da cena começar |
| mesmo instante, mesmo quadro | o mesmo `t` desenha diferente conforme de onde se chegou | contador, cache, propriedade ajustada num ramo e nunca restaurada, imagem ainda decodificando, texto em posição fracionária |
| o loop fecha | o quadro depois do último (`t = DURATION`) difere do primeiro | movimento ainda correndo, estado final diferente do inicial, pulso preso à batida que não recomeça |

Texto parado em posição fracionária pode ser desenhado meio pixel para um lado ou para o outro dependendo do que veio antes: arredonde posições de repouso, deixe a fração
só para o movimento.

## Folhas que o revisor recebe

```bash
# visão geral: uma imagem a cada 0,5 s
node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --stills 0:14.5:0.5 --sheet qa/geral.png --stills-dir qa/geral
# uma transição: 0,3 s antes e depois do corte, de 0,05 em 0,05
node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --stills 3.7:4.3:0.05 --sheet qa/corte-4.png --stills-dir qa/corte-4
# legibilidade: cada tela com texto, em tamanho cheio e supersampled
node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --stills 8.2,12.4 --scale 2 --stills-dir qa/texto
# celular: uma imagem por segundo, miniaturas de 360 px (o tamanho de um feed)
node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --stills 0:14:1 --sheet qa/celular.png --tile 360 --stills-dir qa/celular
```

Uma folha tem até 3 colunas; tire várias para faixas longas. Divida o filme em trechos de uns 12 s e despache **um revisor por trecho e por tipo**, todos de uma vez:
`geral` (o trecho inteiro), `transicoes` (com os instantes dos cortes), `texto` (com os instantes das telas com texto) e um `celular` para o filme todo.

## Prompt do revisor

Dê a cada um o bloco abaixo e o catálogo de falhas (próxima seção). Ele **não edita o filme, não renderiza vídeo e não abre outros arquivos da skill**.

```text
## Despacho
PAGINA: film/index.html          TRECHO: <de> <ate> (segundos)
TIPO: geral | transicoes | texto | celular
INSTANTES: <cortes, para transicoes; telas com texto, para texto>
HISTORIA: <linhas do mapa de batidas deste trecho: tempo, batida, o que deve estar na tela>
MUDOU: <o que acabou de ser corrigido, para olhar primeiro>   (opcional)
SAIDA: qa/revisao-<de>-<ate>.md
```

Instrução: renderize as folhas do tipo, olhe cada página, compare com `HISTORIA`; quando uma miniatura parecer errada mas pequena demais para julgar, renderize aquele instante
com `--scale 2` e olhe de novo antes de reportar. Escreva `SAIDA` com no máximo 30 linhas, sem figuras e sem preâmbulo:

```text
notas: gancho 7 | legibilidade 8 | movimento 6 | variedade 8 | composicao 7 | sincronia 8 | exatidao 9
12.35s | flash | o cartao aparece na posicao final por um quadro antes de subir | mostre no mesmo t em que a subida comeca
14.10-14.60s | tempo | o total fica 0,5 s na tela e precisa de 1,2 s | adie a proxima acao uma batida
```

Cada nota abaixo de 8 exige ao menos uma linha de defeito que a levantaria. Se nada está errado e todas as notas são 8 ou mais, escreva a linha de notas e `limpo`.

| Nota | Significa |
|---|---|
| gancho | os 2 primeiros segundos já mostram a ação mais forte ou levantam uma pergunta (`-` se o trecho começa depois) |
| legibilidade | cada palavra que importa lê no tamanho do celular e dura o suficiente |
| movimento | as coisas têm massa (aceleram, passam um fio, assentam); nada linear, flutuante ou fantasma |
| variedade | algo novo a cada 2 a 4 s, sem o mesmo movimento duas vezes seguidas |
| composicao | um ponto focal por instante, quadro equilibrado, nada colado na borda |
| sincronia | ações e cortes caem nas batidas rotuladas |
| exatidao | só o que a `HISTORIA` e o produto fazem; número ilustrativo leva rótulo ("Dados de exemplo") |

Corrigido o que o relatório nomeia, rode `check-film` de novo e mande o revisor de volta **só ao que mudou e aos vizinhos**, com `MUDOU` dizendo o que foi corrigido. Repita até todo
relatório dizer `limpo` com todas as notas em 8 ou mais.

## Tempo de leitura

Cada linha de texto que precisa ser lida fica parada por **meio segundo mais um terço de segundo por palavra**, contados a partir do instante em que a última palavra assentou.
Cada resultado de uma ação segura 1 a 2 s antes da próxima. Texto que importa tem pelo menos uns 20 px no palco; se não cabe, aproxime a câmera em vez de encolher o filme.

## Catálogo de falhas

| O que se vê | Correção |
|---|---|
| rótulo cortado ("Savi", "Uncategori…") | reenquadre ou escolha um dado que caiba; nunca entregue palavra cortada |
| descendentes cortados no fundo de uma máscara | altura da máscara de pelo menos 1,3 vez o corpo da fonte |
| texto atravessado por um elemento em movimento | reordene as camadas ou mude o caminho; segure o texto até o elemento passar |
| um quadro de flash de uma camada na posição final | mostre a camada no mesmo `t` em que o movimento dela começa |
| camada que aparece ou some sem movimento | dê uma entrada (subida, mola, recorte) ou ligue-a a algo que se mexe |
| conteúdo visível enquanto a tela ainda abre | comece o conteúdo depois que a forma termina de se abrir |
| texto pequeno demais | câmera mais perto; nunca encolher |
| legenda ou fala por cima do elemento principal | mova a câmera primeiro, entre com a legenda depois que ela assentar e tire antes de a câmera voltar |
| texto minúsculo cintilando em movimento lento | renderize com `--scale 2` |
| uma ação entre batidas | ponha na batida; deslocamentos dentro de uma batida são só para movimento secundário |
| deriva fazendo uma tela parada "andar" de lado | a deriva escala em torno do centro do palco; enquadre para o centro ser onde o olho está |
| mola ultrapassando e descobrindo o que está atrás de uma folha | limite o valor da mola a [0, 1] quando o excesso descobriria algo |

## Entregáveis de render

- `out/<nome>.mp4`: H.264, `yuv420p`, CRF 14 a 17, com a trilha.
- **Motion blur** para filmes com movimento rápido (empurrões, chicotes, giros): `--blur 4` (ou 8). Custa N vezes o tempo de render: itere sem, entregue com.
- **Supersampling** para texto fino: `--scale 2` desenha em dobro e reduz com lanczos.
- `out/<nome>-loop.mp4`: a mesma imagem sem som, para autoplay mudo em sites e feeds: `ffmpeg -i out/<nome>.mp4 -an -c:v copy out/<nome>-loop.mp4`.
- `out/<nome>-poster.png`: o quadro-herói (em geral o do drop): `--stills <t> --scale 2`. O **quadro 0** também é miniatura em muitos players; olhe-o: tem de ser um quadro acabado.
- Uma cópia menor quando a plataforma pedir: `ffmpeg -i out/<nome>.mp4 -vf scale=1080:-2:flags=lanczos -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a copy out/<nome>-1080.mp4`.

## Olhos novos no filme pronto

Mostre a quem não conhece o produto (ou imagine ser essa pessoa): dá para dizer o nome, o que ele faz, para quem e onde achar? Se não, o problema é a história ou a abertura,
não o polimento.

Ideias do protocolo (revisores com contexto limpo, notas por dimensão, catálogo de falhas, tamanho de celular) inspiradas em kaventro/motion-designer (MIT); texto e código próprios.
