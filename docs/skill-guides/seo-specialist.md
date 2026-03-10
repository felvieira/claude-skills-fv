# SEO Specialist Guide

> Guia auxiliar da skill `14-seo-specialist`. Consultar apenas quando a tarefa exigir detalhe tecnico de metadata, schema, Core Web Vitals ou configuracao de indexacao.

---

## Indice

- [Meta Tags — Template Padrao](#meta-tags--template-padrao)
- [Schema Markup — JSON-LD](#schema-markup--json-ld)
- [Sitemap e Robots](#sitemap-e-robots)
- [Core Web Vitals](#core-web-vitals)
- [Otimizacoes de Performance](#otimizacoes-de-performance)
- [HTML Semantico](#html-semantico)
- [SEO Checklist Completo](#seo-checklist-completo)

---

## Meta Tags — Template Padrao

```typescript
// src/lib/metadata.ts
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
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName,
      images: [{ url: image || defaultImage, width: 1200, height: 630, alt: title }],
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

### Regras inegociaveis de title e description

| Campo | Limite | Regra |
|-------|--------|-------|
| `<title>` | 50-60 chars | Keyword principal + nome do site |
| `meta description` | 120-155 chars | Resumo + CTA implicito |
| `og:image` | 1200x630px | Arquivo otimizado, sem texto pequeno |
| `canonical` | URL exata | Sempre presente, nunca relativa |

---

## Schema Markup — JSON-LD

### WebSite

```tsx
// src/components/seo/WebsiteSchema.tsx
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

### Organization

```tsx
export function OrganizationSchema({
  name, url, logo, sameAs,
}: { name: string; url: string; logo: string; sameAs: string[] }) {
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

### FAQPage

```tsx
interface FAQItem { question: string; answer: string; }

export function FAQSchema({ items }: { items: FAQItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
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

### BreadcrumbList

```tsx
interface BreadcrumbItem { name: string; url: string; }

export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
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

**Validar em:** [Google Rich Results Test](https://search.google.com/test/rich-results)

---

## Sitemap e Robots

### robots.txt

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Sitemap: https://seudominio.com/sitemap.xml
```

### Sitemap dinamico (Next.js App Router)

```typescript
// src/app/sitemap.ts
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const posts = await fetchPublishedPosts();

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/features`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    ...posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
```

---

## Core Web Vitals

| Metrica | Alvo | O que mede |
|---------|------|-----------|
| **LCP** | < 2.5s | Maior elemento visivel (hero, imagem principal) |
| **FID** | < 100ms | Resposta a primeira interacao |
| **CLS** | < 0.1 | Estabilidade visual — sem layout shift |
| **INP** | < 200ms | Responsividade geral de interacoes |
| **TTFB** | < 800ms | Velocidade do servidor |

Todas as metricas devem estar na zona **verde** do Google PageSpeed Insights.

### Diagnostico rapido

```bash
# Instalar Lighthouse CLI
npm install -g lighthouse

# Rodar auditoria completa
lighthouse https://seudominio.com --output html --output-path report.html

# Rodar auditoria de performance apenas
lighthouse https://seudominio.com --only-categories=performance
```

---

## Otimizacoes de Performance

### next.config.js

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

- **Sempre** usar `next/image` — nunca `<img>` nativo
- Prioridade de formato: AVIF > WebP > PNG > JPG
- `alt` obrigatorio em todas as imagens
- `width` e `height` explicitos em todas
- `priority` nas imagens hero (above the fold)

```tsx
import Image from 'next/image';

export function HeroImage({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={630}
      priority
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}
```

### Fontes

```typescript
// src/app/layout.tsx
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

### Lazy loading — abaixo do fold

```typescript
// src/app/page.tsx
import dynamic from 'next/dynamic';

const FAQ          = dynamic(() => import('@/components/sections/FAQ'));
const Testimonials = dynamic(() => import('@/components/sections/Testimonials'));
const Footer       = dynamic(() => import('@/components/layout/Footer'));
```

### Scripts de terceiros

```tsx
import Script from 'next/script';

export function ThirdPartyScripts() {
  return (
    <Script
      src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"
      strategy="afterInteractive"
    />
  );
}
```

---

## HTML Semantico

| Correto | Errado |
|---------|--------|
| `<header>` | `<div class="header">` |
| `<nav>` | `<div class="nav">` |
| `<main>` | `<div class="main">` |
| `<section>` | `<div class="section">` |
| `<article>` | `<div class="article">` |
| `<aside>` | `<div class="sidebar">` |
| `<footer>` | `<div class="footer">` |
| `<h1>` a `<h6>` | `<div class="title">` |
| `<figure>` + `<figcaption>` | `<div class="image-wrapper">` |
| `<time datetime="">` | `<span class="date">` |

**Regras:**
- Uma unica `<h1>` por pagina
- Hierarquia de headings sem pular niveis (h1 > h2 > h3)
- `<main>` uma unica vez por pagina
- `<nav>` com `aria-label` quando houver mais de uma navegacao

---

## SEO Checklist Completo

### Tecnico

```
☐ Sitemap.xml gerado e enviado ao Google Search Console
☐ robots.txt configurado corretamente
☐ Tags canonical em todas as paginas
☐ HTTPS ativo em todo o site
☐ Sem conteudo duplicado entre URLs
☐ URLs amigaveis (slug legivel, sem IDs expostos)
☐ Redirects 301 para URLs antigas
☐ Pagina 404 customizada com navegacao
☐ Carregamento < 3s em conexao 3G
```

### On-Page

```
☐ H1 unica e descritiva em cada pagina
☐ Title tag < 60 caracteres com keyword principal
☐ Meta description < 155 caracteres com CTA implicito
☐ Alt text em todas as imagens
☐ Links internos entre paginas relacionadas
☐ Breadcrumbs implementados (schema incluido)
☐ Conteudo minimo de 300 palavras por pagina
```

### Acessibilidade (impacta SEO)

```
☐ Contraste minimo 4.5:1 (WCAG AA)
☐ Navegacao completa via Tab
☐ ARIA labels em elementos interativos
☐ Skip to content implementado
☐ Labels em todos os campos de formulario
☐ Focus visivel em todos os elementos interativos
```

### Performance

```
☐ Core Web Vitals na zona verde
☐ Imagens otimizadas (AVIF/WebP via next/image)
☐ Fontes com next/font (zero CLS)
☐ Bundle splitting com dynamic imports
☐ Preload de recursos criticos (hero image, font)
☐ CDN configurado para assets estaticos
☐ Lighthouse score > 90 em todas as categorias
```
