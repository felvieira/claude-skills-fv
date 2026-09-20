# Padrões por Ferramenta

Valores padrão de `formato`, `frequência`, `volume` e `métodos de conexão` para as ferramentas mais citadas na entrevista. Usar em silêncio — nunca perguntar isso diretamente ao operador (ver regra rígida no `SKILL.md`).

Se a ferramenta do operador não estiver aqui, usar `formato=API`, `frequência=sob demanda`, `volume=baixo`, e marcar como oportunidade de escrever uma skill nova em `references/inventario_cli.md`.

| Ferramenta | Formato | Frequência | Volume | Método de conexão |
|---|---|---|---|---|
| Shopify | CSV/API | diário | alto | API, exportação CSV |
| WooCommerce | CSV/API | diário | alto | API, exportação CSV |
| Mercado Livre | API | diário | alto | API |
| WhatsApp Business | chat | tempo real | alto | API oficial, exportação manual |
| Stripe | API/CSV | diário | médio | API, exportação CSV |
| Mercado Pago | API | diário | médio | API |
| Klaviyo | API | semanal | médio | API |
| RD Station | API | semanal | médio | API |
| Meta Ads | XLSX | semanal | médio | exportação, API de marketing |
| TikTok Ads | XLSX | semanal | médio | exportação, API de marketing |
| Google Ads | CSV | semanal | médio | exportação, API |
| Intercom | API | tempo real | médio-alto | API |
| Zendesk | API | tempo real | médio-alto | API |
| Linear | API | diário | médio | API |
| Jira | API | diário | médio | API |
| GitHub Issues | API | diário | médio | API, CLI (`gh`) |
| Sentry | API | tempo real | médio | API |
| Pendo | API | semanal | médio | API |
| Mixpanel | API | semanal | médio | API |
| iManage / NetDocuments | proprietário | sob demanda | baixo-médio | conector proprietário |
| Clio / Bill4Time | API | semanal | baixo | API |
| Prontuário eletrônico | proprietário | diário | médio | varia por fornecedor, frequentemente exige conector proprietário |
| Substack | API/CSV | semanal | baixo-médio | API, exportação |
| ConvertKit | API | semanal | baixo-médio | API |
| Gumroad | API/CSV | semanal | baixo | API |
| YouTube | API | semanal | médio | API (YouTube Data API) |
| Discord | API | tempo real | baixo-médio | API, webhook |
| iFood (parceiro) | API | diário | médio-alto | API de parceiro |
| CRM imobiliário (genérico) | proprietário | diário | baixo-médio | varia por fornecedor |
| Planilha (Excel/Sheets) | XLSX/CSV | manual | baixo | exportação manual, API do Google Sheets |
| Zapier | webhook | tempo real | baixo | integração já existente, aproveitar como fonte |

## Sinal de "paga e não usa"

Marcar `paga_sem_usar = true` só quando o operador voluntariar isso explicitamente ("pago pelo Klaviyo mas não uso", "tenho conta no Pendo parada"). Nunca perguntar diretamente "você paga por algo que não usa?" — isso soa acusatório. Deixar surgir naturalmente na conversa sobre cada ferramenta.
