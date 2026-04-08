# Design Intelligence — Guia Estendido

![Skill](https://img.shields.io/badge/skill-29-blue)
![Role](https://img.shields.io/badge/role-design--intelligence-7c3aed)

Guia auxiliar da skill `29-design-intelligence` para configuracao de ferramentas, boas praticas de pesquisa competitiva e exemplos de uso.

## Quando abrir este guia

- quando precisar configurar Brave Search, Firecrawl ou Playwright para a skill
- quando a pesquisa competitiva envolver nichos complexos ou muitos concorrentes
- quando precisar de exemplos de prompts para analise visual ou geracao de moodboard

## Stack de Ferramentas — Configuracao

### Brave Search (default para busca)

Usado para encontrar concorrentes e referencias. Funciona via WebSearch nativo do ambiente.

Queries recomendadas por fase:
- Concorrentes diretos: `"[nicho] app" OR "[nicho] platform" site:producthunt.com OR site:g2.com`
- Referencias Awwwards: `"[nicho]" site:awwwards.com`
- Referencias Dribbble: `"[nicho] landing page" OR "[nicho] dashboard" site:dribbble.com`
- Referencias Behance: `"[nicho] UI" OR "[nicho] web design" site:behance.net`
- Tendencias: `"[nicho] design trends 2025 2026"`

### Playwright MCP (default para captura)

Usado para navegar, tirar screenshots e extrair imagens.

Fluxo padrao:
1. `browser_navigate` para a URL do concorrente
2. `browser_take_screenshot` com `fullPage: true` para screenshot completo
3. `browser_snapshot` para extrair estrutura de acessibilidade (layout, hierarquia)
4. `browser_evaluate` para extrair URLs de imagens:
   ```javascript
   () => {
     return Array.from(document.querySelectorAll('img[src]'))
       .map(img => ({ src: img.src, alt: img.alt, width: img.width, height: img.height }))
       .filter(img => img.width > 200 && img.height > 200);
   }
   ```
5. Baixar imagens relevantes (heros, cards, CTAs) para `docs/design-intelligence/references/`

### Firecrawl (opcional)

Se disponivel no ambiente, preferir para scraping de conteudo textual. Retorna markdown limpo com imagens inline.

Vantagens sobre Playwright para scraping de texto:
- Mais rapido
- Sem problemas de rendering JS
- Retorna estrutura limpa

### Model Routing

Delegar sempre a escolha do modelo multimodal. Niveis tipicos:
- Analise de 1-3 screenshots: Balanced
- Analise de 5+ screenshots com comparacao cruzada: Deep
- Verificacao rapida de paleta: Fast

### Image Generator (skill 17)

Para moodboards, montar briefing com esta estrutura:

```
Tipo: t2i
Funcao: moodboard para [nicho]
Paleta: [cores extraidas da analise]
Estilo: [descricao do mood — ex: "dark elegante com acentos neon"]
Tipografia: [direcao — ex: "sans-serif pesada, geometrica"]
Composicao: [direcao — ex: "hero section com CTA centralizado, gradiente sutil"]
Referencia: [screenshots mais relevantes da analise]
Evitar: [elementos cliche do nicho identificados na analise]
```

## Prompt de Analise Visual

Prompt padrao para enviar junto com screenshots ao modelo multimodal:

```
Analise estes screenshots de concorrentes do nicho [NICHO]. Para cada um, extraia:

1. PALETA: cores dominantes (primaria, secundaria, acento, background, texto) com hex aproximado
2. TIPOGRAFIA: familia tipografica (serif/sans/mono), peso visual, hierarquia (H1/H2/body/caption)
3. LAYOUT: estrutura de secoes (hero, features, social proof, CTA, footer), grid, espacamento
4. CTAs: texto dos botoes, posicionamento, contraste, urgencia/escassez
5. PADROES DE CONVERSAO: social proof, depoimentos, numeros, garantias, ancoragem de preco
6. MOOD: tom visual geral (corporativo, jovem, luxo, tech, organico)

Depois compare todos e identifique:
- Padroes comuns do nicho (o que todos fazem)
- Diferenciais (o que so um faz)
- Oportunidades (o que ninguem faz e poderia funcionar)

Retorne em formato Markdown estruturado.
```

## Exemplos de Uso

### Exemplo 1: Landing page de app fitness

```
Input: "landing page de app fitness com IA focado em hipertrofia"

Fase 1 - Discovery:
- Brave Search: "fitness AI app hypertrophy" → encontra Fitbod, Dr. Muscle, Juggernaut AI
- Brave Search: "fitness app landing page" site:awwwards.com → 3 referencias
- Playwright: screenshots de cada + extracao de hero images

Fase 2 - Analise:
- Model Routing: Balanced (5 screenshots)
- Resultado: "paletas escuras com acentos neon, tipografia sans bold, hero com mockup de celular, CTA 'Start Free Trial'"

Fase 3 - Estrategia:
- Copiar: paleta escura (padrao do nicho), mockup de app no hero
- Evitar: stock photos genericas de academia (cliche)
- Diferenciar: usar visualizacao de dados de treino como hero ao inves de foto

Fase 4 - Moodboard:
- Skill 17 gera 2 composicoes: dark + neon, dark + warm orange

Fase 5 - Dossie:
- Consolidado com tokens, direcao, moodboards
- Handoff para UI/UX
```

### Exemplo 2: Melhoria de dashboard SaaS existente

```
Input: "melhorar a interface do nosso dashboard de analytics"

Nota: pula o PO, vai direto pra Design Intelligence

Fase 1 - Discovery:
- Asset Librarian (19): projeto ja tem paleta azul/cinza, tipografia Inter
- Brave Search: "analytics dashboard SaaS" → encontra Mixpanel, Amplitude, PostHog
- Playwright: screenshots dos 3 dashboards

Fase 2 - Analise:
- Foco em: data visualization, sidebar navigation, filtros, empty states
- Resultado: "dashboards modernos usam sidebar colapsavel, cards com sparklines, filtros inline"

Fase 3 - Estrategia:
- Copiar: sidebar colapsavel, sparklines em cards
- Evitar: excesso de graficos na mesma tela
- Diferenciar: empty states com ilustracao e sugestao de acao
- Manter: paleta azul/cinza existente (identidade do projeto)

Fase 4 - Moodboard:
- Skill 17 gera composicao respeitando paleta existente

Fase 5 - Dossie:
- Handoff para UI/UX com foco em melhorias incrementais
```

## Boas Praticas

- Sempre consultar Asset Librarian (19) primeiro para nao ignorar identidade visual existente
- Limitar a 5 concorrentes para nao estourar contexto
- Priorizar screenshots de paginas equivalentes ao que sera construido (nao o site inteiro)
- No briefing do moodboard, ser especifico sobre o que evitar (cliches do nicho)
- Se o projeto ja tem branding forte, o moodboard deve respeitar — diferenciar sem destoar

## Uso

- preferir o core curto da skill para execucao padrao
- abrir este guia apenas para configuracao de ferramentas ou nichos complexos
