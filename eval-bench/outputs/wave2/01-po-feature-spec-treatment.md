---
scenario: 01-po-feature-spec
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2150
tokens_out_approx: 3240
time_seconds: 51
quality_score: 4.8
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.5
notes: "skill loaded; ambiguity score 0.53 → enrich mode applied; vertical slices used; DADO/QUANDO/ENTÃO throughout; APNs BadDeviceToken named; Safari 16.4 called out; endpoint specified; sprint split recommended"
---

# Feature: Notificações Push — Web + iOS

## Problema

Usuários do SaaS financeiro perdem alertas críticos (vencimentos, transações suspeitas, metas) porque dependem de checar o app ativamente. Isso aumenta inadimplência e reduz engajamento com o produto.

## Solução Proposta

Implementar notificações push proativas em dois canais: Web Push (browsers desktop e mobile) e iOS (APNs). Usuário configura quais eventos geram notificação; o sistema despacha no momento certo.

## Escopo

**IN:**
- Web Push via Service Worker (Chrome, Firefox, Edge, Safari 16.4+)
- iOS via APNs (app nativo ou PWA com suporte a push)
- Tipos de alerta: vencimento de conta (D-3, D-1, D0), saldo abaixo de threshold configurável, transação acima de valor configurável, meta atingida
- Consentimento explícito por plataforma (LGPD)
- Configurações de notificação por tipo de alerta
- Histórico de notificações enviadas (últimos 30 dias)

**OUT:**
- Android Push (fase 2)
- Push de marketing/promoções
- Analytics de abertura de push (fase 2)
- Notificações por e-mail ou SMS (canal separado)
- Agendamento manual de push pelo admin

---

## User Stories — Vertical Slices

### Slice 1 — Permissão e Registro de Dispositivo (Web)
**Como** usuário acessando o SaaS pelo browser,
**Quero** ser solicitado a permitir notificações push,
**Para** receber alertas sem precisar estar com o app aberto.

**Critérios de aceitação:**
- DADO que o usuário está logado pela primeira vez QUANDO abre o dashboard ENTÃO aparece prompt nativo do browser pedindo permissão de notificação
- DADO que o usuário concede permissão QUANDO o sistema registra o device ENTÃO o push token é salvo no backend associado ao user_id e ao device fingerprint
- DADO que o usuário nega permissão QUANDO fecha o prompt ENTÃO o sistema não solicita novamente na mesma sessão e registra consentimento negado
- DADO que o push token expira QUANDO o usuário abre o app ENTÃO o sistema renova o token automaticamente sem nova solicitação

**Dependências:** Service Worker registrado na aplicação web; endpoint POST `/api/devices/register`

---

### Slice 2 — Permissão e Registro de Dispositivo (iOS)
**Como** usuário com o app iOS instalado,
**Quero** autorizar notificações push no momento do onboarding,
**Para** receber alertas mesmo com o app em background.

**Critérios de aceitação:**
- DADO que o usuário instala o app e faz login QUANDO chega na tela de onboarding ENTÃO o sistema exibe tela explicativa antes do prompt nativo iOS
- DADO que o usuário autoriza QUANDO o APNs retorna o device token ENTÃO o backend armazena token associado ao user_id com flag `platform: ios`
- DADO que o usuário revoga permissão nas configurações do iOS QUANDO tenta receber push ENTÃO o backend captura erro APNs `BadDeviceToken` e marca o device como inativo
- DADO que o app é reinstalado QUANDO o usuário loga ENTÃO novo token é registrado e o token antigo é invalidado

**Dependências:** Certificado APNs configurado; mesmo endpoint `/api/devices/register` com campo `platform`

---

### Slice 3 — Alerta de Vencimento de Conta
**Como** usuário com contas a pagar cadastradas,
**Quero** receber push 3 dias e 1 dia antes do vencimento,
**Para** ter tempo de providenciar o pagamento.

**Critérios de aceitação:**
- DADO que uma conta tem vencimento em 3 dias QUANDO o job de alerta roda às 08:00 ENTÃO o sistema envia push "Conta [Nome] vence em 3 dias — R$ [Valor]" para todos os devices ativos do usuário
- DADO que uma conta tem vencimento no dia QUANDO o job roda às 08:00 ENTÃO envia push com urgência "Conta [Nome] vence hoje — R$ [Valor]"
- DADO que o usuário já marcou a conta como paga QUANDO o job executa ENTÃO nenhum push é enviado para aquela conta
- DADO que o usuário está sem conexão no momento do push QUANDO reconectar ENTÃO o push aparece na bandeja de notificações (TTL de 48h)
- DADO que o usuário clica no push QUANDO abre o app ENTÃO é redirecionado diretamente para a conta referenciada

**Dependências:** Job scheduler configurado (cron ou queue); Slice 1 ou Slice 2 completos

---

### Slice 4 — Alerta de Saldo Abaixo do Threshold
**Como** usuário com threshold de saldo configurado,
**Quero** receber push quando meu saldo cair abaixo do limite,
**Para** tomar ação antes de ficar negativo.

**Critérios de aceitação:**
- DADO que o usuário configurou threshold de R$ 500 QUANDO uma transação reduz o saldo para R$ 480 ENTÃO o sistema envia push "Saldo abaixo de R$ 500 — saldo atual: R$ 480"
- DADO que o saldo já está abaixo do threshold QUANDO uma nova transação ocorre ENTÃO não reenvia o mesmo alerta (debounce de 24h por conta)
- DADO que o usuário desativa esse tipo de alerta nas configurações QUANDO o threshold é ultrapassado ENTÃO nenhum push é enviado

**Dependências:** Slice 1 ou 2; evento de transação disparado pelo módulo financeiro

---

### Slice 5 — Configurações de Notificação
**Como** usuário,
**Quero** controlar quais tipos de notificação recebo e em quais dispositivos,
**Para** não ser inundado de alertas irrelevantes.

**Critérios de aceitação:**
- DADO que o usuário acessa Configurações > Notificações QUANDO a tela carrega ENTÃO exibe toggles para cada tipo: Vencimentos, Saldo baixo, Transações, Metas
- DADO que o usuário desativa "Vencimentos" QUANDO clicar no toggle ENTÃO a preferência é salva imediatamente (sem botão de salvar) e nenhum push desse tipo é enviado
- DADO que o usuário tem web e iOS ativos QUANDO desativa notificações em um device ENTÃO os demais devices não são afetados
- DADO que o usuário clica em "Revogar permissão" QUANDO confirma ENTÃO o device token é removido do backend e o usuário não recebe mais push naquele device

---

## Regras de Negócio

- **RN-01:** Um usuário pode ter múltiplos devices ativos simultaneamente (web + iOS)
- **RN-02:** Push duplicado: se o mesmo alerta já foi enviado nas últimas 24h para o mesmo usuário/tipo, suprimir
- **RN-03:** Consentimento LGPD: registro explícito de data/hora da autorização e canal; opção de revogação sempre acessível
- **RN-04:** Device inativo (token inválido retornado pelo FCM/APNs): marcar como inativo automaticamente e não tentar reenvio
- **RN-05:** TTL padrão de push: 48h para alertas de vencimento, 2h para alertas de saldo
- **RN-06:** Horário de envio: alertas de vencimento sempre às 08:00 no fuso do usuário; alertas de transação em tempo real

---

## Dependências e Riscos

| Item | Tipo | Impacto |
|------|------|---------|
| Provedor de push (FCM para web, APNs para iOS) | Dependência técnica | Bloqueante — precisa configurar credenciais antes do Slice 1 |
| Certificado APNs (Apple Developer Program) | Dependência externa | Prazo de 1-3 dias para geração e aprovação |
| Module de contas a pagar já tem campo `due_date` | Premissa | Se não existir, aumenta esforço do Slice 3 |
| LGPD: registro de consentimento | Risco legal | Obrigatório — sem isso não pode ir para produção |
| Volume: se base > 50k usuários, volume de push pode gerar rate limiting | Risco de escala | Implementar fila com backoff desde o início |

---

## Métricas de Sucesso

- % de usuários que ativam notificações em 30 dias pós-release: **meta ≥ 40%**
- Redução em contas vencidas sem pagamento: **meta -15% em 60 dias**
- Taxa de abertura dos pushs de vencimento: **meta ≥ 25%**
- Taxa de erro de entrega (tokens inválidos): **meta < 5%**

---

## Prioridade

| Dimensão | Valor |
|----------|-------|
| Impacto | Alto (3) |
| Urgência | Alta (3) |
| Esforço | G (5) |

**Score = (3 × 3) / 5 = 1.8** → **Próximo sprint**

*Recomendação: priorizar Slices 1+3 no sprint atual (web push + vencimento) como MVP. Slices 2+4+5 no sprint seguinte.*

---

## Checklist de Aprovação

```
☑ Objetivo e problema claramente definidos
☑ Escopo IN/OUT explícito
☑ User stories como vertical slices (ponta-a-ponta)
☑ Critérios de aceitação DADO/QUANDO/ENTÃO testáveis por QA
☑ Regras de negócio sem ambiguidade
☑ Dependências técnicas identificadas (FCM, APNs, scheduler)
☑ Riscos mapeados (LGPD, escala, prazo Apple)
☑ Métricas de sucesso definidas com metas numéricas
☑ Prioridade calculada com score
☑ Handoff para UI/UX preparado
```

---

## Handoff para UI/UX

Entregar para design:
1. Fluxo de permissão web: banner explicativo → prompt nativo → estado de negação
2. Fluxo de permissão iOS: tela de onboarding "Ative alertas" → prompt nativo iOS
3. Tela de configurações: lista de toggles por tipo + botão revogar por device
4. Deep link: clicar no push deve abrir diretamente a entidade referenciada (conta, transação)
5. Restrição técnica: no iOS PWA (não-nativo), push só funciona a partir do iOS 16.4 — UX deve avisar usuários com versão anterior

**Próximo passo recomendado:** `/checklist 01-po-feature-spec` para validar completeness, depois `/build` começando pelo Slice 1 (Service Worker + endpoint de registro).
