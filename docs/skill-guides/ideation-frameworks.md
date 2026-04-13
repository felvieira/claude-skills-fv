# Ideation Frameworks Guide

Frameworks estruturados de ideação para a fase divergente antes de especificar uma feature.
Use quando o requisito for vago, inovador, ou quando o time estiver travado em uma abordagem.

Referenciado por: `skills/01-po-feature-spec/SKILL.md`

---

## Quando Usar Frameworks de Ideação

- Requisito vago ("melhore a experiência de busca", "faça o onboarding melhor")
- Feature sem referência clara no mercado — nada óbvio a copiar
- Stakeholder indeciso entre abordagens — nenhuma opção está claramente melhor
- Solução atual não está funcionando e precisa de nova perspectiva

**Não usar quando:**
- Requisito é claro e específico (user story já definida)
- É uma task de implementação, não de descoberta
- O time já convergiu em uma abordagem validada

---

## Framework 1: SCAMPER

**Quando usar:** melhorar uma feature existente, encontrar variações não óbvias

**Como funciona:** Para cada letra, gere 1-2 ideias aplicadas ao problema atual.

| Letra | Pergunta |
|-------|----------|
| **S**ubstitute | O que pode ser substituído? Componente, processo, regra, formato? |
| **C**ombine | O que pode ser combinado com outra feature ou sistema? |
| **A**dapt | O que de outro domínio pode ser adaptado aqui? |
| **M**odify / Magnify | O que pode ser ampliado, reduzido, ou modificado? |
| **P**ut to other use | Como esta feature pode servir a um propósito diferente? |
| **E**liminate | O que pode ser removido sem perder o valor central? |
| **R**everse / Rearrange | O que acontece se inverter o fluxo ou reordenar as etapas? |

**Exemplo — Feature de busca:**
- Eliminate: o que acontece se removermos filtros e usarmos apenas NLP?
- Reverse: e se o sistema sugerisse buscas antes do usuário digitar?
- Combine: e se a busca integrasse com o histórico de ações do usuário?

---

## Framework 2: How Might We (HMW)

**Quando usar:** reformular um problema como oportunidade, desbloquear quando o time está travado

**Como funciona:** Reformule o problema como uma pergunta aberta que convida soluções.

**Template:** "Como poderíamos [ação desejada] sem [restrição atual]?"

**Variações úteis:**
- "Como poderíamos [ação] de forma que [resultado positivo]?"
- "Como poderíamos eliminar [problema] sem introduzir [problema secundário]?"

**Exemplo — Onboarding:**
- "Como poderíamos onboar usuários sem exigir cadastro completo?"
- "Como poderíamos mostrar valor antes do primeiro login?"
- "Como poderíamos reduzir onboarding de 5 passos para 1 sem perder contexto necessário?"

**Output:** 5-10 HMW questions, então votar nas mais promissoras para explorar

---

## Framework 3: First Principles

**Quando usar:** resolver problema não-óbvio, questionar suposições do domínio, proposta de reescrita

**Como funciona:** 3 passos sequenciais.

**Passo 1 — Listar suposições:**
Escreva todas as suposições implícitas na solução atual ou no problema.
Exemplo: "assumimos que precisamos de um banco relacional", "assumimos que o usuário precisa de login"

**Passo 2 — Questionar cada suposição:**
Para cada suposição, pergunte: "Esta suposição é necessariamente verdadeira? O que acontece sem ela?"

**Passo 3 — Reconstruir sem suposições falsas:**
Com as suposições falsas removidas, qual é a solução mais simples?

**Exemplo — Sistema de permissões:**
- Suposição: "precisamos de roles complexas com permissões granulares"
- Questão: "Os usuários realmente precisam de permissões granulares, ou só precisam de 2-3 níveis de acesso?"
- Reconstrução: "Simplicar para admin/editor/viewer cobre 95% dos casos e elimina toda a complexidade de gestão"

---

## Framework 4: Jobs To Be Done (JTBD)

**Quando usar:** entender motivação real do usuário, priorizar features por impacto real

**Como funciona:** Formular o problema do ponto de vista do que o usuário está tentando realizar.

**Template:** "Quando [situação específica], quero [ação desejada], para que [resultado esperado]."

**Regras:**
- A situação deve ser específica, não genérica ("quando estou revisando um PR grande" não "quando uso o sistema")
- A ação é o que o usuário quer fazer, não o que o sistema deve fazer
- O resultado é o benefício real, não a feature em si

**Exemplos:**
- "Quando estou revisando um PR grande, quero ver só os arquivos que mudaram lógica, para que eu não perca tempo com formatação"
- "Quando estou onboardando um novo dev, quero um setup que funciona em 1 comando, para que eu não precise pair-programar o setup"
- "Quando o deploy falha em produção, quero ver o erro em 30 segundos, para que eu possa decidir se é rollback ou fix-forward"

**Output:** 3-5 JTBD statements, ordenados por frequência e impacto do job

---

## Ordem de Uso Recomendada

Para um requisito vago, use nesta ordem:
1. **JTBD** — entender o job real antes de qualquer solução
2. **HMW** — reformular como oportunidade
3. **SCAMPER** — explorar variações da solução escolhida
4. **First Principles** — se nenhuma solução existente está funcionando
