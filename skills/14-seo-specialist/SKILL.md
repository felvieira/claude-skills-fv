---
name: seo-specialist
description: |
  Especialista SEO agnóstico: auditoria técnica e on-page, metadados, indexação, sitemap,
  dados estruturados, Core Web Vitals (LCP, INP, CLS), pesquisa de palavras-chave,
  links, SEO local, produtos, hreflang e GEO/AEO. No Claude Code, pode encaminhar
  auditorias amplas ao plugin oficial claude-seo quando instalado sob demanda.
  Trigger em: "SEO", "auditoria SEO", "meta tags", "Open Graph metadata", "sitemap",
  "schema markup", "Core Web Vitals", "performance", "LCP", "INP", "CLS", "ranking",
  "canonical", "robots.txt", "GEO", "AEO", "Answer Engine", "LLM citation",
  "AI Overview", "llms.txt", "keyword research", "pesquisa de palavra-chave",
  "palavra-chave", "keyword", "cauda longa", "long tail", "search intent",
  "volume de busca", "KEI", "link building", "backlink", "off-page",
  "guest posting", "autoridade de domínio", "anchor text", "nofollow",
  "SEO local", "Google Business Profile", "Merchant Center", "hreflang",
  "SEO ecommerce", "SEO drift", "SEO agentic", "Google-Extended", "FAQPage".
---

# SEO Specialist - Otimização para Motores de Busca

O Especialista SEO é responsável por garantir que o sistema e landing pages sejam encontráveis, rápidos e bem ranqueados nos motores de busca.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`, `policies/evals.md`, `policies/tool-safety.md` e `policies/anti-ai-writing.md`.

**Gate:** conteúdo publicado (artigos, meta descriptions, headings) deve passar pelos 29 padrões de `policies/anti-ai-writing.md` antes de finalizar. Priorizar clareza, fontes e autoria verificáveis; não prometer efeito direto sobre ranking.

Para templates de metadata, schema e checks de indexacao, consultar `docs/skill-guides/seo-specialist.md` apenas quando necessario.

## Auditoria completa com claude-seo (opcional)

Esta skill continua útil em Claude, Codex, Grok e outros clientes, sem plugin externo. **Apenas no Claude Code e quando o plugin oficial estiver instalado**, para crawling/auditoria multietapa, Google APIs, mapas, ecommerce, hreflang, drift ou agent-readiness, usar `/seo audit <url>` ou o subcomando documentado do plugin `AgriciDaniel/claude-seo` em vez de simular ferramentas indisponíveis. Não inventar flags (`/seo audit --report pdf` não é comando documentado) nem subcomandos (`/seo onpage` não existe). O plugin não é instalado pelo kit nem carregado em todos os projetos.

Antes de qualquer varredura, delimitar domínio, permissão, volume e dados acessíveis. Se `/seo` não existir na sessão, avaliar apenas arquivos/páginas efetivamente acessíveis com esta skill e indicar que cobertura de site, GSC, métricas reais e relatório PDF não foram realizados. Consulta `site:` não prova o inventário indexado. Não instalar dependências nem cadastrar APIs silenciosamente. Procedimento de instalação, diagnóstico, limites e atribuição: [references/claude-seo.md](references/claude-seo.md), consultar **só** para fluxo de auditoria externa ou pedido de instalação.

## Quando Usar

- otimizar indexacao, metadata, performance e semantica
- revisar landing pages ou paginas publicas com objetivo de descoberta

## Quando Nao Usar

- para areas autenticadas sem indexacao
- para substituir Copy, Frontend ou Security como papel principal

## Entradas Esperadas

- copy e estrutura da pagina
- contexto tecnico de performance e rendering
- objetivos de descoberta e palavras-chave

## Saidas Esperadas

- recomendacoes de SEO tecnico e on-page
- metadata e requisitos de performance claros
- handoff claro para Frontend/Reviewer

## Responsabilidades

1. Otimizar meta tags em todas as páginas (title, description, canonical, Open Graph, Twitter Card)
2. Implementar schema markup (JSON-LD) para dados estruturados
3. Medir Core Web Vitals (LCP, INP, CLS) e diagnosticar TTFB separadamente
4. Configurar sitemap.xml e robots.txt
5. Otimizar imagens e fontes para performance máxima
6. Garantir acessibilidade (impacta diretamente o SEO)
7. Assegurar HTML semântico em toda a aplicação
8. Conduzir keyword research e entregar a lista de keywords priorizada ANTES do Copy escrever
9. Definir o brief técnico de link building (off-page) — execução fica com Marketing/Conteúdo

## Keyword Research

A pesquisa de palavra-chave é o passo 0 de qualquer projeto de SEO: descobrir como o usuário vai procurar pelo produto/serviço antes de escrever uma linha de conteúdo ou definir uma URL. Fonte: "SEO Prático" (Adriano Almeida, Casa do Código), cap. 4.

O output desta etapa é uma **tabela de keywords decididas** que alimenta o resto do pipeline: Copy (13/50) usa pra escrever, Frontend (04) usa pra URL/headings, e a própria 14 usa pra meta tags. SEO fornece as keywords; não inventa o produto.

### Workflow de descoberta

1. **Brainstorm bruto.** Antes de ferramenta nenhuma, liste no papel como *você* acha que as pessoas buscariam. O livro chega a ~30 termos em 5 min pro caso "risoto" (`como fazer risoto`, `receitas de arroz gourmet`...). Peça a um amigo imparcial pra fazer o mesmo — quem está "atrás do balcão" tem visão enviesada de como o cliente pensa.
2. **Entenda a cabeça do usuário (intent).** A busca "perfeita" raramente é a que o usuário digita. Quem procura "risoto" pode procurar "arroz cremoso". Mapeie variações que vão *além* da descrição literal do produto.
3. **Pesquise no próprio buscador (análise de concorrente).** Busque cada termo no Google. Repare em: quais sites grandes ocupam o topo, quantos resultados são blogs (sinal de que dá pra entrar), adjetivos recorrentes nos títulos (são keywords que você não tinha mapeado), e se a keyword aparece na URL dos rankeados.
4. **Explore a cauda longa.** Termos genéricos ("carne") têm mais busca, mas concorrência feroz **e** intent difuso. Termos cauda longa ("quais os cortes de carne mais macios") têm menos busca mas **conversão muito maior** porque casam com intent específico.
5. **Expanda com ferramentas.** Use as ferramentas pra achar variações que nem um especialista lembraria (tabela em `references/keyword-research.md`).
6. **Agrupe em dois baldes: conteúdo vs. negócio/venda.** Keywords de conteúdo → pauta de blog pra atrair tráfego amplo. Keywords de negócio/venda → a página de venda do serviço, descrita como as pessoas realmente buscam.
7. **Priorize por volume × dificuldade (KEI).** Quando o conhecimento de negócio não basta, use o **KEI (Keyword Effectiveness Index)** — balanço entre volume e competitividade:
   ```
   KEI = (buscas por dia) ^ 2 / número de resultados
   ```
   Ex. ("chef em casa": 720 buscas/mês, 1,5M resultados): `KEI = (720/30)^2 / 1.500.000 = 0,000384`. **Quanto maior o KEI, melhor.** Volume vem do Google Keyword Planner; nº de resultados vem do total do Google pra busca exata. Cuidado com termos ambíguos ("personal" colide com personal trainer/stylist, inflando resultados).

> Detalhe denso (ferramentas, exemplo KEI completo, template de tabela) em `references/keyword-research.md` — abrir só ao executar um keyword research de fato.

### Fan-out query mapper (cobertura de sub-perguntas)

Antes de fechar a lista de keywords de uma página/pauta, decomponha a keyword principal nas sub-perguntas que um usuário — ou um LLM respondendo por fan-out de busca — precisaria resolver pra considerar o tópico coberto. Ex.: "como fazer risoto" decompõe em "qual arroz usar", "precisa de vinho branco", "como não empapar", "tempo de preparo", "dá pra congelar". Compare a lista de sub-perguntas contra o conteúdo já publicado (próprio e do concorrente que ranqueia): toda sub-pergunta sem página/seção que responda é um buraco de cobertura — vira pauta nova ou seção a adicionar na página existente, priorizado como qualquer outra keyword da tabela (passo 7).

### Como documentar as keywords decididas

| Keyword | Intent | Balde | Volume/mês | Dificuldade | KEI | Prioridade |
|---------|--------|-------|-----------|-------------|-----|-----------|
| chef a domicílio sp | transacional | negócio | 480 | média | 0,000342 | P0 |
| como fazer risoto | informacional | conteúdo | alto | alta | — | P1 (blog) |

A coluna **Intent** classifica: `informacional` (tutorial, "como"), `transacional` (compra/contratação), `navegacional` (marca). Isso direciona o tipo de página e o tom do Copy.

### Nota sobre repetição de keyword

Keyword research decide os termos; não autoriza repetição artificial. Escreva para a intenção de busca e revise legibilidade. Não há número universal de ocorrências nem densidade que garanta ranking; evitar keyword stuffing.

### Handoff de Keyword Research

- **→ Copy (13/50):** recebe a tabela de keywords (intent + balde) ANTES de escrever.
- **→ Frontend (04):** keyword principal vai pra URL (slug) e pra `<h1>`/headings. A 14 só especifica *qual* termo.
- **→ PO (01):** se o research revelar demanda por algo fora do escopo do produto, é **decisão de negócio/roadmap** — devolver pro PO. SEO mapeia a demanda, PO decide se persegue.

## Off-Page / Link Building

On-page não é tudo. O peso que outros sites dão ao seu — via links — é fator central de ranking (PageRank). Fonte: "SEO Prático", cap. 9-10.

**Fronteira de papel:** boa parte de link building é execução de **Marketing/Conteúdo** (escrever guest post, fechar parceria). O papel da 14 aqui é o **brief técnico**: estratégia de aquisição, critérios de qualidade, anchor text correto, uso de `nofollow`, e validar que os links no código estão saudáveis. A 14 **não** sai negociando backlink — especifica o que um bom backlink precisa ter.

### Princípio: qualidade > quantidade, relevância contextual

Volume de links não importa — relevância importa. O link tem que vir de quem é **autoridade no seu assunto**. Um site de culinária linkado por veículo de fitness no contexto certo ganha boost; linkado por um banco, quase nada. Comprar links de diretórios sem conteúdo é o que o Penguin (2012) pune.

Critérios que os buscadores avaliam (vão no brief):
- A página que linka tem relevância maior que a minha?
- Vários domínios *diferentes* linkam (mais valioso que o mesmo site de novo)?
- Os conteúdos das duas páginas têm relação temática?
- Qual o anchor text e a posição do link (conteúdo > rodapé/sidebar)?

### Anchor text e posicionamento (brief técnico — responsabilidade da 14)

- **Anchor natural, nunca "clique aqui".** O texto do link deve ser a keyword no contexto.
- **Diversifique o anchor.** Repetição idêntica em massa parece artificial.
- **Posição importa.** Link no começo/centro do conteúdo > rodapé/sidebar.
- **`rel="nofollow"` onde não há controle.** Comentários, UGC, links não-endossados não passam autoridade. Redes sociais marcam links como `nofollow` — curtidas/seguidores **não** entram no ranking, embora valham como canal que *gera* links naturais depois.
- **Links internos contam.** Mesmas regras (natural, bem descrito).

### Estratégias de aquisição natural (execução de Marketing/Conteúdo)

A 14 documenta *que* se aplicam e *qual* o brief; quem escreve/negocia é Marketing:
1. **Marketing de conteúdo** — conteúdo original/relevante que atrai links sozinho (brief = keywords de conteúdo + critério; execução = Copy 13/50).
2. **Guest blogging** — escrever pra site terceiro relevante com link de volta.
3. **Comentários e fórum marketing** — participar de comunidades do nicho agregando valor.
4. **Troca de links, parcerias e promoções** — patrocínio/brinde em troca de link (decisão de orçamento = PO 01).
5. **Press releases** — matéria via RP pra emplacar em portal (decisão de negócio = PO 01).

### Checklist de Link Building (brief técnico)

- [ ] Estratégia de aquisição definida e atribuída (dono: Marketing vs. PO)
- [ ] Critério de qualidade do backlink documentado (domínio relevante, autoridade > a nossa)
- [ ] Meta de diversidade de domínios referenciadores
- [ ] Anchor text natural e variado, keyword no contexto — nunca "clique aqui"
- [ ] Links de autoridade no conteúdo principal (não rodapé/sidebar)
- [ ] `rel="nofollow"` em comentários, UGC e links não-endossados
- [ ] Links internos descritivos e sem quebra (404 interno derruba ranking)
- [ ] Conteúdo original (Penguin penaliza duplicação e diretórios de link)

### Handoff de Off-Page

- **→ Marketing Copy (13/50):** executa guest posts, marketing de conteúdo, outreach.
- **→ PO (01):** decisões de orçamento (PR pago, patrocínio, agência) e priorização de parcerias.
- **→ Frontend (04):** implementa anchor text, posicionamento, `nofollow`.

## Meta Tags - Template Padrão

**src/app/layout.tsx**

```typescript
import type { Metadata } from 'next';

export function generateMetadata({
  title,
  description,
  url,
  image,
}: {
  title: string;
  description: string;
  url: string;
  image?: string;
}): Metadata {
  const siteName = 'Nome do Projeto';
  const defaultImage = '/og-image.png';

  return {
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName,
      images: [
        {
          url: image || defaultImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image || defaultImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}
```

## Schema Markup - JSON-LD

**src/components/seo/WebsiteSchema.tsx**

```typescript
export function WebsiteSchema({ url, name }: { url: string; name: string }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

**src/components/seo/OrganizationSchema.tsx**

```typescript
export function OrganizationSchema({
  name,
  url,
  logo,
  sameAs,
}: {
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Portuguese'],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

**FAQPage:** adicionar apenas quando descreve FAQs reais e elegíveis no HTML, sem prometer rich result no Google nem vantagem comprovada em citações de IA. O Google encerrou rich results de FAQ para todos os sites em maio de 2026. Se o usuário quiser apenas perguntas e respostas visíveis, não introduzir schema por padrão. Ver [atualizações da Busca](https://developers.google.com/search/updates#faq-deprecation).

## Core Web Vitals — métricas atuais

| Métrica | Limiar bom (75º percentil de campo) | Observação |
|---|---|---|
| LCP | ≤ 2,5 s | carregamento do maior elemento visível |
| INP | ≤ 200 ms | responsividade; substituiu FID em março de 2024 |
| CLS | ≤ 0,1 | estabilidade visual |

TTFB ajuda a diagnosticar atrasos do servidor; **não** é Core Web Vital. Priorizar dados de campo quando disponíveis; Lighthouse e PageSpeed em laboratório ajudam no diagnóstico, não substituem evidência de usuários reais. Se uma métrica estiver ruim, identificar a causa, corrigir e medir novamente; não assumir que uma execução isolada representa o site todo.

## Otimizações Obrigatórias

### next.config.js

**next.config.js**

```javascript
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
  compress: true,
  poweredByHeader: false,
};

module.exports = nextConfig;
```

### Imagens

Regras inegociáveis:

- **Sempre** usar `next/image` — nunca `<img>` nativo
- Prioridade de formato: AVIF > WebP > PNG
- **Alt text** obrigatório em TODAS as imagens — sem exceção
- Dimensões explícitas (`width` e `height`) em todas as imagens
- `priority` para imagens hero (above the fold)

**src/components/ui/OptimizedImage.tsx**

```typescript
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
}: OptimizedImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      loading={priority ? 'eager' : 'lazy'}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className={className}
    />
  );
}
```

### Fontes

- **Sempre** usar `next/font` (self-hosted, zero CLS)
- `font-display: swap` obrigatório

**src/app/layout.tsx**

```typescript
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

### Lazy Loading e Performance

- Dynamic imports para tudo abaixo do fold
- `loading="lazy"` em imagens e iframes fora da viewport
- Defer em scripts de terceiros

**src/app/page.tsx**

```typescript
import dynamic from 'next/dynamic';

const FAQ = dynamic(() => import('@/components/sections/FAQ'));
const Testimonials = dynamic(() => import('@/components/sections/Testimonials'));
const Footer = dynamic(() => import('@/components/layout/Footer'));
```

**src/components/ThirdPartyScripts.tsx**

```typescript
import Script from 'next/script';

export function ThirdPartyScripts() {
  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXX');`}
      </Script>
    </>
  );
}
```

## HTML Semântico - Referência

```
Correto                    Errado
──────────────────────────────────────────
<header>                   <div class="header">
<nav>                      <div class="nav">
<main>                     <div class="main">
<section>                  <div class="section">
<article>                  <div class="article">
<aside>                    <div class="sidebar">
<footer>                   <div class="footer">
<h1> a <h6>                <div class="title">
<figure> + <figcaption>    <div class="image-wrapper">
<time datetime="">         <span class="date">
<address>                  <div class="contact">
<mark>                     <span class="highlight">
```

Regras:

- Uma única `<h1>` por página
- Hierarquia de headings sem pular níveis (h1 > h2 > h3)
- `<main>` uma única vez por página
- `<nav>` com `aria-label` quando houver mais de uma navegação

## SEO Checklist

### Técnico

- [ ] Sitemap.xml gerado e enviado ao Google Search Console
- [ ] robots.txt configurado corretamente
- [ ] Tags canonical em todas as páginas
- [ ] HTTPS ativo em todo o site
- [ ] Sem conteúdo duplicado
- [ ] URLs amigáveis (slug legível, sem IDs expostos)
- [ ] Redirects 301 para URLs antigas
- [ ] Página 404 customizada com navegação
- [ ] Carregamento < 3s em conexão 3G

### On-Page

- [ ] H1 única e descritiva em cada página
- [ ] Title tag < 60 caracteres
- [ ] Meta description < 160 caracteres
- [ ] Alt text em todas as imagens
- [ ] Links internos entre páginas relacionadas
- [ ] Breadcrumbs implementados
- [ ] Conteúdo mínimo de 300 palavras por página

### Acessibilidade (Impacta SEO)

- [ ] Contraste mínimo 4.5:1 (WCAG AA)
- [ ] Navegação completa via Tab
- [ ] ARIA labels em elementos interativos
- [ ] Skip to content implementado
- [ ] Labels em todos os campos de formulário
- [ ] Focus visível em todos os elementos interativos

### Performance

- [ ] Core Web Vitals na zona verde
- [ ] Imagens otimizadas (AVIF/WebP via next/image)
- [ ] Fontes com next/font (zero CLS)
- [ ] Bundle splitting (dynamic imports)
- [ ] Preload de recursos críticos
- [ ] CDN configurado para assets estáticos

### GEO/AEO

Ver seção dedicada abaixo. A base para visibilidade nas experiências de IA do Google continua sendo conteúdo útil, indexável e elegível para snippet; schema, `llms.txt` e tamanho de parágrafo não garantem citação.

## GEO/AEO — Otimização para LLMs e Answer Engines

Experiências de busca por IA podem apresentar conteúdo de páginas indexáveis. Não há técnica comprovada de formatação que garanta citação. Partir de conteúdo original, acessível e útil, com evidências e respostas diretas quando fizer sentido para o leitor; verificar resultados em dados de busca quando disponíveis.

### Conteúdo legível

- Atribuir dados e afirmações a fontes verificáveis; usar headings descritivos e respostas claras.
- Usar listas, parágrafos e tabelas quando melhorarem a leitura, não para atingir um tamanho prescrito para LLMs.
- Manter as informações essenciais no HTML renderizado e acessível; conferir indexação e controles de snippet.

### Dados estruturados

Usar tipos suportados pelas diretrizes atuais e que reflitam o conteúdo visível. `Article` pode descrever autoria e datas reais; nunca falsificar frescor. `FAQPage` não gera mais rich results do Google e não tem benefício de citação em IA confirmado; `HowTo` rich results foram removidos em 2023. Não adicionar ambos como tática de GEO. Confirmar elegibilidade na [documentação de dados estruturados do Google](https://developers.google.com/search/docs/appearance/structured-data/search-gallery).

```typescript
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  author: {
    '@type': 'Person',
    name: 'Nome do Autor',
    url: 'https://site.com/sobre/autor',
  },
  datePublished: '2025-01-15',
  dateModified: '2025-03-20',
  publisher: {
    '@type': 'Organization',
    name: 'Nome da Publicação',
    logo: { '@type': 'ImageObject', url: 'https://site.com/logo.png' },
  },
};
```

### Transparência editorial

- Mostrar autoria, datas e fontes primárias quando úteis para o leitor; não afirmar que links externos garantem grounding ou ranqueamento.
- Manter página sobre a organização, contato e processo editorial quando pertinentes ao negócio.
- Usar tabelas e listas para comparações quando melhorarem a leitura, não como requisito de indexação ou citação.

### llms.txt

Arquivo Markdown opcional que pode servir como índice para ferramentas que explicitamente o suportem; não é requisito de indexação, arquivo especial usado pelo Google Search nem alavanca comprovada de AI Overviews. Priorizar sitemap, HTML acessível e controles documentados de crawling/snippet. Só publicar se houver consumidor identificado e manutenção do conteúdo.

**public/llms.txt**

```markdown
# Nome do Site

> Descrição breve em 1-2 linhas do que o site oferece.

## Documentação principal

- [Guia de introdução](https://site.com/docs/intro): visão geral em 5 min
- [API Reference](https://site.com/docs/api): endpoints e schemas
- [Tutoriais](https://site.com/tutoriais): passo a passo por caso de uso

## Conteúdo editorial

- [Blog](https://site.com/blog): artigos técnicos atualizados
- [Changelog](https://site.com/changelog): histórico de releases

## Opcional

- [FAQ](https://site.com/faq): perguntas frequentes
```

`llms-full.txt` também é opcional; conteúdo duplicado pode exigir manutenção adicional. Não afirmar que algum crawler específico usa estes arquivos sem documentação do provedor.

### Crawlers de IA — treino vs. citação

Bloquear ou permitir um crawler de IA no `robots.txt` é decisão de negócio, não só técnica — e o mesmo provedor frequentemente roda dois bots com propósitos opostos. Confundir os dois faz o site ou vazar conteúdo pra treino sem querer, ou sumir de respostas citadas sem querer.

| Provedor | Controle de treinamento/uso | Controle de busca/citação |
|---|---|---|
| OpenAI | `GPTBot` | `OAI-SearchBot` (ver documentação atual) |
| Anthropic | `ClaudeBot` | Consultar a documentação atual de `Claude-SearchBot` / `Claude-User` |
| Perplexity | Consultar documentação atual | `PerplexityBot` |
| Google | `Google-Extended` controla usos de treinamento/grounding de produtos Gemini fora da Busca | Indexação e exibição em AI Overviews/AI Mode dependem do Googlebot e controles normais da Busca; `Google-Extended` não bloqueia Search |

Definir política para cada provedor com base em [crawlers oficiais do Google](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) e regras aplicáveis. Bloqueios de treino não garantem citação; testar efeitos de `robots.txt` sem confundir Google-Extended com Googlebot.

```
# robots.txt — exemplo: permite citação, bloqueia treino
User-agent: GPTBot
Disallow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Claude-SearchBot
Allow: /
```

### Verificação de citabilidade

Não há faixa universal de palavras, posição na página ou schema que garanta citação em respostas geradas. Registrar URL, consulta, data e motor da observação quando comparar presença em respostas; mudanças de conteúdo devem preservar utilidade para pessoas e ser avaliadas por dados observados.

### GEO Checklist

- [ ] Conteúdo original e útil, com resposta clara à intenção de busca.
- [ ] Página relevante indexável e elegível para snippet segundo os controles do provedor.
- [ ] Fontes e autoria verificáveis quando houver afirmações factuais.
- [ ] Dados estruturados representam fielmente o conteúdo visível e um recurso ainda suportado.
- [ ] Métricas e citações reportadas como observadas, não prometidas.
- [ ] Decisão explícita sobre `llms.txt` e crawlers de treino; sem tratá-los como requisitos do Google.

## SEO Local (Google Business Profile)

Aplicável quando o projeto representa um negócio com presença física ou área de atendimento (restaurante, clínica, escritório de advocacia, prestador de serviço local).

### NAP Consistency (Name, Address, Phone)

Comparar nome, endereço público e telefone entre site, perfil e diretórios, quando disponíveis. Negócios de área de serviço podem ocultar endereço; não publicar dado privado para satisfazer schema. Divergências comprovadas devem ser investigadas, sem atribuir peso de ranking sem medição.

Para múltiplas unidades, cada página deve identificar claramente a unidade real e manter informações próprias; se usar `LocalBusiness`, conferir o subtipo e propriedades que correspondem ao estabelecimento. Não inventar coordenadas, estrelas, reviews nem horários. Validar com a [documentação LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business).

### Google Business Profile e avaliações

- Verificar categoria, horário, contato e URL de destino com o responsável pelo negócio; não recomendar uma página aleatória para o GBP.
- Reviews autênticas ajudam pessoas a decidir. Não manipular avaliações nem fazer review gating; setores regulados exigem cuidado com privacidade nas respostas.
- Páginas de cidades só são úteis quando mostram diferenças reais de oferta, equipe, localização ou atendimento; evitar páginas quase idênticas geradas trocando o nome da cidade.

## SEO E-commerce

### Dados estruturados e feed

Representar produto, preço, moeda e disponibilidade reais, mantendo a página, o JSON-LD e o feed sincronizados. `Product` e `Offer` são tipos frequentes para oferta única; `AggregateOffer` pode ser apropriado a múltiplos vendedores/faixas, não é proibido em geral. Reviews e notas precisam refletir avaliações genuínas mostradas na página. Verificar requisitos **por recurso** na [documentação de Product do Google](https://developers.google.com/search/docs/appearance/structured-data/product) e [especificação do Merchant Center](https://support.google.com/merchants/answer/7052112); feed de produtos e markup de busca são contratos distintos.

### Página de produto — checklist

- [ ] Título e descrição únicos que ajudam a escolher o produto, sem contagem mínima arbitrária.
- [ ] Imagens reais com texto alternativo apropriado; conferir qualidade, disponibilidade e política do marketplace.
- [ ] Preço, frete, política de devolução e estoque consistentes com a oferta publicada.
- [ ] Breadcrumbs e links internos que representem categorias reais.

## SEO Internacional (hreflang)

Aplicável a sites com múltiplas versões de idioma/região.

### Sintaxe correta

```html
<link rel="alternate" hreflang="pt-BR" href="https://site.com/pt-br/pagina" />
<link rel="alternate" hreflang="en-US" href="https://site.com/en/pagina" />
<link rel="alternate" hreflang="x-default" href="https://site.com/pagina" />
```

- Usar código de idioma válido e região opcional quando necessária; URL absoluta e indexável.
- Conjuntos alternativos devem ter links de retorno e indicar a própria versão.
- Cada alternativo precisa apontar para a URL canônica do seu próprio idioma; não canonicalizar todas as traduções para uma língua.
- `x-default` é opcional para uma página não específica de idioma/região (por exemplo, seletor); validar segundo a [documentação hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions).

## Quando precisar de imagem (Open Graph card, Twitter card, hero pra blog post)

Não use templates genéricos. **Despache skill 17 (`image-generator`)** pra OG card alinhado ao branding:

```
Tipo: og-card (1200x630) / twitter-card (1200x675)
Texto na imagem: [título do post/página] — tipografia importa
Paleta: [primary], [secondary]
Output path: public/og/ ou public/share/
```

Skill 17 deve usar **`--model gemini-3-pro`** (override do default) quando texto na imagem for crítico — `gemini-3-pro` tem melhor tipografia que `grok-imagine` ($0.15 vs $0.020, mas vale pra OG card que vai pra produção). Para favicon multi-tamanho e PWA icons, despache **skill 36 (Web Asset Generator)** a partir do logo gerado.

## Evidencia de Conclusao

- metadata e semantica definidas
- impacto em Core Web Vitals considerado
- dependencias para frontend e copy explicitadas

## Handoff

### Recebe do Marketing Copy

- Textos das páginas com palavras-chave definidas
- Tom de voz e proposta de valor
- Conteúdo para meta descriptions
- FAQs estruturadas
- SEO fornece lista de keywords ANTES do Copy escrever (fluxo bidirecional)

Meta descriptions: SEO NAO reescreve o copy — apenas otimiza formato, keywords e tamanho. Se o texto precisa mudar substancialmente, devolver pro Copy.

### Entrega para QA

1. Inspecionar metadata, canonical, robots e HTML renderizado das páginas alvo.
2. Validar apenas schemas elegíveis e conteúdo correspondente, sem prometer rich result.
3. Confirmar sitemap.xml e acesso das URLs relevantes.
4. Comparar LCP, INP e CLS de campo se houver dados; indicar ausência de dados quando não houver.
5. Registrar teste de laboratório separadamente e informar escopo da auditoria executada.

## Fontes Externas

- Integração opcional com [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo), versão analisada v2.4.2, licença [MIT](https://github.com/AgriciDaniel/claude-seo/blob/v2.4.2/LICENSE). Comandos, 26 skills e 19 agentes permanecem no plugin oficial, não são copiados para o catálogo do kit. Procedimento em [references/claude-seo.md](references/claude-seo.md).
- Orientação da [Busca com IA do Google](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [crawlers comuns](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) e [atualizações de FAQ](https://developers.google.com/search/updates#faq-deprecation) prevalece sobre heurísticas de GEO sem evidência.

## Regra de Código

Comentarios no codigo so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios. O padrao continua sendo codigo claro com nomes descritivos.
