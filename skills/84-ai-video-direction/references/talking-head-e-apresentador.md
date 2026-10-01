# Talking head e apresentador

Vídeo curto de uma pessoa falando para a câmera (apresentação, anúncio, reels). Tudo aqui saiu de
uma rodada medida em 30/09/2026: mesmo quadro-base, mesma fala em PT-BR, 5 s, vertical 9:16,
13 modelos da Higgsfield, conferidos por folha de quadros e STT.

## 1. Conclusões medidas

| Fato | Consequência |
|---|---|
| os 7 modelos que terminaram disseram a frase inteira em PT-BR (Seedance 2.5, Wan 3.0, Kling 3.0, MiniMax H3, Grok Imagine Video 1.5, PixVerse V6, LTX 2.5 Pro), inclusive H3 e Grok, que não têm parâmetro de áudio | fala nativa com lip sync em PT-BR é viável sem TTS |
| enquadramento cintura para cima (rosto ~15% da altura) deu rosto pequeno e boca pouco legível | **sempre peito para cima** em talking head |
| peito para cima, cabeça e ombros em ~70% da largura, olhos na linha do terço superior | rosto grande e lip sync muito melhor |
| a folha de identidade (retrato + corpo + rótulos + insets) como primeiro quadro não serve | gerar um **quadro-base limpo** a partir da folha |
| endpoints image-to-video tratam a imagem como **primeiro quadro** | cena preservada |
| reference-to-video trata a imagem como **referência** | a cena pode mudar (Grok refez monitor, abajur e janela); no Seedance 2.5 preservou bem com "start from this exact composition" |
| `camera_movement: dolly_in` do LTX somado ao push-in escrito no prompt | rosto ampliado demais, cabelo mudou: **nunca** combinar parâmetro de câmera com movimento no prompt |

## 2. Quadro-base

Nano Banana 2 edit no fal (`fal-ai/nano-banana-2/edit`, `aspect_ratio: 9:16`, 2K, ~US$ 0,12), com
a folha de identidade como Figure 1:

```text
Photorealistic vertical 9:16 medium close-up, chest-up, camera at eye level on a tripod, 50mm look.
His head and shoulders fill about 70 percent of the frame width and his eyes sit on the upper third line.
Figure 1 is the master identity sheet of this man. Use it as the sole authority for his exact face
geometry, bone structure, eyes, brows, nose, lips, jawline, ears, skin tone, beard, hair and glasses.
Ignore Figure 1's layout, text labels, small insets, grey studio background and full-body panels.
Do not reshape, slim, symmetrize or beautify the face; keep natural pore-level skin texture.
SUBJECT: he faces the camera, eyes on the lens, lips closed in a small warm confident smile,
shoulders square and relaxed. He wears <roupa>.
SETTING: behind him and to his right, softly out of focus, <cenário: monitor com blocos de cor
abstratos, abajur quente, planta, janela ao fundo>. The monitor never overlaps his face.
LIGHT: soft warm daylight from a window at camera-left as the key light, a gentle cool glow from the
monitor as a rim light, shallow depth of field. 35mm photographic look, fine grain.
The image contains zero letters, zero words, zero numbers, no logos and no watermark anywhere,
including on the monitor and the keyboard.
```

Gerar 2 enquadramentos e escolher olhando; o peito para cima venceu.

## 3. Prompt vencedor (v4 enxuto)

```text
FORMAT: One continuous 5-second vertical 9:16 shot. No cuts.
SCENE CONTEXT: a <profissão> introduces himself straight to the camera for a social-media video,
in his own workspace.
FIRST FRAME: the attached image is the exact first frame of the shot; keep his face, beard, glasses,
hair, outfit, room and lighting identical to it.
   (reference-to-video: ACTIVE REFERENCES: Image 1 is THE PRESENTER in his workspace: use it for his
   exact face, beard, glasses, hair, outfit, the room and the light. Start the clip from this exact
   composition.)
CAMERA: locked-off medium close-up at eye level with a very slow push-in of about 5 percent over the
whole clip. No handheld shake, no zoom jumps, no whip, no cuts.
ACTION: In the first frame he already faces the lens with a closed warm smile. At 0.3 s he starts to
speak with a natural conversational rhythm, small head nods on the stressed words. His lip movements
match every word exactly. He finishes his sentence before the last second and holds a small warm
smile until the end. He never looks away, never walks, never turns his body.
SPEECH: In Brazilian Portuguese, exactly once, spoken only by him, clearly and at a natural pace:
"<fala>"
AUDIO: only his clear voice at conversational volume over very quiet room tone. No music, no other
voices, no subtitles, no captions, no on-screen text.
LOOK: photoreal live action, the same key and rim light as the first frame, shallow depth of field,
natural skin texture, fine grain. The monitor stays soft and unreadable behind him.
CONTINUITY: exactly one person. His glasses stay on his face, same outfit, same beard and hair, the
room does not change.
```

**Orçamento de fala:** cerca de 29 sílabas ou 11 palavras cabem em 5 s (a fala começou entre 0,3 e
0,6 s e terminou entre 4,2 e 4,9 s). Mais que isso estoura o clipe. Para frase maior, aumentar a
duração ou dividir.

## 4. Ranking da rodada (9:16, 5 s)

| Modelo (endpoint) | US$ | Tempo | Resultado |
|---|---|---|---|
| Seedance 2.5 reference-to-video | 2,31 | ~544 s | **mais fiel** ao quadro-base, sala idêntica, expressão calma e natural; o mais lento e o mais caro |
| Cinema Studio 4.0 (corpo no formato do Seedance) | 2,31 | ~963 s | **no nível do Seedance 2.5**: boa identidade, expressão natural, fala completa; o enquadramento recua um pouco e o STT ouviu "Front" no lugar de "frontend"; o mais lento da rodada |
| Wan 3.0 image-to-video (720p) | 0,50 | 127 s | boa identidade, cena preservada; **melhor custo-benefício** |
| MiniMax H3 image-to-video (2K, 1440×2560) | 0,65 | 343 s | boa identidade, cena preservada |
| Kling 3.0 std image-to-video | 0,63 | 81 s | boa identidade; boca em "bico" exagerada, reflexo nos óculos |
| PixVerse V6 image-to-video | 0,26 | 64 s | identidade boa; sorriso exagerado, olhos fechando no fim |
| Grok Imagine Video 1.5 reference-to-video | 0,71 | 66 s | reinterpretou a sala (monitor, abajur, janela mudaram) |
| LTX 2.5 Pro image-to-video (mín. 6 s) | 0,72 | 51 s | **pior**: rosto deforma, expressões exageradas, cabelo mudou |
| Genjutsu motion-transfer (fonte = clipe do Wan 3.0 aparado em 5,0 s, 480p) | 1,59 (+0,50 da fonte) | ~632 s | **repete a atuação e a fala da fonte** no rosto da imagem: identidade e fala OK (cobertura 0,92), mas sai em 480p e com 4,7 s (a saída segue o vídeo-fonte preparado); na prática o mesmo vídeo do Wan por mais dinheiro |

A primeira tentativa do Genjutsu foi recusada na hora com "Your credit balance is too low to complete
this request" (falha **não cobrada**); refeita depois da recarga. Seedance 2.0, Wan 3.0 Prime, Wan 2.7
e Happy Horse 1.1 tinham preço estimado mas não foram comparados. Genjutsu não existe no fal; os
equivalentes lá são Kling 3.0 Motion Control (`fal-ai/kling-video/v3/standard/motion-control`,
US$ 0,126/s, aceita `keep_original_sound`) e Wan 2.2 Animate Replace (US$ 0,08/s a 720p).

Escolha: Seedance 2.5 quando identidade é tudo e há orçamento; Wan 3.0 para volume; H3 quando a
resolução vertical alta importa.

## 5. Genjutsu motion-transfer (atuação de um clipe para outra pessoa)

Usa um vídeo-fonte (por exemplo o melhor clipe do Wan) e troca a pessoa: `video_url` (≥ 4 s, máx
30 s) + `image_urls` (1 a 8) + `prompt` opcional ("Replace the person in the source video with the
presenter from the reference image… keep the source performance, lip movement, camera and timing
exactly"). Cobra por **segundo de vídeo de entrada arredondado para cima**: uma fonte de 5,04 s
custa 6 s. Aparar antes de enviar:

```bash
ffmpeg -i fonte.mp4 -t 5.0 -c:v libx264 -crf 17 -c:a aac fonte_5s.mp4
```

## 6. Conferência do talking head

- Folha de contato de 6 quadros, 300 px de largura, olhando rosto, óculos, barba e **boca**:
  `-vf "select='not(mod(n\,floor(TOTAL/6)))',scale=300:-1,tile=6x1" -frames:v 1`.
- `ffprobe` (duração, resolução, fps, presença de áudio) e `volumedetect`.
- STT (`fal-ai/elevenlabs/speech-to-text`, `language_code: "por"`, ~US$ 0,003 por clipe de 5 s) com
  tempo por palavra: início e fim da fala, idioma.
- Cobertura da frase por LCS de palavras normalizadas (minúsculas, sem acento, sem pontuação). O STT
  escreve "frontend" como "front-end" e erra nomes próprios: usar lista de equivalências ou aceitar
  0,83–0,92 com a frase completa como "disse tudo".
- Nada é aprovado sem olhar os quadros e ouvir ou transcrever o áudio.

## 7. Motion graphics por cima

Texto e @ de redes **nunca** no render do modelo (as letras saem erradas). Entram por legenda ASS
animada (libass), detalhes em `audio-e-pos.md` §6:

| Elemento | Tempo | Composição |
|---|---|---|
| terceiro inferior | 0,7 s a ~3,8 s | barra que "limpa" com `\clip` animado + `\fad` + `\move`; nome em negrito e cargo em cor de destaque |
| cartela final | últimos 1,75 s | painel escuro com ~33% da altura; "Me acompanha nas redes" e 3 linhas ícone + plataforma + `@seu.perfil`, entrada escalonada (~0,18 s entre linhas) |
| selo do modelo | o clipe todo | só nas versões de comparação |

- Ícones em vetor com comandos de desenho ASS (`\p1`): retângulo arredondado, círculo por bézier com
  k = 0,5523, triângulo de play, nota musical simples.
- `PlayResX/PlayResY` = tamanho real do vídeo; todas as medidas multiplicadas por `H/1280`.
- Contraste: ícone escuro precisa de contorno claro sobre painel escuro.
- Grade de comparação: `scale=360:640:force_original_aspect_ratio=decrease,pad=360:640` em cada
  clipe e `hstack=inputs=N`.

## 8. Executor com trava de orçamento

- Preço por modelo numa tabela (do `/estimate` ou da fórmula); o executor soma a seleção e **recusa**
  o lote se passar de `--max=USD`; `--dry` mostra os corpos sem enviar.
- Ordem da fila = prioridade; o item mais caro ou menos certo por último; parar no primeiro erro de
  saldo; 4 em paralelo.
- Conferir o saldo no painel antes (não há endpoint público de saldo conhecido) e deixar 10–15% de
  folga. Ver `custos-e-orcamento.md`.
