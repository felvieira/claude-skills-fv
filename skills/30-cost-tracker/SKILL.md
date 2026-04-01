---
name: cost-tracker
description: |
  Skill de rastreamento de custo por sessao. Monitora tokens consumidos, chamadas de API (fal.ai, Brave, Firecrawl),
  tempo de execucao e custo estimado por skill no pipeline. Gera relatorio de custo ao final da sessao.
  Trigger em: "custo", "cost", "quanto gastou", "token usage", "consumo", "budget", "relatorio de custo".
argument-hint: "[sessao-id ou --current]"
allowed-tools: Read, Write, Bash
---

# Cost Tracker

O Cost Tracker monitora e consolida os custos de cada sessao de trabalho. Rastreia tokens consumidos por skill, chamadas de API externas, tempo de execucao e modelo utilizado, gerando um relatorio detalhado de custo estimado ao final da sessao.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/handoffs.md` e `policies/evals.md`.

## Quando Usar

- ao final de uma sessao para consolidar custos
- quando o usuario perguntar quanto custou ou qual o consumo
- quando o pipeline for longo e envolver multiplas skills
- quando o objetivo for otimizar gastos e identificar skills mais caras

## Quando Nao Usar

- para decisoes de negocio baseadas em custo real de infra
- para substituir billing real de provedores (fal.ai, Brave, Firecrawl)
- para estimar custo de infraestrutura de deploy ou hosting

## Entradas Esperadas

- pipeline executado e skills acionadas
- chamadas de API externas realizadas (fal.ai, Brave, Firecrawl)
- metadata de respostas LLM (tokens de entrada/saida)

## Saidas Esperadas

- relatorio em `docs/cost-reports/session-YYYY-MM-DD.md`
- resumo de custo por skill
- total estimado da sessao

## Responsabilidades

1. Rastrear tokens consumidos por skill durante o pipeline
2. Contabilizar chamadas de API externa (fal.ai, Brave Search, Firecrawl)
3. Calcular custo estimado com base no modelo usado e volume de tokens
4. Gerar relatorio estruturado de custo da sessao
5. Persistir historico de custos para comparacao entre sessoes

## Metricas Rastreadas

| Metrica | Fonte | Exemplo |
|---|---|---|
| Tokens consumidos | LLM response metadata | 12.400 input / 3.200 output |
| Chamadas API fal.ai | Contagem por tool call | 3 chamadas (image gen) |
| Chamadas API Brave | Contagem por tool call | 5 chamadas (search) |
| Chamadas API Firecrawl | Contagem por tool call | 2 chamadas (scrape) |
| Tempo de execucao | Timestamps inicio/fim | 14min 32s |
| Modelo usado | LLM Selector output | claude-sonnet-4-20250514 |

## Formato do Relatorio

```markdown
# Relatorio de Custo — Sessao YYYY-MM-DD

## Pipeline Executado
[nome do pipeline ou descricao]

## Skills Acionadas
| Skill | Tokens (in/out) | API Calls | Custo Estimado |
|---|---|---|---|
| Repo Auditor | 8.000 / 2.100 | 0 | $0.03 |
| Frontend Integration | 15.000 / 5.200 | 2 fal.ai | $0.12 |

## Chamadas de API Externa
| Provedor | Quantidade | Custo Estimado |
|---|---|---|
| fal.ai | 2 | $0.08 |
| Brave Search | 5 | $0.01 |

## Resumo
- **Total de tokens**: 45.600 input / 14.300 output
- **Total de chamadas API**: 7
- **Custo total estimado**: $0.25
- **Duracao da sessao**: 14min 32s
```

## Integracao com Outras Skills

- **Orchestrator (09)**: aciona o Cost Tracker ao final do pipeline para gerar relatorio
- **LLM Selector (16)**: fornece o nivel de modelo usado, impactando o calculo de custo
- **Todas as skills**: reportam consumo de tokens e chamadas no handoff

## Evidencia de Conclusao

- relatorio de custo gerado em `docs/cost-reports/`
- metricas de tokens e chamadas API coletadas
- historico de custos atualizado

## Handoff

Entregar:

- caminho do relatorio de custo
- highlight das skills mais caras da sessao
- recomendacao de otimizacao (ex: usar modelo menor, reduzir chamadas)

Seguir `policies/handoffs.md`.

## Codigo Limpo

Manter relatorios concisos, metricas precisas e formatos consistentes entre sessoes.
