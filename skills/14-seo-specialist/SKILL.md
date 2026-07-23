---
name: seo-specialist
description: |
  Skill do Especialista SEO para otimização de páginas e sistemas para motores de busca tradicionais e
  também para otimização para ser citado por LLMs (ChatGPT, Claude, Perplexity, Google AI Overviews).
  Use quando precisar otimizar meta tags, Open Graph, sitemap, schema markup, Core Web Vitals, performance,
  imagens, fontes, acessibilidade para SEO, fazer pesquisa de palavra-chave (keyword research, intent,
  cauda longa), priorizar termos por volume/dificuldade, ou planejar estratégia de backlinks e autoridade
  de domínio, ou qualquer decisão de ranqueamento e citação por motores
  generativos. Trigger em: "SEO", "meta tags", "Open Graph metadata", "sitemap", "schema markup", "Core Web Vitals",
  "performance", "LCP", "CLS", "ranking", "canonical", "robots.txt", "GEO", "AEO", "Answer Engine",
  "LLM citation", "AI Overview", "llms.txt", "generative engine optimization", "answer engine optimization",
  "keyword research", "pesquisa de palavra-chave", "palavra-chave", "keyword", "cauda longa", "long tail",
  "search intent", "volume de busca", "KEI", "link building", "backlink", "off-page", "guest posting",
  "autoridade de domínio", "anchor text", "nofollow".
---

# SEO Specialist - Otimização para Motores de Busca

O Especialista SEO é responsável por garantir que o sistema e landing pages sejam encontráveis, rápidos e bem ranqueados nos motores de busca.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`, `policies/evals.md`, `policies/tool-safety.md` e `policies/anti-ai-writing.md`.

**Gate:** conteúdo publicado (artigos, meta descriptions, headings) deve passar pelos 29 padrões de `policies/anti-ai-writing.md` antes de finalizar. Conteúdo com tells de IA penaliza percepção de autenticidade e pode afetar E-E-A-T.

Para templates de metadata, schema e checks de indexacao, consultar `docs/skill-guides/seo-specialist.md` apenas quando necessario.

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
3. Garantir excelência em Core Web Vitals (LCP, FID, CLS, INP, TTFB)
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

### Como documentar as keywords decididas

| Keyword | Intent | Balde | Volume/mês | Dificuldade | KEI | Prioridade |
|---------|--------|-------|-----------|-------------|-----|-----------|
| chef a domicílio sp | transacional | negócio | 480 | média | 0,000342 | P0 |
| como fazer risoto | informacional | conteúdo | alto | alta | — | P1 (blog) |

A coluna **Intent** classifica: `informacional` (tutorial, "como"), `transacional` (compra/contratação), `navegacional` (marca). Isso direciona o tipo de página e o tom do Copy.

### Nota sobre densidade de keyword

Keyword research **decide** os termos; não autoriza repeti-los. **Keyword stuffing** (repetir à exaustão) é penalizado pelo Penguin desde 2012 — 2 a 3 ocorrências naturais por página bastam. O aviso vive aqui porque é onde a tentação nasce; o tuning de conteúdo é do Copy.

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

**src/components/seo/FAQSchema.tsx**

```typescript
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQSchema({ items }: { items: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

## Core Web Vitals - Metas Obrigatórias

```
Métrica        Alvo         Descrição
─────────────────────────────────────────────────────────────
LCP            < 2.5s       Largest Contentful Paint — tempo até o maior elemento visível
FID            < 100ms      First Input Delay — tempo de resposta à primeira interação
CLS            < 0.1        Cumulative Layout Shift — estabilidade visual da página
INP            < 200ms      Interaction to Next Paint — responsividade geral
TTFB           < 800ms      Time to First Byte — velocidade do servidor
```

Todas as métricas devem estar na zona **verde** do Google PageSpeed Insights.

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

Ver seção dedicada `## GEO/AEO — Otimização para LLMs e Answer Engines` abaixo, com checklist completo de citação por motores generativos (clear claims, quotable headings, FAQ/HowTo schema, E-E-A-T, tabelas, llms.txt).

## GEO/AEO — Otimização para LLMs e Answer Engines

LLMs como ChatGPT, Claude, Perplexity e Google AI Overviews viraram a primeira camada de descoberta para muitos usuários — eles fazem a pergunta no chat antes de abrir o Google. GEO (Generative Engine Optimization) e AEO (Answer Engine Optimization) cobrem técnicas para tornar o conteúdo extraível, citável e referenciável por esses sistemas. Diferente de SEO clássico (que otimiza ranking em SERP), GEO/AEO otimiza para ser a fonte que o LLM cita textualmente na resposta gerada.

### Conteúdo citável

LLMs extraem trechos curtos e atômicos. Estruture o conteúdo para facilitar essa extração:

- **Clear atomic claims:** 1 fato por sentença. Evite parágrafos com múltiplas afirmações concatenadas — o LLM precisa conseguir citar uma frase isolada sem perder contexto.
  - Ruim: "A Vitamina D é importante para os ossos e também tem papel no sistema imune, sendo que sua deficiência afeta 50% da população em climas frios."
  - Bom: "A Vitamina D regula a absorção de cálcio. Sua deficiência afeta 50% da população em climas frios (Holick, 2024)."
- **Quotable H2/H3 como perguntas:** headings em forma de pergunta direta batem com a query do usuário no LLM. "Como configurar SSL no Nginx" extrai melhor que "Configuração de SSL".
- **Parágrafos curtos:** máximo 3-4 frases. Blocos longos são descartados na extração.
- **TL;DR no topo:** 2-3 linhas resumindo o artigo logo após o H1. LLMs frequentemente citam o TL;DR como resposta direta.
- **Listas numeradas e com bullets:** estruturas enumeradas são extraídas com fidelidade muito maior que prosa corrida.

### Structured data específico

Além do schema clássico (Website, Organization), priorize tipos que LLMs consomem para grounding:

- **FAQPage schema** (já tem template em `FAQSchema.tsx` — ver seção `## Schema Markup - JSON-LD` acima): cada par pergunta/resposta vira candidato a citação direta em AI Overviews.
- **HowTo schema:** para tutoriais e procedimentos. Cada `step` é extraído individualmente.
- **Article schema com metadados completos:** `author` (com `@type: Person` e `url` para bio), `datePublished`, `dateModified` (LLMs ranqueiam por frescor — conteúdo sem `dateModified` perde relevância em queries que pedem informação atual), `publisher`, `headline`, `description`.

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

### E-E-A-T para LLMs

Experience, Expertise, Authoritativeness, Trustworthiness. LLMs filtram fontes por sinais de autoridade explícitos:

- **Bio do autor visível na página:** nome, credenciais, link para perfil profissional. Não basta no schema — precisa estar no HTML renderizado.
- **Fontes externas linkadas:** sempre que citar dado, estudo ou stat, link para a fonte primária. LLMs verificam grounding via outbound links.
- **Datas claras em todo conteúdo:** `<time datetime="2025-03-20">20 de março de 2025</time>` visível no corpo, não só no schema.
- **Contradições explícitas:** não use "alguns dizem X" — atribua nominalmente. "Smith (2024) defende X, mas Jones (2025) contradiz com Y baseado em dados de Z." Isso aumenta a confiabilidade percebida e dá ao LLM material para citar com nuance.
- **Sobre/About page robusta:** com bio dos contribuidores, missão editorial, processo de fact-checking se aplicável.

### Tabelas e listas

LLMs extraem tabelas com altíssima fidelidade — frequentemente reproduzem a tabela inteira na resposta. Use tabelas sempre que comparar:

- Planos/preços
- Features entre alternativas
- Antes/depois
- Especificações técnicas
- Prós/contras

Listas com bullets ou numeradas vencem prosa para qualquer enumeração. Se tem mais de 3 itens equivalentes, vire lista.

### llms.txt

Arquivo opcional na raiz do site (analogia ao `robots.txt`), formato markdown, lista o conteúdo canônico e legível por LLMs. Não é padrão oficial mas começou a ser respeitado por crawlers de Anthropic, OpenAI e Perplexity.

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

Versão estendida `llms-full.txt` pode incluir o conteúdo completo concatenado em markdown plano — útil para sites pequenos onde o LLM pode ingerir tudo.

### GEO Checklist

- [ ] TL;DR de 2-3 linhas no topo de cada artigo/página de conteúdo
- [ ] H2/H3 formulados como perguntas diretas quando aplicável
- [ ] Parágrafos com máximo 3-4 frases
- [ ] Claims atômicos (1 fato por sentença) em conteúdo factual
- [ ] FAQPage schema implementado em páginas com FAQ
- [ ] HowTo schema em tutoriais e procedimentos
- [ ] Article schema com `author`, `datePublished`, `dateModified`, `publisher`
- [ ] Bio do autor visível no HTML (não só no schema)
- [ ] Fontes externas linkadas para todo dado/stat citado
- [ ] Datas visíveis no corpo do conteúdo via `<time datetime="">`
- [ ] Atribuições nominais em vez de "alguns dizem"
- [ ] Tabelas comparativas usadas sempre que comparar 2+ itens
- [ ] Listas numeradas ou com bullets para enumerações de 3+ itens
- [ ] `llms.txt` na raiz do site listando conteúdo canônico
- [ ] Página `/sobre` ou `/about` com missão editorial e bios

## SEO Local (Google Business Profile)

Aplicável quando o projeto representa um negócio com presença física ou área de atendimento (restaurante, clínica, escritório de advocacia, prestador de serviço local).

### NAP Consistency (Name, Address, Phone)

Comparar Nome, Endereço e Telefone em três fontes: HTML visível (rodapé/contato), `LocalBusiness` schema, e Google Business Profile. Qualquer divergência entre as três é **crítica** — resolver antes de qualquer outra otimização local.

Multi-loja: cada página de localização precisa de schema `LocalBusiness` próprio com `@id` único e `branchOf` apontando pra Organization da matriz.

### Schema por vertical (não usar `LocalBusiness` genérico)

| Vertical | Tipo correto | Evitar |
|---|---|---|
| Restaurante | `Restaurant` + `Menu`/`MenuItem` | — |
| Saúde | `MedicalClinic`/`Hospital`/`Dentist` | `MedicalBusiness` (genérico demais) |
| Jurídico | `LegalService` + `Person`/`Service` por área de atuação | `Attorney` (deprecated) |
| Serviço em domicílio | subtipo de `Service` + `areaServed` com cidades nomeadas | — |
| Imobiliária | `RealEstateAgent` + `Person` + `RealEstateListing` por imóvel | — |
| Concessionária | `AutoDealer`, com schema separado pra vendas/serviço | `VehicleListing` como tipo principal |

Obrigatório em todos: `name`, `address` (com sub-propriedades `PostalAddress`), `geo` com 5+ decimais de precisão. Recomendado: `openingHoursSpecification`, `telephone` com link `tel:`, `aggregateRating`.

### GBP — sinais e anti-padrões

- **Categoria primária** é o sinal individual de maior peso — categoria errada é o principal fator negativo de ranking local.
- **Nunca** linkar o GBP pra página mais forte do site — risco de suprimir ranqueamento orgânico sob updates de diversidade.
- Fotos/vídeo aumentam pedidos de rota em ~45%; horário de funcionamento visível é fator relevante.
- Posts do GBP não têm impacto direto de ranking — não priorizar sobre outras táticas.

### Review intelligence

- Recência pesa mais que volume — cadência de novas reviews é o sinal primário.
- Limiar de credibilidade: 10+ reviews totais.
- Sempre responder reviews (impacto de percepção alto), mas **nunca fazer review gating** (pré-filtrar cliente satisfeito antes de direcionar pra plataforma pública) — viola política de engajamento falso do Google e regras da FTC.
- Setores regulados: saúde não pode confirmar/negar que um reviewer é paciente (HIPAA); jurídico precisa considerar sigilo profissional na resposta.

### Doorway page — detecção rápida

Teste do RicketyRoo: se trocar o nome da cidade no texto e o conteúdo continuar fazendo sentido, é doorway page — penalizado desde o Core Update de março de 2024. Piso de qualidade: cada página de localização precisa de conteúdo substancialmente único (não só o nome da cidade trocado).

## SEO E-commerce

### Schema de produto — `Product` + `Offer`

Campos obrigatórios: `name`, `image` (array com 1+ URL de alta resolução), `offers` do tipo `Offer` (nunca `AggregateOffer` para um produto único).

Campos que habilitam rich results: `sku`, `brand`, `gtin13`/`gtin14`/`mpn`, `aggregateRating`, `review` (mínimo 1), `shippingDetails` (tipo `ShippingDetails`), `hasMerchantReturnPolicy` (tipo `MerchantReturnPolicy`). Produtos adultos exigem `hasAdultConsideration`.

### Regras de validação não-negociáveis

- Preço como string numérica sem símbolo de moeda: `"29.99"`, nunca `"$29.99"`.
- `priceCurrency` em código ISO 4217 (`USD`, `BRL`, `EUR`).
- `availability` usa a URL completa do enum do Schema.org.
- `brand.name` nunca vazio ou `"N/A"`.
- Se `aggregateRating` estiver presente, `ratingValue` e `reviewCount` são obrigatórios juntos.
- `priceValidUntil` em ISO 8601.

### Página de produto — checklist

- [ ] Título ≤ 60 caracteres com keyword principal + marca
- [ ] Meta description ≤ 155 caracteres com preço/benefício + CTA
- [ ] 3+ imagens, 800px+, alt text descritivo (não genérico)
- [ ] H1 único correspondendo ao nome do produto
- [ ] Descrição 200+ palavras, própria (nunca copiar texto do fabricante)
- [ ] Breadcrumbs: Home > Categoria > Subcategoria > Produto

### Feed de marketplace (Google Merchant Center)

Usar `Offer`, nunca `AggregateOffer`. Manter preço consistente entre listagem orgânica e Shopping Ads. Campos hoje exigidos pelo Merchant Center: `name`, `image`, `offers`.

## SEO Internacional (hreflang)

Aplicável a sites com múltiplas versões de idioma/região.

### Sintaxe correta

```html
<link rel="alternate" hreflang="pt-BR" href="https://site.com/pt-br/pagina" />
<link rel="alternate" hreflang="en-US" href="https://site.com/en/pagina" />
<link rel="alternate" hreflang="x-default" href="https://site.com/pagina" />
```

- Código de idioma: ISO 639-1 minúsculo (`pt`, `en`) + código de região ISO 3166-1 Alpha-2 maiúsculo (`BR`, `US`) — formato `idioma-REGIÃO`.
- Protocolo consistente em todo o conjunto (todo HTTPS, nunca misturar com HTTP).
- URLs devem casar exatamente com a canonical, inclusive barra final.

### Erros mais comuns

| Erro | Correção |
|---|---|
| Falta a tag auto-referenciada | Toda página do conjunto deve apontar pra si mesma também |
| Link unidirecional (A→B sem B→A) | Implementar malha bidirecional completa |
| Código inválido (`eng`, `jp`, `en-uk`) | Usar estritamente ISO 639-1 + ISO 3166-1 |
| hreflang em URL não-canonical | Aplicar apenas nas URLs canônicas |
| Região sem prefixo de idioma | Nunca usar só o código de país |

`x-default`: um único por conjunto, geralmente apontando pra versão em inglês ou seletor de idioma; precisa receber link de retorno de todas as outras versões.

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

1. Meta tags testadas em todas as páginas (Open Graph Debugger, Twitter Card Validator)
2. Schema markup validado (Google Rich Results Test)
3. Sitemap.xml configurado e acessível
4. Core Web Vitals na zona verde (Google PageSpeed Insights)
5. Lighthouse score > 90 em todas as categorias (Performance, Accessibility, Best Practices, SEO)

## Fontes Externas

- GEO/AEO patterns inspired by [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) (MIT) — comprehensive SEO skill with deep GEO coverage.
- Seções de SEO Local (GBP/NAP), E-commerce (schema de produto) e Internacional (hreflang) também inspiradas em AgriciDaniel/claude-seo, que implementa essas verticais como sub-skills executáveis com dispatch paralelo e integrações MCP (DataForSEO, Ahrefs); aqui curado como referência estática, sem replicar a arquitetura de agentes/MCP da fonte.

## Regra de Código

Comentarios no codigo so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios. O padrao continua sendo codigo claro com nomes descritivos.
