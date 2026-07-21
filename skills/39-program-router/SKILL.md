---
name: program-router
description: |
  Decide a composicao minima de plugins, skills e, quando necessario, programs declarativos para uma task.
  Use antes de improvisar um pipeline ou quando o usuario perguntar qual skill, plugin, workflow ou program usar.
  Trigger em: "qual skill", "qual plugin", "qual program", "qual workflow", "roteie essa task",
  "auto orchestrate", "feature grande", "build app", "review PR", "discovery", "legacy", "greenfield".
allowed-tools: Read, Glob, AskUserQuestion, Bash(node scripts/route-task.mjs *), Bash(node scripts/run-program.mjs *)
---

# Program Router

Escolha o menor conjunto capaz de resolver a task. O router possui duas camadas complementares:

1. **Composicao**: `plugins/catalog/*.json` mapeia a linguagem da task para skills existentes.
2. **Execucao estruturada**: `programs/*.yml` entra apenas quando a task precisa de um pipeline completo.

O hook `intent-classifier` aplica a mesma composicao automaticamente em prompts nao triviais. Esta skill confirma, ajusta ou explica a decisao.

## Ordem de decisao

1. Um comando, skill ou program explicitamente pedido pelo usuario vence o catalogo.
2. Rode `node scripts/route-task.mjs "<task>"` para obter plugins, skills, policies e risco.
3. Carregue somente as skills retornadas, ate tres plugins e seis skills por padrao.
4. Se houver um sinal forte de pipeline, selecione um program. Caso contrario, execute a composicao diretamente.
5. Sem rota confiavel, entregue para a skill 09 (`orchestrator`) montar um fluxo ad-hoc.

## Programs

| Program | Quando usar |
|---|---|
| `pipeline-discovery` | ideia vaga, PRD ou discovery formal |
| `spec-driven-development` | feature nova com criterios e gates |
| `loop-polishing` | trabalho autonomo com polishing pre-commit |
| `detective-spec` | legado, contratos desconhecidos, sem documentacao |
| `adversarial-dev` | aplicativo greenfield do zero |
| `comprehensive-review` | review profundo de PR |
| `refactor-safely` | refactor com preservacao de comportamento |

## Composicoes bundladas

| Plugin | Cobertura |
|---|---|
| `core-discovery` | especificacao, legado, arquitetura, pesquisa |
| `development` | backend, frontend, testes, seguranca, review |
| `design-quality` | UI/UX, acessibilidade, motion, acabamento visual |
| `product-marketing` | copy, landing, SEO, blog e conversao |
| `ai-integration` | LLM, prompts, imagens, assets e video |
| `release-ops` | deploy, release, observabilidade e canary |

## Recomendacoes externas

| Plugin | Quando recomendar | Limite |
|---|---|---|
| `finance-workflows` | demonstracoes, conciliacao, faturamento, payroll, auditoria financeira | usuario instala o plugin; revisao humana obrigatoria |
| `legal-workflows` | contratos, NDA e compliance legal | usuario instala o plugin; revisao juridica qualificada obrigatoria |
| `context7-docs` | documentacao atualizada, API reference e versao de framework/biblioteca | usuario instala ou autoriza o MCP; citar a fonte retornada |

Esses dois itens sao metadados de descoberta, nao dependencias do kit. O router pode sugeri-los, mas nunca tenta invoca-los, instala-los ou apresenta seu resultado como conselho profissional.

Marketing e design sao composicoes de primeira classe: uma landing normalmente combina `product-marketing` e `design-quality`, e so inclui `development` quando houver implementacao de codigo.

## Safety gates

- `release-ops` e qualquer rota `high` exigem revisao humana antes de acao externa.
- O catalogo nao instala plugins externos nem autoriza conectores.
- Nao carregue skills extras por precaucao; use o catalogo e `policies/progressive-skill-loading.md`.
- Respeite `policies/tool-safety.md` e `policies/evals.md` quando a task usa tools ou muda comportamento.

## Verificacao

```bash
node scripts/route-task.mjs "crie a copy e o design de uma landing page"
node scripts/validate-plugin-catalog.mjs
node scripts/eval-plugin-routing.mjs --strict
node scripts/devkit-doctor.mjs --strict
```
