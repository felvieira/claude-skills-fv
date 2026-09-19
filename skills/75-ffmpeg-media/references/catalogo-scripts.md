# Catálogo Completo de Scripts — FFmpeg Media

Referência estendida do `SKILL.md` principal. Carregar quando a tabela de 22 linhas do arquivo principal não cobrir a operação pedida, ou quando for necessário conhecer o catálogo completo antes de decidir entre dois scripts próximos.

## Probing / Análise (somente leitura)

| Script | Função |
|---|---|
| `probe.py` | metadados básicos: duração, codec, resolução, framerate, streams |
| `cropdetect.py` | detecta as bordas pretas de um vídeo pra sugerir crop automático |
| `scenes.py` | detecta cortes de cena por diferença de frame |
| `verify.py` | confirma integridade do container e dos streams |
| `waveform.py` | gera visualização de forma de onda do áudio |
| `metadata.py` | extrai/lê metadados estendidos (EXIF de vídeo, tags) |

## Corte / Recorte

| Script | Função |
|---|---|
| `cut.py` | extrai segmento por timestamp; stream-copy por padrão, `--accurate` para corte frame-exato |
| `silence.py` | detecta e/ou remove trechos de silêncio por limiar de dB |
| `fit.py` | ajusta aspect ratio via pad, crop ou blur de fundo |
| `crop.py` | corte de região exata por coordenadas |

## Composição

| Script | Função |
|---|---|
| `join.py` | concatena múltiplos clipes em ordem |
| `broll.py` | insere b-roll sobre uma trilha de áudio/narração principal |
| `grid.py` | monta grade de múltiplos vídeos numa única tela (comparação lado a lado) |
| `multicam.py` | sincroniza e alterna entre múltiplas câmeras (`--switch energy\|manual`) |
| `sequence.py` | monta sequência a partir de lista/projeto declarativo |

## Visual

| Script | Função |
|---|---|
| `caption.py` | queima legenda de `.srt` ou texto direto, com opção de animação |
| `overlay.py` | overlay de imagem/vídeo sobre o vídeo base, com posição e timing |
| `graphics.py` | overlay de elementos gráficos (logo, marca d'água, lower third) |
| `color.py` | aplica LUT ou correção de cor |
| `look.py` | perfil de cor / conversão HDR→SDR |
| `redact.py` | borra ou pixeliza uma região (rosto, placa, documento) |
| `straighten.py` | corrige inclinação de horizonte |
| `deinterlace.py` | remove interlacing de fonte analógica/broadcast antiga |
| `denoise.py` | reduz ruído de imagem |
| `stabilize.py` | estabiliza câmera tremida |
| `sphere.py` | projeção/reprojeção de vídeo 360° |
| `reverse.py` | reverte a ordem dos frames |
| `freeze.py` | congela um frame por uma duração |
| `pad.py` | adiciona barras/padding sem cortar conteúdo |
| `speedramp.py` | acelera/desacelera com curva de velocidade |
| `loop.py` | repete um clipe N vezes ou até duração alvo |
| `insert.py` | insere um clipe no meio de outro em timestamp específico |
| `background.py` | gera ou substitui fundo (cor sólida, blur, chroma) |

## Áudio

| Script | Função |
|---|---|
| `audio.py` | extrai, converte ou processa trilha de áudio isolada |
| `loudness.py` | normaliza loudness (EBU R128), stream-copy do vídeo por padrão |
| `sync.py` | sincroniza áudio externo com vídeo (offset manual ou detecção automática) |

## Export / Delivery

| Script | Função |
|---|---|
| `export.py` | aplica preset de entrega final (roda por último na cadeia) |
| `render.py` | processa projeto declarativo com múltiplos passos (preferir a encadear scripts manualmente quando 3+ operações) |
| `check.py` | validação final de arquivo antes de considerar entrega pronta |
| `report.py` | gera relatório legível (não-JSON) do que foi processado |
| `proxy.py` | gera versão de baixa resolução pra revisão rápida |
| `batch.py` | roda um script alvo em lote sobre lista de arquivos |

## Interface para agentes de planejamento

O comando `contract --json` expõe o schema de cada uma das 42 ferramentas para um agente que precisa planejar a cadeia de chamadas antes de executar — é a fonte de verdade sobre parâmetros disponíveis, junto com `doctor --json` (lista o que está instalado/disponível no ambiente). Este não é um mecanismo desta skill especificamente — é como o pacote upstream se descreve para integração com ferramentas de orquestração.

## Fonte

Catálogo extraído de [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) (MIT). Ver `## Fontes` no `SKILL.md` principal para o resumo de atribuição.
