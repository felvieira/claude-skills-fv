# Formato Obrigatório do Relatório

Título: `Plano de ação de growth — {Nome do produto}`
Subtítulo: `Playbook {A|B|Híbrido} · {modelo recomendado} · {data}`

Gerar as 10 seções nesta ordem. Seção sem canal aplicável (ex.: produto só web, sem PDP) recebe uma
linha dizendo por quê, nunca some.

## 0. Diagnóstico em 8 linhas

- Frase-prova do aha
- Playbook A / B / híbrido
- Modelo comercial recomendado + por quê (1 frase de R/1K)
- Evento de ativação
- Evento de retenção (não é "abriu o app")
- Consulta-alvo que um agente deveria responder com este produto
- Maior buraco atual
- Hipóteses listadas

## 1. Funil canônico vs atual

Tabela: etapa | tela | objetivo | CTA | critério de saída | evento

Etapas mínimas: abertura → intent/diagnóstico ou setup → aha → persistência da conta → oferta Dia 0
→ aftercare → hábito D3/D7 → feature-gate → cancel-save.

Coluna extra opcional "hoje" com o que existe (ou `HIPOTESE`).

## 2. Telas (máx. 8)

Para cada tela: nome, job, headline, 3 bullets, CTA, microcopy, o que NÃO vai nela.

## 3. Paywall

- Momento
- Arquitetura (n páginas)
- Alavancas usadas (uma forte, duas de suporte)
- Copy: headline, timeline, planos, CTA, saída
- 3 testes radicais (não cor de botão)

## 4. Retenção

Tabela das 5 táticas: tática | estado atual | movimento | tela | evento

Ordem: aha → personalização → hábito → ativo durável → comunidade.

## 5. Psicologia e UI

3 telas auditadas. Para cada uma: efeitos violados e o "depois" textual, com 1 mudança por efeito e
no máximo 2 destaques por tela.

## 6. Distribuição (só o que é citável)

8 apostas priorizadas por impacto × esforço. Para cada uma: hipótese, artefato, tracking, regra de
matar em 14 dias sem sinal.

Incluir obrigatoriamente:
- página `/for-ai` (estrutura)
- 10 títulos de swarm (1 pergunta = 1 URL)
- 1 artefato compartilhável + QR
- regra de comunidade (10x útil / 1x menção)

## 7. Eventos e scorecard

Eventos mínimos (snake_case, prontos para engenharia): `signup`, `intent`, `aha`, `paywall_view`,
`paywall_accept`, `paywall_dismiss`, `trial_start`, `trial_convert`, `limit_hit`, `feature_gate`,
`habit_loop_completed`, `asset_created`, `checkout_start`, `paid`, `cancel`, `auto_renew_off`.

Alvos permitidos (não inventar outros):

| Métrica | Alvo |
|---|---|
| Signup completion | > 80% |
| TTV p50 dos ativados | < 5 min |
| Activation 7d | 40%+ |
| Paywall CVR self-serve | 8–15% |
| Trial → pago | 15–25% sem cartão / 40–55% com cartão |
| D7 | 25%+ |
| Cancel-save | 15–30% |

## 8. Plano de 4 semanas

- **Semana 1** — aha + cortar fricção até o TTV
- **Semana 2** — oferta Dia 0 + timeline honesta + aftercare
- **Semana 3** — loop de hábito + ativo durável + feature-gate da tarefa
- **Semana 4** — citação em IA + 1 canal humano + 1 teste radical de paywall

Tabela por item: semana | ação | artefato | critério de pronto | evento | dono | esforço S/M/L

## 9. Não fazer nesta conta

Lista curta do que foi recusado e por quê (itens do "Proibido" de `brief.md` que seriam tentadores
neste produto, mais qualquer alavanca descartada).
