---
name: ffmpeg-media
description: |
  Skill de edição e manipulação mecânica de vídeo/áudio via ffmpeg — corte, junção, legenda, normalização
  de loudness, detecção de silêncio, redação, correção de aspect ratio, mudança de velocidade, extração de
  metadados. Roda 100% local via scripts Python (stdlib + subprocess), sem API paga e sem upload de arquivo.
  Preenche o gap que a skill 27 (video-integration-specialist) declara fora de escopo: geração de vídeo por
  IA não é edição de vídeo existente.
  Trigger em: "segundos desse video", "cortar esse video", "juntar clipes", "clipes num video so", "queimar essa legenda", "legenda .srt no video",
  "normaliza esse audio", "-14 LUFS", "loudness", "remove os trechos de silencio", "detecta silencio",
  "muda esse video de 16:9 pra 9:16", "aspect ratio sem esticar", "borra o rosto", "borrar rosto no video",
  "sincroniza esse audio", "audio separado com o video", "extrai os metadados desse", "metadados desse arquivo de video",
  "exporta esse video no formato", "formato certo pro TikTok", "ffmpeg", "editar video local sem re-encodar".
allowed-tools: Read, Grep, Glob, Bash(ffmpeg *), Bash(ffprobe *), Bash(python *), Bash(python3 *)
metadata:
  argument-hint: "<operação> <arquivo(s)> [--dry-run] [--json]"
---

# FFmpeg Media — Edição Mecânica de Vídeo e Áudio

Esta skill executa uma edição, não decide uma. Corta, junta, mede, sincroniza, exporta e verifica arquivos de mídia — decisões estéticas (o que é "interessante" num highlight, se uma grade parece "cinematográfica", composição de thumbnail) ficam fora de escopo e voltam pro humano ou pra skill de criação correspondente.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md`, `policies/verification-before-completion.md`, `policies/self-correcting-sensors.md` e `policies/anti-rationalization.md`.

**Fronteira mecânico vs. subjetivo — o princípio central desta skill:** aplicar uma LUT nomeada, cortar em coordenadas exatas, medir loudness em LUFS são operações mecânicas, dentro de escopo. Decidir "essa cor combina com a marca", "esse trecho é o melhor momento do vídeo" ou "isso parece profissional" são julgamentos que pedem contexto humano — a skill relata a medição (waveform, LUFS, duração de cena) e devolve a decisão para quem pediu, nunca decide sozinha e apresenta como fato.

## Quando Usar

- cortar, juntar, ou re-sequenciar clipes de vídeo já existentes
- queimar legenda (`.srt`) ou overlay de texto/gráfico num vídeo
- normalizar loudness de áudio para o padrão de uma plataforma (Reels, podcast, broadcast)
- detectar e remover silêncio, ou detectar cortes de cena automaticamente
- mudar aspect ratio para o formato de uma plataforma (crop, pad, blur de fundo)
- redigir (borrar/pixelizar) uma região do vídeo — rosto, placa, documento
- sincronizar múltiplas câmeras ou trilha de áudio separada
- extrair metadados, gerar proxy de baixa resolução, ou verificar integridade do arquivo final
- exportar para o preset de uma plataforma específica (loudness, resolução, container corretos)

## Quando Nao Usar

- gerar vídeo novo a partir de texto/imagem via IA (text-to-video, image-to-video) — isso é skill 27 (video-integration-specialist)
- decidir o *prompt* cinematográfico ou vocabulário de câmera de um vídeo gerado — skill 27 e `references/vocabulario-cinematografico.md` dela
- analisar/transcrever conteúdo de um vídeo existente (o que está sendo dito, resumo) — skill 54 (video-analysis)
- animação de interface web (CSS/JS, Framer Motion, GSAP) — skill 12 (motion-design)
- decidir qual trecho de um vídeo longo é o "melhor highlight" sem critério objetivo declarado pelo usuário — pedir o critério antes de cortar, não adivinhar
- composição de thumbnail ou grading "para ficar bonito" sem direção estética já definida — isso é decisão de gosto, volta pro humano ou pra skill 02/29

## Entradas Esperadas

- arquivo(s) de vídeo/áudio local(is), com caminho absoluto ou relativo ao projeto
- operação desejada em linguagem natural ("corta os primeiros 10s", "normaliza pra -14 LUFS")
- critério objetivo quando a operação envolve seleção de trecho (timestamp, ou regra mecânica como "todo silêncio > 2s")
- preset de plataforma de destino, quando aplicável (Reels, TikTok, YouTube Shorts, podcast, broadcast)

## Saidas Esperadas

- arquivo de mídia processado, no formato/container/loudness pedido
- `--json` com o resultado da operação: comando ffmpeg executado, streams afetados, métricas medidas (duração, LUFS, resolução)
- `--dry-run` disponível em toda operação que escreve arquivo: mostra o plano sem executar
- relatório de verificação (`verify`) quando a entrega precisa confirmar integridade antes de considerar pronta

## Protocolo

### 1. Identificar a operação e o script correspondente

Tabela de intenção → script → flags principais. Adaptar o comando à necessidade real, não copiar cegamente.

| Intenção do usuário | Script | Flags principais |
|---|---|---|
| "quanto dura esse vídeo / que formato é" | `probe.py` | (nenhuma — só leitura) |
| "corta de X a Y" / "extrai esse trecho" | `cut.py` | `--start`, `--end`, `--segments` |
| "junta esses clipes" | `join.py` | lista de arquivos, ordem |
| "detecta onde tem silêncio" / "remove silêncio" | `silence.py` | limiar de dB, duração mínima |
| "detecta corte de cena" | `scenes.py` | limiar de diferença de frame |
| "muda pra formato 9:16 / 1:1 / 16:9" | `fit.py` | `--aspect`, `--fit pad\|crop\|blur` |
| "queima legenda desse .srt" | `caption.py` | `--srt`, `--text`, `--animate` |
| "põe esse logo/texto por cima" | `overlay.py` / `graphics.py` | posição, opacidade, timing |
| "aplica essa LUT / corrige HDR pra SDR" | `color.py` / `look.py` | `--lut`, perfil de cor |
| "borra esse rosto / essa placa" | `redact.py` | região (coordenadas ou tracking) |
| "normaliza o áudio pra -14 LUFS" | `loudness.py` | `-I <LUFS>`, `--tp <true peak>` |
| "sincroniza esse áudio com o vídeo" | `sync.py` | offset ou detecção automática |
| "sincroniza essas câmeras" | `multicam.py` | `--switch energy\|manual` |
| "exporta pro formato do Reels/TikTok/podcast" | `export.py` / `render.py` | `--template`, `--preset` |
| "verifica se esse arquivo tá íntegro" | `verify.py` / `check.py` | (nenhuma — só leitura) |
| "gera uma versão leve pra revisar rápido" | `proxy.py` | resolução alvo |
| "extrai só o áudio" | `audio.py` | formato de saída |
| "acelera/desacelera o vídeo" | `speedramp.py` | fator de velocidade, curva |
| "congela um frame" | `freeze.py` | timestamp, duração |
| "endireita o horizonte" | `straighten.py` | ângulo ou detecção automática |
| "estabiliza a câmera tremida" | `stabilize.py` | (parâmetros de suavização) |
| "roda em lote pra vários arquivos" | `batch.py` | script alvo + lista de arquivos |

Para 3+ operações encadeadas, preferir um arquivo de projeto consumido por `render.py` a encadear scripts manualmente — reduz reencode intermediário e erro de ordem.

Catálogo completo dos 42 scripts (incluindo os não cobertos pela tabela acima — `denoise.py`, `stabilize.py`, `deinterlace.py`, `grid.py`, `broll.py`, entre outros) em `references/catalogo-scripts.md`.

### 2. Respeitar a ordem de encadeamento prescrita

Quando a operação envolve múltiplos passos, a ordem importa e não é arbitrária:

```
color/look (HDR→SDR, LUT) → cut → join → silence → fit → caption/overlay → sync → audio → loudness → export
```

Razão prática: mudanças de frame (color, cut, fit) precisam acontecer **antes** de legenda/overlay, porque texto posicionado antes de um crop/pad fica com tamanho ou posição errados depois. Sincronização de áudio acontece depois de qualquer corte que altere a duração do vídeo. Loudness é o penúltimo passo, `export` roda por último.

### 3. Lossless-first — nunca reencodar sem necessidade

Antes de qualquer operação que reescreve o arquivo, checar se o resultado pode ser obtido sem reencode:

- corte em keyframe exato → stream-copy (`cut.py` faz isso por padrão; usar `--accurate` só quando o corte precisa ser frame-exato e cair fora de um keyframe)
- mudança que afeta só o container (remux) ou só o áudio → não tocar no stream de vídeo
- `loudness.py` faz stream-copy do vídeo por padrão, normalizando só o áudio

Reencodar sem necessidade é o erro mais caro desta skill — cada reencode desnecessário degrada qualidade e multiplica tempo de processamento. Quando o reencode for inevitável (ex.: mudança de resolução, aplicação de LUT), usar CRF 18 em passos intermediários; o `export.py` final aplica o preset de entrega.

### 4. Medir antes de confiar — `--json`, não a linha de resumo

Toda ferramenta de escrita aceita `--dry-run` (mostra o plano sem executar) e `--json`/`--json-brief` (saída estruturada com comando ffmpeg executado, streams afetados, métricas). **Confiar no `--json`, nunca num número resumido em texto solto** — se a operação precisa reportar duração, LUFS medido, ou resolução final, ler o campo estruturado, não parafrasear de memória.

```bash
python scripts/loudness.py video.mp4 -I -14 --tp -1 --json
# → {"status": "ok", "measured_lufs_before": -22.3, "measured_lufs_after": -14.0, "command": "ffmpeg -i ..."}
```

### 5. Verificar antes de entregar

Depois de qualquer cadeia de operações, rodar `verify.py`/`check.py` no arquivo final antes de considerar a tarefa concluída — confirma que o container não está corrompido, que os streams de áudio e vídeo existem e têm duração compatível, e que o arquivo abre. Isso é o gate de `policies/verification-before-completion.md` aplicado a mídia: "rodei o comando" não é "confirmei que o resultado está correto".

## Presets de Plataforma (loudness e formato de entrega)

| Plataforma | Loudness alvo | Aspect ratio comum | Nota |
|---|---|---|---|
| Instagram/TikTok Reels | -14 LUFS | 9:16 | true peak -1 dBTP |
| YouTube (geral) | -14 LUFS | 16:9 | aceita HDR |
| Podcast (voz) | -16 LUFS | — (áudio) | mono ou stereo conforme distro |
| Broadcast (referência EBU R128) | -23 LUFS | 16:9 | usar quando o destino for TV/streaming formal |

Confirmar o alvo do preset com o usuário quando a plataforma de destino não foi dita — não assumir Reels como padrão universal.

## Heuristicas

- **Um script por operação declarada, não uma cadeia de comandos ffmpeg ad-hoc na hora.** Os scripts já encapsulam a sintaxe correta de filtro/flag para cada operação — escrever um comando `ffmpeg` cru repete trabalho que o script já resolve e tem mais chance de erro de sintaxe.
- **`probe.py`/`verify.py` antes de qualquer edição em arquivo desconhecido** — confirmar codec, resolução, framerate e integridade antes de assumir que a operação vai funcionar como esperado.
- **Batch (`batch.py`) só depois de validar em 1 arquivo** — rodar a operação em lote sem confirmar o resultado no primeiro arquivo multiplica o erro por N arquivos.

## Anti-Padroes

- decidir sozinho que um trecho é "o melhor highlight" sem critério objetivo do usuário — pedir o critério (duração, palavra-chave, pico de áudio) antes de cortar
- aplicar grading ou LUT e declarar que "ficou mais cinematográfico" — é medição (curva de cor aplicada), não avaliação de gosto
- reencodar um arquivo inteiro quando um corte em keyframe ou um remux resolveria sem perda
- reportar duração/LUFS/resolução de memória ou por estimativa quando `--json` está disponível para medir de verdade
- rodar `batch.py` em N arquivos sem ter confirmado o resultado em 1 primeiro
- ignorar a ordem de encadeamento (ex.: aplicar caption antes de fit) e produzir legenda mal posicionada depois do crop
- prometer "arquivo verificado" sem ter rodado `verify.py`/`check.py` de fato

## Evidencia de Conclusao

- arquivo de saída existe no caminho esperado, com o formato/container pedido
- `--json` da operação confirma as métricas relevantes (duração, LUFS, resolução) batendo com o pedido
- `verify.py`/`check.py` rodado no arquivo final sem erro
- se a operação envolveu decisão de plataforma, o preset usado foi confirmado com o usuário (não assumido)

## Handoff

### Recebe de

- Skill 27 (video-integration-specialist) — quando o vídeo gerado por IA precisa de pós-produção (corte, legenda, normalização) antes de entrega
- Skill 54 (video-analysis) — quando a análise identificou um trecho a extrair ou um problema técnico a corrigir
- Skill 69 (character-pipeline-2d) — quando o pipeline de animação 2D produz clipes que precisam de junção/exportação final

### Entrega para

- Skill 54 (video-analysis) — se o arquivo processado precisa de transcrição/análise de conteúdo depois de editado
- Humano/skill 02 ou 29 — qualquer decisão de gosto (grading estético, composição de thumbnail) que a mensagem do pedido não resolveu objetivamente

Seguir `policies/handoffs.md`.

## Integracao com Pipeline

- **Orchestrator (09):** roteia para cá quando o pedido é edição de mídia já existente, distinto de geração (skill 27) ou análise (skill 54)
- **Skill 27 (video-integration-specialist):** ponteiro de saída — a linha "Quando Não Usar" da 27 (edição pós-produção) aponta para esta skill

## Fontes

Skill adaptada de [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) (MIT) — os 42 scripts Python (stdlib + subprocess sobre ffmpeg/ffprobe), a tabela de intenção→script→flags, a ordem de encadeamento prescrita, a estratégia lossless-first, e a fronteira mecânico-vs-subjetivo foram traduzidos e adaptados ao formato deste kit. O mecanismo real de schema para agentes de planejamento no upstream é o comando `contract --json` (fonte de verdade junto com `doctor --json`) — não usar outro nome para ele.
