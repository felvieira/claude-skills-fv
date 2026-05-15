# Anti-AI Writing Patterns

**Objetivo:** catálogo de 29 padrões que sinalizam texto gerado por IA. Aplicar antes de publicar qualquer prosa que humanos vão ler: docs, PRDs, copy, changelogs, release notes, summarys.

**Quando aplicar (obrigatório):**
- skill 10 (documenter) — antes de finalizar docs de usuário
- skill 13 (marketing-copy) — antes de publicar copy
- skill 14 (seo-specialist) — antes de publicar artigo/blog
- `/to-prd` — antes de publicar PRD no tracker
- `/humanize` — comando dedicado para revisão completa

**Como usar:** ler cada categoria, identificar ocorrências no texto, reescrever conforme padrão After. Rodar o check final: "O que ainda parece obviamente gerado por IA?" Resolver até não sobrar tells visíveis.

**Crédito:** [blader/humanizer](https://github.com/blader/humanizer) + [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) (WikiProject AI Cleanup).

---

## Categoria 1 — Conteúdo

### 1. Inflação de significado e legado

**Palavras:** stands/serves as, testament, vital/significant/crucial/pivotal role, underscores/highlights its importance, reflects broader, symbolizing its enduring, contributing to, setting the stage for, represents a shift, key turning point, evolving landscape, indelible mark

**Problema:** IA infla a importância de tudo adicionando frases sobre como algo "representa" uma tendência maior.

- **Before:** *"This marks a pivotal moment in the evolution of software development, underscoring its vital role in the modern landscape."*
- **After:** *"This changes how developers write documentation."*

### 2. Ênfase em notabilidade e cobertura de mídia

**Palavras:** independent coverage, featured in [lista de outlets], active social media presence, cited by leading experts

**Problema:** IA lista fontes sem contexto para parecer que está provando notabilidade.

- **Before:** *"Her views have been cited in The New York Times, BBC, and The Guardian. She maintains an active social media presence with 500k followers."*
- **After:** *"In a 2024 NYT interview, she argued that AI regulation should focus on outcomes."*

### 3. Frases com -ing superficiais

**Palavras:** highlighting/underscoring/emphasizing..., ensuring..., reflecting/symbolizing..., contributing to..., fostering..., showcasing...

**Problema:** IA adiciona participio presente para fingir profundidade analítica que não existe.

- **Before:** *"The new policy reduces costs, reflecting the company's commitment to efficiency, contributing to long-term sustainability."*
- **After:** *"The new policy reduces costs."*

### 4. Linguagem promocional

**Palavras:** boasts a, vibrant, rich (figurado), profound, nestled, in the heart of, groundbreaking, renowned, breathtaking, must-visit, stunning, commitment to excellence

**Problema:** IA perde neutralidade especialmente em tópicos culturais ou de produto.

- **Before:** *"Nestled in the heart of downtown, the platform boasts a vibrant community and stunning user experience."*
- **After:** *"The platform has 40,000 active users and a 4.7 rating on G2."*

### 5. Atribuições vagas e weasel words

**Palavras:** industry reports, observers have cited, experts argue, some critics, several sources

**Problema:** IA atribui opiniões a autoridades vagas sem fontes específicas.

- **Before:** *"Experts believe this plays a crucial role in the ecosystem."*
- **After:** *"A 2023 MIT study found that X increases Y by 34%."*

### 6. Seções formulaicas de "Desafios e Perspectivas"

**Palavras:** Despite its... faces challenges, Despite these challenges, Challenges and Legacy, Future Outlook

**Problema:** IA gera seções "Desafios" formulaicas mesmo quando o conteúdo não justifica.

- **Before:** *"Despite its success, it faces challenges typical of the industry. Despite these challenges, it continues to thrive."*
- **After:** *"Turnover increased 15% in 2023. The company has not publicly addressed the trend."*

---

## Categoria 2 — Linguagem e Gramática

### 7. Vocabulário de alta frequência de IA

**Palavras:** actually, additionally, align with, crucial, delve, emphasizing, enduring, enhance, fostering, garner, highlight (verbo), interplay, intricate/intricacies, key (adj), landscape (abstrato), pivotal, showcase, tapestry, testament, underscore, valuable, vibrant

**Problema:** Aparecem 3-5× mais em texto pós-2023. Costumam aparecer juntas.

- **Before:** *"Additionally, it's crucial to highlight the intricate interplay of these pivotal factors."*
- **After:** *"These three factors interact in ways that matter."*

### 8. Evitação de "is/are" (copula avoidance)

**Palavras:** serves as, stands as, marks, represents [a], boasts, features, offers [a]

**Problema:** IA substitui "é/são" por construções elaboradas.

- **Before:** *"The library serves as a foundation for modern development and features over 200 utilities."*
- **After:** *"The library is the foundation for modern development and has over 200 utilities."*

### 9. Paralelismos negativos e negações finais

**Problema:** "Not only... but..." e "It's not just X, it's Y" são superusados. Fragmentos de negação final ("no guessing", "no wasted motion") em vez de cláusulas reais.

- **Before:** *"It's not just about autocomplete; it's about unlocking creativity at scale."*
- **After:** *"It does more than autocomplete — it suggests full implementations."*

### 10. Regra dos três forçada

**Problema:** IA agrupa ideias em três para parecer abrangente mesmo quando não há três coisas distintas.

- **Before:** *"The platform offers speed, reliability, and innovation."*
- **After:** *"The platform is fast and rarely goes down."*

### 11. Variação elegante (synonym cycling)

**Problema:** IA tem penalty de repetição que causa substituição excessiva de sinônimos.

- **Before:** *"The protagonist faces challenges. The main character must overcome obstacles. The central figure triumphs. The hero returns."*
- **After:** *"The protagonist faces many challenges but eventually triumphs and returns home."*

### 12. Falsos ranges

**Problema:** "from X to Y" onde X e Y não estão numa escala significativa.

- **Before:** *"Our journey has taken us from the Big Bang to dark matter, from stars to galaxies."*
- **After:** *"The book covers the Big Bang, stellar formation, and dark matter theories."*

### 13. Voz passiva e fragmentos sem sujeito

**Problema:** IA esconde o agente ou omite o sujeito ("No configuration needed", "Results are preserved automatically").

- **Before:** *"No configuration file needed. The results are preserved automatically."*
- **After:** *"You do not need a configuration file. The system saves results automatically."*

---

## Categoria 3 — Estilo

### 14. Overuse de em dash (—)

**Problema:** IA usa em dash mais que humanos, imitando escrita "incisiva". Na prática, vírgulas ou pontos são mais limpos.

- **Before:** *"The term—promoted by institutions—is misleading—even in official documents."*
- **After:** *"The term, promoted by institutions, is misleading in official documents."*

### 15. Negrito mecânico

**Problema:** IA enfatiza frases em negrito sem critério editorial.

- **Before:** *"It blends **OKRs**, **KPIs**, and the **Business Model Canvas**."*
- **After:** *"It blends OKRs, KPIs, and the Business Model Canvas."*

### 16. Listas com cabeçalho inline em negrito

**Problema:** IA estrutura listas com cabeçalhos em negrito seguidos de texto que repete o cabeçalho.

- **Before:** `- **Speed:** Significantly faster through optimization.`
- **After:** Integrar na prosa ou usar lista simples sem cabeçalho repetitivo.

### 17. Title Case em headings

**Problema:** IA capitaliza todas as palavras principais em títulos.

- **Before:** `## Strategic Negotiations And Global Partnerships`
- **After:** `## Strategic negotiations and global partnerships`

### 18. Emojis decorativos

**Problema:** IA decora headings e bullets com emojis.

- **Before:** `🚀 **Launch Phase:** Q3 rollout`
- **After:** `The product launches in Q3.`

### 19. Aspas curvas (curly quotes)

**Problema:** ChatGPT usa aspas curvas ("...") em vez de retas ("...").

- Substituir `"` e `"` por `"`.

---

## Categoria 4 — Comunicação

### 20. Artefatos de chatbot colados como conteúdo

**Palavras:** I hope this helps, Of course!, Certainly!, Would you like..., let me know, here is a..., I'll be happy to

**Problema:** Texto de resposta de chatbot é colado como conteúdo.

- **Before:** *"Here is an overview. I hope this helps! Let me know if you'd like me to expand."*
- **After:** *"The French Revolution began in 1789 when..."*

### 21. Disclaimers de knowledge cutoff

**Palavras:** as of [date], up to my last training update, while specific details are limited, based on available information

- **Before:** *"While specific details about the founding are not extensively documented..."*
- **After:** *"The company was founded in 1994, per its registration documents."*

### 22. Tom sycofântico

**Problema:** Linguagem excessivamente positiva e complacente.

- **Before:** *"Great question! You're absolutely right. That's an excellent point."*
- **After:** *"The economic factors you raised are relevant here."*

---

## Categoria 5 — Enchimento e Hedging

### 23. Frases de enchimento

| Before | After |
|--------|-------|
| In order to achieve this goal | To achieve this |
| Due to the fact that it was raining | Because it rained |
| At this point in time | Now |
| In the event that you need help | If you need help |
| The system has the ability to process | The system can process |
| It is important to note that | (remover) |

### 24. Hedging excessivo

- **Before:** *"It could potentially possibly be argued that the policy might have some effect."*
- **After:** *"The policy may affect outcomes."*

### 25. Conclusões positivas genéricas

- **Before:** *"The future looks bright. Exciting times lie ahead as we continue our journey toward excellence."*
- **After:** *"The company plans to open two locations next year."*

### 26. Hifenização excessiva de pares comuns

**Palavras:** third-party, cross-functional, client-facing, data-driven, decision-making, well-known, high-quality, real-time, long-term, end-to-end

**Problema:** IA hifeniza esses pares com consistência perfeita. Humanos são inconsistentes.

- **Before:** *"The cross-functional team produced a high-quality, data-driven report."*
- **After:** *"The cross functional team produced a high quality, data driven report."*

(Nota: hifenização em modificadores técnicos ou incomuns está OK.)

### 27. Tropos de autoridade persuasiva

**Palavras:** the real question is, at its core, in reality, what really matters, fundamentally, the deeper issue, the heart of the matter

**Problema:** IA usa essas frases para fingir profundidade antes de uma observação ordinária.

- **Before:** *"The real question is whether teams can adapt. At its core, what really matters is organizational readiness."*
- **After:** *"Whether teams can adapt depends mostly on whether the organization is ready to change habits."*

### 28. Anúncios e signposting

**Palavras:** let's dive in, let's explore, let's break this down, here's what you need to know, without further ado, now let's look at

**Problema:** IA anuncia o que vai fazer em vez de fazer.

- **Before:** *"Let's dive into how caching works. Here's what you need to know."*
- **After:** *"Next.js caches data at three layers: request memoization, data cache, and router cache."*

### 29. Cabeçalhos com parágrafo de aquecimento

**Problema:** Heading seguido de frase genérica que apenas repete o heading antes de começar o conteúdo real.

- **Before:** `## Performance\n\nSpeed matters.\n\nWhen users hit a slow page...`
- **After:** `## Performance\n\nWhen users hit a slow page...`

---

## Checklist final anti-IA

Após reescrever, perguntar: **"O que ainda parece obviamente gerado por IA?"**

Responder com bullets concretos. Revisar. Repetir até não sobrar tells.

Sinais de texto "limpo mas sem alma" (também problemáticos):
- Todas as frases têm o mesmo comprimento e estrutura
- Sem opiniões — só relato neutro
- Sem incerteza ou sentimentos mistos
- Sem perspectiva em primeira pessoa quando caberia
- Sem humor, sem borda, sem personalidade
- Parece artigo da Wikipedia ou press release

**Adicionar alma:**
- Ter opiniões ("I genuinely don't know how to feel about this")
- Variar ritmo (frases curtas. Depois longas que chegam devagar.)
- Reconhecer complexidade ("This is impressive but also kind of unsettling")
- Usar "I" quando cabe
- Deixar entrar alguma bagunça (tangentes, asides)
- Ser específico sobre sentimentos ("there's something unsettling about agents churning at 3am")
