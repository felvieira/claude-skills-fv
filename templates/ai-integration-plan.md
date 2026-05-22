# AI Integration Plan

Template para planejar a integração de IA (texto, imagem ou vídeo) em uma feature ou produto.
Preencher antes de implementar. Referência canônica: `patterns/ai-integration/README.md`.

---

## 1. Contexto

| Campo              | Valor |
|--------------------|-------|
| Feature / Produto  |       |
| Modalidade         | `texto` / `imagem` / `vídeo` / `multi-modal` |
| Prioridade         | `P0 – crítico` / `P1 – importante` / `P2 – nice-to-have` |
| Data alvo          |       |
| Responsável        |       |

**Descrição do caso de uso:**
<!-- O que o usuário faz, o que a IA entrega, e qual é o valor de negócio. -->

---

## 2. Provider e Modelo

> Consultar `patterns/ai-integration/providers.md` antes de decidir.

| Campo                   | Decisão |
|-------------------------|---------|
| Gateway primário        | `Vercel AI Gateway` / `OpenRouter` / `fal.ai` / outro |
| Modelo primário         |         |
| Modelo de fallback      |         |
| Justificativa da escolha|         |
| SDK / biblioteca        | `ai` (Vercel AI SDK) / `@anthropic-ai/sdk` / outro |

**Variáveis de ambiente necessárias:**
```
AI_GATEWAY_URL=
AI_GATEWAY_API_KEY=
AI_DEFAULT_TEXT_MODEL=
```

---

## 3. Arquitetura de Integração

> Seguir o padrão de camadas de `patterns/ai-integration/hooks.md`.

**Diagrama de camadas (preencher com o fluxo real):**

```
Frontend (componente / página)
  └── Hook: use_______________
        └── API Route / Server Action: /api/ai/_______________
              └── Adapter: _______________()
                    └── Gateway: _______________
                          └── Model: _______________
```

**Adapter(s) server-side envolvidos:**
- [ ] `generateText()` — resposta síncrona
- [ ] `streamText()` — resposta em streaming
- [ ] `generateObject()` — output estruturado com schema
- [ ] `generateImage()` — geração de imagem
- [ ] `generateVideo()` — geração de vídeo
- [ ] `generateTextWithFallback()` — cadeia de fallback

**Hooks de frontend envolvidos:**
- [ ] `useTextGeneration`
- [ ] `useTextStream`
- [ ] `useStructuredGeneration`
- [ ] `useImageGeneration`
- [ ] `useVideoGeneration`
- [ ] `useAIFallback`

---

## 4. Prompt Template

> Seguir `patterns/ai-integration/prompt-patterns.md`.

**System prompt (se aplicável):**
```
<!-- Papel, restrições, tom e formato esperado. Sem PII. -->
```

**Prompt template (user turn):**
```
<!-- Marcadores de variável: {{variable_name}} -->
```

**Variáveis injetadas dinamicamente:**
| Variável | Fonte | Máx. chars |
|----------|-------|------------|
|          |       |            |

**Schema de output (quando `generateObject`):**
```typescript
const OutputSchema = z.object({
  // definir campos esperados
});
```

---

## 5. Cost Ceiling

> Consultar `patterns/ai-integration/cost-efficiency.md`.

| Parâmetro              | Valor |
|------------------------|-------|
| Max tokens por request |       |
| Budget estimado / mês  |       |
| Budget por usuário / sessão |  |
| Rate limit por IP / usuário |  |
| Estratégia de caching  | `prefix cache` / `semantic cache` / `nenhum` |
| Contexto máximo enviado | tokens |

**Estratégia para controle de custo:**
<!-- Ex: resumir histórico após 6 turnos, usar modelo barato para triagem, usar modelo caro só no acabamento. -->

---

## 6. Fallback Strategy

| Cenário de falha         | Comportamento esperado |
|--------------------------|------------------------|
| Provider primário fora   |                        |
| Timeout (>Xs)            |                        |
| Output inválido / schema errado |               |
| Rate limit atingido      |                        |
| Budget de custo excedido |                        |

**Cadeia de fallback de modelos:**
1. (primário)
2. (fallback 1)
3. (fallback 2 / degraded mode)

---

## 7. Observability Spec

> Consultar `patterns/ai-integration/hooks.md` → `useAIObservability`.
> Handoff possível para skill `20-observability-sre`.

**Eventos a registrar em cada chamada:**
- [ ] `model` usado
- [ ] `inputTokens` / `outputTokens`
- [ ] `latencyMs`
- [ ] `costEstimateUsd`
- [ ] `status` (success / error / fallback)
- [ ] `feature` / `endpoint` de origem

**Destino dos logs / métricas:**
| Destino        | Configurado? | Notas |
|----------------|-------------|-------|
| Console (dev)  |             |       |
| Posthog / Mixpanel |         |       |
| Datadog / Langfuse |         |       |
| Alertas de custo |           |       |

**Alertas críticos:**
- custo acima de `$___` / dia → notificar canal ___
- error rate acima de `___%` → pager / incident
- latência p99 acima de `___ms` → investigar

---

## 8. Security Boundary

> Regras obrigatórias em `patterns/ai-integration/security.md`.

**Checklist de segurança:**
- [ ] API key nunca exposta no frontend
- [ ] Prompt do usuário tratado como `input`, não como instrução de sistema
- [ ] Rate limiting no endpoint de IA
- [ ] Validação de schema no input antes de enviar para o modelo
- [ ] Output sanitizado antes de renderizar no DOM (XSS)
- [ ] PII não enviada para o modelo sem consentimento explícito
- [ ] Secrets rotacionados se aparecerem em log, commit ou screenshot
- [ ] CORS do endpoint de IA restrito ao domínio da aplicação

**Dados sensíveis no contexto:**
| Dado | Enviado ao modelo? | Justificativa |
|------|--------------------|---------------|
|      | Sim / Não          |               |

---

## 9. Handoffs e Dependências

| Skill / Time        | O que precisa       | Quando |
|---------------------|---------------------|--------|
| `03-backend-api`    | adapter + route     |        |
| `04-frontend`       | hook + componente   |        |
| `20-observability`  | log + alertas       |        |
| `21-data-analytics` | eventos de produto  |        |
| `06-security`       | revisão de boundary |        |

---

## 10. Evidência de Conclusão

- [ ] Provider escolhido com justificativa documentada
- [ ] Adapter implementado e testado com mock de provider
- [ ] Hook de frontend integrado ao componente real
- [ ] Output estruturado validado com schema (quando aplicável)
- [ ] Fallback testado manualmente (simular falha do provider primário)
- [ ] Observabilidade registrando chamadas em staging
- [ ] Custo estimado por request calculado e dentro do budget
- [ ] Security checklist (seção 8) completamente marcada
- [ ] Handoffs para skills dependentes disparados

---

## Cross-links

- `patterns/ai-integration/README.md` — visão geral do sistema de patterns
- `patterns/ai-integration/providers.md` — gateways e modelos recomendados
- `patterns/ai-integration/hooks.md` — catálogo de hooks e adapters
- `patterns/ai-integration/text-generation.md` — pattern completo para texto
- `patterns/ai-integration/prompt-patterns.md` — boas práticas de prompt
- `patterns/ai-integration/cost-efficiency.md` — caching e contexto mínimo
- `patterns/ai-integration/security.md` — secrets e safety
- `templates/handoff.md` — template de handoff entre skills
- `policies/quality-gates.md` — gates de qualidade antes de deploy
