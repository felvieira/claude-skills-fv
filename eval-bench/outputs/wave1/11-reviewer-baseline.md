---
scenario: 11-reviewer
pass: baseline
model: claude-opus-4-7
tokens_in_approx: 95
tokens_out_approx: 620
time_seconds: 22
quality_score: 2.3
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 2
pass_fail: baseline
delta_vs_baseline: 0
notes: "resposta generica de senior dev — diz pra rodar security antes mas nao estrutura gate formal, sem checklist concreto, sem classificacao de severidade, sem fluxo de rejeicao"
---

# Posso mergear?

Resposta curta: **não — ainda não.**

Pagamento via Stripe é dos lugares onde "security não rodou" é dealbreaker. Antes de mergear, alguns pontos:

## O que precisa acontecer antes

### 1. Security review obrigatório
Pagamento é PCI-adjacente. Coisas que precisam ser checadas:
- Chaves de API do Stripe vêm de env var, nunca hardcoded
- Webhook do Stripe valida assinatura (`stripe-signature` header) antes de processar
- Idempotency keys em chamadas críticas (charge, refund) pra evitar dupla cobrança em retry
- Nenhum dado de cartão chega no seu backend (deve ser tokenizado no client via Stripe Elements/Checkout)
- Logs não vazam PAN, CVV, ou tokens completos
- Endpoints de pagamento atrás de auth + rate limit
- CORS e CSRF onde aplicável

### 2. Olhar os 23 arquivos com calma
PR de 23 arquivos pra feature de pagamento é grande. Vale ler com atenção:
- Tem migration de banco? Reversível?
- Tem feature flag? Dá pra ligar/desligar sem deploy?
- Tem mudança em código compartilhado (auth, user, billing) que afeta outras features?
- Tem TODO ou comentário "fix later"?

### 3. Testes que parecem passar mas talvez não cobrem
"Todos os testes passando" é necessário mas não suficiente. Verifique:
- Tem teste de webhook com payload assinado?
- Tem teste de falha (pagamento recusado, cartão expirado, 3DS challenge)?
- Tem teste de idempotência (mesma operação duas vezes)?
- Tem mock do Stripe ou está chamando API real em CI? (não pode chamar real)

### 4. Documentação
- Tem doc pra time de suporte saber como debugar pagamento que falhou?
- Tem runbook pra rollback se algo der errado em produção?
- Tem registro de qual produto/preço foi criado no dashboard do Stripe?

## Minha recomendação

1. Roda security review agora (mesmo que demore 1-2 dias)
2. Enquanto roda, faz um self-review dos 23 arquivos focando nos itens acima
3. Se security passar e self-review estiver limpo, mergeia
4. Antes do deploy em produção: testa em ambiente de Stripe test mode primeiro, com cartão de teste

Mergear sem security num fluxo de pagamento é o tipo de coisa que aparece num post-mortem 3 meses depois. Não vale o atalho.
