# Áudio e pós-produção

O que o filme provou: fala nativa do próprio modelo com lip sync, **trilha por sequência** (o usuário
reprovou uma música única com seções), ducking com chave no som de cena (sidechain), SFX gerados,
som-assinatura por capítulo, cartelas e legendas na edição e loudness medido.

## 1. Fala nativa com lip sync

- `generate_audio: true` no Seedance e a AUDIO POLICY no prompt (idioma, só o personagem nomeado,
  linhas exatas uma vez, fundo ininteligível nunca em inglês). Todas as falas do filme saíram assim.
- Rosto de quem fala grande o bastante (médio ou close); nada de lip sync de figura minúscula.
- TTS separado fica para narração em off. Em pipeline, cuidado com um modo "narração" que zere o
  diálogo do personagem: o clipe sai mudo e o prompt passa a exigir silêncio.
- `Diegetic sound only, no music` no clipe; a música entra na pós. Exceção: banda tocando em cena.
- Provar fala por STT ou RMS por janela (`qa.md`), não pela existência do stream de áudio.

## 2. Montagem por sequência

1. Juntar os clipes da sequência na ordem do roteiro; cortar 0,2–0,5 s de sobra nas emendas onde
   houver pausa; usar trechos aproveitados com timecode.
2. Uniformizar o ambiente nas emendas (vento, rumor, zumbido) se o timbre variar entre clipes.
3. Transição entre sequências pela forma recorrente (a luz que nasce de um objeto redondo da época):
   o pico de luz de uma é o começo da outra.
4. Planejar ponte de som: J-cut (o som da próxima imagem chega antes) e L-cut (o som anterior
   continua) entre sequências.

Concatenação simples quando os parâmetros batem (mesma resolução, fps, codec):

```bash
printf "file '%s'\n" C1.mp4 C2.mp4 C3.mp4 C4.mp4 > lista.txt
ffmpeg -f concat -safe 0 -i lista.txt -c copy sequencia.mp4
```

Recodificar se algum trecho foi cortado ou se os parâmetros diferem.

## 3. Trilha por sequência com crossfade no portal

Uma música independente por sequência, cada uma no estilo da época, com 2 s de sobra para cruzar.
Gerada com ElevenLabs Music via fal:

```json
POST https://queue.fal.run/fal-ai/elevenlabs/music
{ "prompt": "1920s Charleston hot jazz big band: fast clarinet and trumpet, banjo, tuba bass, stride piano, brushed drums. Glamorous, playful.",
  "music_length_ms": 29800, "force_instrumental": true, "output_format": "mp3_44100_128" }
```

API de fila do fal: `POST` devolve `status_url` e `response_url`; consultar o status a cada 4 s até
`COMPLETED` (ou `FAILED`), então ler `response_url` → `audio.url`. Autenticação
`Authorization: Key <FAL_KEY>` vinda do ambiente.

Montagem das trilhas: cada uma começa cerca de 1 s antes do pico de luz da transição, entra com
fade-in curto (1,2 s), sai com fade-out de 2,2 s, sobreposta 1,5 s à seguinte:

```text
[0:a]atrim=0:<dur>,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.3,afade=t=out:st=<dur-2.2>:d=2.2,adelay=0|0[m0];
[1:a]atrim=0:<dur>,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=1.2,afade=t=out:st=<dur-2.2>:d=2.2,adelay=<ms>|<ms>[m1];
[m0][m1]…amix=inputs=<n>:normalize=0:duration=longest,atrim=0:<fim>[out]
```

`dur` de cada trilha = início da seguinte + 1,5 s − início desta. `normalize=0` evita que o `amix`
abaixe tudo. Escrever o filtro num arquivo e usar `-filter_complex_script` (filtro longo quebra na
linha de comando do Windows).

## 4. Ducking com sidechain no som de cena

A música abaixa sozinha quando há fala ou efeito, porque a **chave** é o próprio áudio de cena (o
sinal), não uma janela declarada:

```text
[0:a]apad=whole_dur=<fim>,volume=1.25,asplit=2[orig][chave];
[1:a]volume=0.26[musb];
[musb][chave]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=450:makeup=1[mus];
[orig][mus]…amix=inputs=<n>:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[a]
```

Com isso a música ficou cerca de 6 dB abaixo nas ações e voltou nas pausas. O volume da música pode
ter automação (mais alto na abertura e no fim, sem fala):
`volume='0.26+0.24*(1-clip((t-3)/2,0,1))+0.50*clip((t-168)/3,0,1)':eval=frame`.

## 5. SFX gerados

ElevenLabs Sound Effects via fal (`fal-ai/elevenlabs/sound-effects/v2`, cerca de US$ 0,002/s):

```json
{ "text": "Magical portal transition: a swirling wind whoosh that rises quickly, glassy shimmering chimes, then a soft bright airy burst that fades out. Cinematic, clean, no voices.",
  "duration_seconds": 3.5, "prompt_influence": 0.5, "output_format": "mp3_44100_128" }
```

- Sempre terminar com "no voices".
- SFX de transição posicionado com `adelay` cerca de 2,2 s antes do pico de luz.
- **Som-assinatura por capítulo** (3 s): um timbre da época tocando junto com a cartela (sino de
  templo, corneta romana, frase de jazz, acorde de sintetizador dos anos 80, acordeão parisiense,
  varredura analógica de nave).
- Impacto discreto ("sub boom com cauda de brilho") só na abertura e no capítulo final.
- Descrição de SFX no plano que não vira arquivo é perda silenciosa: gerar cada um ou cortar do plano.

## 6. Cartelas e legendas

**Texto legível nunca no render do modelo**: títulos, cartelas, nomes e legendas entram na edição ou
em motion graphics. O modelo inventa letras.

- Cartela de capítulo (código, local, ano) no canto superior esquerdo, com caixa desfocada e filete,
  fade de entrada e saída, junto do som-assinatura.
- Legendas das falas no rodapé, com tempo **por palavra** vindo do STT do áudio do próprio clipe
  (`fal-ai/elevenlabs/speech-to-text`, `language_code` do idioma do projeto), não do texto do roteiro
  repartido por igual.
- Formato ASS com `PlayResX/PlayResY` = resolução do vídeo (1470×630 para 21:9 a 720p) e fontes
  copiadas para uma pasta local:

```text
[0:v]fade=t=in:st=0:d=0.8,fade=t=out:st=<fim-1.2>:d=1.2,tpad=stop_mode=add:stop_duration=6:color=black,subtitles=legendas.ass:fontsdir=fonts[v]
```

- **Legenda × texto de cena:** dois produtores de texto no mesmo segundo, ambos ancorados no rodapé,
  viram dois textos sobrepostos e ilegíveis. Uma regra só decide o lugar de cada um (fala no rodapé,
  cartela no topo) e nunca dois no mesmo canto ao mesmo tempo. Conferir por quadro, recortando a
  faixa: `ffmpeg -ss 10 -i final.mp4 -vf "crop=iw:ih*0.2:0:ih*0.8" -frames:v 1 faixa.png`.

### Motion graphics em ASS (terceiro inferior, cartela de redes, ícones)

- Terceiro inferior: barra que "limpa" da esquerda para a direita com `\clip` animado por `\t`,
  mais `\fad` e `\move` curto no nome e no cargo; de 0,7 s até cerca de 3,8 s.
- Cartela final nos últimos ~1,75 s: painel escuro com altura generosa (~33% da altura, para não
  cortar a última linha), chamada ("Me acompanha nas redes") e linhas ícone + plataforma +
  `@seu.perfil` entrando escalonadas.
- Ícones desenhados em vetor com `\p1`: retângulo arredondado (curvas `b` nos cantos), círculo por
  bézier com k = 0,5523, triângulo de play, nota musical simples. Ícone escuro ganha contorno claro
  (`\3c` + `\bord`) sobre painel escuro.
- `PlayResX/PlayResY` = tamanho real do vídeo, e toda medida multiplicada por `H/1280` (o mesmo ASS
  serve para 720×1280 e 1440×2560).
- No Windows, rodar o ffmpeg com o diretório de trabalho na pasta do `.ass` e usar caminho relativo
  (`subtitles=arq.ass:fontsdir=fonts`): caminho absoluto com `C:` exige escape no filtro e quebra.
- Selo com o nome do modelo só em versões de comparação; grade de comparação com
  `scale+pad` em 360×640 por clipe e `hstack`.

## 7. Loudness e entrega

- `loudnorm=I=-14:TP=-1.5:LRA=11` no fim da cadeia de mixagem.
- Se usar `alimiter`, **sempre** `level=disabled`: o padrão (`level` ligado) devolve o pico a 0 dBFS
  e anula o teto, e o QA reprova por clipping.
- Vídeo: `-c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p`; áudio: `-c:a aac -b:a 256k -ar 48000`;
  `-movflags +faststart`.
- Medir o arquivo final (`ebur128=peak=true`) e a duração antes de entregar.
- Encerramento: tela preta com `tpad` e cartela final; música com fade-out até o fim.

## 8. Ordem da pós

1. montados por sequência → 2. filme mudo concatenado com fades → 3. trilhas por sequência montadas
→ 4. SFX de transição e assinaturas → 5. mix com ducking → 6. loudnorm → 7. legendas e cartelas
(ASS) → 8. encode final → 9. QA final (`qa.md` §8).
