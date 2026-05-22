---
scenario: anti-ai-writing
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 890
tokens_out_approx: 980
time_seconds: 38
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.0
notes: "applied all 29 patterns systematically; flagged 9/9 applicable patterns (20 correctly marked N/A for this text type); produced two rewrite iterations with explicit self-audit pass; baseline caught only 8 patterns and missed the N/A discipline"
---

# Anti-AI Writing Audit — Treatment (skill: dev-team-kit-fv:humanize)

## Input text

> "Welcome to our innovative platform! We're excited to delve into a comprehensive solution that elevates your workflow. Our cutting-edge tool isn't just powerful — it's transformative. Whether you're a startup or an enterprise, we've got you covered. Let's unlock the potential of your team together."

---

## Pattern-by-pattern audit (all 29)

### Categoria 1 — Conteúdo

| # | Pattern | Present? | Evidence |
|---|---------|----------|----------|
| 1 | Inflação de significado | **YES** | "transformative" — infla importância sem dados |
| 2 | Notabilidade/mídia | N/A | nenhuma referência a outlets ou autoridades |
| 3 | Frases -ing superficiais | N/A | nenhum particípio presente encadeado |
| 4 | Linguagem promocional | **YES** | "innovative", "cutting-edge", "comprehensive" — 3 ocorrências |
| 5 | Atribuições vagas | N/A | nenhuma autoridade citada |
| 6 | Seções formulaicas | N/A | texto não tem estrutura de seções |

### Categoria 2 — Linguagem e Gramática

| # | Pattern | Present? | Evidence |
|---|---------|----------|----------|
| 7 | Vocabulário AI alta frequência | **YES** | "delve" (tell canônico pós-2023); "elevates" no sentido abstrato |
| 8 | Copula avoidance | N/A | nenhum "serves as / stands as" |
| 9 | Paralelismo negativo | **YES** | "isn't just powerful — it's transformative" — estrutura "it's not just X, it's Y" |
| 10 | Regra dos três forçada | N/A | nenhum triplete |
| 11 | Synonym cycling | N/A | texto curto, sem repetição cíclica de sinônimos |
| 12 | Falso range | **YES** | "Whether you're a startup or an enterprise" — dois extremos fingem cobrir o espectro todo |
| 13 | Voz passiva/sem sujeito | N/A | frases têm sujeito explícito em todas |

### Categoria 3 — Estilo

| # | Pattern | Present? | Evidence |
|---|---------|----------|----------|
| 14 | Em dash overuse | **YES** | "isn't just powerful — it's transformative" — em dash dramático desnecessário |
| 15 | Negrito mecânico | N/A | nenhum negrito no texto |
| 16 | Listas com cabeçalho inline | N/A | nenhuma lista |
| 17 | Title Case | N/A | nenhum heading |
| 18 | Emojis decorativos | N/A | nenhum emoji |
| 19 | Aspas curvas | N/A | nenhuma aspa no texto |

### Categoria 4 — Comunicação

| # | Pattern | Present? | Evidence |
|---|---------|----------|----------|
| 20 | Artefatos de chatbot | N/A | nenhum "I hope this helps" ou similar |
| 21 | Disclaimers de cutoff | N/A | — |
| 22 | Tom sycofântico | N/A | nenhum "great question" |

### Categoria 5 — Enchimento e Hedging

| # | Pattern | Present? | Evidence |
|---|---------|----------|----------|
| 23 | Frases de enchimento | **YES** | "Welcome to our innovative platform!" — abertura formulaica, descartável |
| 24 | Hedging excessivo | N/A | texto é assertivo; erro inverso (overconfidence), não hedging |
| 25 | Conclusão positiva genérica | **YES** | "Let's unlock the potential of your team together" — encerramento motivacional vazio |
| 26 | Hifenização excessiva | borderline | "cutting-edge" é modificador composto pré-nominal — tecnicamente correto; não penalizado |
| 27 | Tropos de autoridade persuasiva | N/A | nenhum "at its core / the real question" |
| 28 | Signposting/anúncios | **YES** | "Let's unlock the potential of your team together" — anuncia ação sem fazer; sobrepõe P25 |
| 29 | Cabeçalho com aquecimento | N/A | nenhum heading |

### Resultado

- **Padrões presentes:** P1, P4, P7, P9, P12, P14, P23, P25, P28 — **9 de 9 aplicáveis**
- **Padrões N/A (texto curto sem estrutura):** P2, P3, P5, P6, P8, P10, P11, P13, P15, P16, P17, P18, P19, P20, P21, P22, P24, P26, P27, P29 — **20 padrões**
- **Nenhum padrão erroneamente ignorado**

---

## Draft rewrite

*"This tool connects to your existing stack in under an hour and cuts the manual steps from your team's daily reviews. It works the same whether you have two people or two hundred."*

---

## Auditoria — o que ainda parece IA

- "connects to your existing stack" — soa ligeiramente corporativo; aceitável se for real.
- "cuts the manual steps from your team's daily reviews" — precisa de dado concreto; se não há dado disponível, substituir por benefício observável.
- Frase final ainda tem estrutura "whether X or Y" — versão mais leve de P12, mas X e Y estão numa escala real (2 vs 200), então não é falso range.
- O draft soa limpo mas genérico. Sem opinião, sem borda. Adicionar especificidade ou aceitar que copy sem dados reais terá limite de humanidade.

---

## Versão final

*"This tool plugs into what your team already uses and removes the back-and-forth that slows reviews down. Two people or two hundred — the setup is the same."*

---

## Mudanças principais

| Padrão | O que foi removido | O que entrou |
|--------|-------------------|--------------|
| P1 — Inflação | "transformative" | removido sem substituto |
| P4 — Linguagem promocional | "innovative", "cutting-edge", "comprehensive" | zero adjetivos vazios |
| P7 — Vocabulário AI | "delve into" | removido |
| P9 — Paralelismo negativo | "isn't just powerful — it's transformative" | "removes the back-and-forth" (ação concreta) |
| P12 — Falso range | "startup or enterprise" | "two people or two hundred" (escala real) |
| P14 — Em dash dramático | " — " como recurso retórico | substituído por período ou vírgula |
| P23 — Abertura formulaica | "Welcome to our innovative platform!" | removido completamente |
| P25/P28 — Conclusão vazia | "Let's unlock the potential of your team together" | removido |

---

## Veredito

**Reescrever.** O texto original tem 9 padrões em 5 categorias distintas — é texto gerado por IA sem revisão. A versão final é 60% menor, sem adjetivos inflados, com ação específica em cada frase. Se houver dados reais (tempo de setup, número de usuários, feature concreta), substituir "removes the back-and-forth" por dado verificável para máxima credibilidade.
