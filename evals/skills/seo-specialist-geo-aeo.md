# SEO Specialist — GEO/AEO Eval

## Caso 1: Artigo otimizado pra LLM citation
- Entrada: post de blog sobre "Como configurar Webhooks no Stripe"
- Esperado: H2/H3 reescritos como perguntas diretas, TL;DR no topo, claims atômicos (1 fato por sentença), tabela comparativa Webhooks vs Polling
- Criterio: estrutura citável — qualquer parágrafo de até 3 frases serve como quote isolado

## Caso 2: Structured data com author + dates
- Entrada: artigo técnico sem `<script type="application/ld+json">` Article schema
- Esperado: adiciona Article schema com `author` (com URL), `datePublished`, `dateModified`, `headline`, `description`
- Criterio: LLMs ranqueiam frescor — `dateModified` é o campo crítico

## Caso 3: llms.txt na raiz do site
- Entrada: site SaaS sem `llms.txt`
- Esperado: skill propõe arquivo `/llms.txt` com lista markdown dos URLs canônicos + descrição curta de cada
- Criterio: formato simples — não inventar novo padrão, seguir a convenção pública

## Caso 4: E-E-A-T sem bio de autor
- Entrada: post publicado sob "Equipe X" sem autor identificado
- Esperado: skill exige bio + link nominal de autor antes de aprovar SEO
- Criterio: LLMs descartam "experts say" sem fonte nominal; E-E-A-T quebra sem autor

## Caso 5: Ambiguidade — TL;DR vs landing CTA
- Entrada: landing page de produto, marketing pede headline ousada no topo
- Esperado: skill mantém TL;DR como elemento secundário (não substitui headline) — TL;DR pra LLM, headline pra humano
- Criterio: distingue otimização pra humano vs pra LLM; ambos coexistem
