---
scenario: 14-seo-specialist
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2800
tokens_out_approx: 1780
time_seconds: 45
quality_score: 4.75
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.75
notes: "Pass B — skill loaded. Added FAQPage @graph rich-snippet schema, ISR revalidate strategy, anti-AI content gate with PT-BR examples, E-E-A-T authorship markup, named file paths throughout, and explicit handoff chain. Discipline -1 for minor keyword-stuffing note that's adjacent but not squarely in scope."
---

# SEO — Blog Post "Como cobrar inadimplência sem perder cliente"
**Stack:** Next.js 14 App Router · **Locale:** pt_BR

---

## 1. Keyword Strategy (PT-BR)

**Keyword primária:** `cobrar inadimplência sem perder cliente`
**Intent:** informacional → resolver problema prático de gestão de clientes

**Cluster de suporte:**
- `como cobrar cliente inadimplente educadamente` (alta intenção)
- `cobrança amigável de dívida` (volume médio)
- `recuperar crédito sem perder relacionamento` (cauda longa)
- `estratégia de cobrança para pequenas empresas` (audiência-alvo)

**Anti-padrão a evitar:** não repetir a keyword mais de 1x no title, 1x no H1, 2–3x no corpo — keyword stuffing penaliza no Google Search Central.

---

## 2. `generateMetadata` — App Router

Arquivo: `app/blog/como-cobrar-inadimplencia-sem-perder-cliente/page.tsx`

```tsx
import type { Metadata } from 'next'

const POST_URL = 'https://seusite.com.br/blog/como-cobrar-inadimplencia-sem-perder-cliente'
const OG_IMAGE = 'https://seusite.com.br/og/cobrar-inadimplencia.png'

export const metadata: Metadata = {
  title: 'Como cobrar inadimplência sem perder o cliente',
  // 55 chars — dentro do limite de 60
  description:
    'Veja estratégias práticas para cobrar clientes devedores com respeito e eficácia — sem comprometer o relacionamento comercial.',
  // 127 chars — dentro do limite de 160
  alternates: {
    canonical: POST_URL,
  },
  openGraph: {
    title: 'Como cobrar inadimplência sem perder o cliente',
    description:
      'Veja estratégias práticas para cobrar clientes devedores com respeito e eficácia — sem comprometer o relacionamento comercial.',
    url: POST_URL,
    siteName: 'Seu Site',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Cobrança amigável de inadimplência' }],
    locale: 'pt_BR',
    type: 'article', // ← BlogPosting usa 'article' no OG; diferente do website default
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Como cobrar inadimplência sem perder o cliente',
    description:
      'Estratégias práticas para recuperar dívidas sem perder o relacionamento comercial.',
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}
```

**Pontos críticos:**
- `type: 'article'` — obrigatório para posts; `'website'` é errado aqui e bloqueia rich previews
- `canonical` explícito — previne penalidade por conteúdo duplicado se o post aparecer em `/tag/cobranca` ou paginação
- `lang="pt-BR"` no `<html>` (no `app/layout.tsx`) — sinaliza idioma ao Googlebot

---

## 3. Schema.org — JSON-LD para BlogPosting

Arquivo: `app/blog/como-cobrar-inadimplencia-sem-perder-cliente/page.tsx`

```tsx
function BlogPostingSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: 'Como cobrar inadimplência sem perder o cliente',
    description:
      'Estratégias práticas para cobrar clientes devedores de forma respeitosa e eficaz.',
    image: 'https://seusite.com.br/og/cobrar-inadimplencia.png',
    url: 'https://seusite.com.br/blog/como-cobrar-inadimplencia-sem-perder-cliente',
    datePublished: '2026-05-22T09:00:00-03:00',
    dateModified: '2026-05-22T09:00:00-03:00',
    inLanguage: 'pt-BR',
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
        width: 600,
        height: 60,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://seusite.com.br/blog/como-cobrar-inadimplencia-sem-perder-cliente',
    },
    // FAQPage aninhado — ativa rich snippet de FAQ no SERP
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Como cobrar um cliente inadimplente sem ser agressivo?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Comece com uma abordagem empática: entre em contato por e-mail ou mensagem, reconheça que situações financeiras podem ser difíceis e ofereça opções de parcelamento antes de escalar a cobrança.',
            },
          },
          {
            '@type': 'Question',
            name: 'Qual o prazo mínimo para negativar um cliente inadimplente?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No Brasil, não há prazo mínimo obrigatório por lei, mas a prática recomendada é tentar contato amigável por 30–60 dias antes de negativar, para preservar o relacionamento.',
            },
          },
        ],
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

**Por que `@graph` com FAQPage:** posts sobre "como fazer X" quase sempre têm perguntas frequentes. FAQPage ativa rich snippets que ocupam mais espaço no SERP e aumentam CTR sem custo extra de posição.

---

## 4. Core Web Vitals — Ações Específicas para Blog Post

| Métrica | Meta | Ação concreta no App Router |
|---------|------|-----------------------------|
| **LCP < 2.5s** | Imagem hero above-the-fold | `<Image priority width={1200} height={630} />` — nunca `<img>` |
| **CLS < 0.1** | Fontes sem FOUT | `next/font` com `display: 'swap'` no layout raiz |
| **INP < 200ms** | Widgets de compartilhamento, comentários | `dynamic(() => import(...), { ssr: false })` para tudo abaixo do fold |
| **TTFB < 800ms** | Conteúdo estático | ISR com `revalidate = 3600` — não SSR a cada request |

```tsx
// app/blog/[slug]/page.tsx
export const revalidate = 3600 // ISR — revalida 1×/hora

// Seções abaixo do fold: dynamic imports
const ShareButtons = dynamic(() => import('@/components/blog/ShareButtons'), { ssr: false })
const Comments    = dynamic(() => import('@/components/blog/Comments'),     { ssr: false })
const RelatedPosts = dynamic(() => import('@/components/blog/RelatedPosts'))
```

---

## 5. next.config.js — Configuração obrigatória

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'], // AVIF primeiro — melhor compressão
  },
  compress: true,
  poweredByHeader: false, // não expor stack por segurança
}

module.exports = nextConfig
```

---

## 6. HTML Semântico — Estrutura do BlogPost

```tsx
// app/blog/como-cobrar-inadimplencia-sem-perder-cliente/page.tsx
export default function BlogPostPage() {
  return (
    <main>
      <article>
        <header>
          <h1>Como cobrar inadimplência sem perder o cliente</h1>
          <time dateTime="2026-05-22">22 de maio de 2026</time>
          <address rel="author">Nome do Autor</address>
        </header>

        {/* Imagem hero — LCP candidate, sempre priority */}
        <Image
          src="/blog/cobrar-inadimplencia.webp"
          alt="Empresário e cliente conversando sobre cobrança de dívida"
          width={1200}
          height={630}
          priority
        />

        <section aria-label="Conteúdo do artigo">
          {/* corpo do post */}
        </section>

        <footer>
          <ShareButtons />
        </footer>
      </article>

      <aside aria-label="Posts relacionados">
        <RelatedPosts />
      </aside>
    </main>
  )
}
```

**Regras críticas:**
- `<h1>` única — igual ao `title` da metadata (ou variação próxima)
- `<time dateTime="">` — obrigatório para schema de data no Google
- `<address rel="author">` — sinaliza authorship para E-E-A-T
- Hierarquia: h1 → h2 (seções) → h3 (subseções) — nunca pular nível

---

## 7. Anti-AI Writing Gate (obrigatório antes de publicar)

O conteúdo deste post precisa passar pelo gate de `policies/anti-ai-writing.md` antes de indexar. Sinais que penalizam E-E-A-T:

- Frases genéricas abertas: "É importante lembrar que..." → substituir por dado concreto
- Hedging excessivo: "pode ser que", "talvez seja" → voz ativa e assertiva
- Listas com 7+ itens sem hierarquia → agrupar em subtópicos
- Falta de experiência real: sem exemplo concreto de caso ou número → adicionar dado de mercado (ex: "inadimplência no Brasil bateu 5,6% em 2025, segundo Serasa")

---

## 8. Checklist de Publicação

### Técnico
- [ ] `canonical` aponta para a URL definitiva (sem trailing slash ou com — decidir e ser consistente)
- [ ] `robots: { index: true }` ativo em produção
- [ ] ISR configurado (`revalidate`) — não SSR a cada request
- [ ] Sitemap inclui a URL do post e está enviado ao Google Search Console

### Metadata / OG
- [ ] OG image gerada (1200×630) e publicamente acessível
- [ ] `og:type = article` (não `website`)
- [ ] Testado em: [Facebook Debugger](https://developers.facebook.com/tools/debug/) + [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [ ] `lang="pt-BR"` no `<html>` (app/layout.tsx)

### Schema
- [ ] `BlogPosting` validado em [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] `FAQPage` aprovado e elegível para rich snippet

### Performance
- [ ] LCP < 2.5s — imagem hero com `priority` e dimensões explícitas
- [ ] Fontes via `next/font` (zero CLS)
- [ ] Dynamic imports para componentes abaixo do fold
- [ ] Lighthouse > 90 em Performance + SEO + Accessibility

### On-Page
- [ ] H1 única e igual (ou próxima) ao title da metadata
- [ ] Alt text descritivo em todas as imagens do post
- [ ] Links internos para posts relacionados (mínimo 2)
- [ ] Breadcrumb implementado e com schema BreadcrumbList

---

## Handoff

**Recebe de:** Marketing Copy — keywords definidas, FAQs estruturadas, texto do post revisado pelo gate anti-AI.

**Entrega para:** Frontend (implementar templates acima) → QA (validar checklist + Lighthouse) → Reviewer (gate final).

**Bloqueio:** publicar sem `author` + `datePublished` no schema quebra elegibilidade para rich results de artigo no Google.
