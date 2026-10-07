# TIPOS — a forma do filme antes do código

O brief nomeia **um** tipo. Todos rodam no mesmo motor (uma página, cada quadro vindo de `seek(t)`, cenas sobre `createStage` em `skills/86-code-motion-film/scripts/stage.mjs`)
e passam nas mesmas verificações (`check-film.mjs`). O que muda é a forma da história e o que preenche o quadro.

| Tipo | Serve para | Duração · formato | Estrutura |
|---|---|---|---|
| Filme de produto | mostrar o app funcionando | 30–60 s · quadrado ou horizontal | marca vira o app, fluxos um depois do outro, resultado-chave no drop, câmera recua |
| História | lançamento com ponto de vista | 25–45 s · qualquer | gancho → chegada do produto → recursos → cartela final |
| Cartões de recurso | vários recursos rápido (loja, rede social) | 15–30 s · vertical ou quadrado | um painel por recurso, empurrado pelo seguinte na batida |
| Conduzido por texto | uma frase que o produto sustenta | 15–30 s · qualquer | uma linha enorme por vez, uma palavra por batida |
| Vinheta (sting) | abertura, encerramento, revelação de logotipo | 3–8 s · qualquer, em loop | uma ideia, número inteiro de compassos |
| Texto cinético | citação, manifesto, anúncio | 10–40 s · vertical ou quadrado | uma linha por batida, junções nas barras |
| Explicador | explicar um tema, quase sempre com voz | 30–90 s · horizontal ou vertical | um plano por ponto, diagramas que se desenham, números que contam |
| Vídeo de dados | uma estatística, um resultado | 8–30 s · qualquer | número que conta, barras escalonadas, linha que se desenha |
| Clipe musical / lyric | a faixa manda no corte | duração da faixa · qualquer | cortes e golpes na grade da música; efeitos nos drops |
| Montagem de fotos | fotos contando uma história | 15–60 s · qualquer | uma foto por plano com empurrão lento, junções suaves |
| Sobreposição em vídeo | legendas, terços inferiores, cartela final sobre uma gravação | a da gravação | fundo transparente desenhado por cima |

**Corte social** é qualquer um destes com 15–25 s em 1080 × 1920 e o momento mais forte nos 2 primeiros segundos.

## Filme de produto

A interface real do produto dentro do seu dispositivo, uma câmera, cada movimento na batida. A marca vira o app, os fluxos se seguem, o resultado-chave cai no **drop**, a câmera
recua e o último quadro encontra o primeiro. Mostre só o que o produto faz, do jeito que faz; dados inventados e rotulados. Mockup de dispositivo e captura da interface real são
trabalho de fora do motor: use capturas fornecidas pelo usuário (com direito de uso) e redesenhe a interface com `createStage`.

## História (três atos)

1. **Gancho** (2–4 linhas, 6–10 s): quem fala e o que está errado. Cada linha digita na batida; uma palavra carrega a cor de destaque. Se há personagem, ele age em toda linha.
2. **Chegada** (1–2 linhas): o produto aparece com a marca e a interface real.
3. **Recursos** (3–5 cenas de 3–5 s): cada uma é um painel. Um título de quatro a oito palavras diz o que o recurso faz **para quem assiste**, com uma palavra em destaque; ao lado a
   interface faz exatamente isso, em movimento (um interruptor vira, um número conta, uma linha se desenha, uma linha de lista pousa).
4. **Cartela final**: marca, a frase com sua palavra de destaque, a chamada (botão com as palavras do próprio produto), o endereço e três ou quatro fatos pequenos. O último quadro leva ao primeiro.

Como se constrói:
- **Palavra de destaque**: as palavras comuns do título em fonte pesada; a de destaque separada (itálico serifado, cor de destaque ou um traço embaixo) e digitada letra a letra depois do resto.
  Uma por linha, nunca duas.
- **Painéis**: cada cena é um campo de cor com painéis arredondados, um estreito para o título e um largo para a interface. Cenas mudam de cor nas barras; o painel entra do lado para
  onde a história vai e o seguinte o empurra para fora. As cores vêm da marca, em tons claros.
- **Interface em cartões**: os componentes reais, redesenhados em tamanho legível. Cada cartão faz uma coisa por batida.
- **Som**: um leito baixo sob as palavras e um som pequeno em cada ação que importa (estalo enquanto o destaque digita, um "pop" a cada marca, um "whoosh" a cada transição, um sino
  no logotipo). `audio-synth.mjs --score` já tem `type`, `click`, `whoosh`, `chime` e `impact`.
- **Sem legendas decorativas**: nada na tela além do título, da interface e do personagem; nada de número de cena, nome de seção, código de tempo ou rótulo estilo código nos cantos.
- **Personagem**: só o mascote da própria marca, nunca o de outra marca e nunca um inventado para quem já tem o seu.

## Outros tipos, em uma linha cada

- **Cartões de recurso**: a história sem o gancho; termina no cartão do logotipo. Bom como vertical de 15–25 s.
- **Conduzido por texto**: o espaço de cada palavra é reservado desde o começo para a linha não deslocar; entre as linhas a interface prova a frase com um único movimento.
- **Vinheta**: a marca se constrói a partir do ícone, ou uma forma do app vira o logotipo, depois o slogan; corte em compassos inteiros para fechar o loop.

## Além de filmes de app

O mesmo motor faz qualquer vídeo curto. Diferenças em relação a um filme de app:

- **O brief vem primeiro** (`BRIEF.md`): o que o vídeo diz, a quem, em que ordem. Troque "os fluxos do produto" pelos pontos ou linhas que o vídeo faz.
- **Planos**: cada plano é uma camada de quadro inteiro; cada um dura o suficiente para ler (regra de tempo de leitura em `REVISORES.md`); uma ideia por plano.
- **Gravação por baixo**: o que está sob uma sobreposição é arquivo do usuário; o filme só desenha por cima e **nunca altera o arquivo dele**. Com ffmpeg, componha o resultado em uma
  cópia nova.
- **Fatos**: número, citação e nome são do usuário ou inventados para uma demonstração, e o brief diz qual.

Efeitos de cada tipo: `EFEITOS.md`. Estilos: `ESTILOS.md`.
