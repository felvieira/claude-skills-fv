---
name: marketing-reporting-analytics
description: |
  Skill de Marketing Analytics Ops para relatorios de campanha, setup tecnico de GA4/GTM, auditoria de
  infraestrutura de dados de marketing e calculadoras financeiras (CAC payback, ROI/ROAS). Use quando
  precisar montar relatorio de performance de Ads, configurar GA4 do zero, auditar tracking de marketing
  ou calcular retorno de investimento em aquisicao.
  Trigger em: "relatorio de ads", "relatorio de campanha", "relatorio de performance", "relatorio mensal", "performance report", "Google Ads report",
  "Google Ads", "GA4", "setup GA4", "GTM", "Google Tag Manager", "Universal Analytics", "auditoria de dados de marketing",
  "auditar dados de marketing", "data audit", "pixel do Meta", "Meta Ads", "CAC payback", "payback period", "ROI de marketing",
  "ROI de", "ROAS", "calculadora de ROI", "cost per acquisition", "customer acquisition cost".
---

# Marketing Reporting & Analytics Ops

Duas perguntas que "instrumentar o produto" (skill 21) nao responde: **a ferramenta de terceiro esta configurada certo?** e **o dinheiro gasto em aquisicao voltou?** Esta skill cobre a camada operacional de marketing analytics — setup de GA4/GTM, auditoria de stack de dados, relatorio de campanha e matematica financeira de aquisicao — que fica fora do escopo intencional da skill 21.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md` e `policies/verification-before-completion.md`.

### Privacidade e PII

Setup de tracking de terceiro (GA4, GTM, Meta Pixel) e auditoria de dados tocam dados de usuario — mesma disciplina de `skills/21-data-analytics/SKILL.md`:
- nunca configurar coleta de PII (email, nome, CPF, telefone) em parametro de evento sem base legal
- IP anonymization e retencao de dados configurados por padrao no menor prazo que atenda o negocio
- checar consent mode (LGPD/GDPR) antes de disparar tags de ads/analytics
- documentar no relatorio de auditoria quais tags coletam quais dados

## Quando Usar

- montar relatorio de performance de campanha (Google Ads, Meta Ads) para stakeholder
- configurar GA4 e GTM tecnicamente do zero, ou migrar de Universal Analytics
- auditar a infraestrutura de dados de marketing de um projeto (tags, pixels, atribuicao, warehouse)
- calcular CAC payback period ou ROI/ROAS de um canal ou campanha

## Quando Nao Usar

- definir tracking plan de **produto** (eventos, funil, north-star) → skill 21 (data-analytics). Esta skill cobre *como configurar a ferramenta*; a 21 cobre *o que trackear e por que*
- escrever copy do relatorio (headline, narrativa de apresentacao) → skill 13 (marketing-copy)
- SEO tecnico ou keyword research → skill 14 (seo-specialist)
- observabilidade de sistema (uptime, latencia, erro de servico) → skill 20 (observability-sre) — isto e comportamento de usuario e gasto de midia, nao saude de servico
- decisao de budget/pricing de negocio sem dados (isto e input pra skill 01, nao saida desta skill)

## Entradas Esperadas

- ferramenta(s) em uso: GA4, GTM, Meta Ads Manager, Google Ads, CRM/warehouse
- objetivo do relatorio ou da auditoria (executivo mensal, revisao de otimizacao, QBR de agencia)
- acesso (ou export) aos dados de campanha do periodo
- para calculadoras: CAC, ARPA, gross margin %, churn mensal (o que estiver disponivel)

## Saidas Esperadas

- relatorio de performance estruturado (ver template abaixo) pronto pra stakeholder
- checklist de setup GA4/GTM com cada item marcado feito/pendente/NA
- relatorio de auditoria de dados com veredito PASS/FAIL/PARTIAL por item e severidade
- calculo de CAC payback ou ROI/ROAS com formula explicita e interpretacao

---

## 1. Relatorio de Performance de Campanha (Ads)

Estrutura para relatorio de Google Ads / Meta Ads. Nao gerar todas as secoes sempre — escolher pelo publico (ver "Adaptar por publico" abaixo).

### Secoes

1. **Header** — campanha/conta, periodo, autor, lista de distribuicao
2. **Resumo executivo** — indicador visual (verde/amarelo/vermelho), % de budget utilizado, 3-5 conquistas, 1-3 problemas criticos, recomendacoes prioritarias
3. **Metricas core** (sempre incluir, com variacao % vs periodo anterior):
   - Trafego: impressoes, cliques, CTR
   - Custo: spend total, CPC, CPM, pacing de budget
   - Conversao: conversoes, taxa de conversao, CPA, ROAS, receita
   - Qualidade: quality score medio, ad relevance, landing page experience
4. **Breakdown por campanha** — nome, tipo, impressoes/cliques/CTR, spend/CPC, conversoes/CPA, ROAS, status vs meta
5. **Top e bottom performers** — melhores/piores campanhas, ad groups, keywords e anuncios (com causa raiz nos piores)
6. **Audiencia** — demografia, dispositivo, localizacao, novo vs recorrente, remarketing
7. **Search terms** (se Search) — termos convertendo, negativas adicionadas, oportunidades de match type
8. **Analise de conversao** — funil, modelo de atribuicao, conversoes assistidas, tempo ate conversao
9. **Recomendacoes** — cada uma com: acao, racional (data-driven), impacto esperado, prioridade, prazo, owner

### Formula core

```
ROAS = Receita da campanha / Custo da campanha
CPA  = Custo total / Numero de conversoes
CTR  = Cliques / Impressoes
```

### Adaptar por publico

| Publico | Foco | Nivel de detalhe |
|---|---|---|
| C-level / executivo mensal | resumo executivo + ROAS + recomendacoes de negocio | alto nivel, sem jargao |
| Gestor de PPC (otimizacao semanal) | breakdown por campanha, search terms, audiencia | tatico, granular |
| Cliente de agencia (QBR trimestral) | comparativo YoY, contexto de mercado, roadmap | narrativo, com contexto |
| CFO (justificativa de budget) | ROI, eficiencia ao longo do tempo, impression share perdido | financeiro, projecao |

### Regra de apresentacao

- resumo executivo primeiro, sempre — decisor le isso e para
- toda metrica isolada e ruido; toda metrica precisa de comparacao (periodo anterior, meta, benchmark)
- grafico de tendencia > tabela para serie temporal; tabela > grafico para comparar campanhas
- nunca apresentar metrica sem "e daí" — o "por que importa" vai junto

## 2. Setup Tecnico GA4 + GTM

Checklist de configuracao, nao de estrategia (a estrategia de *o que* medir vem da skill 21). Usar para: implementacao nova, migracao de Universal Analytics, ou correcao de instalacao existente.

### Fase 1 — Estrutura

- [ ] propriedade GA4 criada com fuso horario e moeda corretos do negocio
- [ ] data stream configurado (web/app) com URL/bundle ID corretos
- [ ] Google Tag (gtag.js) ou GTM instalado em todas as paginas, incluindo checkout/paginas de conversao
- [ ] retencao de dados configurada no menor prazo que atenda o negocio (14 meses default, avaliar se precisa mais)
- [ ] filtro de trafego interno configurado (excluir IP do time/agencia)
- [ ] cross-domain tracking configurado se o funil atravessa dominios diferentes

### Fase 2 — Eventos

- [ ] eventos automaticos (enhanced measurement) revisados — desligar os irrelevantes pro negocio
- [ ] eventos de conversao customizados marcados como "conversion" no GA4
- [ ] e-commerce tracking (se aplicavel): `view_item`, `add_to_cart`, `begin_checkout`, `purchase` com parametros de valor/moeda/itens
- [ ] eventos server-side para conversoes de dinheiro (client-side perde 5-15% por adblock/erro de rede — mesma regra da skill 21)
- [ ] nenhum evento carrega PII em parametro (validar contra a lista de dados sensiveis)

### Fase 3 — Integracao

- [ ] Google Ads linkado ao GA4 (import de conversoes)
- [ ] BigQuery export configurado se houver necessidade de analise raw
- [ ] consent mode configurado e testado com opt-out real (banner de cookie afeta o disparo)
- [ ] GTM: workspace organizado, tags nomeadas de forma consistente, triggers documentados

### Fase 4 — Validacao

- [ ] DebugView do GA4 confirma que os eventos chave disparam corretamente
- [ ] Realtime report confirma trafego real chegando
- [ ] Google Tag Assistant / Preview mode do GTM sem erros
- [ ] comparar contagem de conversao do GA4 com o sistema de origem (CRM/checkout) por 3-7 dias antes de confiar no numero

**Nao "configurado" ate passar pela Fase 4** — GA4 aceitar o tag nao significa que os dados estao corretos.

## 3. Auditoria de Infraestrutura de Dados de Marketing

Usar para diagnosticar um projeto existente antes de confiar nos numeros ou antes de uma migracao. Cada item recebe **PASS / FAIL / PARTIAL** com nota de severidade.

### Categorias

1. **Tracking basico** — tags carregando em todas as paginas, sem duplicacao (GA4 disparando 2x é bug comum), sem erro de console
2. **Conversao** — eventos de conversao mapeados ao funil real, valor monetario correto, atribuicao configurada
3. **Plataformas de ads** — Google Ads, Meta Pixel, LinkedIn Insight Tag instalados e linkados as respectivas contas de analytics
4. **Qualidade de dados** — sem spike anormal (bot traffic), sem gap de coleta (dias sem dado), IDs consistentes entre sistemas
5. **Warehouse/armazenamento** — se houver, export configurado, schema documentado, job de ETL monitorado
6. **Atribuicao** — modelo definido e consistente entre plataformas (nao comparar last-click do Ads com data-driven do GA4 sem normalizar)
7. **Privacidade** — consent mode ativo, PII nao vazando em parametro de evento, politica de retencao definida
8. **Governanca** — donos de cada fonte de dados definidos, mudancas de tracking documentadas e versionadas

### Severidade

| Nivel | Significado | Exemplo |
|---|---|---|
| Critico | numero de decisao esta errado | conversao duplicada inflando ROAS reportado |
| Alto | gap gera decisao possivelmente errada | atribuicao inconsistente entre Ads e GA4 |
| Medio | ruido, mas nao muda decisao | evento morto sem consumidor |
| Baixo | melhoria de higiene | naming inconsistente sem impacto de leitura |

### Saida da auditoria

Tabela: item | categoria | veredito | severidade | evidencia | acao recomendada. Ordenar por severidade decrescente — o time corrige do Critico pra baixo, nao na ordem do checklist.

## 4. Calculadoras Financeiras de Aquisicao

### CAC Payback Period

```
CAC Payback (meses) = CAC / (ARPA x Gross Margin %)
```

- **CAC** = custo total de aquisicao (midia + vendas + marketing) / numero de clientes novos no periodo
- **ARPA** = receita media por conta, mensal
- **Gross Margin %** = margem bruta (nao receita bruta — SaaS deve descontar custo de infra/suporte)

Ajuste por churn: se churn mensal for alto (>3-5%), payback nominal subestima o risco — parte dos clientes nao chega a pagar o CAC de volta. Calcular payback ajustado multiplicando o denominador pela probabilidade de retencao acumulada até o mes N.

**Benchmarks de referencia (contextualizar, nao usar como meta absoluta):**
- SaaS eficiente: payback < 12 meses
- SaaS aceitavel: 12-18 meses
- SaaS de risco: > 24 meses (exige capital de giro robusto)

### ROI / ROAS de Marketing

```
ROI  = (Receita atribuida - Custo total) / Custo total  [expresso em %]
ROAS = Receita atribuida / Custo total                   [expresso em razao, ex: 5:1]
```

Regras de calculo correto:
- **custo fully-loaded**: incluir midia + ferramenta + headcount proporcional, nao so o spend de midia (senão infla o ROI artificialmente)
- calcular por canal e por campanha, nao so agregado — a media esconde o canal que da prejuizo
- ROAS bom varia por industria: e-commerce ~4:1, lead gen B2B ~2:1+ (customizar pelo gross margin real do negocio)
- break-even ROAS = 1 / gross margin % (abaixo disso, cada venda perde dinheiro mesmo com receita positiva)

## Anti-padroes Frequentes

- **relatorio sem "e daí"** — metrica isolada sem comparacao ou contexto de negocio
- **GA4 "instalado" sem Fase 4 de validacao** — numero errado silenciosamente confiavel por meses
- **ROI sem custo fully-loaded** — spend de midia sozinho subestima o custo real, infla o retorno reportado
- **CAC sem ajuste de churn** — payback nominal esconde risco de cliente que sai antes de pagar o CAC
- **auditoria sem severidade** — lista plana de 50 itens sem priorizacao vira checklist que ninguem executa
- **comparar atribuicao de plataformas diferentes sem normalizar modelo** — Ads (last-click) vs GA4 (data-driven) nao sao o mesmo numero

## Evidencia de Conclusao

- relatorio de campanha: toda metrica tem comparacao e recomendacao associada
- setup GA4/GTM: Fase 4 (validacao) executada, nao só Fases 1-3
- auditoria: cada item tem veredito + severidade, ordenado por severidade
- calculadora: formula explicita mostrada, não só o numero final

## Handoff

- **PO (01)** usa o relatorio/ROI para decisao de budget e priorizacao
- **Data Analytics (21)** define o tracking plan de produto que esta skill audita/configura tecnicamente
- **Marketing Copy (13)** escreve a narrativa/apresentacao do relatorio quando for para audiencia externa
- **Observability/SRE (20)** para saude tecnica do pipeline de dados (nao coberto aqui — esta skill cobre o conteudo do dado, nao a infra que o processa)
- Seguir `policies/handoffs.md`
