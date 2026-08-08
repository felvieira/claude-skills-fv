# Closed-Loop Revenue — Guia de Referência

Guia da skill `59-closed-loop-revenue`. Consultar para contrato de evento, fórmulas e receita de auditoria.

## Contrato de evento

Todo evento que toca dinheiro precisa destes campos. Faltando qualquer um, a reconciliação depois fica impossível:

| Campo | Exemplo | Por quê |
| --- | --- | --- |
| `event_name` | `purchase` | Nome padrão da plataforma, não apelido interno |
| `transaction_id` | `ord_2026_08_44812` | **Deduplicação** — sem isso, refresh conta duas vezes |
| `value` | `399.90` | Numérico, sem símbolo nem separador de milhar |
| `currency` | `BRL` | Código ISO; sem isso a plataforma assume a moeda da conta |
| `gclid` | `Cj0KCQ...` | Ligação com a campanha; persistir no backend |
| `utm_*` | `google` / `cpc` / `produto-x` | Taxonomia legível cross-channel |
| `user_id` / `lead_id` | pseudonimizado | Liga ao desfecho real no CRM |
| `timestamp` | ISO 8601 com fuso | Janela de atribuição e ordenação |

O `value` de e-commerce deve declarar explicitamente o que inclui:

```
value = receita do pedido
        − descontos aplicados
        (definir e documentar: inclui frete? inclui imposto?)
```

O erro comum é analytics contar com frete e backend contar sem. A contagem bate, o valor não — e ninguém acha a causa.

## Funis

**E-commerce**

```
view_item → add_to_cart → begin_checkout → add_payment_info → purchase
```

**Lead gen** — a diferença crítica está depois do formulário:

```
view_landing → form_start → generate_lead → qualify_lead → close_convert_lead
                                 ↑                              ↑
                        não é receita                    aqui é receita
```

Otimizar bidding para `generate_lead` quando a qualidade varia treina o algoritmo a comprar lead ruim barato. O sinal que importa é `close_convert_lead` com valor real.

**Assinatura** — o valor de um `purchase` inicial não representa o valor do cliente:

```
trial_start → subscribe → renew (N×) → churn
```

Enviar o valor do primeiro mês subestima; enviar LTV projetado infla. O caminho honesto é enviar valor realizado em janela definida (ex: receita dos primeiros 90 dias) e documentar a escolha.

## Fórmulas

Operacionais:

```
CTR  = cliques / impressões
CPC  = investimento / cliques
CVR  = conversões / cliques
CPA  = investimento / conversões
AOV  = receita / pedidos
ROAS = receita atribuída / investimento
```

Econômicas — as que decidem:

```
Custos variáveis = COGS
                 + taxa de pagamento
                 + frete e subsídio
                 + reembolso e chargeback
                 + custo variável de suporte

Contribuição = Receita − custos variáveis − mídia

Margem de contribuição = (Receita − custos variáveis) / Receita

Break-even ROAS = 1 / Margem de contribuição
```

Tabela de referência:

| Margem de contribuição | Break-even ROAS |
| ---: | ---: |
| 20% | 5,0 |
| 30% | 3,33 |
| 40% | 2,5 |
| 50% | 2,0 |
| 70% | 1,43 |

Com margem de 40%, ROAS 2,0 aparece positivo no painel e **destrói valor**. É a razão pela qual "ROAS bom" precisa sempre de um número de referência calculado, nunca herdado de benchmark de mercado.

Lead gen, cadeia até o valor real:

```
Valor por lead = taxa de fechamento × ticket médio × margem de contribuição
```

Com 10% de fechamento, ticket de R$5.000 e margem de 40%, cada lead vale R$200 — esse é o número que vai pro bidder, não "1 conversão".

## Receita de auditoria

Comparar as três fontes no mesmo intervalo, com o mesmo fuso:

```
1. Backend    → SELECT count(*), sum(value) FROM orders
                WHERE created_at BETWEEN ... AND status = 'paid'
2. Analytics  → mesma janela, mesmo evento
3. Plataforma → mesma janela, considerando a janela de atribuição
```

Diagnóstico por padrão de divergência:

| Sintoma | Causa provável | Como confirmar |
| --- | --- | --- |
| Analytics > backend | Evento duplicado | Contar `transaction_id` distintos vs. total de eventos |
| Analytics < backend | Bloqueador, consent negado, pagamento assíncrono | Comparar taxa por método de pagamento |
| Plataforma > analytics | Janela de atribuição / modelagem da plataforma | Comparar em janela idêntica |
| Contagem bate, valor não | Moeda, imposto, frete ou desconto | Comparar `value` pedido a pedido numa amostra |
| Falta só um segmento | Fluxo específico sem instrumentação | Segmentar por método de pagamento e device |

Tolerância: declarar explicitamente (ex: ±5% em contagem, ±3% em valor) e monitorar. Bater 100% não acontece — o que importa é a divergência ser estável, explicada e dentro do limite. Divergência acima da tolerância **bloqueia escala de mídia**.

## Pagamento assíncrono

O caso que quebra a maioria das implementações client-side:

```
PIX / boleto:
  usuário sai do checkout  →  paga horas depois  →  webhook confirma
                                                        ↑
                              o browser já fechou; nenhum evento client-side dispara
```

Solução: evento server-side no webhook de confirmação, com o mesmo `transaction_id`. Se houver também evento client-side, a deduplicação por `transaction_id` impede contagem dupla.

## Conversão offline

Fluxo para lead gen B2B / ticket alto:

```
1. Clique  →  GCLID na URL
2. Landing →  persistir GCLID junto do lead (backend/CRM), não só no analytics
3. CRM     →  lead avança: qualificado → proposta → fechado
4. Upload  →  enviar de volta: GCLID + desfecho + valor real
5. Bidder  →  aprende a comprar lead que fecha, não lead que preenche
```

O ponto de falha mais comum é o passo 2: o GCLID fica só no analytics e não é persistido junto do registro do lead. Sem ele no CRM, não há como fechar o loop depois.

Fluxos de upload de conversão mudam com frequência — conferir a documentação atual da plataforma em vez de seguir tutorial antigo.

## Consentimento

```
CMP / preferência do usuário
        ↓
    consent state
        ↓
  tag de analytics / ads
        ↓
   evento disparado (ou não)
        ↓
  revogação propaga de volta
```

Checklist de banner:

- Rejeitar tão fácil quanto aceitar (mesmo nível, mesmo peso visual)
- Nada não-essencial ativado por padrão quando a base legal é consentimento
- Revogação acessível depois da primeira escolha
- Estado persiste entre sessões e propaga para todas as tags

## Teste de regressão

```js
test("purchase não duplica em refresh", async ({ page }) => {
  await completeCheckout(page);
  const id = await page.evaluate(() => window.dataLayer
    .filter(e => e.event === "purchase").map(e => e.transaction_id));
  await page.reload();
  const depois = await page.evaluate(() => window.dataLayer
    .filter(e => e.event === "purchase").map(e => e.transaction_id));
  expect(new Set([...id, ...depois]).size).toBe(1);   // mesmo id, uma venda
});

test("nenhuma tag antes do consentimento", async ({ page }) => {
  const requests = [];
  page.on("request", r => requests.push(r.url()));
  await page.goto("/");                       // sem interagir com o banner
  expect(requests.filter(u =>
    u.includes("google-analytics") || u.includes("googleadservices")
  )).toEqual([]);
});
```

## Referência rápida

```
Fonte de verdade        backend, sempre
Deduplicação            transaction_id idempotente, gerado no backend
GCLID                   persistir junto do lead/pedido, não só no analytics
UTM                     taxonomia documentada; case sensitive importa
Pagamento assíncrono    evento server-side no webhook
Break-even ROAS         1 / margem de contribuição
Lead gen                enviar desfecho real, nunca submissão de formulário
Tolerância              declarar; acima dela, não escalar mídia
Consent                 antes de qualquer disparo; revogação propaga
```
