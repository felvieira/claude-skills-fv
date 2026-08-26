# Verificar

Uma pagina de scroll nao da pra checar so olhando. Ela nao tem estado unico: cada posicao de scroll e um
frame diferente, e as falhas vivem entre as duas posicoes que voce por acaso olhou. Por isso caminhar
mecanicamente.

## Como rodar neste kit

O repo original usa scripts Node proprios (`serve.mjs`, `shoot.mjs`) acoplados ao ambiente do autor — nao
portados aqui (ver PROVENANCE.md). O procedimento equivalente com as ferramentas ja disponiveis no ambiente
do agente:

1. **Servir a pagina via HTTP local.** Nunca `file://` — isso bloqueia o fetch em Blob que o motor usa
   pra scrub de video, entao a pagina cai silenciosamente pro poster e nao prova nada. Usar qualquer
   servidor estatico simples (o kit ja tem convencao de dev-registry pra subir processo — ver CLAUDE.md do
   ambiente) apontando pra pasta do build.
2. **Navegar programaticamente por multiplas posicoes de scroll**, usando as ferramentas de browser
   disponiveis (screenshot a cada posicao). Amostrar **dentro de cada ato** — nao uniformemente pela
   pagina inteira — pra pegar entrada, meio e saida de cada stage pinado. Um stage pinado fica visivel um
   viewport antes do pin comecar e um depois de terminar; amostrar so o percurso pinado (ex.:
   `top + (altura - vh) * p`) nunca visita essas duas janelas, que sao exatamente onde o bug de "clip
   congelado" (ver devices.md §1) se esconde.
3. **Repetir em viewport mobile** (ex.: 390x844) e **com `prefers-reduced-motion` emulado**.
4. **Montar um contact sheet** — grade de screenshots lado a lado. O valor esta em olhar os frames juntos;
   uma pasta de PNGs soltos nao e olhada dessa forma.
5. **Ler o contact sheet.** Ele prova que um clipe avanca; nao prova que a composicao e boa, que o
   movimento e suave, ou que a pagina significa algo.
6. **Navegar por Tab** pra checar ordem de foco.

Usar Chrome real (nao um Chromium empacotado sem decoder h264) quando disponivel — um Chromium sem decoder
faz todo clipe falhar silenciosamente e a rodada "passa" contra posters, escondendo o problema real.

## O que procurar

**Scroll morto**: posicoes consecutivas onde nada mudou — nenhum cue moveu, nenhum tempo de clipe avancou,
nenhum rail percorreu, nenhum wipe progrediu. Scroll morto real significa que o visitante esta girando a
roda e recebendo nada. Corrigir encurtando o span do ato ou adicionando um cue.

**Clipe congelado**: um stage scrub esta na tela, o leitor esta rolando, e o playhead do clipe nao se move.
Scroll morto nao pega isso, porque o stage em si esta se movendo — uma foto parada esta deslizando pagina
acima. E a pior falha visual que este kit pode produzir. O motor mapeia o tempo do clipe pela vida visivel
inteira do stage por padrao (ver devices.md §1); se isso aparecer, o mais provavel e `data-sc-clip-map="travel"`
tendo sido setado sem necessidade real, ou uma copia do motor anterior a esse default.

**Cues que nunca atingem o pico**: um elemento que nunca chega a opacidade total em lugar nenhum. Geralmente
janela de cue estreita demais pro ato, ou rampas comendo a janela inteira.

**Contraste**: medido na **pagina composta**, nao no video fonte. A direcao certa e escolhida por linha:
texto claro numa pagina escura falha na patch mais **clara** sob ele; texto escuro numa pagina clara falha
na mais **escura**. O scrim tem que ser um **irmao** do copy, nunca um filho — `visibility: hidden` num
teste automatizado esconde pseudo-elementos junto, entao um scrim escrito como `.mycopy::before` fica
escondido junto com o texto que ele protege e a medicao sempre le contra o filme cru. O sinal inconfundivel:
fortalecer o scrim e o numero reportado nao muda nada.

**Erros de console e requisicoes falhas**: um 404 num clipe degrada pro poster silenciosamente, o que
parece bem e nao e.

## O que a checagem automatizada nao cobre

- **Se a composicao e boa.** Copy caindo na parte mais ocupada do frame, um assunto cortado num ponto
  infeliz.
- **Se o movimento e suave.** Frames contiguos provam que o clipe avanca; nao provam que avanca de forma
  uniforme.
- **Se a pagina significa algo.** Seis atos que cada um funciona e juntos nao dizem nada e a falha mais
  cara disponivel aqui.

## Passes manuais

**Reduced motion.** Clipes nunca sao buscados, posters seguram, copy ainda faz cue. A pagina precisa
continuar compreensivel, nao so "nao quebrar" — isso inclui **alcancavel**: confirmar que nenhum conteudo
foi deletado, so parado. Um rail `pan` e o caso que morde: o motor devolve o stage como uma regiao de
scroll nativa sob reduced motion, entao confirmar no sheet que o rail mostra conteudo real e que itens
depois da dobra ainda sao alcancaveis.

**Mobile.** Stages pinados usam `100svh` pra a barra de URL do celular nao causar salto. Conferir que os
encodes de celular de fato carregam. Checar o corte retrato de cada clipe — um movimento 16:9 composto em
volta de espaco negativo a esquerda perde exatamente esse espaco em 9:16.

### O telefone e uma maquina diferente

Chrome headless na maquina de build nao reproduz o decoder de video de um iPhone, a politica de autoplay,
Low Power Mode, ou scroll por toque. Uma rodada headless verde diz que a pagina esta correta onde o headless
roda — nao diz nada sobre iOS de verdade.

O que iOS faz com um clipe scrub, e o que o motor (`engine/scrollcraft.js`, ja copiado) trata:

- iOS nao **pinta** um video mudo que nunca foi tocado. Seeks chegam, `seeked` dispara, a imagem fica num
  frame so. O decoder precisa ser "primed" com um `play()`/`pause()`.
- O motor faz o priming em `loadedmetadata` e tenta de novo em `touchstart`, `touchend`, `pointerdown`,
  `click` e `scroll`. `touchend` importa: a especificacao HTML inclui `touchend` mas nao `touchstart` na
  lista de eventos que ativam gesto do usuario.
- Um priming precisa ser re-tentavel por clipe — um priming de disparo unico no primeiro toque perde a
  corrida quando o hero ainda esta baixando no momento do toque.

Nao reimplementar nada disso em JS de pagina, e nao remover ao copiar o motor.

### Perguntar o que difere antes de perguntar o que quebrou

A licao de debug que custou rodadas inteiras no repo original: "desktop funciona, celular nao" le como
diferenca de plataforma e convida teoria de plataforma (codec, keyframe, resolucao). **"Um clipe funciona e
outro nao, no mesmo dispositivo" nao pode ser diferenca de plataforma.** Antes de teorizar, escrever toda
forma em que o caso que funciona difere do que nao funciona — o bug vive nessa lista.

**Teclado.** Tab por toda a pagina. Ordem de foco bate com ordem visual, o anel de foco e visivel contra
todo chao que ele cruza, nada alcancavel fica parado em opacidade 0.

O motor centraliza um elemento focado dentro de um `[data-sc-act]` cujo cue computa abaixo de 0.85 (via
`focusin`), com `behavior: 'instant'`. Isso nao resolve um controle dentro de um ato **pinado** — la, a
unica forma de abrir o cue certo e rolar pra parar o ato exatamente no progresso onde o cue daquele
controle esta aberto, o que e trabalho especifico da pagina (so a pagina sabe qual cue pertence a qual
controle).

## Falhas conhecidas

Cada uma destas ja aconteceu num build do repo original e parecia correta ate ser medida.

| Sintoma | Causa |
|---|---|
| Titulo de hero quebrando em seis linhas | `max-width` em `ch` num **container** — `ch` resolve contra o font-size do container, nao do titulo dentro |
| Copy centralizado pendurado fora da borda esquerda | `inset-inline` declarado **depois** de `left: 50%` — o shorthand reseta `left` |
| Ato que nunca pina, silenciosamente | Uma regra de autor setando `position` no stage — o motor avisa no console |
| Titulo de um ato sobrando visivel sobre a secao seguinte | Cue de valor unico ("hold") num ato do meio — so o ultimo ato pode segurar |
| CTA de fechamento esmaecendo antes da pagina acabar | Cue de dois valores no ultimo ato |
| Clipe preso no poster no topo do proprio ato | O reveal espera evento `seeked`, e um clipe ja em tempo 0 nunca faz seek |
| Rail `pan` sem overflow reportado como saudavel | `scrollWidth - viewport` negativo — medir manualmente, a suite automatizada nao pega |
| Clipe que escruba bem, para, e desliza como foto parada | Clipe mapeado ao percurso pinado em vez da vida visivel inteira do stage |
| Clipe de hero congelado no iPhone real, clipes seguintes ok, toda sonda headless verde | iOS nunca pinta video mudo nao-tocado; priming de disparo unico gastou a chance enquanto o hero ainda baixava |
