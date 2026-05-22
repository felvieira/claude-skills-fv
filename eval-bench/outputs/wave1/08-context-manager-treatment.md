---
scenario: 08-context-manager
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 1100
tokens_out_approx: 1450
time_seconds: 35
quality_score: 4.3
quality_breakdown:
  specificity: 4
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.8
notes: "applied playbook: focus+history files, status taxonomy, 1 in_progress per feature, blockers visible, escalation rules, handoff ritual"
---

# Handoff de 3 features antes da viagem (1 semana)

Aplicando o ciclo do Context Manager: **foco atual + tarefas com status + dependencias/blockers visiveis + handoff curto pra proxima sessao** (no caso, o time enquanto voce esta fora).

## 1. Persistir estado em 2 arquivos curtos

Criar no repo (ou Notion equivalente):

**`docs/context/current-focus.md`** — o que esta ativo agora
**`docs/context/history.md`** — append-only de decisoes/eventos

Por que arquivo no repo: stateful, versionado, acessivel por todo o time, e voce le na volta em 5 min.

## 2. `current-focus.md` — template preenchido

```markdown
# Foco Atual — semana de [data partida] a [data volta]

Owner ausente: [seu nome] (viajando, contato so emergencia)
Tech lead interino: [nome] (decide o que nao espera)

## Tarefas ativas (max 15, 1 in_progress por feature)

### Auth — status: in_qa
- [ ] in_progress — QA executa cenarios [link do plano]
- [ ] pending — Merge para main se QA aprovar (owner: [nome])
- [ ] pending — Deploy staging pos-merge
- Dependencia: nenhuma
- Blocker: nenhum
- Quem decide se bug aparecer: [nome] (criterio: P0/P1 hotfix, P2/P3 espera retorno)

### Billing — status: blocked_on_adr
- [ ] blocked — ADR-[NNN] sobre [tema] aguardando decisao
- [ ] pending (apos ADR) — Retomar implementacao [issue #X]
- Dependencia: decisao de [pessoa/grupo]
- Blocker: ADR-[NNN] sem dono claro de decisao
- Acao antes de viajar: forcar deadline da ADR pra [data] OU aceitar que fica parado a semana

### Dashboard — status: in_progress (D+1)
- [ ] in_progress — [primeira milestone, 3-5 dias]
- [ ] pending — Review de design com [nome]
- [ ] pending — Integracao com API X
- Dependencia: endpoint Y do backend (status: [pronto/em dev])
- Blocker: nenhum agora; risco = duvidas tecnicas em codigo novo
- Quem desbloqueia: [nome] (par tecnico ou tech lead interino)

## Regras de escalonamento

- Pode esperar retorno: mudanca de escopo, decisao de produto nao-urgente, refactor
- NAO pode esperar: producao quebrada, cliente afetado, bloqueio que para >1 dev por >4h
- Contato emergencia: [canal/numero], so para "nao pode esperar"
```

## 3. `history.md` — append-only durante a viagem

Time registra cada decisao tomada na sua ausencia, formato 1 linha:

```markdown
# History

- 2026-MM-DD — Auth mergeado em main apos QA aprovar 12/12 cenarios. Deploy staging ok. (decidido por: [nome])
- 2026-MM-DD — ADR-NNN decidida: opcao B (motivo: custo de migracao). Billing retomado. (decidido por: [grupo])
- 2026-MM-DD — Dashboard travou em endpoint Y; backend prometeu pra sexta. Frontend seguiu com mock.
```

Na volta voce le em 5 min e ja sabe onde cada uma esta.

## 4. Mudanca de foco enquanto fora

Se aparecer trabalho novo (bug em prod, feature urgente):

- Tech lead interino **arquiva** o foco atual da feature afetada em `history.md`
- Cria novo bloco em `current-focus.md` com tarefas iniciais
- Mantem regra: 1 `in_progress` por frente, max 15 tarefas ativas no total
- Se conflitar com auth/billing/dashboard, decisao do tech lead interino (com criterio de escalonamento acima)

## 5. Handoff explicito antes de embarcar

Reuniao de 30 min com tech lead interino, cobrir:

1. Walk-through dos 2 arquivos (`current-focus.md`, `history.md`)
2. Confirma quem aprova merge de auth
3. Confirma deadline da ADR de billing (e o que fazer se nao sair)
4. Apresenta par tecnico do dashboard
5. Critério P0/P1/P2/P3 de bug
6. Canal e quando contatar voce

## 6. Checklist 1h antes de sair

- [ ] `docs/context/current-focus.md` commitado
- [ ] `docs/context/history.md` criado vazio (so cabecalho)
- [ ] Tech lead interino confirmou em escrito (Slack/email)
- [ ] Boards (Jira/Linear/GitHub) com assignee e ultimo comentario de status
- [ ] OOO no calendario + status no Slack
- [ ] Deadline da ADR-billing definida ou aceita como "fica parado"

## 7. Na volta — recontextualizacao

Primeira hora, na ordem:

1. Ler `history.md` (5 min) — o que aconteceu
2. Ler `current-focus.md` atualizado (5 min) — onde estamos agora
3. 15 min com tech lead interino — perguntas e nuances que nao foram escritas
4. Atualizar `current-focus.md` com seu retorno como owner

Nao tente produzir no primeiro dia. Recontextualize.

---

## Por que essa estrutura

- **1 `in_progress` por feature**: evita confusao de paralelismo durante sua ausencia
- **Blockers visiveis**: billing nao "some" so porque esta travada — fica no radar
- **History append-only**: cumulativo, voce nao perde nada da semana
- **Regras de escalonamento explicitas**: tech lead interino nao precisa adivinhar o que e urgente

Quer que eu gere os 2 arquivos preenchidos se voce me passar nomes do time, deadline real da ADR, e link das issues?
