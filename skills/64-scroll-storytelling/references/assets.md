# Assets

Regras de composicao e enquadramento pra gerar imagem e video de scrollytelling — independente de qual
pipeline gera o arquivo final. Este kit usa `skills/17-image-generator/SKILL.md` (imagem) e o pipeline de
video/imagem canonico do ambiente em vez do kie.ai especifico do repo original — ver PROVENANCE.md.

## Quantos assets

Menos do que parece. Uma pagina de seis atos precisa aproximadamente:

- **2 clipes.** Um movimento de hero, um movimento de textura/detalhe. Esse e o teto de qualidade
  (ver devices.md §1), nao so de orcamento.
- **4 a 6 imagens estaticas.** Posters dos clipes, mais o que os atos flow e pan precisarem.

Todo clipe precisa de um poster, e o poster deve ser **o proprio primeiro frame do clipe**, extraido com
ffmpeg, nunca uma geracao separada parecida — um poster que nao bate causa um salto visivel no momento em
que o video pinta.

```bash
ffmpeg -y -i clipe.mp4 -frames:v 1 -q:v 2 poster.png
```

## Encode pra scrub, nao pra playback

Um encode web normal toca perfeitamente e escruba mal. Buscar (seek) no meio do clipe caminha a partir do
keyframe anterior — usar um GOP denso (keyframe frequente) especificamente pro arquivo que vai ser escrubado
pelo motor, mesmo que isso va contra a configuracao "otima" de um encode de playback normal. Sem audio na
trilha — o motor nunca toca som em clipe de scrub, e o hard rule do SKILL.md proibe audio autoplay de
qualquer forma.

## Stills

1. Escolher um mundo em worlds.md e escrever o preambulo de estilo uma vez.
2. Todo prompt e: **preambulo, linha em branco, cena**. Preambulo literal, sempre.
3. Nomear onde fica o espaco vazio — copy senta em cima dessas imagens.
4. Ler toda imagem antes de usar. Gerar e barato; re-rodar e mais barato que publicar um frame ruim.

**Passar o objeto real da marca como referencia** sempre que a geracao permitir imagem de referencia (ver
`skills/17-image-generator/SKILL.md`). Um label ou logo que deriva entre imagens diferentes e a primeira
coisa que um cliente nota.

## Filmagem real que o cliente ja tem

Filmagem fornecida costuma ser **plana** — sem ponto branco definido. Baixada direto pra pagina sem grade,
produz atos lavados que nenhum ajuste de scrim resolve depois — corrigir na etapa de grade/color do
material intermediario, nao tentando compensar em CSS.

Crop retrato pra mobile: um movimento 16:9 composto em volta de espaco negativo a esquerda perde exatamente
esse espaco quando cortado pra 9:16. Cortar os clipes de celular em retrato a partir dos masters, nao so
redimensionar o encode desktop (ver verify.md, "Mobile").

## Custo

Sem dado de preco proprio deste kit — usar as ferramentas de estimativa de custo ja embutidas no pipeline
de imagem/video do ambiente (`skills/17-image-generator/SKILL.md` ou equivalente) antes de gerar em lote. O
repo original documenta precos especificos do kie.ai que nao se aplicam aqui.
