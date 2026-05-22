---
scenario: 14-seo-specialist
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 1050
time_seconds: 28
quality_score: 3.0
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 4
pass_fail: baseline
delta_vs_baseline: n/a
notes: "Pass A — cold answer, no skill. Covered core deliverables but missed FAQPage/rich-snippet schema, ISR strategy, anti-AI gate, E-E-A-T authorship markup, and breadcrumb schema."
---

# SEO para Blog Post "Como cobrar inadimplência sem perder cliente" — Next.js 14 App Router

## 1. Keyword Research (PT-BR)

**Keyword principal:** `cobrar inadimplência sem perder cliente`

**Keywords secundárias:**
- como cobrar dívida de cliente amigavelmente
- cobrança de inadimplente educada
- cobrar cliente devedor sem brigar
- estratégia de cobrança amigável
- recuperação de crédito sem perder relacionamento

**Intenção de busca:** informacional — leitor quer saber como agir em situação prática.

---

## 2. Metadata (Next.js 14 — generateMetadata)

```tsx
// app/blog/como-cobrar-inadimplencia-sem-perder-cliente/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Como cobrar inadimplência sem perder o cliente | Blog',
  description:
    'Aprenda a cobrar clientes inadimplentes de forma eficaz e respeitosa. Veja estratégias práticas para recuperar dívidas sem prejudicar o relacionamento comercial.',
  alternates: {
    canonical: 'https://seusite.com.br/blog/como-cobrar-inadimplencia-sem-perder-cliente',
  },
  openGraph: {
    title: 'Como cobrar inadimplência sem perder o cliente',
    description:
      'Estratégias práticas para cobrar clientes devedores sem perder o relacionamento comercial.',
    url: 'https://seusite.com.br/blog/como-cobrar-inadimplencia-sem-perder-cliente',
    siteName: 'Seu Site',
    images: [
      {
        url: 'https://seusite.com.br/og/cobrar-inadimplencia.png',
        width: 1200,
        height: 630,
        alt: 'Como cobrar inadimplência sem perder o cliente',
      },
    ],
    locale: 'pt_BR',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Como cobrar inadimplência sem perder o cliente',
    description:
      'Veja estratégias práticas para recuperar dívidas sem prejudicar o relacionamento comercial.',
    images: ['https://seusite.com.br/og/cobrar-inadimplencia.png'],
  },
}
```

**Pontos de atenção:**
- `type: 'article'` no OG porque é blog post (não `'website'`)
- `title` < 60 chars — ok (55 chars)
- `description` < 160 chars — ok

---

## 3. Schema.org — JSON-LD

Para um blog post, use `Article` (ou `BlogPosting`):

```tsx
// app/blog/como-cobrar-inadimplencia-sem-perder-cliente/page.tsx
function ArticleSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'Como cobrar inadimplência sem perder o cliente',
    description:
      'Estratégias práticas para cobrar clientes devedores de forma respeitosa e eficaz.',
    datePublished: '2026-05-22T10:00:00-03:00',
    dateModified: '2026-05-22T10:00:00-03:00',
    author: {
      '@type': 'Person',
      name: 'Nome do Autor',
      url: 'https://seusite.com.br/autores/nome-do-autor',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Seu Site',
      logo: {
        '@type': 'ImageObject',
        url: 'https://seusite.com.br/logo.png',
      },
    },
    image: 'https://seusite.com.br/og/cobrar-inadimplencia.png',
    url: 'https://seusite.com.br/blog/como-cobrar-inadimplencia-sem-perder-cliente',
    inLanguage: 'pt-BR',
    keywords: 'cobrança, inadimplência, cliente, relacionamento comercial',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

---

## 4. Core Web Vitals — Checklist para este post

| Métrica | Meta | Como garantir no App Router |
|---------|------|-----------------------------|
| LCP < 2.5s | Imagem hero com `priority` no `<Image>` da Next | `<Image priority />` + `next/image` AVIF/WebP |
| CLS < 0.1 | Reservar espaço para imagens (`width`/`height` explícitos) | Props obrigatórias no `<Image>` |
| INP < 200ms | Evitar JS pesado no primeiro render | Dynamic imports para comentários, share widgets |
| TTFB < 800ms | Blog post = conteúdo estático → usar SSG | `export const revalidate = 3600` ou geração estática |

**Recomendação para blog:** usar SSG com revalidate (ISR) — o post raramente muda, não precisa de SSR a cada request.

```tsx
// app/blog/[slug]/page.tsx
export const revalidate = 3600 // revalida a cada 1 hora
```

---

## 5. Fontes e Imagens — Regras rápidas

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], display: 'swap' })

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

- Todas as imagens via `next/image` (formatos AVIF/WebP automáticos)
- Alt text descritivo em todas as imagens do post
- Imagem hero: `priority` prop + dimensões explícitas

---

## 6. Checklist de Publicação

- [ ] `canonical` apontando para a URL definitiva
- [ ] OG image gerada (1200x630) e acessível publicamente
- [ ] Schema BlogPosting validado em https://search.google.com/test/rich-results
- [ ] OG testado em https://developers.facebook.com/tools/debug/
- [ ] Twitter Card testado em https://cards-dev.twitter.com/validator
- [ ] Lighthouse > 90 em Performance, Accessibility, SEO
- [ ] `lang="pt-BR"` no `<html>` (já feito no layout acima)
- [ ] Post indexável: sem `noindex` em produção
- [ ] URL slug legível: `/blog/como-cobrar-inadimplencia-sem-perder-cliente`
