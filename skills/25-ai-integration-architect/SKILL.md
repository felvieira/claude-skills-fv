---
name: ai-integration-architect
description: |
  Skill para desenhar e implementar integracoes de IA em aplicacoes, separando provider, adapter, hooks,
  observabilidade, custo e seguranca. Use quando o usuario quiser adicionar texto, imagem ou video ao app.
  Trigger em: "integrar IA no app", "AI integration", "provider adapter de IA", "feature de IA", "chamar OpenAI", "chamar Anthropic", "Claude API", "LLM no app", "arquitetura de IA", "custo de IA", "fallback de provider", "rate limit de IA".
---

# AI Integration Architect

O AI Integration Architect usa os patterns de `patterns/ai-integration/` para implementar features de IA em apps sem improvisar arquitetura toda vez.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/evals.md`, `policies/stack-flexibility.md` e `policies/mcp-builder-patterns.md` (quando recomendar/criar MCP server para integrar serviço externo).

## Quando Usar

- integrar geracao de texto no app
- integrar geracao ou edicao de imagem no app
- integrar video generativo no app
- definir adapters, hooks, schemas, custo e observabilidade de IA

## Quando Nao Usar

- para gerar um asset visual isolado durante o trabalho do kit
- para substituir `Image Generator`, que e uma skill operacional separada

## Entradas Esperadas

- caso de uso do app
- stack real do projeto
- provider ou gateway desejado
- requisitos de UX, custo, seguranca e observabilidade

## Saidas Esperadas

- arquitetura de integracao de IA clara
- hooks ou adapters sugeridos
- handoff para Backend, Frontend, Data Analytics ou Observability SRE

## Base Obrigatoria

Antes de decidir a arquitetura, consultar:

- `patterns/ai-integration/README.md`
- `patterns/ai-integration/providers.md`
- `patterns/ai-integration/hooks.md`
- `patterns/ai-integration/prompt-patterns.md`
- `patterns/ai-integration/cost-efficiency.md`
- `patterns/ai-integration/security.md`

## Evidencia de Conclusao

- provider/gateway escolhido com justificativa
- adapters e hooks mapeados
- custo, seguranca e observabilidade considerados

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/ai-integration-plan.md`.

## Camada Visual dos Padroes de IA (componentes prontos)

Esta skill decide a arquitetura de streaming, tool-calling, custo e fallback — nao decide como a tela **parece** enquanto isso acontece. Quando o handoff for para Frontend ou UI/UX Design implementar as telas que expoem esses padroes (chat composer, indicador de "pensando"/streaming de texto, card de aprovacao de acao do agente, card de recomendacao, exibicao de estado do agente), considerar [Beautiful UI](https://www.beautifui.dev/) como opcao de biblioteca de componentes prontos em vez de desenhar cada um do zero.

**O que é** (confirmado ao vivo em 2026-08-23, ver `## Fontes`): "crafted primitives for AI-native interfaces", feito pelo estúdio de design Turbo. 20 componentes organizados em 6 categorias — **Loading & States** (Loading State, Thinking com traces expansíveis), **Text & Input** (Streaming Text, Prompt Bar, Chat Composer), **Cards & Feedback** (Approval Card, Recommendation Card, Context Cards, Insight Cards, Fine-tune Card), **Data Display** (Tool Chips, Task Rows, Diff Table, Records Table, Filter Table), **Navigation & Organization** (Sidebar Nav, Search, Flowchart), **Code & Advanced** (Code Block, Selection Actions). Licença MIT (indicada no rodapé como referência linkada, sem o texto completo exibido na página). **Sem link de repositório GitHub, nome de pacote npm, ou comando de instalação/CLI na página** — e a stack exigida (versão de React, Next.js, Tailwind, shadcn) não é especificada no site. Antes de adotar de verdade, localizar o repositório/pacote real (não achado no reconhecimento) e confirmar a stack.

**Escopo desta menção:** é sobre a camada visual do padrao (como o card de aprovacao e desenhado), nao sobre a arquitetura por tras dele (como o app decide o que mostrar, quando fazer streaming, como tratar timeout de aprovacao) — essa parte continua sendo desta skill (`patterns/ai-integration/hooks.md`, `patterns/ai-integration/providers.md`). Se o handoff for para `skills/02-ui-ux-design` ou `skills/04-frontend-integration`, citar Beautiful UI la como opcao de aceleracao, nao reimplementar a decisao aqui.

## Docs upstream via submodule (v2.12.2+, opt-in)

Esta skill pode usar o `anthropics/anthropic-cookbook` como fonte de exemplos vivos via git submodule. Por padrao **nao esta inicializado** (evita ~100MB de clone obrigatorio). Para ativar:

```bash
git submodule init skills/25-ai-integration-architect/sources/anthropic-cookbook
git submodule update --remote --depth=1
```

Quando ativo, os exemplos em `./sources/anthropic-cookbook/anthropic_api/` ficam em sync com o repo upstream. Pra atualizar:

```bash
git submodule update --remote skills/25-ai-integration-architect/sources/anthropic-cookbook
git add . && git commit -m "chore: bump anthropic-cookbook submodule"
```

Pattern documentado em [`docs/patterns/submodule-skills.md`](../../docs/patterns/submodule-skills.md). Inspirado em [antfu/skills](https://github.com/antfu/skills) (MIT).

## Fontes

- [Beautiful UI](https://www.beautifui.dev/) (estúdio Turbo, licença MIT indicada no rodapé do site): citado na seção "Camada Visual dos Padroes de IA" como opção de componente pronto para chat composer, indicadores de streaming/thinking, approval cards e recommendation cards. **Confirmado ao vivo via `WebFetch` em 2026-08-23** (a URL correta é `beautifui.dev`, sem "l" extra — as tentativas anteriores na mesma sessão falharam por erro de digitação, não porque o site estava fora do ar). 20 componentes em 6 categorias confirmados diretamente na página; link de repositório/pacote e stack exigida não estão publicados no site e continuam não confirmados — localizar antes de adotar em produção.
