---
name: closed-loop-revenue
description: |
  Fecha o loop entre clique pago, evento, venda real e margem — a cadeia de identidade
  (GCLID/UTM/transaction_id/CRM) que faz o dado de aquisicao bater com o financeiro. Use ao instrumentar
  um funil que gera receita, ao descobrir que analytics e backend discordam, ao decidir se uma campanha
  da lucro (nao so ROAS), ou ao enviar conversao offline / valor de lead de volta pra plataforma.
  Trigger em: "GCLID", "UTM", "conversao offline", "enhanced conversions", "measurement plan",
  "plano de medicao", "reconciliacao", "analytics nao bate", "receita nao bate", "duplicou conversao",
  "margem de contribuicao", "break-even ROAS", "ROAS de equilibrio", "value-based bidding",
  "smart bidding", "target ROAS", "qualidade de lead", "lead nao vira venda", "consent mode",
  "closed loop", "atribuicao".
argument-hint: "[--audit] [--funnel=ecommerce|leadgen]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Closed-Loop Revenue — Do Clique à Margem

O produto nao termina no deploy. Esta skill cobre a cadeia que liga **clique pago → evento → venda real → margem**, e a disciplina de identidade que faz essa cadeia ser reconciliavel. Sem isso, o time otimiza para numeros que a plataforma de anuncios reporta, nao para dinheiro que entrou.

O erro central que ela previne: **ROAS alto nao significa negocio saudavel**. Uma campanha com ROAS 2,0 pode estar destruindo valor se a margem de contribuicao for 40%.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/quality-gates.md` e `policies/evals.md`.

Para formulas completas, contrato de evento por tipo de funil e receita de auditoria, consultar `docs/skill-guides/closed-loop-revenue.md` apenas quando necessario.

Fronteira com skills vizinhas:
- **21-data-analytics** define **o que** trackear no produto (taxonomia de evento, funil de ativacao/retencao) — esta skill cobre a **identidade** e a **reconciliacao com dinheiro**
- **55-marketing-reporting-analytics** faz setup de GA4/GTM e monta relatorio de campanha — esta skill garante que o dado dentro do relatorio bate com o financeiro
- **03-backend-api** e dono da transacao e do registro de receita — esta skill define o contrato que o backend precisa expor
- **06-security-review** e dono de PII e base legal — esta skill respeita o consent state, nao o define

## Quando Usar

- instrumentar funil que gera receita (e-commerce ou lead gen)
- diagnosticar divergencia entre analytics, plataforma de ads e backend
- decidir se uma campanha da lucro de verdade, nao so ROAS
- enviar conversao offline ou valor de lead de volta pra plataforma
- definir o que enviar pro bidder quando a qualidade do lead varia
- montar measurement plan antes de escrever a primeira tag

## Quando Nao Usar

- definir metrica de produto: ativacao, retencao, engajamento (isso e 21-data-analytics)
- montar relatorio de campanha ou configurar GA4/GTM do zero (isso e 55-marketing-reporting-analytics)
- escrever copy de anuncio ou landing (isso e 13-marketing-copy ou 50-direct-response-copy)
- decidir base legal de tratamento de dado pessoal — esta skill implementa o consent, nao interpreta a lei

## Entradas Esperadas

- funil alvo e tipo (e-commerce, lead gen, assinatura)
- fonte de verdade da receita (backend, ERP, CRM)
- estrutura de custo: COGS, taxas, frete, reembolso, custo variavel
- plataformas de aquisicao e analytics em uso

## Saidas Esperadas

- measurement plan com contrato de evento por etapa
- mapa de identidade (quais IDs existem, onde nascem, onde se juntam)
- relatorio de reconciliacao: backend vs. analytics vs. plataforma, com tolerancia declarada
- break-even ROAS calculado a partir da margem real
- checklist marcado

## 1. Measurement Plan Antes de Tag

A ordem correta e **plano → contrato de evento → tag**. Sair implementando tag primeiro produz evento que ninguem sabe interpretar e numero que nao bate com nada.

O plano responde, por etapa do funil: qual evento, o que ele significa em linguagem de negocio, quem dispara, quais parametros sao obrigatorios, e qual decisao ele vai suportar. Evento que nao suporta decisao nao entra.

Funil de e-commerce e funil de lead gen tem formatos diferentes:

```
E-commerce:  view_item → add_to_cart → begin_checkout → purchase
Lead gen:    view_landing → form_start → generate_lead → qualify_lead → close_convert_lead
```

A diferenca importa: em lead gen, **`generate_lead` nao e receita**. Otimizar bidding para submissao de formulario, quando a qualidade varia, ensina o algoritmo a comprar lead ruim barato.

## 2. Cadeia de Identidade

Cada identificador tem uma funcao. Tratar como intercambiavel e a causa mais comum de dado que nao reconcilia:

| ID | Nasce onde | Serve para | Nao serve para |
| --- | --- | --- | --- |
| **GCLID** | Clique no anuncio (auto-tagging) | Ligar a venda de volta a campanha; conversao offline | Identificar o usuario |
| **UTM** | URL da campanha | Taxonomia legivel, cross-channel | Atribuicao precisa (perde em redirect) |
| **transaction_id** | Backend, na transacao | **Deduplicacao** — a mesma venda contada uma vez so | Atribuicao |
| **ID de usuario/lead** | Cadastro ou CRM | Qualidade e valor real ao longo do tempo | Ser enviado cru pra plataforma |

Regras que evitam a maioria dos bugs:

- **Auto-tagging ligado** — sem GCLID, conversao offline nao existe
- **GCLID persistido no backend**, junto do lead/pedido, no momento em que ele chega — nao adianta so no analytics
- **UTM padronizada**, com taxonomia escrita e validada; `Google` e `google` viram duas fontes diferentes num relatorio
- **`transaction_id` idempotente**, gerado no backend, nunca no cliente
- **Dado pessoal enviado a plataforma so com hash** e base legal — nunca cru

## 3. Reconciliacao — O Backend e a Fonte de Verdade

O evento `purchase` do lado do cliente **nao e receita**. Ele nao dispara quando o pagamento confirma fora do browser (PIX, boleto, retry), dispara duas vezes em refresh, e some com bloqueador.

A arquitetura correta:

```
Backend (fonte de verdade)  →  registra transacao com transaction_id
        ↓                        ↓
    analytics                plataforma de ads
   (evento marcado)         (conversao importada)
```

O relatorio de reconciliacao compara os tres e declara uma **tolerancia** — nao existe bater 100%, e fingir que existe esconde problema real:

| Divergencia tipica | Causa provavel |
| --- | --- |
| Analytics > backend | Evento duplicado (refresh, back-button, sem `transaction_id`) |
| Analytics < backend | Bloqueador, consent negado, pagamento assincrono fora do browser |
| Plataforma > analytics | Janela de atribuicao diferente, modelagem da propria plataforma |
| Receita diferente com contagem igual | Moeda, imposto, frete ou desconto contados de forma diferente |

Divergencia acima da tolerancia bloqueia escala de midia. Escalar orcamento em cima de dado que nao reconcilia e multiplicar o erro.

## 4. Da Metrica Operacional ao Lucro

A hierarquia importa: quanto mais em cima, mais economico; quanto mais embaixo, mais operacional.

```
Lucro incremental / contribuicao   ← o que importa
      ↑
   Receita, CAC
      ↑
   AOV, CVR, qualidade de lead
      ↑
   CPC, CTR, impressoes            ← nunca a meta
```

A conta que muda a decisao:

```
Margem de contribuicao = (Receita − custos variaveis antes da midia) / Receita
Break-even ROAS        = 1 / Margem de contribuicao
```

Com margem de 40%, o break-even e **2,5**. Um ROAS de 2,0 aparece verde no painel e destroi valor.

Custos variaveis a incluir antes de calcular: COGS, taxa de pagamento, frete e subsidio, reembolso e chargeback, suporte variavel. Deixar qualquer um de fora infla a margem e rebaixa o break-even artificialmente.

**Nunca otimizar CTR quando o objetivo e margem.** Sao metricas de camadas diferentes.

## 5. Alimentar o Bidder com Sinal Economico

Automacao de lance so e tao boa quanto o sinal que recebe. A progressao correta:

| Situacao | Estrategia |
| --- | --- |
| Tracking ainda nao reconcilia | **Nao escalar automacao** — lixo entra, lixo sai |
| Conversoes tem valor parecido | Maximizar conversoes / CPA alvo |
| Valores variam bastante | Maximizar valor de conversao |
| Volume e historico de valor suficientes | ROAS alvo |
| Lead gen com qualidade variavel | **Valor offline** — enviar a venda real, nao a submissao do formulario |

Para lead gen, a virada de chave e enviar de volta o **desfecho real** (lead virou venda? de quanto?), nao o formulario preenchido. Uma campanha com 1.000 leads baratos que nao fecham nao vale mais que 200 leads que fecham com margem — e sem esse retorno, o algoritmo nao tem como saber.

Mudanca grande de estrategia se testa com experimento (controle vs. tratamento), nao comparando com a semana passada — sazonalidade e ruido explicam quase qualquer diferenca semana a semana.

## 6. Consentimento

Instrumentacao e privacidade nao se separam. O estado de consentimento precisa chegar as tags **antes** de qualquer disparo, e a mudanca de consentimento (inclusive revogacao) precisa propagar.

- Rejeitar deve ser tao facil quanto aceitar — banner so com "aceitar" é padrao problematico
- Nada nao-essencial dispara antes do consentimento quando a base legal e consentimento
- Revogacao propaga; o estado nao pode ficar preso na primeira escolha
- Dado pessoal enviado a plataforma so hasheado, e so com base legal

A escolha de base legal e a interpretacao de caso concreto sao de responsavel juridico/DPO — esta skill implementa o mecanismo.

## Anti-Padroes

- Implementar tag antes de existir measurement plan
- Tratar evento `purchase` do cliente como fonte de verdade de receita
- `transaction_id` gerado no cliente, ou ausente
- Auto-tagging desligado (mata conversao offline)
- GCLID so no analytics, sem persistir junto do pedido/lead no backend
- UTM sem taxonomia — `Google`, `google` e `google-ads` como tres fontes
- Escalar orcamento com reconciliacao fora da tolerancia
- Otimizar bidding para `generate_lead` quando a qualidade do lead varia
- Usar ROAS como meta sem calcular o break-even da margem real
- Otimizar CTR ou CPC quando o objetivo declarado e margem
- Comparar performance com "a semana passada" em vez de experimento controlado
- Disparar tag de ads/analytics antes do consentimento
- Enviar e-mail ou telefone cru pra plataforma

## Checklist

Plano e identidade:
- [ ] Measurement plan escrito antes das tags, com decisao suportada por evento
- [ ] Auto-tagging ligado; GCLID persistido no backend junto do lead/pedido
- [ ] UTM com taxonomia documentada e validada
- [ ] `transaction_id` idempotente, gerado no backend
- [ ] Dado pessoal so hasheado, com base legal

Reconciliacao:
- [ ] Backend declarado como fonte de verdade da receita
- [ ] Relatorio comparando backend × analytics × plataforma
- [ ] Tolerancia de divergencia declarada e monitorada
- [ ] Duplicidade testada (refresh, back-button, retry de pagamento)
- [ ] Pagamento assincrono (PIX, boleto) coberto por evento server-side

Economia:
- [ ] Margem de contribuicao calculada com todos os custos variaveis
- [ ] Break-even ROAS derivado da margem, nao arbitrado
- [ ] Meta declarada em lucro/contribuicao, nao em CTR ou CPC
- [ ] Lead gen envia desfecho real, nao submissao de formulario

Privacidade:
- [ ] Consent state chega as tags antes de qualquer disparo
- [ ] Rejeitar tao facil quanto aceitar; revogacao propaga

## Evidencia de Conclusao

- measurement plan versionado, com contrato por evento
- relatorio de reconciliacao com numeros reais e tolerancia declarada
- break-even ROAS calculado e registrado, com os custos que entraram na conta
- checklist marcado, com item nao aplicavel justificado

## Handoff

### Recebe de

- **01-po-feature-spec** — objetivo economico e metrica primaria
- **21-data-analytics** — taxonomia de evento do produto
- **03-backend-api** — contrato da transacao e fonte de verdade da receita

### Entrega para

- **55-marketing-reporting-analytics** — relatorio de campanha em cima de dado ja reconciliado
- **03-backend-api** — requisito de persistir GCLID e expor `transaction_id` idempotente
- **06-security-review** — revisao de PII, hashing e consent
- **05-qa-testing** — duplicidade, consent negado e pagamento assincrono viram teste

## Regra de Codigo Limpo

Comentario onde a regra de negocio nao e obvia: por que determinado custo entra no calculo de margem, por que um evento e server-side. Nome de evento e parametro seguem o padrao da plataforma, sem apelido interno.

## Fontes

- Modelo de identidade de clique (GCLID) e conversao offline: documentacao do Google Ads.
- Nomes de evento recomendados e key events: documentacao do GA4.
- Estrategias de lance automatico e otimizacao por valor: documentacao do Google Ads.
- Consentimento e boas praticas de banner: orientacao da ANPD sobre cookies (LGPD).
- Formulas de margem de contribuicao e break-even: contabilidade gerencial padrao.

## Integracao com Pipeline

- **Orquestrador (skill 09):** aciona esta skill antes de qualquer escala de midia paga
- **Data Analytics (skill 21):** dona da taxonomia de produto; esta skill cobre identidade e dinheiro
- **Marketing Reporting (skill 55):** consome o dado ja reconciliado que esta skill garante
- **Backend (skill 03):** implementa persistencia de GCLID e idempotencia da transacao
- **Security Review (skill 06):** valida PII, hashing e consent
- **QA (skill 05):** transforma duplicidade e consent em teste de regressao
