# Cost Tracker — Guia Estendido

![Skill](https://img.shields.io/badge/skill-30-blue)
![Role](https://img.shields.io/badge/role-cost--tracker-10b981)

Guia auxiliar da skill `30-cost-tracker` para calculo de custo por modelo, exemplos de relatorio e alertas.

## Quando abrir este guia

- quando o relatorio de custo precisa de calculo mais granular por modelo
- quando a sessao envolveu muitas chamadas de API externas (fal.ai, Brave, Firecrawl)
- quando o usuario quer entender por que o custo foi alto em determinada sessao

## Tabela de Custo por Modelo (referencia)

Precos em USD por 1M tokens (input / output). Atualizar conforme pricing oficial:

| Modelo | Input | Output | Uso recomendado |
|--------|-------|--------|-----------------|
| claude-haiku-4-5 | ~$0.80 | ~$4.00 | boilerplate, rename, microcopy |
| claude-sonnet-4-6 | ~$3.00 | ~$15.00 | implementacao, debug, testes |
| claude-opus-4-6 | ~$15.00 | ~$75.00 | arquitetura, segurança, decisoes complexas |

## Custo de APIs Externas

| Servico | Modelo de Preco | Nota |
|---------|-----------------|------|
| fal.ai (flux-pro) | ~$0.05/imagem | varia por resolucao e modelo |
| Brave Search | ~$0.003/query | plano pay-as-you-go |
| Firecrawl | ~$0.002/page | plano basico |

## Formato do Relatorio

```
## Relatorio de Custo — Sessao [data]

### Resumo
- Duracao: Xh Ym
- Modelo principal: claude-opus-4-6
- Total estimado: ~$X.XX

### Por Skill
| Skill | Tokens In | Tokens Out | Custo Est. |
|-------|-----------|------------|------------|
| Repo Auditor | 12k | 3k | ~$0.05 |
| Backend | 45k | 18k | ~$0.15 |
| QA | 8k | 2k | ~$0.03 |

### APIs Externas
| Servico | Chamadas | Custo Est. |
|---------|----------|------------|
| fal.ai | 4 imagens | ~$0.20 |

### Total: ~$X.XX

### Alertas
- [ ] contexto > 100k tokens sem /compact
- [ ] mais de 3 subagents simultaneos
- [ ] retry loop detectado
```

## Sinais de Custo Alto

Se o relatorio mostrar custo muito acima do esperado:
1. verificar se Opus foi usado em tasks que Sonnet resolve
2. verificar se o contexto cresceu sem /compact
3. verificar se houve geracao de imagem sem briefing (gera lixo e regera)
4. verificar se subagents foram disparados em paralelo desnecessariamente

## Integracao com MCP

O MCP `devkit_track_cost` persiste os dados de custo por sessao. Para acumular historico:
- chamar ao final de cada skill relevante
- usar `devkit_session_summary` para consolidar o relatorio final

## Sinais locais que entram na estimativa

- `read_count` e `search_count` para medir exploracao bruta
- `write_count` para medir volume de alteracao
- `bytes_read` para penalizar leitura recorrente de arquivos grandes
- `large_read_count` para destacar leitura pesada
- `repeated_signals` para detectar loops de exploracao

Esses sinais nao substituem telemetria real do modelo, mas melhoram bastante a estimativa operacional de desperdicio.
