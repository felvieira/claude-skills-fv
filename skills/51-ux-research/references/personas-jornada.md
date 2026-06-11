# Personas, Jornada e Arquitetura de Informação

Destilado de Fabricio Teixeira, *UX Design — Introdução e boas práticas* (Casa do Código), caps. 2, 11, 12. Templates acionáveis.

## 1. Persona — template

Retrato do público-alvo que destaca dados demográficos, **comportamentos, necessidades e motivações**, via personagem fictício **baseado em insights de pesquisa**. Função: fazer designers e devs criarem **empatia** com o consumidor durante o design.

```
PERSONA: [nome] — "[frase-resumo do que essa pessoa quer]"

Foto/avatar | Idade | Ocupação | Contexto de vida

DEMOGRAFIA
- idade, gênero, localização, renda, escolaridade, familiaridade com tecnologia

COMPORTAMENTO
- como resolve o problema HOJE (sem o produto)
- ferramentas/métodos atuais
- frequência e contexto de uso (casa/trânsito/trabalho; que horas; uso constante ou pontual)

NECESSIDADES, ANSEIOS, MOTIVAÇÕES
- o que a leva a buscar uma solução
- principais tarefas que quer realizar
- dor principal (nas palavras dela)

PARTICULARIDADES que influenciam decisões de design
- habilidade técnica, acesso a dispositivos, restrições de contexto

FONTE DA PESQUISA
- [entrevistas X, métricas Y, suporte Z] — ou marcar [PROTO-PERSONA: hipótese, não validada]
```

**Regras:**
- persona é destilada de **pesquisa real**. Sem dado → marcar como **proto-persona** (hipótese a validar)
- foca no **comportamento e necessidade** que conectam perfis demográficos diferentes num grupo consistente — não só na demografia
- 1-3 personas por produto; mais que isso dilui o foco

## 2. Mapa de Empatia (apoio à persona)

Quadrantes ao redor do usuário, preenchidos com pesquisa:
- **Pensa e sente** (preocupações, aspirações)
- **Vê** (ambiente, ofertas dos concorrentes)
- **Fala e faz** (comportamento declarado vs. observado — atenção à divergência)
- **Ouve** (influência de amigos, chefes, mídia)
- **Dores** (frustrações, obstáculos, riscos)
- **Ganhos** (desejos, métricas de sucesso do próprio usuário)

## 3. Mapa de Jornada (Consumer/User Journey Map)

Diagrama dos múltiplos passos (alguns invisíveis) que o consumidor toma ao se engajar com o serviço. Permite definir motivações e necessidades em cada etapa e criar soluções de design apropriadas para cada uma.

```
ETAPA →      Descoberta   Consideração   Uso/Tarefa   Pós-uso/Suporte
AÇÕES        o que faz    ...            ...          ...
PENSA/SENTE  ...          ...            ...          ...
DORES        fricção      ...            ...          ...
OPORTUNIDADE melhoria     ...            ...          ...
TOQUES       site/app/loja/call-center/email (multicanal)
```

**Relacionados no livro:**
- **Blueprint** — mapa de todos os pontos de contato consumidor↔marca + processos internos que sustentam a interação. Visualiza caminho multicanal (site, SAC, loja física), identifica oportunidades
- **Fluxo do usuário (user flow)** — representação visual do caminho para completar uma tarefa (home → produto → carrinho → checkout). Identifica passos a melhorar/redesenhar
- **Storyboard** — HQ das ações do consumidor em situação real; gera empatia e dá noção de escopo
- **Cenários e casos de uso** — lista de cenários possíveis (logado, não-logado, primeira visita, lista com 0/1/200 itens)

## 4. Arquitetura de Informação (AI)

Raiz na biblioteconomia: organizar e catalogar para ser facilmente **encontrado** pelo visitante.
Perguntas-guia:
- como as informações são organizadas no menu para acesso fácil?
- qual perfil de usuário busca qual tipo de informação?
- como os itens estão ordenados, agrupados, organizados na estrutura?

**Sitemap** — diagrama das páginas organizadas hierarquicamente. Visualiza estrutura e navegação.
**Auditoria de conteúdo** — lista de todo o conteúdo do site; base para estratégia de conteúdo.

## 5. Card Sorting

Pedir aos usuários que **agrupem** conteúdos/funcionalidades em categorias. Dá input direto sobre **hierarquia de conteúdo, organização e taxonomia** — a estrutura sai da cabeça do usuário, não da do time.
- **aberto**: usuário cria e nomeia as categorias (descobre o modelo mental)
- **fechado**: usuário encaixa itens em categorias pré-definidas (valida estrutura proposta)

## 6. Taxonomia

Organizar e **rotular** a informação de forma que faça sentido para o usuário. Decisões reais:
- "Refrigeradores" ou "Geladeiras"? E se buscar "Freezer"?
- o perfil demográfico do usuário está habituado com aquela linguagem?
- como classificar editorias de um portal?

Usar a **linguagem do usuário** (capturada em focus group/entrevista), não o jargão interno. Conecta com a heurística de Nielsen "compatibilidade com o mundo real" (skill 02).

## 7. Proposição de Valor (produto novo)

Método redutivo dos estágios iniciais. Define o produto e afunila as opções. Responde:
- **Por quê** investir? Qual a oportunidade de negócio? Que dado comprova viabilidade?
- **O que** é o produto? Função principal? Como se diferencia dos competidores?
- **Para quem**? Perfil demográfico + (mais importante) o **comportamento/necessidade** que une perfis diferentes num grupo consistente
- **Onde e quando** será usado? Frequência? Casa/trânsito/trabalho? Uso constante ou pontual?
- **Como** queremos que usem? Qual o objetivo de UX? Que sensação causar? Que problema resolver?
- **E a final:** de tudo isso, o que é **mais importante**?

**Princípio:** "o que você não desenha também é design." Saber dizer **não** a features evita o "produto Frankenstein" (toneladas de função, ninguém usa). Mais função ≠ produto melhor (iPhone lançou sem copy/paste).

## 8. Priorização orientada ao usuário

Ponte para o PO (01) — research informa a priorização:

**Levantamento de casos de uso:**
1. Quais os casos de uso mais comuns?
2. Quais os participantes/players envolvidos?
3. Quais funcionalidades eles usam para realizar a tarefa?
4. Dessas, quais são **estritamente necessárias** para a ação ocorrer?

Resultado típico: um pequeno grupo de features responde por **80-90%** do uso; outras mal chegam a 1%.

**Kano Model** (Noriaki Kano) — matriz Satisfação do consumidor × Esforço de execução:
- canto inferior direito: **mínimo necessário** para evitar frustração (cumprir primeiro)
- canto superior esquerdo: **quick hits** — baixo esforço, alto impacto na experiência

**Estratégia dos cupcakes** (Adaptive Path) — não entregue "bolo com recheio e cobertura" em sequência (seco e sem graça no meio). Entregue um **cupcake**: menor, mas completo, bonito e saboroso por si só. Depois um maior. Conecta com vertical slices da skill 01.

## 9. Handoff dos artefatos

- **persona + mapa de empatia** → skill 01 (contexto do usuário na spec) e skill 02 (empatia no design)
- **jornada + fluxo + cenários** → skill 02 (base dos fluxos de tela e estados)
- **AI + taxonomia + card sorting** → skill 02 (estrutura de navegação, menu, rótulos)
- **proposição de valor** → skill 01 (escopo IN/OUT, priorização, métricas de sucesso)
