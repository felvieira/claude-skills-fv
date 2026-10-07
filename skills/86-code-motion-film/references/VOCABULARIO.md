# VOCABULÁRIO DE MOVIMENTO — um conjunto por filme

Nomeie os movimentos pela sensação e **use um conjunto só no filme inteiro**. Isso é o que faz um filme parecer dirigido em vez de somado.
Os nomes de molas e funções são os de `skills/86-code-motion-film/scripts/motion.mjs` e `skills/86-code-motion-film/scripts/stage.mjs`.

| Sensação | Como se escreve |
|---|---|
| **chegar** | mola com um fio de sobrepasso (`presets.snappy`, `SPRINGS.slam` em letras) ou saída suave; as coisas vêm de baixo ou do elemento que as causou |
| **assentar** | mola bem amortecida (`presets.default`, `SPRINGS.settle`); painéis, cartões, seleções |
| **sair** | mais rápido que a chegada; o último a entrar é o primeiro a sair |
| **encaixar** | `SPRINGS.snap`; mudança de estado de interface: lista que se desloca, cartão que muda de tamanho |
| **deslizar** | 0,8 a 1,2 s com `ease`; movimentos de câmera |
| **derivar** | 2 a 3% ao longo de uma pausa; a câmera nunca para de vez, para a tela parada não virar quadro congelado |

## Regras que seguram o conjunto

- **Um objeto-relé.** Um pequeno elemento da marca (ponto, linha, linha de lista) atravessa o filme inteiro: vira o dispositivo, marca o que mudou, volta ao logotipo.
  Primeiro e último quadro rimam.
- **A cor de destaque tem um só significado**: *agora* ou *acabou de mudar*. O valor novo chega nela e esfria para a cor neutra. Não gaste em decoração.
- **Algo se mexe a cada batida; cenas mudam na barra do compasso.**
- **Uma mudança visual por batida.** Uma ação leva 0,3 a 0,5 s; o resultado segura 1 a 2 s antes da próxima.
- **Texto** entra em 0,35 a 0,45 s, escalonado 0,06 a 0,1 s por linha; sai mais rápido (0,25 a 0,3 s), a última linha primeiro.
- **Um toque é uma batida só dele**: o marcador do dedo aparece 0,08 s antes da batida, o controle aperta na batida, a tela seguinte começa 0,10 a 0,15 s depois. Nunca toque
  em algo na mesma batida em que ele aparece.
- **Câmera se move entre ações, nunca durante uma.** Dois movimentos de câmera ao mesmo tempo, nunca.
- **A maior revelação cai no drop da música.** Ponha o drop no mapa de batidas primeiro e planeje de trás para a frente (`beats.mjs analyze` mostra onde ele está).
- **Termine onde começou**: quando é loop, o quadro depois do último é igual ao primeiro. Movimento ambiente (respirar, balançar) usa ciclos inteiros ao longo do filme.

## Pausas ("holds")

Pause **batidas inteiras** depois de cada resultado que o espectador precisa ler (um total, um formulário preenchido, um gráfico); as ações seguintes continuam na batida.
Duas batidas a 120–130 BPM são cerca de um segundo.

## Transições que funcionam: use as formas e ações do próprio produto

- **Ponto → dispositivo**: um ponto da marca voa ao centro e encolhe enquanto a tela se abre por baixo dele.
- **Toque → folha**: marcador do dedo, o botão aperta, a folha sobe de baixo com uma mola amortecida, o conteúdo sobe depois dela.
- **Salvar → resultado**: a folha cai, a nova linha entra e empurra as outras, o saldo rola para o novo valor. Pausa.
- **Fechar no ícone**: ao fim a tela se transforma no ícone do app, a câmera ajusta para o ícone chegar ao centro no tamanho final, e o ícone vira o ponto da marca.
- **Legenda ao lado**: a câmera leva o elemento principal para um lado; a legenda sobe em máscaras linha a linha no lado livre, nunca por cima, e afunda antes de a câmera voltar.

Evite em filme de produto: fusão cruzada entre cenas, desfoque de entrada, revelação por brilho, vidro e brilho, giro 3D, partículas. Em outros vídeos efeitos são válidos, mas
cada um marca um momento e nenhum esconde texto que precisa ser lido.

## Armadilhas

- Texto em posição fracionária de repouso (desenhado meio pixel de lado conforme a ordem dos quadros; `check-film` acusa): arredonde o repouso.
- Conteúdo aparecendo enquanto a tela ainda se abre: comece o conteúdo depois que a forma termina.
- Camada ligada um quadro antes de o movimento dela começar: pisca na posição final. Mostre no mesmo `t`.
- Sobrepasso de mola empurrando uma folha além do repouso e descobrindo a tela de trás: limite a [0, 1].
- Dois movimentos na mesma propriedade vindos de cenas diferentes: cada camada tem um dono, ou combine com `track()`.
- Cache indexado por qualquer coisa que não seja o valor que ele espelha (um contador de "última batida" quebra a ordem de seek).

Ideias de vocabulário e armadilhas inspiradas em kaventro/motion-designer (MIT); texto próprio.
