# AI Integration Architect Guide

> Guia auxiliar da skill `25-ai-integration-architect`.  
> Abrir apenas quando a integracao de IA for complexa ou quando precisar dos patterns completos de adapter, hook e observabilidade.
>
> Consultar tambem os patterns em `patterns/ai-integration/` para referencia de implementacao.

---

## O que esta skill faz

O AI Integration Architect usa os patterns de `patterns/ai-integration/` para integrar geracao de texto, imagem ou video em aplicacoes sem improvisar a arquitetura toda vez. O foco e separar provider, adapter, hooks, observabilidade, custo e seguranca — garantindo que a integracao seja troçavel, monitoravel e controlavel.

---

## Quando acionar

| Situacao | Acionar? |
|----------|----------|
| Adicionar geracao de texto (chat, resumo, traducao, code) | Sim |
| Adicionar geracao ou edicao de imagem no app | Sim |
| Adicionar video generativo no app | Sim |
| Definir adapter, hook, schema de custo ou observabilidade | Sim |
| Gerar asset visual isolado durante trabalho do kit | Nao (usar `Image Generator`) |
| Trocar provider sem mudar a arquitetura ja definida | Nao (tarefa de Backend) |

---

## Principios de arquitetura

### Separacao de camadas

```
App Logic
    │
    ▼
Hook / Composable       ← ponto de entrada para o componente/tela
    │
    ▼
Service / Use Case      ← orquestra a chamada, trata erros, formata
    │
    ▼
Adapter / Client        ← isola o SDK do provider
    │
    ▼
Provider (OpenAI, Anthropic, Replicate, etc.)
```

**Regra:** a camada acima nunca importa o SDK diretamente. Sempre via adapter.

### Por que adapters?

- Trocar de provider requer mudar so o adapter, nao o restante do app
- Facilita mock em testes
- Permite gateway unificado (ex: OpenRouter) sem mudar a logica da feature

---

## Patterns de referencia

### Text Generation

```typescript
// adapter/openai.ts
export interface TextAdapter {
  generate(prompt: string, options: GenerateOptions): Promise<TextResult>
}

export class OpenAIAdapter implements TextAdapter {
  async generate(prompt: string, opts: GenerateOptions): Promise<TextResult> {
    // wrapper do SDK
  }
}

// hook/useTextGeneration.ts
export function useTextGeneration() {
  const [result, setResult] = useState<TextResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const generate = async (prompt: string) => {
    setLoading(true)
    try {
      const res = await textService.generate(prompt)
      setResult(res)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  return { result, loading, error, generate }
}
```

### Image Generation

```typescript
// Estrutura equivalente para imagem
export interface ImageAdapter {
  generate(prompt: string, options: ImageOptions): Promise<ImageResult>
  edit?(image: File, mask: File, prompt: string): Promise<ImageResult>
}
```

---

## Checklist de integracao

### Provider e gateway

- [ ] Provider escolhido com justificativa (custo, qualidade, latencia, compliance)
- [ ] Avaliar gateway unificado (OpenRouter, PortkeyAI) se multiplos providers previstos
- [ ] API key via variavel de ambiente, nunca hardcoded
- [ ] Regiao de processamento verificada (compliance de dados, LGPD/GDPR)

### Adapter

- [ ] Interface abstrata definida antes do adapter concreto
- [ ] SDK do provider isolado no adapter (zero vazamento para camadas acima)
- [ ] Adapter mockavel para testes unitarios
- [ ] Timeout e retry configurados no adapter

### Schema e validacao

- [ ] Schema de input e output definidos (Zod, Joi, io-ts ou similar)
- [ ] Validacao de tamanho de input (tokens, caracteres, dimensoes de imagem)
- [ ] Sanitizacao de input do usuario antes de enviar ao provider

### Custo

- [ ] Custo por chamada estimado (tokens de entrada + saida, resolucao da imagem)
- [ ] Rate limiting por usuario ou sessao definido
- [ ] Budget alert ou hard cap configurado no provider
- [ ] Metricas de custo expostas para observabilidade

### Seguranca

- [ ] Prompt injection considerado — inputs do usuario nao devem controlar diretamente o system prompt
- [ ] Conteudo gerado moderado antes de exibir ao usuario (moderation API ou filtro proprio)
- [ ] Dados sensiveis nao incluidos no prompt (PII, tokens de auth, dados de terceiros)
- [ ] CORS e autenticacao no endpoint que chama a IA validados

### Observabilidade

- [ ] Log de cada chamada: prompt (ou hash), provider, modelo, tokens, latencia, status
- [ ] Metrica de taxa de erro por provider
- [ ] Alerta para degradacao de latencia ou aumento de erros
- [ ] Tracing distribuido conectado ao span da chamada de IA

### UX

- [ ] Estado de loading adequado para latencia de IA (geralmente > 1s)
- [ ] Streaming implementado quando o provider suporta e a UX se beneficia
- [ ] Mensagem de erro clara para o usuario (sem expor detalhes internos)
- [ ] Fallback definido: o que acontece se o provider estiver fora?

---

## Providers por modalidade

### Texto

| Provider | Modelos | Destaque |
|----------|---------|---------|
| OpenAI | GPT-4o, GPT-4o-mini | Ecosistema maduro, funcoes/tools |
| Anthropic | Claude 3.5 Sonnet/Haiku | Contexto longo, instrucoes complexas |
| Google | Gemini 2.0 Flash | Multimodal nativo, baixo custo |
| Meta (via API) | Llama 3.x | Open-weight, auto-hospedagem possivel |

### Imagem

| Provider | Modelos | Destaque |
|----------|---------|---------|
| OpenAI | DALL-E 3, gpt-image-1 | Qualidade alta, integracao simples |
| Stability AI | SDXL, SD3 | Customizacao avancada |
| Replicate | FLUX, varios | Marketplace de modelos |
| fal.ai | FLUX, SD | Baixa latencia |

### Video

| Provider | Modelos | Destaque |
|----------|---------|---------|
| Runway | Gen-3 | Qualidade cinematografica |
| Kling | Kling 1.6 | Custo-beneficio |
| Luma | Dream Machine | image-to-video de qualidade |
| Pika | Pika 2.x | Clips curtos, rapido |

---

## Integracao com outras skills

| Skill | Relacao com AI Integration Architect |
|-------|--------------------------------------|
| `Prompt Engineer` | Define os templates de prompt usados pelos adapters |
| `Video Integration Specialist` | Especialista para features de video generativo |
| `Backend API` | Implementa o endpoint que chama o adapter |
| `Frontend` | Implementa o hook e a UX de loading/streaming |
| `Observability SRE` | Integra as metricas de custo e latencia de IA ao sistema |
| `Security Review` | Valida prompt injection, moderacao e compliance de dados |
| `Data Analytics` | Mede o uso real da feature de IA pelo usuario |

---

## Evidencia de conclusao

- [ ] Provider/gateway escolhido com justificativa
- [ ] Interface de adapter definida
- [ ] Custo estimado e rate limit definidos
- [ ] Seguranca revisada (prompt injection, PII, moderacao)
- [ ] Observabilidade planejada (log, metrica, alerta)
- [ ] UX de loading e fallback definidos
- [ ] Handoff entregue para Backend, Frontend e SRE
