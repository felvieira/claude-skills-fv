# Keyword Research — Ferramentas, KEI e Templates

Destilado de "SEO Prático" (Adriano Almeida, Casa do Código), cap. 4 e 12. Abrir ao executar um keyword research de fato.

## Ferramentas

| Ferramenta | Pra quê | Nota do livro |
|-----------|---------|--------------|
| Google Trends | Tendência de demanda no tempo + comparar termos | Cuidado com localização (default é mundo todo); sugere termos relacionados no fim da tela |
| keywordtool.io | Expandir variações via Google Autocomplete | Usabilidade superior ao Keyword Planner; botão `+` acumula e `Copy` joga pro Excel |
| Google Keyword Planner | Volume de busca mensal (input do KEI) | Gratuito; associado ao Adwords incomoda alguns SEOs |
| Ubersuggest | Igual ao keywordtool (precursor) | Usabilidade pior |
| SEMRush, Open Site Explorer, SEOQuake | Análise de concorrente / autoridade de domínio | cap. 12 |

## KEI — Keyword Effectiveness Index (passo a passo)

```
KEI = (buscas por dia) ^ 2 / número de resultados
```

- **buscas por dia** = volume mensal (Keyword Planner) ÷ 30
- **número de resultados** = total do Google para a busca exata (entre aspas)
- **quanto maior o KEI, melhor** (mais demanda relativa à concorrência)

Exemplo do livro (3 candidatos):

| Termo | Buscas/mês | Buscas/dia | Resultados | KEI |
|-------|-----------|-----------|-----------|-----|
| chef em casa | 720 | 24 | 1.500.000 | (24²)/1.5M = **0,000384** |
| chef a domicílio | ~ | ~ | ~ | **0,000342** |
| personal chef | ~ | ~ | muitos | **0,00003** (ruim) |

"personal chef" tem KEI péssimo porque "personal" colide com personal trainer/stylist e outros idiomas — o número de resultados infla e derruba o índice. Lição: termo ambíguo distorce o KEI; valide a ambiguidade antes de confiar no número.

## Template completo da tabela de keywords

| Keyword | Intent | Balde (conteúdo/negócio) | Volume/mês | Dificuldade | KEI | Prioridade | Página-destino |
|---------|--------|--------------------------|-----------|-------------|-----|-----------|----------------|
| | informacional / transacional / navegacional | | | baixa/média/alta | | P0/P1/P2 | URL ou "blog" |

- **Intent** direciona o tipo de página e o tom do Copy.
- **Balde** separa pauta de conteúdo (blog, tráfego amplo) de página de venda (transacional).
- **Página-destino** evita canibalização (duas páginas competindo pela mesma keyword).

## Domínio e keyword (cap. 4.7-4.8)

- Peso **leve** de keyword no domínio — não force domínio feio só pra encaixar keyword.
- **ccTLD** (`.com.br`, `.io`, `.co`) sinaliza relevância geográfica. Só use `.com.br` se o apelo for local; produto global perde alcance com ccTLD nacional.
- Decisão de domínio sai do keyword research mas é tangente — registrar como recomendação, não como entregável obrigatório.
