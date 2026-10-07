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

## Verificar o áudio

Não afirme que "a trilha está certa" sem medir: `ffprobe` (duração igual à do vídeo), `ffmpeg -af volumedetect` (sem clipping),
e ouvir/olhar o espectro onde há corte. Voz sintetizada paga (ElevenLabs etc.): chave por variável de ambiente, custo aprovado antes.
