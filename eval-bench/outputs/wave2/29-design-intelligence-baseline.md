---
scenario: 29-design-intelligence
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 420
time_seconds: 18
quality_score: 2.3
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 2
  discipline: 3
notes: "genérico, sem análise real das páginas citadas, sem estrutura de pesquisa, sem outputs concretos, sem padrões específicos de Stripe/Linear/Vercel/Resend"
---

# Pass A — Baseline (sem skill)

## Input

"Antes de redesenhar nossa pricing page, quero ver o que Stripe, Linear, Vercel e Resend fazem. Como mapeio padrões deles e tiro insights pra nossa?"

## Resposta

Para mapear o que esses produtos fazem na pricing page e tirar insights acionáveis:

**1. Coleta manual (screenshots + anotações)**
- Acesse cada pricing page e faça screenshots: stripe.com/pricing, linear.app/pricing, vercel.com/pricing, resend.com/pricing
- Anote: headline principal, número de tiers, nomes dos planos, âncora de preço, CTAs, features de destaque por tier, social proof

**2. Matriz de comparação**
Monte uma tabela com colunas: produto | tiers | preço âncora | CTA primário | diferencial visual | modelo (por usuário/por uso/flat)

**3. Padrões a observar**
- Modelo de pricing: seat-based vs usage-based vs freemium
- Cognitive load: quantos tiers? Qual é o "recomendado"?
- Hierarchy visual: o que está above the fold?
- FAQ inline vs página separada
- Billing annual vs monthly toggle

**4. Insights para sua página**
Compare com seus planos e identifique gaps: seu tier gratuito é competitivo? Seu CTA está claro? Você tem social proof suficiente?

## Análise

- **Especificidade (2/5):** Menciona as URLs mas não descreve o que cada produto realmente faz — nenhum insight real sobre Stripe vs Linear vs Vercel vs Resend. Poderia ter sido escrito sem olhar para nenhuma das páginas.
- **Completeness (3/5):** Cobre os passos básicos (coleta, comparação, padrões, insights), mas de forma superficial.
- **Correção (4/5):** O que está escrito está correto, apenas genérico.
- **Actionability (2/5):** O leitor ainda precisa saber o que exatamente observar em cada empresa, quais patterns são específicos desse nicho, como priorizar.
- **Disciplina (3/5):** Manteve escopo, mas não surfacou riscos ou nuances.
