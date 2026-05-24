# Quickstart

Guia curto para usar o kit no dia a dia sem reler tudo.

---

## Cenários comuns (v2.16.0) — copy-paste

### 1. Gerar imagem direto via CLI (skill 17)

Zero-dep Node 18+. Aplica regra default do kit (grok-imagine pra t2i $0.020, gemini-25-flash pra edit $0.039).

```bash
# Setup uma vez
export FAL_AI_API_KEY="sk-..."  # ou FAL_KEY (https://fal.ai/dashboard/keys)

# Gerar imagem (text-to-image, default = grok-imagine)
node scripts/generate-image.mjs --prompt "hero minimalist, blue gradient" --aspect 16:9 --out public/hero.jpg

# Editar imagem existente (auto-detect edit mode com --ref, default = gemini-25-flash)
node scripts/generate-image.mjs --prompt "remove background" --ref ./photo.jpg --out clean.png

# Override quando justificado (tipografia complexa)
node scripts/generate-image.mjs --prompt "OG card with title" --model gemini-3-pro --aspect 16:9 --out og.png

# Listar models + preços
node scripts/generate-image.mjs --list
```

### 2. `/swarm` gera imagens automaticamente

Quando você pedir `/swarm "criar landing pra produto X"`, a Phase 2.5 detecta que é landing/sistema novo e despacha skill 17 para gerar hero/ícones/OG sem você pedir. Backend-only features pulam a phase.

Ver `commands/swarm.md → Phase 2.5 Visual Assets`.

### 3. Bootstrap de novo projeto via template `stack-default`

```bash
# Copia o template (Docker + Next.js 15 + Better Auth + Drizzle + OpenRouter + FAL.AI)
cp -r templates/stack-default/ ../meu-projeto/
cd ../meu-projeto/
docker network create traefik_web   # uma vez por host
cp .env.example .env                # editar: DB_PASSWORD, REDIS_PASSWORD, OPENROUTER_API_KEY, FAL_AI_API_KEY...

# Subir
make dev
# App:           http://localhost:3000
# DB GUI:        http://localhost:8080
# Redis UI:      http://localhost:8081
# Mailpit:       http://localhost:8025
# MinIO console: http://localhost:9001
```

Decisões já tomadas (não reabrir): ver `templates/stack-default/README-stack.md`.

### 4. Consumir adapters no app (runtime)

Dentro de um projeto criado do template:

```ts
// LLM via OpenRouter (1 key → 300+ models, troca via .env sem mudar código)
import { callLLM, streamLLM } from "@/lib/llm";
const result = await callLLM({ tier: "balanced", messages });

// Imagem via FAL.AI
import { generateImage, estimateImageCost } from "@/lib/image";
const { images } = await generateImage({ prompt: "...", preset: "cheap" });

// Cost guard antes de gerar
if (estimateImageCost({ preset: "quality", numImages: 4 }) > userBudget) {
  throw new Error("budget exceeded");
}
```

### Regra default global do kit (imagem)

| Cenário | Model default | Preço |
|---|---|---:|
| text-to-image (sem `referenceImages`) | **grok-imagine** | $0.020/img |
| edit/refine (com `referenceImages`) | **gemini-25-flash** | $0.039/img |

Override só com justificativa. Fonte única: `models/image-models.json`.

### Regra default global do kit (LLM via OpenRouter, no template)

| Tier | Default model | Quando |
|---|---|---|
| `fast` | llama-3.1-8b-instruct:free | Classificação, formatação, boilerplate |
| `balanced` | claude-sonnet-4-5 | Implementação, chat, docs |
| `deep` | claude-opus-4-5 | Arquitetura, security, raciocínio complexo |

Troca via `.env` (`LLM_MODEL_FAST/BALANCED/DEEP`) sem reescrever código.

### Troubleshooting comum

| Problema | Solução |
|---|---|
| `FAL_AI_API_KEY não definida` | `export FAL_AI_API_KEY="sk-..."` ou colocar no `.env` (fallback: `FAL_KEY`, `FAL_API_KEY`) |
| Subagent gastou Opus em tarefa de Sonnet | Passar `model:` explícito em `Agent()`. Hook só sugere — ver `policies/model-routing-real.md` |
| `/swarm` não gerou imagens em landing | Verificar se PRD/stories mencionam "hero", "landing", "ícone". Sem essas palavras, phase 2.5 não dispara. |
| Imagem ficou genérica/destoante | Despachar via UI/UX (skill 02) com contexto visual primeiro, não pular pra skill 17 direto |

---

## Ordem recomendada

1. Ler `GLOBAL.md`
2. Ler `docs/repo-audit/current.md` se existir
3. Iniciar pelo `Repo Auditor` se a auditoria estiver ausente ou desatualizada
4. Deixar o `Orchestrator` definir o pipeline minimo suficiente

## Instalacao em repo existente

- manter `AGENTS.md` na raiz do repo
- instalar o kit em `.bot/`
- usar `templates/AGENTS-root.md` como base para o `AGENTS.md` do repo consumidor
- consultar `docs/setup-bot-folder.md` para a estrutura recomendada

## Fluxos mais comuns

### Feature nova
`Repo Auditor -> PO -> UI/UX -> Backend -> Frontend -> QA -> Security -> Reviewer`

### Bugfix
`Repo Auditor` se faltar contexto -> skill afetada -> QA -> Security -> Reviewer

### Landing page
`Repo Auditor -> Copy -> UI/UX -> Frontend -> Image Generator` quando necessario `-> SEO -> QA -> Reviewer`

### Infra/operacao
`Repo Auditor -> skill afetada -> Observability SRE -> Security/QA conforme risco -> Reviewer -> Deploy`

### Release formal
pipeline normal `-> Release Manager -> Deploy`

### Feature de IA no app
`Repo Auditor -> AI Integration Architect -> Prompt Engineer` quando necessario `-> Backend/Frontend -> QA -> Security -> Reviewer`

### Feature de video no app
`Repo Auditor -> AI Integration Architect -> Video Integration Specialist -> Prompt Engineer` quando necessario `-> Backend/Frontend -> QA -> Security -> Reviewer`

### Migracao grande
`Repo Auditor -> Migration Refactor Specialist -> skill afetada -> QA -> Security -> Reviewer -> Deploy`

## Quando chamar skills novas

- `Asset Librarian`: quando houver duvida sobre logos, icones, imagens, fontes ou consistencia visual
- `Image Generator`: quando precisar gerar ou adaptar asset novo sem destoar do app
- `Data Analytics`: quando a feature precisar de tracking, KPI ou funil
- `Accessibility Specialist`: quando houver fluxo critico, compliance ou maior rigor de UX inclusiva
- `Migration Refactor Specialist`: quando a mudanca for estrutural, incremental ou de legacy
- `Observability SRE`: quando a mudanca tocar monitoramento, logs, tracing, readiness, alerta ou rollback
- `Release Manager`: quando a entrega precisar de release notes, changelog e rollout controlado
- `AI Integration Architect`: quando a task for integrar texto, imagem ou video no app do usuario
- `Prompt Engineer`: quando a qualidade, reproducao ou custo do prompt for parte central da feature
- `Video Integration Specialist`: quando a task envolver video generativo no app
- `Playwright MCP`: quando for importante subir o app, navegar, validar visualmente e tirar screenshots

## Regra de economia de token

- reutilizar `docs/repo-audit/current.md`
- reutilizar `docs/repo-audit/assets.md` para contexto visual
- usar `devkit_context_pack` antes de abrir muitos arquivos
- usar `devkit_diff_brief` para retomar branch, review ou handoff
- manter `devkit_working_set` atualizado com arquivos quentes e proximos passos
- consultar `devkit_track_cost` quando a sessao estiver longa ou repetitiva
- reutilizar `patterns/ai-integration/` em vez de redesenhar plumbing de IA do zero
- reutilizar MCPs locais de browser automation quando validacao visual real for importante
- abrir `docs/skill-guides/` so sob demanda
- evitar reauditar o repo inteiro sem mudanca relevante
- consultar `docs/daily-token-workflow.md` para o fluxo operacional enxuto

## Roadmap atual

- ver `docs/plans/2026-04-04-token-economy-roadmap.md` para o roadmap implementado de economia de token e uso diario com IA
