---
name: video-integration-specialist
description: |
  Skill para integrar geracao e manipulacao de video em aplicacoes. Use quando o app precisar de text-to-video,
  image-to-video, clips promocionais, avatar video, motion explainers ou outros fluxos de video generativo.
  Trigger em: "text-to-video", "image-to-video", "video generativo", "avatar video", "motion explainer", "clip promocional", "gerar video", "fal video", "Sora", "Veo", "Runway video", "video AI".
---

# Video Integration Specialist

Video generativo nao e "imagem que se move" — tem duracao, audio, custo 10-50x maior e latencia em minutos (nao segundos). Esta skill cobre arquitetura, custo, prompt cinematografico e UX de features de video no app, sem tratar o problema como uma extensao trivial de imagem.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/verification-before-completion.md` e `policies/stack-flexibility.md`.

## Quando Usar

- integrar text-to-video ou image-to-video numa feature do app
- desenhar o fluxo assincrono (submit → poll/webhook → entrega) de video generativo
- definir provider, custo tolerado, duracao, formato e UX de espera
- escrever prompt cinematografico (camera, movimento, ritmo) reutilizavel

## Quando Nao Usar

- tratar video como imagem sem considerar tempo, audio e custo por segundo
- gerar asset operacional do kit (banner do repo, etc.) — isso e skill 17 (image)
- editar video pos-producao tradicional (corte, legenda, mux) — isso e ffmpeg/pipeline de midia, nao geracao

## A diferenca fundamental: video e assincrono e caro

| Dimensao | Imagem (skill 17) | Video |
|---|---|---|
| Latencia | 2-15s | 30s-5min+ |
| Custo | $0.002-0.15/img | $0.05-0.50+ por segundo de video |
| Padrao de chamada | request/response sincrono | submit → job id → poll ou webhook |
| UX | spinner curto | progress + "te aviso quando ficar pronto" |
| Falha | barata, retry | cara, retry custa de novo — confirme antes |

Por isso o fluxo NUNCA e sincrono. Bloquear um request HTTP por 3 minutos esperando video e bug.

## Providers (panorama — confirme preco atual via models.json/docs)

| Provider | Forte em | Modo | Nota |
|---|---|---|---|
| **FAL.ai** (Veo, Kling, Hunyuan, LTX) | acesso unificado, varios modelos, i2v | submit + poll/webhook | preferir como gateway — mesma key, troca de modelo sem reescrever |
| **Google Veo** | qualidade cinematografica, fisica | async | top de linha, caro |
| **OpenAI Sora** | coerencia longa, prompt adherence | async | acesso limitado |
| **Runway (Gen-3/4)** | controle de camera, estetica | async + editor | forte em criativo |
| **Kling / Hunyuan** | custo-beneficio, i2v | async | bom para escala |

**Default operacional do kit:** rotear via FAL.ai quando possivel (gateway unico, troca de modelo barata). So ir direto ao provider se ele tiver capacidade que o gateway nao expoe.

## Base obrigatoria

Consultar (nao reinventar):
- `patterns/ai-integration/video-generation.md` — adapter, job lifecycle, storage
- `patterns/ai-integration/prompt-patterns.md` — estrutura de prompt
- `patterns/ai-integration/cost-efficiency.md` — controle de custo/quota
- `patterns/ai-integration/security.md` — moderacao, abuso, NSFW

## O fluxo assincrono (padrao de referencia)

```
1. Usuario submete (texto/imagem + params)
2. App valida + estima custo → confirma se acima de threshold
3. App chama provider.submit() → recebe job_id, persiste {job_id, user, status: queued}
4. Provider processa (minutos). App NAO bloqueia.
5a. WEBHOOK (preferido): provider chama /webhook/video → app atualiza status, notifica user
5b. POLL (fallback): worker consulta status a cada N s com backoff
6. Pronto → baixa o output, move pra storage proprio (S3/R2), gera URL assinada
7. Notifica (in-app, push, email) + thumbnail/preview
```

Decisoes que importam:
- **webhook > polling** quando o provider suporta (sem queimar quota de status)
- **mova o asset pro seu storage** — URLs de provider expiram; nao dependa delas
- **idempotencia**: webhook pode chegar 2x — dedupe por job_id
- **timeout/dead-job**: job que nunca volta precisa de TTL + estado `failed`

## Prompt cinematografico (estrutura)

Video responde a vocabulario de cinema, nao so descricao de cena:

```
[SUJEITO + ACAO] + [AMBIENTE] + [CAMERA: shot/movimento] + [ILUMINACAO] + [ESTILO] + [RITMO]

Ex: "A woman walks through a neon-lit Tokyo alley at night,
     slow dolly-in following her from behind,
     rain reflecting the signs, cinematic, shallow depth of field,
     24fps film look, calm pacing"
```

Controles que mais mudam o resultado:
- **movimento de camera**: dolly, pan, tilt, orbit, static, handheld
- **shot**: wide / medium / close-up / aerial
- **ritmo**: slow/calm vs fast/dynamic
- **i2v**: a imagem-seed domina a composicao; o prompt controla o *movimento*, nao a cena

Prompt reutilizavel e responsabilidade compartilhada com skill 26 (prompt-engineer).

## Custo — controle antes de liberar

- video custa **por segundo** — um clip de 10s pode valer 50-100x um still
- **estimar e confirmar** acima de um threshold de custo antes de submeter
- **cachear** outputs por (prompt+seed+params) — nunca regenerar o identico
- **quota por usuario** (free vs paid) para nao virar vetor de custo aberto
- **preview de baixa resolucao** antes do render final caro, quando o provider permite

## Anti-padroes frequentes

- chamada sincrona esperando o video (bloqueia request, estoura timeout)
- depender da URL do provider (expira) em vez de mover pro storage proprio
- sem confirmacao de custo → usuario gera 50 clips de 10s, fatura explode
- webhook sem dedupe/idempotencia → asset duplicado, notificacao dupla
- sem moderacao no input → geracao de conteudo proibido vira problema legal
- tratar i2v como t2i (esquecer que a imagem-seed manda na composicao)

## Evidencia de Conclusao

- provider + fluxo assincrono (submit/poll-ou-webhook/storage) definidos
- custo por segundo estimado, threshold de confirmacao e quota definidos
- prompt cinematografico especificado (camera/movimento/ritmo)
- moderacao de input e idempotencia de webhook tratadas

## Handoff

- **AI Integration Architect (25)** define o adapter/gateway e fallback de provider
- **Prompt Engineer (26)** itera o prompt cinematografico reutilizavel
- **Frontend (04)** implementa a UX de espera (progress, notificacao)
- **Observability SRE (20)** instrumenta latencia, taxa de falha e custo por job
- Seguir `policies/handoffs.md` e, quando util, `templates/ai-integration-plan.md`
