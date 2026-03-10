# Video Integration Specialist Guide

> Guia auxiliar da skill `27-video-integration-specialist`.  
> Abrir apenas quando a integracao de video generativo for complexa ou quando precisar dos patterns de fluxo assincrono e UX.

---

## O que esta skill faz

O Video Integration Specialist foca em arquitetura, custo, prompt cinematografico e UX de features de video generativo em apps: text-to-video, image-to-video, clips promocionais, avatar video e motion explainers. Video generativo tem caracteristicas proprias — latencia alta, custo por segundo, processamento assincrono — que exigem tratamento dedicado.

---

## Quando acionar

| Situacao | Acionar? |
|----------|----------|
| Integrar text-to-video no app | Sim |
| Integrar image-to-video no app | Sim |
| Avatar video ou talking head feature | Sim |
| Clips promocionais gerados por IA | Sim |
| Tratamento de video como simples extensao de imagem | Nao |
| Asset operacional do kit sem feature no app | Nao |

---

## Por que video e diferente de imagem

| Dimensao | Imagem | Video |
|----------|--------|-------|
| Latencia tipica | 2-10s | 30s-5min |
| Custo | Por imagem | Por segundo de video |
| Processamento | Sincrono possivel | Assincrono quase sempre |
| Storage | Pequeno (~100KB-5MB) | Grande (5MB-500MB+) |
| Entrega | URL direta | Pre-assinado + CDN |
| Formatos | JPEG, PNG, WebP | MP4, WebM, GIF |
| Prompt | Descricao visual | Cena + camera + duracao |

---

## Arquitetura de integracao de video

### Fluxo assincrono recomendado

```
Usuario submete request
        │
        ▼
Backend cria job e retorna job_id
        │
        ▼
Provider processa video (30s-5min)
        │
        ▼
Webhook ou polling → status update
        │
        ▼
Video salvo em storage (S3, R2, etc.)
        │
        ▼
URL pre-assinada entregue ao frontend
        │
        ▼
Player exibe o video
```

### Estados do job

```
PENDING    → job criado, aguardando na fila
PROCESSING → provider gerando o video
COMPLETED  → video disponivel para download
FAILED     → geracao falhou — motivo e acao de retry
EXPIRED    → URL pre-assinada expirou — necessario renovar
```

### Polling vs Webhook

| Abordagem | Quando usar |
|-----------|------------|
| Webhook | Preferencial — provider chama o backend quando termina |
| Short polling (5-10s) | Fallback quando webhook nao esta disponivel |
| Long polling | Alternativa ao webhook em ambientes sem endpoint publico |
| SSE / WebSocket | Para UX em tempo real no frontend |

---

## UX de video assincrono

### Estados de loading

```
Enviando request        → spinner ou progress bar de upload
Aguardando geracao      → progress estimado ou animacao de espera
Gerando (in progress)   → mensagem com tempo estimado restante
Concluido               → player aparece com video pronto
Falhou                  → mensagem clara + botao de retry
```

### Boas praticas de UX

- **Nunca bloquear o usuario** — video e gerado em background; usuario pode fazer outras coisas
- **Progresso honesto** — se o tempo estimado e 2 min, mostrar contador regressivo ou barra proporcional
- **Retry visivel** — se falhar, botao de retry com mensagem explicativa (nao tecnica)
- **Preview antes do video** — mostrar o frame inicial ou thumbnail enquanto carrega
- **Download opcional** — oferecer download do video gerado quando relevante
- **Limite claro** — comunicar antecipadamente o limite de geracao (ex: "max 10s por clip")

---

## Providers de video generativo

| Provider | Modelos | Destaque | Latencia tipica |
|----------|---------|---------|-----------------|
| Runway | Gen-3 Alpha | Qualidade cinematografica | 1-3 min |
| Kling | Kling 1.6 | Custo-beneficio, 5-10s clips | 1-2 min |
| Luma | Dream Machine | image-to-video de alta qualidade | 2-4 min |
| Pika | Pika 2.x | Clips curtos rapidos | 30-60s |
| Stability AI | SVD (Stable Video) | Open-weight, auto-hospedagem | Variavel |
| HeyGen | HeyGen API | Avatar video, talking head | 1-3 min |

---

## Custo e rate limiting

### Estimativa de custo

- A maioria cobra por segundo de video gerado
- Resolucao e FPS impactam o custo
- Geracao com audio (quando disponivel) e mais caro

```
Exemplo Runway Gen-3:
  5s clip, 720p  ≈  $0.05-0.10
  5s clip, 1080p ≈  $0.10-0.20

Para app com 1000 videos/mes de 5s: ~$50-200/mes
```

### Rate limiting recomendado

- Por usuario: max N videos/dia ou N videos/hora
- Por conta: budget mensal com alerta a 80%
- Hard cap: suspender geracao quando budget atingido, com mensagem clara

---

## Checklist de integracao

### Arquitetura

- [ ] Fluxo assincrono com job + webhook/polling implementado
- [ ] Estados do job mapeados e tratados no frontend
- [ ] Storage para os videos gerados definido (S3, R2, GCS)
- [ ] TTL dos videos definido (quando expiram do storage)
- [ ] URL pre-assinada com expiracao configurada

### Custo e limites

- [ ] Custo por segundo estimado para o provider escolhido
- [ ] Rate limit por usuario definido
- [ ] Budget alert configurado no provider
- [ ] Hard cap implementado para evitar surprise billing

### Seguranca

- [ ] Conteudo do prompt de video nao permite geracao de conteudo proibido
- [ ] Moderacao de conteudo antes de exibir ao usuario (quando o provider oferece)
- [ ] Videos gerados nao armazenados indefinidamente sem necessidade
- [ ] Acesso ao storage restrito (nao publico por padrao)

### UX

- [ ] Estados de loading claros para cada etapa do fluxo
- [ ] Mensagem de tempo estimado durante a geracao
- [ ] Retry acessivel em caso de falha
- [ ] Limite de geracao comunicado antecipadamente ao usuario

### Observabilidade

- [ ] Log de cada job: provider, modelo, duracao solicitada, tokens/custo, status, latencia
- [ ] Metrica de taxa de sucesso/falha por provider
- [ ] Alerta para falhas acima do threshold
- [ ] Dashboard de custo de video por periodo

---

## Prompts cinematograficos

Consultar `docs/skill-guides/prompt-engineer.md` para o template completo. Principios-chave:

- **Especificar camera:** `static shot`, `slow zoom in`, `pan left`, `aerial view`, `handheld`
- **Especificar duracao:** `3-second clip`, `5 seconds of footage`
- **Especificar estilo:** `cinematic`, `documentary`, `product showcase`, `motion graphics`
- **Especificar ambiente:** iluminacao, paleta, atmosfera
- **Negative prompts:** `no abrupt cuts`, `no flickering`, `no text on screen`

---

## Integracao com outras skills

| Skill | Relacao com Video Integration Specialist |
|-------|------------------------------------------|
| `AI Integration Architect` | Architect define a arquitetura geral; Video Specialist aprofunda em video |
| `Prompt Engineer` | Define os templates de prompt cinematografico |
| `Frontend` | Implementa o player, estados de loading e UX assincrona |
| `Backend API` | Implementa o job manager, webhook handler e integracao com storage |
| `Observability SRE` | Monitora custo, latencia e falhas de video |

---

## Evidencia de conclusao

- [ ] Provider escolhido com justificativa (custo, qualidade, latencia)
- [ ] Fluxo assincrono com estados mapeados
- [ ] Rate limiting e budget definidos
- [ ] UX de loading e fallback especificados
- [ ] Prompts cinematograficos definidos
- [ ] Handoff entregue para AI Integration Architect, Frontend e Backend
