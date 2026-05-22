---
scenario: 01-po-feature-spec
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 310
tokens_out_approx: 1180
time_seconds: 18
quality_score: 2.3
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 2
  discipline: 3
pass_fail: null
delta_vs_baseline: null
notes: "cold answer, no skill, no template injection; no DADO/QUANDO/ENTÃO; no RNs section; no vertical slices; no priority formula applied"
---

# Como escrever a spec de notificações push (web + iOS)

Para documentar bem essa feature no seu SaaS de gestão financeira, siga estas etapas:

## 1. Defina o problema e o objetivo

Comece explicando por que notificações push são necessárias. Por exemplo:
- Os usuários perdem alertas de vencimento de contas porque só verificam o app quando lembram
- A taxa de inadimplência interna subiu 12% no último trimestre

## 2. Escolha o formato de spec

Você pode usar:
- **User Stories** (formato ágil — recomendado para equipes Scrum)
- **Documento de requisitos funcional** (mais formal)
- **PRD (Product Requirements Document)**

## 3. Escreva as User Stories principais

Exemplo:
- **Como** usuário do app, **quero** receber push quando uma conta está próxima do vencimento **para** não esquecer de pagar
- **Como** admin, **quero** configurar quais tipos de alertas são enviados **para** controlar o volume de notificações

## 4. Defina os critérios de aceitação

Para cada story, liste o comportamento esperado. Use linguagem testável:
- O push chega até 24h antes do vencimento
- O usuário pode desativar notificações nas configurações
- No iOS, o push aparece na tela de bloqueio

## 5. Mapeie plataformas e canais

Sua feature cobre:
- **Web Push** (browsers desktop e mobile via Service Workers / Web Push API)
- **iOS** (APNs — Apple Push Notification service)

Considere: Android? PWA? Você precisará de tokens distintos para cada plataforma.

## 6. Identifique dependências técnicas

- Serviço de push (Firebase Cloud Messaging para web, APNs para iOS)
- Backend precisa armazenar tokens de dispositivo por usuário
- Integração com o calendário financeiro existente (trigger de eventos)
- LGPD: consentimento explícito do usuário

## 7. Defina escopo

Deixe claro o que NÃO entra na v1:
- Android (talvez fase 2)
- Push de marketing/promoções (fora do escopo inicial)
- Analytics de abertura de push (fase 2)

## 8. Estime esforço e prioridade

Use uma escala simples:
- Esforço: P / M / G / GG
- Prioridade: Alta / Média / Baixa

## 9. Defina métricas de sucesso

- % de usuários que ativam notificações
- Redução na taxa de vencimentos não pagos
- Taxa de abertura dos pushs

## 10. Checklist antes de passar para engenharia

- [ ] Personas identificadas
- [ ] Critérios de aceitação testáveis
- [ ] Escopo IN/OUT documentado
- [ ] Dependências mapeadas
- [ ] LGPD considerada
- [ ] Design envolvido

---

Com isso, você tem o esqueleto da spec. Recomendo documentá-la em Notion, Confluence ou Jira, junto com os wireframes da tela de configuração de notificações.
