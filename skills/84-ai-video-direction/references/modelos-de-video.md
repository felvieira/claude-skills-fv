# Familias de modelo de video — contratos e armadilhas

Destilado do pack `scenario-labs/skills` (MIT), adaptado ao nosso stack (fal.ai + Seedance/
Higgsfield). Carregar quando escolher motor, condicionar um clipe ou precificar.

## Regras universais de condicionamento

- **Vias de condicionamento:** imagem de primeiro frame fixa a composicao de abertura exata;
  last-frame so vale JUNTO de first-frame; imagens de referencia carregam identidade/estilo sem
  fixar momento nenhum. First-frame e referencias sao mutuamente exclusivos na maioria — checar
  por modelo.
- **Audio de referencia precisa ser reivindicado no prompt:** trilha passada em silencio e
  ignorada. Dizer para que serve ("@audio is her voice, lip-synced" / "cuts land on beats of
  @audio").
- **Estilo custom (LoRA) -> video:** nenhum modelo de video aceita LoRA. Rota: gerar still no
  estilo -> passar como first frame ou referencia.
- **Sem seed na maioria:** re-rodar em res maior = take novo. Iterar no tier mais barato +
  menor duracao, depois upscalear o keeper ou usar draft->final onde existe.
- **Gramatica de prompt universal:** direcao de cena em frases — tamanho de plano, cenario,
  sujeito + UMA acao, UM movimento de camera nomeado, fonte de luz, estilo, linha de audio.
  Movimentos nomeados + luz concreta sobrevivem; palavras de mood nao. Multi-beat: beats com
  timecode ("0-2s ... 2-4s ...") dentro do cap de duracao.
- **Audio nativo:** liga por `generateAudio`/`audio` onde existe (defaults DIFEREM por membro!);
  senao o prompt e a unica alavanca. Nunca escrever "no music" nem nomear genero/instrumento em
  exclusao — dispara moderacao de audio. Descrever som diegetico positivamente ("room tone,
  footsteps"). Musica por shot re-inicia tom/andamento a cada corte -> trilha vem da montagem,
  nao dos clipes.
- **Texto na tela:** tipo gerado drifta frame a frame. Prompt "no subtitles, no on-screen
  text"; texto composto em pos.
- **Limites de duracao:** modelos rejeitam, nao cortam (30.08s num cap de 30.0 = falha dura).
  Pisos tambem prendem (min 1-5s). Abaixo do piso -> renderizar o mais curto + cortar, ou
  "tres explosoes uma apos a outra" + fatiar. Acima do cap -> cadeia por last-frame.
- **Extender:** membro dedicado de extend, ou cadeia: last frame do output vira first frame do
  proximo; escrever o prompt a partir do que o frame MOSTRA (direcao de tela sobrevive a emenda).
- **Lip sync tem duas vias:** footage+audio novo = video2video (redesenha a boca, mantem o
  quadro); still+audio = talking-avatar img2video (inventa a performance toda — nunca resgata
  lip sync falho). Preflight: rosto legivel no tamanho de exibicao — rosto pequeno/virado/
  ocluido completa e cobra com boca parada. Cropar no rosto antes. Audio e texto sao inputs
  exclusivos.
- **Dublagem != lip sync:** dub traduz mantendo voz/tom, labios nao mexem. Pipeline: dub ->
  extrair audio -> lipsync clip+track.
- **Gates que importam:** job completo != output bom. Varredura contact-sheet (ffmpeg fps=2),
  comparar frames no mesmo timestamp, lipsync = comparar pixels da boca, ouvir se o audio de
  entrada sobreviveu.
- **Alavancas de custo:** duracao de video/audio de entrada, resolucao, duracao de saida,
  contagem de referencias — todas pesam. Cortar fonte ANTES do run pago.
- **Moderacao:** filtro de saida e por familia -> retry no irmao falha igual. Trocar provider
  primeiro; reescrever vocabulario de arma/dano; personagem parecido com IP fica bloqueado.

## Seedance (ByteDance)

- Um modelo infere o modo dos inputs: prompt | image | image+lastFrameImage | referenceImages |
  referenceVideos+prompt (edit) | referenceVideos+"extend @video1" (devolve SO o rabo novo).
- @tags ligam por ordem do array (@image1, @video1, @audio1); o prompt diz o que cada tag
  governa e o que ignorar.
- Caps: ate 30 imgs/10 videos/10 audios de ref, 4-30s, 1080p na linha alta; linhas baratas 9/3/3,
  4-15s.
- `duration` em Auto precifica no teto — sempre setar segundos. Modo edit usa -1.
- Modo referencia: frame 1 ancora no estado-base do mundo da referencia — prompt nao sobrescreve
  a pose de abertura; usar `image` para abertura exata.
- Sem seed/mask/camera. Playblast como @video1 transfere rigidez do rig; capsulas sem perna
  deixam o modelo inventar a marcha.
- Draft: preview 480p -> draft-complete -> mesmo take em 1080p. UNICA forma de aprovar take
  (sem seed). Draft+complete so compensa via takes descartados.

## Veo (Google)

- Membros: full (refs + switch ASSET/STYLE), Fast (refs sem switch), Lite (so anchors, mais
  barato), Extend.
- `image` exclui `referenceImages`. Modo ref trava duration=8. Duracoes {4,6,8}; 720p/1080p;
  seed + negativePrompt existem. `generateAudio` e campo OBRIGATORIO e move o preco.
- Gramatica de audio: aspas para dialogo, prefixos `SFX:` e `Ambient noise:`. Ordem do prompt:
  cinematografia, sujeito, acao, contexto, estilo; 90-250 palavras; spans `[00:00-00:02]` por beat.
- Spread de tier ~5x; um extend > geracao nova -> mirar um unico passe de 8s.

## Kling (Kuaishou)

- Zoo de membros — escolher pelo trabalho: Omni (modo via campo `mode`), linhas dedicadas
  T2V/I2V, edit/reference, motion control, lipsync, avatar.
- `prompt` exclui `multiPrompt` (array {prompt,duration}); multiPrompt do Omni = string JSON,
  <=6 shots somando a duracao.
- `duration` e STRING enum ("5") exceto Omni (numero 3-15). V3: 15s; linhas O1/2.6: 10s.
- Elements = imagem frontal + <=4 refs de angulo para personagem consistente.
- `cfgScale` 0-1 (default 0.5): ->0.8 fidelidade a storyboard, ->0.3 liberdade do modelo.
- generateAudio default varia por membro (TRUE em T2V dedicado, FALSE em Omni) — ler, nao assumir.
- Motion control: imagem de personagem + video condutor; `characterOrientation` diz quem segura o
  personagem.
- Sem seed nas linhas novas -> upscalear o keeper, nao re-renderizar.

## MiniMax Hailuo

- Um modelo, todos os modos; audio estereo inline no prompt (sem campo de audio). Keyframes
  excluem referencias. Refs: <=9 img/3 vid/3 audio, saida 5-15s, 768P/2K.
- Linha 2.3: prompt+firstFrame so; 10s so em 768p, 1080p so em 6s; `promptOptimizer` default ON
  (desligar para preservar wording engenhado).
- Editores: Extend (saida inclui fonte | continuacao com ~1.6s de lead-in — cortar de ~1.7s),
  Insert (cena de 5-13s com startTime+resumeTime), Recast (<=4 pessoas de fotos, cobra por
  segundo da FONTE).
- Comandos de camera entre colchetes `[Push in]` `[Pan left, Pedestal up]`; <=3 por colchete,
  2-3 cues de movimento por shot no total ou o fundo balanca. Travar estaticos
  explicitamente — I2V drifta sem prompt.

## Gemini Omni

- Modos divididos por membro: base (texto/first-frame + <=7 refs), Reference-to-Video,
  Edit (restyle; SEM duration/aspectRatio — segue a fonte), Extend (duration = segundos
  acrescentados).
- Duracao 3-10s (def 8); so 16:9/9:16. Resolucao ate 4k nao move preco -> draft barato = duracao
  menor.
- Sem campo de audio em lugar nenhum — prompt e a unica alavanca; fechar o prompt com a linha de
  audio. NUNCA promptar audio no Edit (regenera com o look).
- R2V: nao re-descrever o sujeito; "the character" + verbos. Edit: liderar com a mudanca, nunca
  pedir movimento/camera novos (travados na fonte).

## Grok Imagine video (xAI)

- Um membro por modo: 1.5 (texto/first-frame), R2V (@image tags, <=7 refs), Edit (pre-processa a
  fonte para ~8.7s — cortar antes), Extend (duration = segundos NOVOS apenas).
- 1-15s, 8 ratios incl. auto(->16:9). 1080p so no 1.5 texto/first-frame; R2V capa em 720p,
  default 480p.
- Gramatica: cena, camera, estilo, movimento, audio; present tense, um shot, UM movimento
  dominante, acoes fisicas; 80-150 palavras, >=3 camadas. Aspas + verbo de delivery = lipsync.
- Audio default = musica generica -> sempre dirigir o som ou declarar "no music" (esta familia
  tolera exclusao).
- Prompts de extend: ponte ("the shot continues"), manter luz/elenco estabelecidos, reafirmar audio.

## Vidu

- Nome do modelo carrega modo+tier (T2V/I2V/Reference2V x Q3/Q2/Q1/2.0). I2V: generationType
  tem que bater com a contagem de imagens: image_to_video(1) | start_end_to_video(2, ordem
  decide). Sem aspectRatio no I2V — segue as stills.
- `seed` em todo membro. `audio` = toggle de musica de fundo apenas.
- Duas formas de prompt: T2V/I2V = paragrafo de shot unico de 120-180 palavras (nada que nao
  esteja na still, no I2V); R2V = frase de 20-40 palavras ligando elementos por posicao
  ("character from image1 wearing armor from image2").

## Wan (Alibaba)

- Um membro por trabalho; params NAO portam entre geracoes: linha nova (resolution 720p/1080p +
  duracao em segundos inteiros, aspectRatio so no T2V); linhas antigas levam `size` string
  ("1920*1080") + grade de duracao.
- Editores: Video Edit, Animate Move/Replace (transferencia de movimento / troca de pessoa),
  Reframe + Outpainting (setar match de frames/fps da entrada ou a saida nao bate com a fonte;
  flags expand* default true).
- Audio: linha nova sempre gera (ou aceita upload para dirigir); linhas antigas precisam de
  upload (3-30s).
- Prompt de edit: uma mudanca clara por frase + linguagem de preservacao ("keep subject
  identity and camera path").

## Runway

- Gen: texto ou first-frame; duracao 2-10s; aspectRatio como PAR DE PIXELS ("1280:720") — modo
  texto honra so pares 16:9/9:16; outras formas via geometria do first-frame. Ordenar beats
  explicitamente; multi-beat pede 8-10s.
- Aleph (edit): fonte <=30s E <=16MB (bitrate estoura primeiro); ~6x o custo da geracao. Muda so
  o que o prompt nomeia; nao re-coreografa. Refs via keyframes XOR promptImage — nunca os dois.

## Luma Ray

- Membros por modo: geracao, Edit, Reframe (so outpaint), Modify Video (barato).
- `duration` = string unidade "5s"|"10s"; "10s" VETA loop, hdr, frame anchors. Resolucoes
  540p/720p/1080p.
- Edit vs Modify dividem escala de 9 graus (adhere_1...reimagine_3) com nomes diferentes
  (editStrength|mode). Gap de preco ~100x — precificar os dois.
- Prompts: 50-300 palavras centradas em movimento, um movimento de camera + uma consequencia
  fisica. Reframe: promptar SO as bordas novas do canvas. Evitar "vibrant/whimsical/
  hyper-realistic" — degrada o output.
- Loop pede movimento de intensidade constante (chuva firme, vapor a deriva).

## Edicao e montagem (camada deterministica)

- Todo efeito de pos de imagem tem gemeo de video; custo segue o input — cortar antes.
- Chroma key: deixar keyColor vazio (auto-detect); alpha so sai em WebM VP9 ou ProRes 4444 MOV
  — mp4 nao tem alpha; arestas: spillSuppression + edgeShrink 1-2px. ~60s de input cap.
- Extracao de frames devolve ids SEM ordem garantida — a ordem mora na linha do job; reconstruir
  via contact sheet + checagem de continuidade.
- Resize `fit`: contain|stretch|cover — nenhum faz outpaint; reframe de verdade = generativo
  (caro) ou compositor (barras/crop, barato).
- Ordem de pipeline: trim -> reshape -> grade -> textura (grain POR ULTIMO, no frame de
  entrega). Grade uma vez no master, nao por clipe.
- Nomes de campo driftam entre vizinhos (outputFormat vs videoOutputFormat) — ler schema.
- Montagem: concat (transitions len = clips-1; preserveAudio NAO garante sync — verificar soma
  de duracoes + streams) vs compositor (timeline absoluta, layers com startTime/zIndex/fade;
  cortes secos). Speech-critico -> compositor; clipes mudos ou corte com cama de som -> concat.
- Compositor: trimStart/trimEnd = quanto TIRAR (nao in/out points); layers de overlay precisam
  width/height EXPLICITOS ou sao upscaleados; fit default "fill" estica — usar cover|contain.
- Sem layer de texto: titulos/CTAs = cards PNG como layers de imagem. Legendas = ultimo passe
  no master final.

## Legendas e captions

- Chave de entrega: burn-in | soft track | SRT sidecar. Passe so-SRT prova as palavras antes de
  pagar pixels.
- Presets por destino: social = cues de 3-5 palavras, posicao do meio, ~60-90px em quadro de
  1920 de altura (auto-size fica pequeno); YouTube = 2 linhas <=84 chars; karaokê = 1 palavra/cue.

- fontColor branca sobrevive a tudo; acento em UMA coisa (cor da marca).
- TranscriptionPrompt = dica de ortografia (nomes/marcas), nao garantia — conferir todo nome
  exigido.
- Verificar: contact sheet + frames em borda de cue (reveals podem exceder o tempo do SRT;
  flashes <100ms sobrevivem a fps=2), rosto/UI livres, ultima palavra sobrevive.
- Multi-idioma: um master -> variante por idioma; CJK ~1/3 dos caracteres por linha.

## Loops de motion em codigo (nao modelo)

- Loop seamless = funcao pura de t: todos os periodos dividem o comprimento do loop; scrolls
  andam repeticoes inteiras; rand com seed (nada de Date/estado); tamanhos derivados de h/100.
- Checagem de emenda: frame em T == frame em 0; nunca crossfade nas pontas.
- Armadilhas de encode: decoder VP9 do ffmpeg derruba alpha (usar -c:v libvpx-vp9); flags de cor
  precisam de setparams no fim da cadeia; `-shortest` com audio mais curto corta o ultimo frame
  e quebra o loop; chroma 4:2:0 mata linhas finas saturadas — engrossar ou conferir por psnr.
- Nao fazer loops com modelo de video (ultimo frame raramente encontra o primeiro) — rota e o
  primeiro=ultimo frame explicito, ou codigo.

## Pipelines prontos (musica, ads, UGC, recast)

- **Clipe de musica (song->cut):** a musica master e a unica trilha, deitada uma vez no fim,
  intocada. generateAudio por shot: false (so a musica) ou true com "diegetic sound only:
  <fontes concretas>" + mix em ganho 0.1-0.3. Ordem: analisar a musica (tempo/secoes/candidatos
  de corte — MEDIR o tempo, rotulo mente) -> letra (fornecida > transcricao) -> historia de 1
  pagina (aprovacao = ponto de conserto mais barato) -> stills de referencia no ratio de
  entrega -> shots (+1-2s de sobra, beats com timecode, um movimento+locacao por shot) ->
  montagem.
- **Storyboard -> movimento continuo:** todo shot termina na pose em que o proximo comeca.
  Roteiro com timecode + poses de entrada/saida; uma prancha por performer; paineis em lapis
  leve (marcacao pesada de board renderiza como objeto — declarar marcas como "director's
  planning guides", nao proibir). Duas vias: run unica roteirizada (cabe no cap) vs encadeada
  (image=still N-1 + lastFrameImage=still N; N shots = N+1 stills + N runs, aberturas exatas).
  Esperar MENOS cortes renderizados que o roteirizado (handoffs viram movimentos de camera);
  re-cortar o take entregue nos pontos roteirizados.
- **Ad de video:** produto NUNCA gerado (foto enviada -> first frame ou composite); texto NUNCA
  gerado (overlay em pos). Ordem de gates: brief (UM objetivo) -> conceito -> storyboard
  precificado (gate antes de gastar video) -> stills no ratio -> animar (um movimento, audio
  off) -> gate de fidelidade (frame-extract vs checklist; rotulo que drifta reprova; retry do
  mesmo still, NUNCA do output driftado) -> audio -> montagem -> preflight (politica, flashes,
  sound-off, loudness). Duracao: 3-5s produto, 5-10s cobertura.
- **Variantes de ad:** edicoes independentes de UMA fonte; registrar por variante: rotulo,
  delta, invariantes, copia exata, politica de audio. Toda variante parte da fonte, nao da
  variante anterior. Checar bordas: frames antes/em/depois do corte; runtime medido vs pedido.
- **UGC (criador):** registro = pessoa-no-celular, nao marca-por-equipe: altura de celular, luz
  disponivel, fundo baguncado, pele natural, <=1 deriva de mao. Gramatica cinematografica mata.
  Roteiro: 6 beats (hook/contexto/produto/prova/virada/CTA suave), ~2.5 palavras/seg ideal mas
  avatares observados a 1.76-1.94 — cronometrar o clipe devolvido, cortar silencios, encurtar
  roteiro. Ler em voz alta. Nunca fabricar claims/numeros/depoimentos. Avatares inventam
  props/texto — pedir maos vazias e cenario sem produto; alguns alucinam legendas em
  gibberish. Lip sync: audio XOR texto. Compoe 9:16 nativo.
- **Fan cam:** dois estagios: img2img da identidade num quadro broadcast 16:9 -> gate da still
  -> img2video. Foto enviada e referencia de identidade, nunca start frame. Gramatica
  broadcast: compressao de teleobjetiva, torcida desfocada frente+fundo, luz dura, motion blur,
  camera procurando, sujeito fora do centro. Reacao precisa de arco: alheio -> nota -> reage.
- **Reel recast:** video2video em modo edit: mantem coreografia/timing/camera; prompt =
  clausula de troca + keep-list + binding de folha ("@image1 for face/hair only: no panels,
  labels, text") + detalhes frageis nomeados (o nao-nomeado drifta). Extrair o audio primeiro,
  mutar a referencia, repor no final. fps/duracao da saida != fonte — medir a saida; sync da
  musica vai na DANCA, nao no audio da fonte (offset varia ~+-100ms).
- **Prancha de cenario nova:** editar o firstFrame da fonte com ele mesmo como unica ref;
  verificar por overlay 50% (paredes/janela coincidem ao pixel); nova-locacao-por-texto falha
  (a prancha mantem a camera dela).
