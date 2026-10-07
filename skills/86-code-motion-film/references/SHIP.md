# SHIP — formatos, poster, skill e entrega

## Todos os formatos a partir de uma linha do tempo

Escreva as cenas contra `layout(w, h)` (unidades relativas, `portrait`, `safe`), não contra pixels. Renderize em paralelo:

```bash
for f in "1920x1080 16x9" "1080x1920 9x16" "1080x1080 1x1"; do set -- $f
  node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --size $1 --out out/film-$2.mp4 --duration 6 --audio score.wav &
done; wait
```

Recomponha texto e interface por formato; não corte um 16:9 para vertical.

## Checagens de entrega

- `ffprobe`: duração, resolução, codec e trilha do arquivo entregue
- loop: o quadro 0 e o último quadro são iguais (compare) quando for loop
- poster: um quadro escolhido (`--stills <t>`)
- fonte limpa: `film/`, `lib/`, `README.md` com o comando de re-render; sem chaves

## Empacotar como skill

Depois de uma peça boa, o processo vira uma frase: `/motion-reel para [URL], 20 s, vertical, referência ./refs/quadro.png`. Empacote
motor, síntese, brief e crítica como skill de projeto (`.claude/skills/`) ou plugin. Esta própria skill é esse empacotamento.

## Oferta comercial (se for o caso)

Um pacote simples: música, mascote em qualquer estilo, features do produto, oferta no final, qualquer idioma, até 3 ajustes. O que torna
isso viável é o motor mais o laço de crítica: entregar numa tarde, com preço compatível com produção de vídeo. Preço e contrato são decisão
sua; a skill só entrega o filme.
