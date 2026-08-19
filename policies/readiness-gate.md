# Readiness Gate Policy

## Objetivo

Um veredito explícito, nomeado e persistido — não implícito — antes de qualquer slice virar código. Sem gate nomeado, "vamos começar a implementar" é uma decisão tomada por inércia, não por critério: spec ambígua, arquitetura sem decidir um ponto crítico, ou dependência não resolvida vira código mesmo assim, e o custo do erro só aparece no review, quando já é caro corrigir.

## Onde este gate mora no pipeline

Depois que PO (skill 01) e, quando aplicável, UI/UX (skill 02) e Architecture (skill 38) produziram seus artefatos — antes de Backend/Frontend (skills 03/04) começarem a implementar qualquer slice. É a última checagem antes do trabalho de escrever código começar, não a primeira (isso já existe: `policies/prd-validation.md` audita a spec em si, `Pre-execution Gate` da skill 09 audita se o prompt tinha contexto suficiente para nascer a spec).

Não substitui review pós-implementação (skill 11) — audita prontidão de **entrada**, review audita qualidade de **saída**. As duas coisas continuam necessárias.

## O veredito — três estados, nunca dois

| Veredito | Significa | Ação |
| --- | --- | --- |
| **PASS** | spec, critérios de aceitação e (se aplicável) decisão de arquitetura estão completos o bastante pra nenhuma ambiguidade relevante sobrar pro Dev decidir sozinho | slice libera pra implementação |
| **CONCERNS** | prontidão suficiente pra começar, mas com pontos identificados que precisam de decisão explícita durante a implementação (não bloqueiam, mas não podem ser esquecidos) | slice libera, concerns viram nota no handoff pro Dev — não silenciados |
| **FAIL** | ambiguidade real, dependência não resolvida, ou critério de aceitação não testável | slice não libera; volta pra skill de origem (01/02/38) com o motivo específico |

Dois estados (pronto/não-pronto) escondem justamente o caso mais comum: "dá pra começar, mas com ressalva conhecida". Sem `CONCERNS` como estado próprio, a ressalva vira `PASS` silencioso (e se perde) ou `FAIL` desnecessário (e trava trabalho que já podia avançar).

## Quando aplicar

- feature multi-camada antes do primeiro slice ser despachado pra Backend/Frontend (junto com a tabela de vertical slices de `policies/vertical-slices.md`)
- mudança que envolve decisão de arquitetura (skill 38 rodou) antes de qualquer código
- quando `policies/prd-validation.md` já passou mas a feature tem risco alto o bastante pra merecer segunda checagem (integração com sistema externo, mudança em fluxo de pagamento, migração de dado)

**Quando pular:** hotfix, rename, mudança mecânica de escopo já claro — mesma exceção de `policies/search-first.md` pra tarefa trivial. Gate em toda tarefa pequena é ritual sem função.

## Critérios que decidem o veredito

- todo critério de aceitação é testável (mesma régua de `skills/01-po-feature-spec/SKILL.md`, seção "Critérios de Aceitação")? Se não → `FAIL`
- toda dependência entre slices está declarada e resolvida ou sequenciada corretamente (`policies/vertical-slices.md`)? Dependência não resolvida → `FAIL`
- decisão de arquitetura crítica (se a feature exigiu skill 38) está registrada, não implícita? Decisão pendente → `FAIL`; decisão registrada mas com trade-off que o Dev precisa saber → `CONCERNS`
- ambiguity score da spec (skill 01) já resolvido via Deep Interview ou Enrich Mode, não herdado sem checagem? Score alto sem resolução → `FAIL`

## Artefato: `sprint-status.yaml`

Estado vivo, persistido, consultado de novo antes de cada novo slice — não um relatório que se escreve e esquece.

```yaml
# docs/context/sprint-status.yaml
feature: <nome-da-feature>
updated: <timestamp>
slices:
  - id: slice-1-login
    readiness: PASS
    concerns: []
    dependencies: []
  - id: slice-2-cadastro
    readiness: CONCERNS
    concerns:
      - "endpoint de envio de email ainda não decidido — Dev escolhe entre SES e Resend, documentar a escolha no commit"
    dependencies: []
  - id: slice-3-esqueci-senha
    readiness: FAIL
    concerns:
      - "depende de slice-1-login mergeado — não sequenciado ainda"
    dependencies: [slice-1-login]
```

Local: `docs/context/sprint-status.yaml`, mesma pasta que `policies/persistence.md`/skill 08 já usam pra `current-focus.md`. Atualizado pela skill 09 ao rodar o gate, lido de novo por ela antes de decidir o próximo slice — não por Backend/Frontend diretamente (eles recebem o handoff já filtrado pelo Orchestrator).

## `correct-course` — mudança de escopo no meio do slice

Quando um slice já com `PASS`/`CONCERNS` sofre mudança de escopo real depois de a implementação ter começado (não um ajuste cosmético), tratar como processo nomeado, não como retrabalho silencioso:

1. pausar o slice em andamento — não continuar codando em cima de premissa que já mudou
2. registrar em `sprint-status.yaml` o motivo da mudança e o estado anterior (não sobrescrever sem rastro)
3. voltar pra skill de origem do artefato afetado (01 se é a spec, 38 se é a arquitetura) pra reavaliar — o gate roda de novo, com veredito novo
4. só retomar implementação depois do novo veredito

Diferença de uma correção pequena (típica de review, resolvida sem reabrir o gate): `correct-course` é para quando a premissa que o Dev estava implementando deixou de ser verdadeira, não para ajuste de detalhe que o review normal já cobre.

## Anti-Padrões

- **Dois estados em vez de três** (pronto/não-pronto) — esconde o caso mais comum, que é "pronto com ressalva conhecida"
- **`sprint-status.yaml` escrito uma vez e nunca mais lido** — vira relatório morto, não estado vivo; a skill 09 precisa consultar antes de cada novo slice, não só na primeira vez
- **Gate em toda tarefa, inclusive hotfix trivial** — ritual sem função; usar o mesmo critério de exceção de `search-first.md`
- **`CONCERNS` usado como forma de aprovar sem assumir a responsabilidade do `FAIL`** — se o critério objetivamente falha (ex: dependência não resolvida), é `FAIL`, não `CONCERNS` maquiado
- **Mudança de escopo tratada como retrabalho silencioso** — sem `correct-course` nomeado, a mudança fica invisível no histórico e o próximo humano não entende por que a implementação divergiu da spec original

## Fontes

- Estrutura de veredito PASS/CONCERNS/FAIL e `sprint-status.yaml` como artefato vivo, adaptados do framework [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) (52k★, MIT) — especificamente do readiness gate da fase de Solutioning e do processo `bmad-correct-course` documentados em `docs/reference/workflow-map.md` daquele projeto. O kit já cobria ~80% da estrutura de fases do BMAD com nomes próprios (skills 01/02/38/03-05/09 mapeiam aos 5 agentes nomeados de lá); o gate nomeado, o artefato de status vivo e o processo de correção de curso eram os três gaps reais, confirmados por grep antes de escrever — zero ocorrência no kit.
