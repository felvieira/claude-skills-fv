# Deep Interview — Template

Use quando ambiguity score > 0.7 ou quando o briefing precisar de mais contexto antes de montar pipeline.

## Formula de Ambiguidade

```
ambiguity = 1 - (goal * 0.40 + constraints * 0.30 + criteria * 0.30)
```

**Variante Brownfield** (projeto existente):
```
ambiguity = 1 - (goal * 0.30 + constraints * 0.25 + criteria * 0.25 + context_clarity * 0.20)
```

## Score por Dimensao (0-1)

| Dimensao | Score 0 (vago) | Score 1 (concreto) |
|----------|----------------|---------------------|
| `goal` | "melhorar o app" | "adicionar filtro de preco na listagem de produtos" |
| `constraints` | nenhuma restricao | "max 500ms, sem breaking change na API v2" |
| `criteria` | "que funcione bem" | "filtro retorna em <500ms e persiste na URL" |
| `context_clarity` | sem referencia a codigo | file paths, componentes, endpoints mencionados |

## Thresholds

| Score | Acao |
|-------|------|
| < 0.4 | Prosseguir — briefing claro |
| 0.4–0.7 | Enrich Mode — inferir do contexto e confirmar |
| > 0.7 | Guided Enrich — uma pergunta focada com opcoes |

## Estrutura de Rodada

```
Rodada [N]/5:

Pergunta: [pergunta focada com 3 opcoes de resposta]
Ontologia atual: { entidades: [...], campos: [...], relacionamentos: [...] }
Stability ratio: [0-1]
Score pos-rodada: [recalcular]
```

## Protocolo de Entrevista

1. Calcular score inicial antes de comecar
2. Fazer UMA pergunta por rodada — preferencialmente multipla escolha
3. Apos cada resposta: extrair ontologia e calcular stability ratio
4. Stability ratio = overlap de entidades entre rodada N e N-1
5. Se stability > 0.8 por 2 rodadas consecutivas → ontologia estavel, parar
6. Se score < 0.4 em qualquer rodada → parar, briefing suficiente
7. Apos 5 rodadas sem estabilidade → avisar que escopo precisa de mais trabalho

## Exemplo de Rodada

```
Rodada 1/5:
Score inicial: 0.72 (goal: 0.3, constraints: 0.0, criteria: 0.0)

Pergunta: "O filtro de preco e para qual contexto?"
  A) Listagem de produtos do e-commerce (lado publico)
  B) Dashboard admin de gestao de preco (lado interno)
  C) Outro — descreva

[usuario responde A]

Ontologia: { entidades: [Produto, Filtro, Listagem], campos: [preco_min, preco_max], relacionamentos: [Listagem usa Filtro] }
Stability ratio: N/A (primeira rodada)
Score pos-rodada: 0.55 (goal: 0.7, constraints: 0.0, criteria: 0.2)
```

## Handoff apos Entrevista

Ao concluir, entregar para Orchestrator:
- score final
- briefing enriquecido com tudo que foi inferido + confirmado
- ontologia final (entidades e relacionamentos chave)
- constraints e criterios capturados
