# Geracao de audio: musica, SFX, voz e dublagem

Destilado do pack `scenario-labs/skills` (MIT), adaptado ao nosso stack. Cobre o que falta no
`audio-e-pos.md`: gerar musica/SFX/voz/dublagem por modelo (o outro arquivo trata de trilha por
sequencia, ducking, loudness e montagem).

## Vias (lanes)

- Camas de musica, cancoes com vocal, SFX, TTS/dialogo, clone de voz, re-voice, video->audio
  (scoring), separacao de stems (UM stem por run, sem retorno "instrumental").
- Schema de cancao vem em 3 formas: prompt de estilo + letra em campo separado | um prompt em
  prosa | array ordenado de secoes. Palavras NUNCA no campo de estilo.
- Letra como arranjo: tags `[Verse]` `[Chorus]` na propria linha; linha em branco = pausa;
  2-4 linhas por secao; parenteses = direcao de performance; fechar com `[Outro]`.
- Campos de texto/duracao sao capados e cobrados; estourar = erro, nao corte.
- `numOutputs` assimetrico por membro — fazer batch onde existe, runs paralelos com seed onde so
  ha seed.
- Estender uma musica = via audio2audio com array de secoes (manter trecho | gerar novo,
  `contextAdherence`) — NAO txt2audio mais longo, NAO repaint (mantem duracao).
- TTS: sintaxe de tag varia por membro ([whispers] / <sigh> / (sighs) / nenhuma — gramatica
  errada e falada em voz alta). Multi-speaker: linhas "Nome: fala" (<=2 vozes por take).
  Direcao vai nos campos de voz/emocao, nao no texto.
- Contrato de voz: voiceId (clone) sempre vence preset; unset = voz default.
- Audio e moderado separado do video: nomear genero/instrumento ate em exclusao ("no music",
  "distant guitar") dispara — descrever som diegetico positivamente ou desligar o flag.

## ElevenLabs

- TTS: v3 (tags inline, 70+ idiomas, multi-speaker) vs Multilingual (languageCode fixo) vs
  Turbo (~metade do custo, menos expressivo; dials stability/styleExaggeration/speed). Tags sao
  lidas em voz alta no membro errado.
- Music: prompt + durationSeconds (custo) + forceInstrumental. Avancado: <=30 secoes
  {text, durationSeconds, positive/negativeStyles, contextAdherence}; texto puro = CANTADO.
  Sem numOutputs — runs paralelos com seed.
- SFX: promptInfluence + loop; sem seed.
- Dubbing: keyterms protege nomes; substitui a trilha, NAO os labios. Pipeline para labio certo:
  dub -> extrair audio -> lipsync separado.
- Speech-to-Speech/Voice Changer/Isolator: so aceitam audio (extrair trilha do video antes).
- Caps: texto ~40k chars, audio <=5min.

## MiniMax Music

- Prompt = so estilo (10-2000 chars) + lyrics (cap ~3500 chars, cobra ~700 chars/min, 1-5min).
  `lyricsOptimizer:true` vira o campo lyrics para aceitar briefing em vez da letra.
  `isInstrumental` flag.
- Cover: audioUrl da fonte; mantem melodia, re-estiliza o resto (troca de genero, nao remix);
  precisa de melodia vocal clara; custo flat vs custo por letra da geracao.

## ACE-Step

- Um membro por modo x vias Turbo/Quality (Turbo ~metade, iterar la; Quality final).
- Text2Music (prompt XOR lyrics, qualquer um basta; duration 10-600s; campos bpm/keyscale).
- Cover (`audioCoverStrength`: ~1 fiel, .5-.6 transforma genero mantendo hook, .2 so clima;
  +referenceAudio doador).
- Repaint (janela regenera no lugar; receita de correcao de letra: prompt sentinela + letra
  inteira). AddLayer/CompleteTrack/StemExtract (~12 nomes de stem fixos).
- Sem seed em lugar nenhum: repaint = take novo, cantor pode mudar; correcao de letra que
  preserva voz -> Cover strength 1 + numOutputs 3-4, audicionar candidatos, emendar o trecho
  corrigido na montagem.

## Video->audio e SFX de cena

- Eixos: SFX|musica x standalone|muxado-de-volta-no-video. Video como input: o footage e o
  relogio, o prompt dirige o carater; prompt vazio e valido. `segments` = faixas contiguas do 0.
- keepSpeechVocal: isola voz + ducka a musica; todo nao-vocal e substituido -> nunca scorear em
  cima de foley muxado; pegar trilhas standalone e mixar na pos.
- Output de musica e instrumental so — nenhum membro faz fala/vocal em cima de video.
- SFX por texto: UM evento por run; estrutura fonte->material->espaco->intensidade.
- numSamples 1-3 compra takes; wav/flac para pipelines.

## Audio nativo de modelo de video

- `generateAudio`/equivalente difere por membro — ler o schema, nao assumir (default ON numas
  linhas, OFF noutras).
- Audio pedido por prompt: aspas para fala, prefixos do tipo `SFX:`/`Ambient noise:`; fechar o
  prompt com a linha de audio onde nao ha campo.
- Nunca pedir musica por clipe — tom/andamento reiniciam a cada corte; trilha entra na montagem
  (`audio-e-pos.md`).

## Custos e QC

- Tudo que entra como input de audio/video pesa no preco — cortar fonte antes do run.
- Verificar audio de volta: ouvir se o input sobreviveu (loopback pode trocar a trilha);
  STT/RMS por janela prova fala; contar samples/duracao entregue vs pedida.
