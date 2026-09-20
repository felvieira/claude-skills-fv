# Arquétipos de Negócio

Nove arquétipos que a entrevista da skill 78 pode reconhecer. Se o negócio do operador não se encaixar claramente em nenhum, marcar como `outro` e fazer 2-3 perguntas abertas sobre como ganha dinheiro e como é o dia a dia.

---

## ecommerce

**Resumo:** vende produto físico ou digital via loja online. Orientado a pedido. Fluxo de estoque e reembolso.

**Ferramentas típicas:** Shopify, WooCommerce ou Mercado Livre/Shopee, gateway de pagamento (Stripe, Mercado Pago), e-mail marketing (Klaviyo, RD Station), anúncios (Meta, Google, TikTok), atendimento (WhatsApp, help desk).

**Padrão de dor:** dono discute toda semana qual produto dá lucro de verdade; e-mail de reembolso espalhado em duas caixas de entrada; gasto de anúncio rastreado em três planilhas que não batem; pesquisa de satisfação acumula sem ninguém ler.

**Hierarquia de agente típica:** orquestrador (chefe de gabinete) → bot financeiro (resumo de margem), bot de marketing (anúncio + voz do cliente), bot de operação (estoque, agenda).

---

## saas

**Resumo:** software por assinatura, recorrente. Time de engenharia lançando produto continuamente.

**Ferramentas típicas:** GitHub/GitLab, Linear ou Jira, Stripe, ferramenta de produto (Mixpanel, Pendo), suporte (Intercom, Zendesk), monitoramento de erro (Sentry), Slack, gravação de call (Fireflies, Gong).

**Padrão de dor:** gerente de engenharia é o roteador humano entre suporte e dev; tempo de correção de bug em semanas; feedback de cliente se perde no ruído; investigação de churn demora dias porque o dado vive em cinco lugares.

**Hierarquia de agente típica:** orquestrador de triagem → analista de causa raiz (junta ticket + commit + call), rascunho de correção, destilador de voz do cliente.

---

## servicos_profissionais (advocacia, contabilidade, consultoria)

**Resumo:** prática de hora faturável. Trabalho de conhecimento, muitas vezes regulado, por processo/caso.

**Ferramentas típicas:** gerenciador de documento (iManage, NetDocuments), sistema de faturamento (Clio, Bill4Time), e-mail corporativo, base jurídica (LexisNexis, se advocacia), assinatura digital.

**Padrão de dor:** hora faturável perdida procurando documento antigo; comunicação de caso em três lugares diferentes; onboarding de cliente novo repete o mesmo formulário manualmente.

**Hierarquia de agente típica:** orquestrador → destilador de processo/caso, assistente de faturamento, rascunho de comunicação padrão.

**Nota regulatória:** dado de cliente frequentemente não pode sair do ambiente do cliente — considerar hospedagem que mantém tudo dentro do tenant e regras por pasta.

---

## clinica_saude

**Resumo:** prática regulada, atendimento a paciente. Dado sensível (prontuário).

**Ferramentas típicas:** prontuário eletrônico, agenda, faturamento de convênio, WhatsApp para lembrete de consulta.

**Padrão de dor:** recepção sobrecarregada com confirmação manual de consulta; resultado de exame demora a chegar ao médico certo; dado de paciente espalhado entre sistema de agenda e prontuário sem conversa entre eles.

**Hierarquia de agente típica:** orquestrador → assistente de agenda, resumo de resultado de exame (com escopo restrito por regra de dado sensível), lembrete automático.

**Nota regulatória obrigatória:** todo fluxo que toca prontuário precisa de regra por pasta que impede o agente de ler fora do escopo do paciente/contexto autorizado. Esse passo entra no plano de 30 dias, não é opcional.

---

## consultoria_financeira

**Resumo:** assessoria de investimento boutique, fundo pequeno, ou family office.

**Ferramentas típicas:** plataforma de custódia, CRM de relacionamento, planilha de alocação, comunicação regulada (compliance de e-mail).

**Padrão de dor:** relatório de performance montado manualmente todo mês; comunicação com cliente precisa de trilha de auditoria que hoje não existe de forma centralizada.

**Hierarquia de agente típica:** orquestrador → resumo de performance de carteira, assistente de comunicação com trilha de auditoria.

---

## criador_conteudo

**Resumo:** newsletter, YouTube, podcast, ou curso. Operador solo ou pequena equipe.

**Ferramentas típicas:** plataforma de newsletter (Substack, ConvertKit), YouTube/plataforma de vídeo, produto digital (Gumroad, Hotmart), comunidade (Discord, Skool) quando existe.

**Padrão de dor:** métricas de audiência espalhadas entre 3-4 plataformas sem visão unificada; conteúdo antigo (back-catalog) não é reaproveitado porque está em formato bruto; monetização (venda + assinatura paga) não conversa com dado de audiência.

**Hierarquia de agente típica:** orquestrador → resumo de monetização semanal, resumo de audiência, destilador de conteúdo antigo pra reaproveitamento.

**Nota:** se o criador não tem comunidade (resposta "não tenho"), nunca sugerir Discord/Skool como canal — respeitar essa resposta como válida.

---

## restaurante_multiunidade

**Resumo:** operação de food service com mais de uma unidade.

**Ferramentas típicas:** sistema de PDV por unidade, delivery (iFood, Rappi), planilha de custo de insumo, WhatsApp de gestão de equipe.

**Padrão de dor:** comparar performance entre unidades exige juntar exportação manual de cada PDV; desperdício de insumo não é rastreado de forma consolidada.

**Hierarquia de agente típica:** orquestrador → resumo financeiro consolidado por unidade, resumo de operação (desperdício, agenda de equipe).

**Nota:** esse arquétipo quase sempre precisa do ramo "não tenho desenvolvedor" da entrevista (Estágio 9.5) — priorizar linguagem simples e caminho de contratação de freelancer.

---

## corretora_imoveis

**Resumo:** corretor autônomo ou pequena equipe.

**Ferramentas típicas:** CRM imobiliário, WhatsApp, portal de anúncio (OLX, Zap Imóveis), planilha de comissão.

**Padrão de dor:** lead de portal de anúncio não é acompanhado de forma sistemática; comissão calculada manualmente por corretor.

**Hierarquia de agente típica:** orquestrador → assistente de follow-up de lead, resumo de comissão.

---

## prestador_servico_local (elétrica, encanamento, jardinagem, limpeza)

**Resumo:** serviço de campo, geralmente pequena equipe ou autônomo.

**Ferramentas típicas:** WhatsApp pra agendamento, planilha de orçamento, aplicativo de pagamento (Pix, maquininha).

**Padrão de dor:** agenda inteira vive no WhatsApp sem visão consolidada; orçamento repetido manualmente pra cada cliente novo.

**Hierarquia de agente típica:** orquestrador → assistente de agenda a partir do WhatsApp, gerador de orçamento padrão.

**Nota:** esse arquétipo quase sempre precisa do ramo "não tenho desenvolvedor" da entrevista (Estágio 9.5), obrigatório conforme o SKILL.md principal.
