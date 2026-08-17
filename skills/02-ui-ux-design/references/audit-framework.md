# Framework de Auditoria e Implementação UI/UX

Carregar só quando a tarefa for **revisar** ou **corrigir** uma interface existente — não ao desenhar do zero (isso é o SKILL.md principal). Este arquivo é o protocolo que a skill 02 segue nesses dois modos.

## Dois Modos — Nunca Misturar

| Modo | Quando entra | Ação sobre arquivos |
| --- | --- | --- |
| **Auditoria** | pedido pede analisar, revisar, avaliar, dar parecer | **nenhuma alteração**. Produz achados e recomendação, não diff |
| **Implementação** | pedido autoriza explicitamente mudança ("corrija", "implemente", "aplique") | edita, com escopo restrito à causa identificada |

Se o pedido é ambíguo entre os dois, tratar como auditoria e perguntar antes de editar. Editar arquivo num pedido que só pedia opinião é o erro mais caro deste protocolo — não é reversível de graça (revisão de PR, retrabalho, confiança).

## Fluxo — 9 Passos, Nesta Ordem

1. **Inspecionar antes de opinar.** Produto real (se acessível), repositório, instruções do projeto (`CLAUDE.md`, design tokens existentes, convenções). Achado sem ter visto o produto de verdade é suposição vestida de auditoria. Se a auditoria é comparação entre dois estados (antes/depois, design/implementação) e o achado depende de medir posicionamento/espaçamento/cor fino, seguir `policies/visual-diff-precision.md` — uma comparação numa passada só captura diferença grande e perde a fina.
2. **Classificar o contexto.** Tipo de produto, público, tarefa principal da tela, plataforma, restrições técnicas, métrica de sucesso. Toda suposição inevitável (não dá pra descobrir e é preciso seguir) se declara explicitamente — nunca vira fato silencioso no relatório.
3. **Ler só as referências aplicáveis** (ver tabela abaixo) — carregar as 8 de uma vez é desperdício de contexto quando a tarefa é, por exemplo, só sobre um formulário.
4. **Mapear a jornada antes de avaliar decoração.** Happy path, exceções, estados, recuperação de erro — nessa ordem. Avaliar cor e tipografia antes de saber se o fluxo fecha é folha em cima de fundação rachada.
5. **Classificar cada achado** (ver seção própria abaixo) em `norma` / `evidência` / `heurística` / `preferência`. Nunca apresentar preferência estética como falha objetiva — é a linha que separa auditoria de gosto pessoal com autoridade emprestada.
6. **Priorizar por severidade × alcance × frequência × confiança** (ver seção própria). Bloqueio e risco vêm antes de polimento, sempre.
7. **Se autorizado a implementar**: preservar stack, padrões e identidade existentes. Corrigir a causa mais simples, sem reescrever área não relacionada — ver `skills/23-migration-refactor-specialist/SKILL.md` se o escopo real for maior que um fix pontual.
8. **Verificar**: comportamento, acessibilidade, responsividade, conteúdo extremo, estados, regressão. Rodar os testes que existem — não afirmar cobertura que não foi executada (`policies/claim-verification.md`).
9. **Entregar**: resultado, evidência, arquivos alterados (se modo implementação), validações rodadas, limitações reais — não maquiadas.

## Referências por Tipo de Produto — Ler Só a Aplicável

| Situação | Onde |
| --- | --- |
| Fundamentos, severidade, formato de saída | este arquivo |
| Site institucional, landing page, pricing, conversão | `references/marketing-surfaces.md`, mais `skills/61-content-growth-engine/SKILL.md` se o escopo incluir estratégia de conteúdo, não só a página |
| SaaS, dashboard, tabela de dados, navegação | `references/product-apps.md` |
| Mobile nativo ou responsivo | `skills/57-mobile-ux-foundations/SKILL.md` (thumb zone, dark mode, performance percebida) e `skills/56-responsive-conversion/SKILL.md` (breakpoint, conteúdo extremo, correção de layout quebrado) |
| Formulário, checkout, tratamento de erro | `references/forms-and-transactions.md` |
| Acessibilidade e verificação | `skills/22-accessibility-specialist/SKILL.md` — não duplicado aqui |
| Tokens, componente, governança de design system | seção "Três Camadas de Token" e "Adotar um Design System Existente" no SKILL.md principal |
| Fontes e limites das regras aplicadas | seção "Hierarquia de Evidência" abaixo |

## Classificar Cada Achado

Todo achado do relatório carrega uma destas quatro etiquetas — a etiqueta é o que impede a auditoria de virar opinião com verniz de autoridade:

| Categoria | O que significa | Exemplo |
| --- | --- | --- |
| **Norma** | requisito legal, regulatório ou de contrato que o produto tem que cumprir | WCAG 2.1 AA é requisito do cliente; contraste 3.2:1 no texto do corpo é violação de norma, não opinião |
| **Evidência** | comportamento observado, métrica do produto, teste de usabilidade real | "68% dos usuários abandonam neste passo do checkout" (com a fonte do dado) |
| **Heurística** | princípio consolidado (Nielsen, leis cognitivas — ver SKILL.md principal) sem dado específico deste produto | "três CTAs de mesmo peso visual violam Von Restorff" — verdadeiro em geral, não medido aqui |
| **Preferência** | gosto estético sem base normativa, empírica ou heurística | "eu prefeririaum tom de azul mais escuro" — legítimo de mencionar, nunca como item de severidade alta |

Regra dura: **preferência nunca vira "bloqueador" ou "correção obrigatória"** na tabela de achados. Se o único argumento para mudar algo é gosto, isso vai na seção de sugestões opcionais, rotulado como tal — não na tabela de severidade.

## Hierarquia de Evidência — Preferir Nesta Ordem

1. **Comportamento observado, requisito e métrica do produto** — o que o produto de fato faz e o que ele precisa fazer
2. **Padrões do design system e convenção de plataforma** — o que já foi decidido para este produto especificamente
3. **WCAG e documentação oficial** — norma, não opinião
4. **Pesquisa com usuário e teste de usabilidade** — quando existe; nunca inventada (ver Anti-Padrões)
5. **Heurística consolidada** — Nielsen, leis cognitivas do SKILL.md principal
6. **Preferência visual** — sempre rotulada como tal, nunca disfarçada de item 1-5

Uma recomendação apoiada só no nível 6 é a mais fraca do relatório e precisa dizer isso.

## Priorizar por Severidade × Alcance × Frequência × Confiança

Quatro eixos, não um score único — a combinação é que decide a ordem, não a média:

| Eixo | Pergunta |
| --- | --- |
| **Severidade** | se acontecer, quão ruim é? (bloqueia a tarefa vs. incomoda vs. estético) |
| **Alcance** | quantos usuários/telas isso afeta? |
| **Frequência** | isso acontece toda sessão, ou só num caminho raro? |
| **Confiança** | quão certo estou de que é isso mesmo, e não uma leitura errada do contexto? |

Bloqueio de tarefa principal com alta confiança sempre vem antes de refinamento visual, mesmo que o refinamento afete mais telas. Achado de baixa confiança nunca vira item de severidade alta — vira pergunta de validação ("suspeito que X, confirmar com teste de usabilidade") em vez de afirmação.

## Formato de Saída da Auditoria

Síntese executiva primeiro (3-5 linhas: o que está funcionando, o que bloqueia, e a prioridade recomendada) — depois a tabela:

```
| ID | severidade | tela/fluxo | achado | evidência | impacto | correção | confiança |
|----|-----------|------------|--------|-----------|---------|----------|-----------|
| 01 | bloqueador | checkout/passo-2 | campo de CEP não aceita colar | comportamento observado | usuário com CEP salvo no clipboard não completa a compra | permitir paste, remover onpaste preventDefault | alta |
```

Separar em três blocos: **bloqueadores** (impedem a tarefa principal), **melhorias importantes** (não bloqueiam mas custam conversão/retenção/confiança), **refinamentos** (polimento, baixo impacto). Pontos positivos só entram quando explicam o que precisa ser **preservado** durante uma implementação futura — não como elogio genérico.

## Regras de Implementação (Modo Implementação Apenas)

- Localizar componente, token e padrão reutilizável **antes** de criar novo — grep no design system existente primeiro
- Manter semântica HTML e comportamento por teclado; preferir controle nativo (`<button>`, `<select>`) a recriar do zero
- Implementar todo estado relevante ao contexto: inicial, loading, vazio, erro, sucesso, disabled, offline, sem-permissão — nem todos se aplicam a toda tela, mas nenhum se aplica sem checar (ver seção "Estado Vazio" e "Skeleton Loading" no SKILL.md principal)
- Responsividade é mudança de **prioridade e composição**, não redução proporcional do desktop — ver `skills/56-responsive-conversion/SKILL.md`
- Preservar dado do usuário após falha; oferecer recuperação para ação destrutiva quando possível (desfazer, ou confirmação com nome digitado — ver skill 56)
- Nunca depender só de hover, cor, gesto ou animação para informação crítica
- Não introduzir dark pattern, urgência falsa, custo oculto ou consentimento enganoso — ver seção "Dark Patterns" no SKILL.md principal
- Não embelezar interface operacional às custas de densidade, velocidade ou previsibilidade — dashboard denso bem estruturado bate landing page bonita e lenta pro trabalho que ele faz

## Definição de Pronto

Considerar concluído só quando:

- tarefa principal e próximo passo estão compreensíveis sem explicação adicional
- fluxo crítico e recuperação de erro estão cobertos, não só o caminho feliz
- os estados relevantes existem (não todos os 8 — os que o contexto exige)
- teclado, foco, nome acessível e contraste foram verificados (não afirmados sem checar)
- layout funciona nos intervalos relevantes de largura e com conteúdo extremo (nome longo, lista vazia, lista com 500 itens)
- a mudança respeita padrão existente — não introduziu um segundo sistema de botão
- teste e verificação executados estão relatados como realmente foram, sem inflar cobertura

## Anti-Padrões Deste Protocolo

- **Editar arquivo num pedido que só pedia análise** — a fronteira entre os dois modos é a primeira decisão, não um detalhe
- **Inventar persona, métrica, teste de usuário ou impacto de conversão** — se não foi medido, é hipótese, e hipótese se declara como hipótese com como-medir junto, nunca como fato ("essa mudança vai aumentar conversão" é proibido sem dado; "hipótese: X reduz abandono no passo 2, medir por Y" é permitido)
- **Apresentar preferência como falha objetiva** — é o vício mais comum de review de design e o que mais corrói a confiança no processo
- **Tabela de achados sem coluna de evidência ou confiança** — vira lista de reclamações, não auditoria
- **Reescrever área não relacionada ao achado** durante o modo implementação — escopo cresce, review fica impossível de revisar de verdade
- **Afirmar cobertura de teste que não rodou** — "testei em mobile" quando não testou é o tipo de claim que `policies/claim-verification.md` existe para pegar
