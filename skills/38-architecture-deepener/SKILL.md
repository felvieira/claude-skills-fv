---
name: architecture-deepener
description: |
  Encontra oportunidades de "deepening" no codebase — refactors que transformam modulos
  shallow (interface complexa, implementacao simples) em deep (interface simples,
  implementacao rica). Foco em testabilidade e AI-navigability. Use quando usuario
  quiser melhorar arquitetura, encontrar oportunidades de refactor, consolidar modulos
  acoplados, ou preparar codebase para trabalho de agente.
  Trigger em: "deepening", "deep module", "shallow module", "refactor architecture",
  "improve architecture", "consolidate modules", "agent-friendly codebase",
  "AI-navigable", "module depth".
argument-hint: "[--scope=src/foo] [--max-candidates=N]"
allowed-tools: Read, Grep, Glob, Bash
---

# Architecture Deepener — Refactors que Importam

Identificar friccao arquitetural e propor **deepening opportunities** — refactors que transformam modulos shallow em deep. Objetivo: testabilidade + AI-navigability (codebase que agente consegue evoluir sem quebrar coisas).

Adaptado de [mattpocock/skills/engineering/improve-codebase-architecture](https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture) e integrado ao kit (skill 23 Migration & Refactor + skill 33 Detective Spec + `policies/vertical-slices.md`).

## Fitness Functions YAML (v2.5.0+)

> Inspirado em Birgitta Böckeler (Thoughtworks) + Neal Ford ("Building Evolutionary Architectures"). Ver `docs/inspiration/harness-engineering.md` + `policies/harness-categories.md`.

Esta skill agora também produz **fitness functions runnable** quando o usuário pedir auditoria arquitetural com gates concretos. Formato canônico:

```yaml
# .harness/fitness-functions.yml
fitness_functions:
  - id: <kebab-case-id>
    description: "Frase clara do que regula"
    type: structural | performance | accessibility | security
    runner: grep | dep-cruiser | lighthouse | custom-script
    rule: <padrão ou query do runner>
    fail_threshold: <int — 0 = zero tolerância>
    severity: high | medium | low
    applies_to: <glob opcional>
```

Exemplo prático — leaky abstraction de DB:

```yaml
- id: no-db-in-domain
  description: Domain layer não importa bibliotecas de DB
  type: structural
  runner: dep-cruiser
  rule:
    forbidden:
      - from: 'src/domain/'
        to: '(prisma|typeorm|sequelize|knex|pg|mongodb)'
  severity: high
```

**Quando produzir YAML vs apenas relatório:**

| Output | Quando |
|---|---|
| Relatório markdown apenas | Auditoria inicial, usuário entendendo opções |
| + `fitness-functions.yml` | Quer **gate automatizado**, tem CI, prevenir regressão |
| + Aplicar refactor | Via `/auto`, `/swarm` ou `refactor-safely` |

Ao produzir YAML, salvar em `<consumer>/.harness/fitness-functions.yml`. Roadmap v2.5.1: `/run-fitness` command runs the file.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/source-driven.md`, `policies/writing-clarity.md`, `policies/handoffs.md` e `policies/readiness-gate.md` (decisão de arquitetura registrada explicitamente, não implícita, é um dos critérios que decide PASS/CONCERNS/FAIL antes do slice ir para implementação — decisão pendente reprova o gate).

## Filosofia

> **Deletion test:** imagine deletar o modulo. Se complexidade desaparece, era pass-through. Se complexidade reaparece em N callers, estava ganhando seu lugar.
>
> **The interface is the test surface.**
>
> **One adapter = hypothetical seam. Two adapters = real seam.**

## Glossario (use exatamente — consistencia e o ponto)

Nao deslizar para "component", "service", "API", "boundary". Definicoes:

- **Module** — qualquer coisa com interface e implementacao (funcao, classe, package, slice).
- **Interface** — tudo que o caller precisa saber para usar o modulo: tipos, invariantes, modos de erro, ordering, config. **Nao apenas a assinatura de tipo.**
- **Implementation** — codigo dentro.
- **Depth** — leverage na interface: muito comportamento atras de interface pequena. **Deep** = alta leverage. **Shallow** = interface quase tao complexa quanto a implementacao.
- **Seam** — onde uma interface vive; lugar onde comportamento pode ser alterado sem editar in place. (Use isso, nao "boundary".)
- **Adapter** — coisa concreta satisfazendo uma interface em um seam.
- **Leverage** — o que callers ganham com depth.
- **Locality** — o que mantenedores ganham com depth: mudanca, bugs, conhecimento concentrados em um lugar.
- **Cohesion** — sinal de que um Module merece ser deep: suas responsabilidades fazem sentido juntas e mudam pela mesma razao. Alta coesao = candidato a deep. (Nao e termo novo — e o *gatilho* para aplicar deletion test.)
- **Coupling leak** — quando a Implementation de um Module vaza pela Interface, forcando callers a saber detalhes internos. Sintoma de shallow: a Interface nao esconde o que devia.
- **Contract** — a Interface de um Module *distribuido* (schema, classe de mensagem, media type). Vale a definicao estrita de Interface: tudo que o outro sistema precisa saber — nao apenas o formato do payload, mas modos de erro, versionamento e compatibilidade.

## Quando Usar

- semanalmente ou apos sprint de desenvolvimento (prep antes de proxima iteracao)
- antes de delegar manutencao para agente em modulo complexo
- onboarding de codebase desconhecido (mapear seams existentes)
- antes de feature grande que vai estressar arquitetura atual
- review de PR que adiciona modulo novo (esta deep ou shallow?)
- pos-`/detective-spec` em legado (Detective ja mapeou; Deepener propoe melhorias)

## Quando NAO Usar

- bug fix localizado
- spike exploratorio
- task que ja tem ADR proibindo refactor naquela area
- codebase muito novo (deixar arquitetura emergir antes de "consertar")

## Entradas Esperadas

- caminho do escopo (repo inteiro, subdir, ou modulo especifico)
- glossario de dominio do projeto (`CONTEXT.md` ou `docs/glossary.md`)
- ADRs em `docs/adr/` se existirem
- (opcional) `graphify-out/graph.json` — god nodes priorizados
- (opcional) `_detective_sdd/` — Detective Spec ja mapeou
- (opcional) max-candidates (default: 5-7)

## Saidas Esperadas

- lista priorizada de **deepening candidates** em formato markdown (template `## Architecture Deepening Candidates` mais abaixo)
- caminho de saida: `_architecture_review/YYYY-MM-DD-candidates.md` (criar dir se nao existir, gitignored por default)
- (se conversa de grilling produziu termos novos) entradas inseridas em `CONTEXT.md`
- (se usuario rejeitou candidato com motivo load-bearing) ADR proposto em `docs/adr/`
- handoff para skill 23 (Migration & Refactor) com plano de deepening do candidato escolhido
- nenhum codigo do projeto modificado (Deepener so propoe; skill 23 executa)

## Pre-requisitos

- glossario de dominio do projeto (`CONTEXT.md` ou `docs/glossary.md`) — sem isso, nomes ficam genericos
- ADRs em `docs/adr/` (se existirem) — respeitar decisoes registradas
- (opcional) `graphify-out/graph.json` — god nodes sao candidatos prioritarios
- (opcional) `_detective_sdd/` — Detective ja mapeou; reusar

## Processo

### Fase 1 — Explore

Ler glossario de dominio + ADRs primeiro. Depois usar Read/Grep/Glob (ou despachar `Explore` subagent) para caminhar pelo codebase.

**Nao siga heuristicas rigidas — explore organicamente** e anote onde voce sente friccao:

- Onde entender UM conceito exige pular entre N modulos pequenos?
- Onde modulos sao **shallow** — interface quase tao complexa quanto implementacao?
- Onde funcoes puras foram extraidas apenas para testabilidade, mas bugs reais escondem em **como sao chamadas** (sem **locality**)?
- Onde modulos acoplados vazam pelos seams?
- Quais partes nao sao testadas, ou sao dificeis de testar pela interface atual?

**Aplicar o deletion test** em qualquer suspeito de shallow: deletar concentraria complexidade ou apenas a moveria? "Sim, concentra" e o sinal que voce quer.

### Fase 2 — Apresentar candidatos

Lista numerada de **deepening opportunities**. Para cada candidato:

- **Files** — quais files/modules envolvidos
- **Problem** — por que arquitetura atual causa friccao
- **Solution** — descricao em portugues claro do que mudaria
- **Benefits** — explicados em termos de **locality** e **leverage**, e como testes melhorariam

**Usar vocabulario do glossario do projeto para o dominio, e o glossario desta skill para arquitetura.** Se `CONTEXT.md` define "Order", fale "modulo de Order intake" — nao "FooBarHandler", nem "Order service" generico.

**Conflitos com ADR:** se candidato contradiz ADR existente, so trazer quando friccao for real o suficiente para reabrir o ADR. Marcar claramente: _"contradicts ADR-0007 — but worth reopening because…"_. NAO listar todo refactor teorico que ADR proibe.

**NAO propor interfaces ainda.** Perguntar: "Qual destes voce quer explorar?"

### Fase 3 — Grilling Loop (sobre o candidato escolhido)

Quando usuario escolhe um candidato, entrar em conversa de **grilling** (analoga a `/grill-me`). Caminhar pela arvore de design — restricoes, dependencias, shape do modulo deepened, o que fica atras do seam, quais testes sobrevivem.

Side effects acontecem inline conforme decisoes cristalizam:

- **Nomeando modulo deepened com termo nao em `CONTEXT.md`?** Adicionar termo ao `CONTEXT.md` — mesma disciplina de skill 28 (CLAUDE.md Generator). Criar arquivo lazy se nao existir.
- **Refinando termo durante a conversa?** Atualizar `CONTEXT.md` ali mesmo.
- **Usuario rejeita candidato com motivo "load-bearing"?** Oferecer ADR: _"Quer registrar isso como ADR para que reviews futuros nao re-sugiram?"_. So oferecer quando o motivo seria realmente necessario para um explorador futuro evitar re-sugestao — pular motivos efemeros ("nao vale a pena agora") e auto-evidentes.

## Heuristicas de Detecao

| Sintoma | Suspeita | Acao |
|---|---|---|
| Modulo so re-exporta de outro | shallow / pass-through | deletion test |
| Interface tem 10 metodos, cada um faz so 1 thing | shallow | mover comportamento para dentro, expor menos |
| Bugs sempre em "como X e usado", nunca em X | falta locality | unificar X com chamadores |
| Multiplos modulos sabem como chamar Y na ordem certa | seam errado / shallow | esconder ordem dentro de modulo deep |
| Refactor pequeno quebra muitos testes | testes acoplados a implementacao | reescrever testes pela interface; modulo provavelmente shallow |
| God file (>1000 linhas, >20 callers) | falta de seam | identificar sub-responsabilidades, criar seams |
| Detalhe de impl (conexao, driver, ordem de chamada) aparece na assinatura | coupling leak / shallow | esconder atras do seam; expor Interface menor |
| Adicionar campo a mensagem/schema quebra consumidores que nao usam o campo | Contract rigido demais / acoplamento desnecessario | aplicar Must-Ignore; validar so o que se usa |
| Layer/tier so repassa chamadas sem encapsular decisao | shallow / pass-through distribuido | deletion test; mover complexidade real para dentro ou eliminar o tier |

Coordenar com graphify quando disponivel:
- god nodes do `graphify-out/GRAPH_REPORT.md` = candidatos prioritarios
- bridges entre comunidades = seams ja existentes (boas ou ruins)
- comunidades coesas = candidates a virar deep modules (interface unica, implementacao concentrada)

## Lentes Adicionais — Coesao, Integracao e Camadas

> Inspirado em Silveira et al., *Introducao a Arquitetura e Design de Software* (Casa do Codigo), cap. 4, 6.1, 6.5, 7. Principios atemporais cross-linguagem — a parte JVM-especifica do livro (GC, classloaders, JIT) e ignorada de proposito; nao e o dominio desta skill.

Tres reformulacoes do mesmo nucleo (depth, deletion test, leverage, locality) aplicadas a contextos que a Fase 1 ja varre, mas que ganham vocabulario aqui. **Nao sao novos passos do processo** — sao lentes para nomear friccao durante a exploracao.

### Coesao/acoplamento como heuristica de profundidade

Coesao e acoplamento nao sao metas em si nesta skill — sao **sinais** que apontam para candidatos:

- **Modulo coeso** (responsabilidades que mudam pela mesma razao — SRP, "uma razao para mudar") e candidato natural a **deep**: ja concentra uma decisao, falta so esconder a Implementation atras de Interface menor. Rode o deletion test para confirmar.
- **Acoplamento que vaza pelo seam** (callers sabem *como* chamar Y na ordem certa, ou um detalhe de persistencia aparece na assinatura) e **coupling leak** = shallow. A acao e a de sempre: mover comportamento para dentro, expor menos.
- SRP mapeia direto em **locality**: se voce consegue pensar em dois motivos para mudar um Module, ele tem duas responsabilidades e a mudanca/bug nao esta concentrada em um lugar.

Cuidado simetrico: **baixo acoplamento != zero acoplamento**. Sempre havera uma ligacao entre dois Modules que cooperam; a meta e que ela seja a menor e mais simples possivel (a Interface), nao que desapareca. Extrair um Module so para "desacoplar" sem deletion test e mover complexidade, nao remover.

### Seam distribuido — REST vs async vs RPC como escolha de Interface

A fronteira entre dois sistemas e um **seam** como qualquer outro; o estilo de integracao e a escolha de *que tipo de seam*:

- **RPC/SOAP** — acopla o caller a operacoes e tipos especificos (WSDL gera stubs; mudanca no contrato => regerar). Seam rigido: tende a shallow quando cada metodo remoto faz so 1 coisa e o caller orquestra a ordem.
- **Async/mensageria (broker)** — o seam e a *classe + formato da mensagem*. Quem envia nao conhece quem recebe — desacoplamento alto, mas o formato da mensagem **e** o Contract: adicionar um campo quebra consumidores rigidos. Deep aqui = consumidor **Must-Ignore** (ignora o que nao conhece), que mantem a Interface estavel sob evolucao.
- **REST orientado a recurso** — poucas operacoes (verbos HTTP) sobre muitos recursos; capilaridade no lugar de N operacoes ad-hoc. Interface uniforme = menos superficie para o caller aprender.

Em todos os casos, **o Contract e a Interface no sentido estrito da 38**: nao so o shape do payload, mas modos de erro, ordering e compatibilidade. Validar o schema inteiro quando voce usa so parte dele e auto-imposicao de acoplamento — o equivalente distribuido de um caller que importa detalhes internos.

**HATEOAS como Interface profunda.** Hipermidia (links com `rel`, media types, content negotiation) e exemplo limpo de deep interface: o caller acopla ao *significado* do link (`rel="pagamentos"`), nao a URI. O servidor pode trocar a URI, a maquina, ate o fornecedor por tras — a Implementation muda, a Interface (o significado) nao. Versionamento e re-roteamento ficam escondidos atras do seam.

### Camadas/tiers sob a mesma lente

Uma camada se avalia pela leverage que oferece, igual a qualquer Module:

- **Layer/tier que so repassa** ("apenas uma ponte" entre cliente e dados, repassando chamadas sem encapsular decisao) e **shallow** — passa no deletion test como pass-through. Suspeito classico: um tier intermediario cuja unica funcao e relay gera round-trips extras sem esconder complexidade.
- **Layer que encapsula complexidade real** (regra de negocio, orquestracao de workflow, traducao de protocolo que de fato esconde detalhe) e **deep** — concentra decisao e da locality. Mover logica de negocio de um relay burro para um business tier coeso *e* uma deepening opportunity valida.

Distinguir **layer** (separacao logica — reduz acoplamento no codigo) de **tier** (separacao fisica — roda em maquina separada). Adicionar layer/tier so porque "fica organizado", sem encapsular complexidade, e o mesmo anti-padrao de extrair Module sem deletion test.

## Output

```markdown
# Architecture Deepening Candidates — <YYYY-MM-DD>

**Scope:** src/...
**Source:** <CONTEXT.md / ADRs / graphify / Detective Spec>

## Candidates (priorizados)

### 1. <nome usando vocabulario do dominio>
**Files:** src/foo.ts, src/bar.ts, src/baz/index.ts
**Problem:** entender Order intake exige pular entre FooBarHandler, OrderService, OrderValidator e OrderRepository. Validacao acontece em 3 lugares com regras ligeiramente diferentes (RN-005 vs RN-012).
**Solution:** consolidar Order intake atras de modulo unico `OrderIntake` com interface `intake(rawOrder): Order | OrderError`. Esconder validacao + persistencia + emit-event atras desse seam.
**Benefits:**
- **Leverage:** callers param de saber sobre os 4 modulos
- **Locality:** validacao em 1 lugar, RN-005 vs RN-012 conflito vira impossivel
- **Testabilidade:** 1 interface a testar, vs 4 hoje. Testes ficam integration-style por default.

### 2. ...

## Recomendacao

Pegue 1 candidato por vez. Comecar pelo numero 1 (highest leverage).

## Para discutir
Qual candidato voce quer explorar? (responda com numero)
```

## Anti-Padroes

### "Refactor por refactor"
Mexer porque "ficou feio" sem deletion test = mover complexidade, nao remover. Sempre rodar deletion test primeiro.

### "Usar vocabulario novo"
Inventar "OrderProcessor" quando glossario diz "Order intake" = drift terminologico. Sempre usar termos do `CONTEXT.md`.

### "Re-litigar ADR"
ADR-0007 proibe X. Refactor sugere X. Solucao: re-abrir ADR primeiro, justificar mudanca, depois refactorar. Nao silenciosamente contradizer.

### "Propor 20 candidatos"
Usuario nao consegue priorizar lista de 20. Maximo 5-7 candidatos, ordenados por impacto.

### "Propor solucao antes de validar problema"
"Aqui esta a interface nova" antes de "voce concorda que e shallow?" = perde feedback do usuario sobre a fricao real.

## Evidencia de Conclusao

- lista priorizada de candidatos com deletion test aplicado
- vocabulario do dominio respeitado em toda proposta
- ADRs respeitados (ou conflito explicitamente marcado)
- nenhum codigo modificado nesta fase (Deepener so propoe; skill 23 implementa)

## Handoff

Apos usuario escolher candidato e fase de grilling concluir:

1. **Skill 23 (Migration & Refactor):** recebe plano de deepening + executa o refactor incremental com feature flags
2. **Skill 37 (TDD Engineer):** escreve testes contra a NOVA interface antes da migracao (red-green-refactor)
3. **Skill 28 (CLAUDE.md Generator):** atualiza `CLAUDE.md` se vocabulario novo emergiu
4. **Documenter (skill 10):** registra ADR se conversa gerou decisao "load-bearing" — se o candidato escolhido ganha mais clareza com um diagrama (arquitetura, dependency graph, sequence) do que com prosa, ver `## Diagramas em Docs e ADRs` na skill 10

## Integracao com Pipeline

- **Detective Spec (33):** roda ANTES desta skill em legado, mapeia o que existe
- **Repo Auditor (18):** roda antes para ter `current.md` atualizado
- **Migration & Refactor (23):** **sempre** roda DEPOIS desta skill — Deepener propoe, Migration executa
- **TDD Engineer (37):** acompanha refactor, garantindo testes contra interface nova
- **CLAUDE.md Generator (28):** atualiza vocabulario quando termos novos emergem
- **Reviewer (11):** valida que refactor manteve comportamento (testes verdes)

## Material Adicional

- `docs/skill-guides/architecture-language.md` (a criar conforme demanda) — glossario completo equivalente a [LANGUAGE.md](https://github.com/mattpocock/skills/blob/main/skills/engineering/improve-codebase-architecture/LANGUAGE.md)
- `docs/skill-guides/architecture-deepening.md` — exemplos de antes/depois, padroes comuns
- `docs/skill-guides/architecture-interface-design.md` — design de interface boa
