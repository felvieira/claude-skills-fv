---
name: video-analysis
description: |
  Skill para analisar conteudo de video existente: baixar, extrair frames, transcrever audio e responder
  perguntas sobre o que acontece no video. Use quando precisar entender, resumir ou buscar informacao dentro
  de um video ja existente — nao para gerar video novo (isso e skill 27).
  Trigger em: "transcrever video", "transcrever esse video", "baixar video do youtube", "extrair frames do video",
  "extrair frames desse video", "legenda automatica", "resumir video", "resumir esse video", "analisar video",
  "analisar o conteudo desse video", "o que acontece nesse video", "whisper", "yt-dlp", "transcription video",
  "extract frames from this video".
argument-hint: "[url ou caminho do video] [pergunta opcional]"
allowed-tools: Read, Write, Bash(node *), Bash(python *), Bash(ffmpeg *), Bash(yt-dlp *)
---

# Video Analysis - Ingestão e Transcrição de Vídeo

Diferente de gerar vídeo (skill 27), esta skill entende vídeo que já existe: baixa, extrai o que for necessário (legenda, frames, áudio), e entrega texto/frames que o modelo consegue interpretar diretamente.

## Governança Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/tool-safety.md` e `policies/evals.md`.

Para comandos completos de ffmpeg por estratégia e exemplos de payload de transcrição, consultar `docs/skill-guides/video-analysis.md` apenas quando necessário.

## Quando Usar

- transcrever áudio de um vídeo (aula, reunião gravada, podcast em vídeo)
- baixar vídeo de plataforma pública e extrair legenda/transcript
- responder pergunta sobre conteúdo visual ou falado de um vídeo específico
- resumir um vídeo longo em texto

## Quando Nao Usar

- gerar vídeo novo (text-to-video, image-to-video) — isso é skill 27
- edição de pós-produção tradicional (corte, mux, efeitos) — isso é pipeline de mídia, não análise
- baixar conteúdo protegido por DRM ou de plataforma que proíbe download nos termos de uso — ver nota de ToS abaixo

## Entradas Esperadas

- URL de vídeo público (YouTube, Vimeo, etc.) ou caminho de arquivo local
- pergunta específica sobre o conteúdo, se houver (senão, resumo geral)
- preferência de transcrição (local/offline por padrão, hosted só se pedido)

## Saidas Esperadas

- transcript com timestamps (`start`, `end`, `text` por segmento)
- ou frames extraídos + descrição, quando a pergunta é visual
- resumo estruturado quando pedido

## O Fluxo (3 passos, na ordem)

1. **Baixar + tentar legenda nativa primeiro** — `yt-dlp` baixa o vídeo e verifica se a plataforma já tem legenda/caption. Se tiver, pula direto pro texto sem gastar tempo com áudio.
2. **Extrair frames, só se a pergunta for visual** — três estratégias por custo de token: `keyframe` (só cortes de cena, até 50 frames, mais barato), `scene-aware` (detecção de mudança de cena + fallback uniforme, até 100 frames), `uniform` (amostragem regular, sem cap, mais caro). ~80 frames a 512px de largura ≈ 50-80k tokens de imagem — decidir a estratégia baseado no orçamento de contexto disponível.
3. **Transcrever áudio, só se não há legenda** — ver seção abaixo. Pré-processar o áudio pra mono/16kHz antes de transcrever (reduz tempo de processamento sem perder qualidade de transcrição).

## Transcrição — local por padrão, hosted como override

| Opção | Custo | Privacidade | Velocidade |
|---|---:|---|---|
| **Local (`faster-whisper`)** — default | $0 | áudio nunca sai da máquina | mais lento em CPU, ok em GPU |
| **Hosted (Groq `whisper-large-v3`)** — override | ~$0.01-0.02/hora de áudio | áudio enviado a terceiro | rápido |
| **Hosted (OpenAI `whisper-1`)** — fallback do override | mais caro que Groq | áudio enviado a terceiro | rápido |

Usar local sempre que possível — é gratuito e não depende de rede. Só trocar pra hosted quando o usuário pedir explicitamente velocidade acima de custo/privacidade (ex: vídeo muito longo, urgência).

**Chave de API (só se usar hosted):** `GROQ_API_KEY` (preferencial) com fallback pra `OPENAI_API_KEY`, resolvidas via env — mesma convenção de `FAL_AI_API_KEY` na skill 17. Sem chave configurada, usar local automaticamente em vez de falhar.

## Regra Default (aplica automaticamente)

Sem pedido explícito do usuário, a skill usa: transcrição **local**, extração de frame em modo **scene-aware** (equilíbrio custo/cobertura), e tenta legenda nativa antes de qualquer processamento de áudio ou vídeo.

## Nota de ToS

Baixar vídeo de plataformas de terceiros pode violar os termos de uso do serviço, dependendo do conteúdo e da finalidade. Confirmar com o usuário que ele tem direito de baixar/processar o vídeo antes de prosseguir — não assumir que todo vídeo público é livre para download.

## Anti-Rationalization

| Racionalização | Realidade |
|---|---|
| "É só pegar a legenda automática do YouTube" | Legenda automática erra nome próprio e termo técnico — avisar o usuário quando a fonte é auto-gerada, não humana |
| "Hosted é sempre melhor, é mais rápido" | Hosted manda o áudio pra fora — usar só quando o usuário aceitar esse trade-off explicitamente |
| "Extrair todos os frames pra garantir cobertura" | Uniform sem cap em vídeo longo estoura o orçamento de contexto — escolher a estratégia pelo orçamento disponível |

## Evidencia de Conclusao

- fonte do vídeo confirmada (URL pública ou arquivo local do usuário)
- estratégia de transcrição/extração escolhida e justificada (local vs hosted, qual modo de frame)
- output entregue no formato que a pergunta do usuário pede (transcript, frames, ou resumo)

## Handoff

- **Prompt Engineer (26):** se o resumo/transcript alimentar outro prompt reutilizável
- **Video Integration Specialist (27):** se o pedido virar geração de vídeo novo em vez de análise do existente

## Fontes Externas

- Fluxo de download→legenda-ou-frame→transcrição inspirado em [bradautomates/claude-video](https://github.com/bradautomates/claude-video) (MIT) — mecanismo adaptado para transcrição local-por-padrão via `faster-whisper`, que a fonte não oferece (ela é hosted-only via Groq/OpenAI).
