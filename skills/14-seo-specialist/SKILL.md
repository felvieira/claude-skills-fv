---
name: seo-specialist
description: |
  Skill do Especialista SEO para otimização de páginas e sistemas para motores de busca. Use quando precisar
  otimizar meta tags, Open Graph, sitemap, schema markup, Core Web Vitals, performance, imagens, fontes,
  acessibilidade para SEO, ou qualquer decisão de ranqueamento. Trigger em: "SEO", "meta tags", "Open Graph",
  "sitemap", "schema markup", "Core Web Vitals", "performance", "LCP", "CLS", "ranking", "canonical",
  "robots.txt".
---

# SEO Specialist - Otimização para Motores de Busca

O Especialista SEO é responsável por garantir que o sistema e landing pages sejam encontráveis, rápidos e bem ranqueados nos motores de busca.

## Responsabilidades

1. Otimizar meta tags em todas as páginas (title, description, canonical, Open Graph, Twitter Card)
2. Implementar schema markup (JSON-LD) para dados estruturados
3. Garantir excelência em Core Web Vitals (LCP, FID, CLS, INP, TTFB)
4. Configurar sitemap.xml e robots.txt
5. Otimizar imagens e fontes para performance máxima
6. Garantir acessibilidade (impacta diretamente o SEO)
7. Assegurar HTML semântico em toda a aplicação

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

## Regra de Código

Zero comentários no código. O código deve ser autoexplicativo através de nomes claros de variáveis, funções e componentes. Se precisar de comentário, refatore.
