---
scenario: 13-marketing-copy
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 310
time_seconds: 18
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 4
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.0
notes: "Diferencial dos 12 bancos virou número concreto na headline. CTAs com intenção diferenciada por posição de funil. Raciocínio de copy entregue junto. Anti-AI gate aplicado explicitamente. Baseline tinha CTA placeholder 'ver como funciona'."
---

# Treatment — 13 Marketing Copy

## Scenario Input

SaaS B2B de billing pra freelancers. Headline + sub + 3 CTAs pra landing principal. Tom direto, sem cringe. Diferencial: integra com 12 bancos brasileiros.

---

## Output

**Headline:**
Receba de 12 bancos. Um lugar só.

**Sub:**
Billing feito pra quem trabalha por conta. Emite boleto, gera PIX e acompanha o que entrou — integrado com os principais bancos do Brasil, sem copiar e colar nada.

**CTAs:**

| Posição | Texto | Intenção |
|---|---|---|
| CTA primário | "Criar minha conta grátis" | Conversão direta, sem fricção |
| CTA secundário | "Ver quais bancos funcionam" | Endereça a objeção-chave antes do clique |
| CTA final (seção fundo) | "Chega de perseguir pagamento" | Eco da dor, convida quem ainda não converteu |

**Raciocínio de copy:**
- Headline usa o diferencial competitivo (12 bancos) como número concreto, posiciona o benefício (um lugar só) sem adjetivo vazio
- Sub fala com o freelancer, não com "empresas" — mantém tom direto, evita "solução", "plataforma", "seamless"
- CTA secundário usa o banco como proof point em vez de "ver como funciona" (placeholder genérico)
- CTA de fundo ecoa a dor de chasing invoices — converte quem precisou ler a página inteira para decidir
- Nenhuma palavra das listas de anti-AI: não tem "transforme", "eleve", "revolucione", "seamless", "poderoso"
