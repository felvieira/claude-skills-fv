# SOUND — pontuar na batida

Som é onde "vídeo de IA" começa a parecer filme. Dois caminhos, ambos na mesma linha do tempo da imagem:

1. **Trilha fornecida**: meça o BPM (e o primeiro tempo) antes de cortar. Cortes e acentos caem na grade.
2. **Trilha sintetizada**: gere o áudio no mesmo script que a imagem, com o mesmo BPM. `scripts/audio-synth.mjs` faz kick,
   chimbal, baixo e um tick por corte (WAV mono sem dependências) e é só rascunho de ritmo; trilha final mais rica pode usar a mesma grade.

## Grade de batidas (`motion.mjs`)

`beatGrid(bpm, count, sub)` lista os instantes; `snapToBeat(t, bpm)` trava um corte na batida; `barsFor(seconds, bpm)` diz se a duração fecha
em compassos de 4 (loops e finais soam melhor); `pulse(t, bpm)` dá um brilho que decai a cada batida.

```bash
node skills/86-code-motion-film/scripts/audio-synth.mjs --bpm 120 --seconds 6 --cuts 0,1.5,3,4.5 --out score.wav
node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --out film.mp4 --duration 6 --audio score.wav
```

## Escutar uma trilha fornecida e cortar no compasso

`skills/86-code-motion-film/scripts/beats.mjs` acha o andamento, a primeira batida, o **tempo forte** (compasso 1) e onde a música levanta ou cai, e corta compassos inteiros:

```bash
node skills/86-code-motion-film/scripts/beats.mjs analyze trilha.mp3                      # andamento, compasso 1, energia por compasso, levantadas (drops) e quedas
node skills/86-code-motion-film/scripts/beats.mjs cut trilha.mp3 --bpm 110 --bar1 0.30 --bars 3-10 --out corte.wav   # compassos 3 a 10, fades de 8 ms, duração exata
```

Como usar o resultado: ponha o **drop** no mapa de batidas primeiro e planeje o filme de trás para a frente (a maior revelação cai nele); escolha compassos cuja levantada e
quebra caiam onde as do filme caem; copie `bpm` e `bar1` para o filme (`snapToBeat`, `beatGrid`); a duração do filme deve ser um número inteiro de compassos. O andamento é
procurado entre 80 e 160 BPM (`--range 70,180` muda), onde não há ambiguidade de oitava. A confiança do tempo forte é baixa quando a música não acentua o primeiro tempo:
nesse caso confirme de ouvido e passe `--bar1` à mão.

Trilha própria sintetizada ou fornecida, o resultado é verificável: `ffprobe` na duração e `beats.mjs analyze` no arquivo final devem mostrar o mesmo andamento e o drop onde o filme espera.

## Verificar o áudio

Não afirme que "a trilha está certa" sem medir: `ffprobe` (duração igual à do vídeo), `ffmpeg -af volumedetect` (sem clipping),
e ouvir/olhar o espectro onde há corte. Voz sintetizada paga (ElevenLabs etc.): chave por variável de ambiente, custo aprovado antes.
