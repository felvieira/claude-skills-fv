---
name: persona-driven-issue-audit
description: |
  Skill de auditoria em massa de produto existente via personas simuladas, com pipeline completo
  ate PR: persona-testing encontra bugs reais de usabilidade e navegacao, issues sao abertas com
  dedup, um agente analista cruza cada issue com a codebase e comenta solucao, uma frota paralela
  de agentes abre PR onde a confianca e alta (ou comenta wontfix onde nao e), e um reviewer aprova
  ou rejeita cada PR. Termina em issues residuais para triagem humana, nunca em merge automatico.
  Use quando precisar auditar um produto (nao uma feature) do ponto de vista de usuarios reais
  variados, gerar volume de findings de UX/navegacao/encontrabilidade, ou escalar triagem de bug
  encontrado por IA sem virar gargalo de review humano.
  Trigger em: "auditar o produto com personas", "auditar o produto simulando usuarios",
  "testar como usuario real", "simular usuarios", "simular usuario nao tecnico",
  "impersonar persona", "encontrar bugs de usabilidade em massa", "auditoria de 100 issues",
  "100 issues numa auditoria", "triar issues", "triagem em massa de issues",
  "frota de agentes de fix", "agentes paralelos abrindo PR", "dedup de issue",
  "issue duplicada de bug", "wontfix em lote", "abrir pr automatica ou comentar wontfix",
  "quais issues sao reais", "quantas prs aprovar automaticamente",
  "prs aprovadas automaticamente", "escalar QA exploratorio com IA".
argument-hint: "[--fase=personas|testar|analisar|fix|review|triagem] [--max-agentes=N]"
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(gh *), Agent
---

# Persona-Driven Issue Audit — Auditoria em Massa via Personas Simuladas

Testar um produto do ponto de vista de N usuarios reais diferentes, converter cada fricção em issue, e escalar a triagem sem trocar "gargalo de QA" por "gargalo de review". O funil e o produto: cada fase existe para reduzir volume com confiança crescente, ate sobrar só o que exige julgamento humano.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/tool-safety.md`, `policies/verification-before-completion.md` e `policies/swarm-protocol.md` (mecânica de fan-out paralelo e circuit-breaker, herdada — não reimplementada).

**Fronteira com as skills vizinhas** — esta skill decide o **funil de descoberta e triagem**. Ela nao reimplementa:

- `commands/swarm.md` — implementa **feature nova a partir de spec**, worktree isolado, Ralph loop story-by-story. Esta skill audita **produto existente**, unidade de trabalho e persona → issue, nao story. A Fase 4 (fix paralelo) reaproveita o padrao de fan-out do swarm — N agentes fresh, cada um consumindo 1 unidade — mas sobre issues, nao stories
- `skills/06-security-review/SKILL.md` — se uma persona encontra uma vulnerabilidade (nao so friccao de UX), a issue e rotulada `security` e vai para review de seguranca, nao para o reviewer de qualidade geral desta skill
- `skills/11-reviewer/SKILL.md` — a Fase 5 (review de PR) usa os mesmos criterios de aprovacao/rejeicao da skill 11; esta skill so define o **volume e o corte de confiança** que chega ate ela
- `skills/34-static-analysis/SKILL.md` — cobre bug de codigo achado por scanner estatico (Semgrep/CodeQL). Esta skill cobre bug de **experiência** achado por simulação comportamental — a intersecção é pequena (uma persona pode tropeçar num bug que também aparece em SAST) e nesse caso as duas issues devem ser linkadas, não duplicadas
- `skills/51-ux-research/SKILL.md` — persona ali e artefato de pesquisa com usuario real (entrevista, journey map). Aqui a persona e simulada para gerar cobertura de teste — não confundir uma com a outra num handoff

## Quando Usar

- produto já em produção precisa de uma varredura ampla de usabilidade/navegação antes de um marco (release, migração, redesign)
- suspeita de que bugs de UX estão sendo perdidos porque QA testa só o caminho feliz de um perfil técnico
- volume de findings esperado é grande o bastante para que review humano item-a-item seja o gargalo, não a descoberta
- precisa transformar uma auditoria exploratória em issues rastreáveis e, quando possível, em PR pronta

## Quando Não Usar

- feature nova sendo construída a partir de spec — isso é `/swarm` ou skill 01→09, não esta
- 1-2 bugs pontuais já conhecidos — abrir a issue direto, o funil de 6 fases é overhead
- produto sem ambiente de teste seguro (sem staging, sem dados sintéticos) — nunca rodar persona-testing em produção com dados reais de cliente
- o objetivo é pesquisa qualitativa com usuário real, não simulação — isso é skill 51

## Entradas Esperadas

- pasta de personas (`personas/*.md`), cada uma com: nível de conhecimento técnico, objetivo no produto, dispositivo/contexto de uso, o que ela NÃO sabe fazer
- acesso de leitura ao produto (URL de staging, ou app local) e à documentação existente
- acesso de escrita ao repositório GitHub (issues + branches; PR requer permissão de push)
- critério de confiança mínima para abrir PR automática (default: alto — ver Fase 4)
- limite de agentes paralelos (default: 10 — mesmo teto de concorrência do `Workflow`)

## Saídas Esperadas

- N issues abertas no repositório, cada uma com persona, link, passo-a-passo de reprodução
- issues comentadas com solução proposta, prós e trade-offs
- PRs abertas onde a confiança permitiu, com resultado de review (aprovada/rejeitada/precisa de humano)
- lista final de issues residuais para distribuição humana, com motivo de cada uma não ter sido resolvida por IA
- relatório de funil: quantas entraram, quantas sobreviveram em cada fase, e por quê

---

## Fase 1 — Personas

Cada persona é um `.md` com, no mínimo:

- **nível de conhecimento**: técnico / não-técnico / avançado no domínio mas novo na ferramenta
- **objetivo concreto** na sessão de teste (não "explorar o produto" — "encontrar onde cancelar a assinatura")
- **contexto de uso**: dispositivo, urgência, se é o primeiro acesso ou uso recorrente
- **o que ela explicitamente não sabe fazer** — é isso que produz o bug de encontrabilidade que um QA técnico nunca reproduz, porque o QA técnico já sabe onde tudo está

Cobertura mínima recomendada: pelo menos uma persona técnica, uma não-técnica, uma com dificuldade declarada (baixa visão, pouca familiaridade com o idioma da interface, conexão lenta), e uma adversarial (tenta quebrar o fluxo de propósito — volta, duplo clique, campo vazio).

Personas viram **contexto do agente de teste**, não uma lista de casos de teste escritos por um humano. A diferença importa: uma persona bem escrita deixa a IA descobrir a fricção; um caso de teste escrito à mão só verifica o que o autor já esperava.

## Fase 2 — Persona-Testing

Uma skill de teste costurada ao produto específico (navegabilidade, arquitetura de informação, documentação disponível) impersona cada persona e explora o produto com o objetivo dela, podendo despachar `mcp__Claude_Browser__*`, `mcp__claude-in-chrome__*` ou Playwright conforme o ambiente.

Regras da fase:

- **um agente por persona, contexto fresco** — se o mesmo agente testa duas personas em sequência, o conhecimento adquirido testando a primeira contamina a segunda (a persona não-técnica "aprende" um atalho que só a técnica descobriria)
- **a exploração segue o objetivo da persona, não um roteiro fixo** — se a persona não-técnica não acha o botão de cancelamento em 3 tentativas razoáveis, isso *é* o achado, não uma falha de teste
- **todo achado vira candidato a issue com: URL/rota exata, persona, o que ela esperava vs. o que aconteceu, passo-a-passo mínimo de reprodução** — sem passo-a-passo a issue nasce não-acionável e a Fase 3 não consegue analisar
- **ambiente isolado de dados reais** — staging ou dataset sintético. Persona adversarial testando em produção com dado de cliente real é incidente, não achado

### Dedup antes de abrir

Duas personas frequentemente tropeçam na mesma causa raiz por caminhos diferentes (persona A não acha o botão porque o menu está escondido; persona B clica errado pelo mesmo motivo). Antes de abrir issue nova:

1. buscar issues abertas nesta run pela **rota afetada**, não pelo texto do título — título varia por persona, rota não
2. se a rota bate, comparar causa: mesma causa raiz → comentar na issue existente com a nova persona e reprodução, não duplicar
3. se a rota bate mas a causa é outra (dois bugs diferentes na mesma tela) → issue nova, com referência cruzada à existente
4. issue de segurança encontrada durante persona-testing nunca se mistura com issue de UX — abre separada, rotulada, e vai para `skills/06-security-review`

Dedup ruim gera o resultado inverso do pretendido: 100 issues das quais 60 são a mesma raiz not-so-differently descrita não é "cobertura", é ruído que a Fase 3 paga para reprocessar 60 vezes.

## Fase 3 — Análise de Solução

Um agente com contexto rico do produto (arquitetura, convenções, decisões registradas) passa issue por issue, cruza com a codebase, e comenta: causa provável, solução sugerida, trade-offs.

Este agente **não corrige nada** — só analisa e comenta. Separar análise de fix intencionalmente: um agente que já decidiu a solução tende a implementá-la rápido demais e pular alternativas; comentar primeiro cria um registro que a Fase 4 (ou um humano) pode contestar antes que vire código.

Toda issue sai desta fase com um rótulo de confiança implícito no comentário — mesmo que a Fase 4 seja quem decide o corte, a Fase 3 precisa expor o raciocínio suficiente para essa decisão ser auditável depois.

## Fase 4 — Fix Paralelo (frota)

N agentes (default: 10, mesmo teto do `Workflow`), cada um clone do perfil "engenheiro frontend/arquitetura", cada um consome **uma issue**, lê o comentário de análise da Fase 3, decide:

- **confiança alta** → implementa o fix, abre PR referenciando a issue, descreve a mudança e por que a confiança era alta
- **confiança baixa** → comenta `wontfix` (ou `needs-human`) na issue com o motivo específico — "requer decisão de produto sobre X", "toca lógica de billing, fora do escopo de auto-fix", "reprodução inconsistente" — nunca um wontfix genérico

**Critério de confiança alta não é "o código compila"**: exige (a) causa raiz identificada com certeza razoável na Fase 3, (b) fix local — não atravessa múltiplos módulos ou muda contrato de API, (c) coberto por teste existente ou trivialmente testável, (d) fora de área sensível declarada pelo projeto (pagamento, auth, dado pessoal — ver `skills/06-security-review`). Fora disso, `wontfix`/`needs-human` é a resposta correta, e um agente que abre PR de baixa confiança só move o custo do review da Fase 3 para a Fase 5.

Regras de isolamento: cada agente roda em contexto fresco (nunca herda o que outro agente da frota decidiu — evita viés de "a issue anterior era assim, essa deve ser parecida"); paralelismo é entre issues, nunca duas frotas tocando a mesma issue ao mesmo tempo (mesma razão do swarm: `policies/swarm-protocol.md` já proíbe spawn paralelo não-Ralph sobre a mesma unidade de trabalho, por risco de race condition no git).

## Fase 5 — Review

Um agente reviewer (skill 11 + `skills/06-security-review` quando aplicável) passa PR por PR com os critérios normais de aprovação — não um critério mais frouxo só porque o volume é alto.

Saídas possíveis por PR: **aprovada** (com o motivo específico no comentário — não "LGTM"), **rejeitada** (fechada, com o motivo — inclui "mudança inútil" e "só comentário de enhancement, fora de escopo", que são achados legítimos do funil, não falha dele), ou **revisão manual** quando o reviewer automático não tem confiança suficiente para decidir sozinho.

PR aprovada pelo reviewer **não é PR mergeada**. Merge continua decisão humana — ver Anti-Padrões.

## Fase 6 — Triagem Final

O que sobra depois da Fase 5 (PRs rejeitadas voltando a issue, mais os `wontfix`/`needs-human` da Fase 4) passa por uma triagem humana leve antes da distribuição ao time:

1. eliminar falso positivo (persona reproduziu algo que não é bug — comportamento esperado mal descrito)
2. eliminar duplicata que a Fase 2 não pegou (acontece; dedup por rota não é infalível)
3. o que sobra — issues objetivas e específicas que a IA analisou mas não resolveu com confiança — vai para o time como trabalho humano+IA, com o comentário de análise da Fase 3 como ponto de partida, não do zero

## Anti-Padrões

- **Merge automático de PR aprovada pela Fase 5** — review de IA reduz o que humano precisa olhar, não substitui a decisão de integrar. Mesma regra do `/swarm`: `--auto-merge` é decisão separada e nunca default
- **Persona-testing em produção com dado real de cliente** — ambiente isolado é requisito de entrada, não boa prática opcional
- **Pular o comentário de análise (Fase 3) e ir direto ao fix** — sem o registro do raciocínio, uma Fase 5 que rejeita a PR não tem o que auditar, e o próximo humano não sabe por que aquele fix foi tentado
- **`wontfix` sem motivo específico** — "não deu pra resolver" não ajuda a triagem final a decidir se vale reabrir com outro agente ou é definitivamente humano
- **Dedup só por título** — título varia por persona (cada uma descreve a fricção com suas palavras); a chave de dedup é a rota afetada + causa raiz
- **Confiança alta redefinida para aumentar volume de PR** — o objetivo do funil é reduzir para o que é seguro automatizar, não maximizar quantas PRs saem. Mais PR de baixa confiança só transfere trabalho para a Fase 5
- **Misturar achado de segurança com achado de UX na mesma issue** — vulnerabilidade tem tratamento, retenção e divulgação diferentes; nunca deixar que o volume da auditoria vire uma vulnerabilidade discutida em issue pública igual a um botão fora do lugar
- **Reportar "100 issues encontradas" como métrica de sucesso isolada** — o número que importa é o funil completo (quantas eram reais, quantas foram resolvidas por IA com segurança, quantas exigiram humano) e o tempo do time recuperado, não o volume bruto de output do topo

## Evidência de Conclusão

- toda issue aberta tem persona, rota, expectativa vs. resultado, e passo-a-passo de reprodução
- taxa de dedup registrada (issues abertas vs. comentários em issue existente) — número alto de dedup é sinal de que a Fase 2 está saudável, não de que há menos bugs
- toda PR aberta pela Fase 4 referencia a issue e declara por que a confiança era alta
- todo `wontfix`/`needs-human` tem motivo específico, não genérico
- relatório de funil com contagem por fase: personas → achados → issues (pós-dedup) → PRs abertas → PRs aprovadas → issues residuais para o time
- nenhum merge automático — todo PR aprovado aguarda decisão humana explícita

## Handoff

- **Security Review (06):** qualquer achado de vulnerabilidade durante persona-testing ou análise, isolado do fluxo de UX
- **Reviewer (11):** critérios de aprovação/rejeição de PR na Fase 5
- **UX Research (51):** quando um padrão de fricção recorrente sugere que vale investigar com usuário real, não só simulado
- **Time humano:** issues residuais da Fase 6, com o comentário de análise da Fase 3 como contexto de partida
- **`/swarm` ou skill 03/04:** quando uma issue residual é grande o bastante para virar feature/refactor formal em vez de fix pontual

## Integração com Pipeline

- **Orchestrator (09):** aciona esta skill quando a tarefa é auditoria de produto existente, distinta de construção de feature nova
- **Context Manager (08):** mantém o estado do funil entre fases — a auditoria de 100 issues não cabe numa sessão só
- **Documenter (10):** registra o relatório de funil como artefato reutilizável para a próxima auditoria
- **Parallel Dispatcher (40):** fornece a mecânica de fan-out que a Fase 4 consome, mesmo padrão usado pelo `/swarm`

## Fontes

- Case real de auditoria de produto com 4 personas simuladas, 100 issues abertas, dedup por rota, análise separada de fix, frota de 10 agentes paralelos abrindo 60 PRs, 42 aprovadas por review automatizado, 24 issues residuais após triagem humana — nenhum merge automático, nenhum teste quebrado. O funil (não o volume bruto) é o que este case ensina: cada fase existe para que a fase seguinte receba menos, com mais contexto.
