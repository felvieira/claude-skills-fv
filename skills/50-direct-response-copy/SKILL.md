---
name: direct-response-copy
description: |
  Skill de copy de direct response — headlines com gatilhos mentais, anúncios, e-mails de venda,
  legendas de Instagram, VSL e páginas de venda de infoproduto. Carrega biblioteca de fórmulas de
  headline em 20 categorias de gatilho + os 8 gatilhos mentais + estrutura de storytelling de venda.
  Trigger em: "direct response", "copy de anuncio", "copy de venda", "headline", "gatilho mental",
  "criativo de ads", "email de venda", "legenda", "instagram", "caption", "copy predadora", "VSL",
  "pagina de vendas", "lancamento digital", "infoproduto", "lead magnet", "anuncio", "prova social".
argument-hint: "[peça: headline|anuncio|email|legenda|pagina-de-vendas] [avatar] [oferta]"
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Direct Response Copy — Headlines, Gatilhos e Copy de Venda

Copy que pede ação imediata: o leitor clica, cadastra ou compra agora — ou a peça falhou. Esta skill cobre o arsenal de direct response (gatilhos mentais, fórmulas de headline, storytelling de venda); a skill 13 (marketing-copy) cobre copy de produto (landing page estrutural, microcopy, brand voice).

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/writing-clarity.md` e `policies/anti-ai-writing.md`.

**Gate 1 (anti-AI):** antes de entregar qualquer copy, rodar os 29 padrões de `policies/anti-ai-writing.md`. Copy com cara de AI não sai. Oferecer `/humanize` como passe final.

**Gate 2 (integridade):** ver "Regras de Integridade" abaixo — nenhuma peça sai com claim não-verificável.

## Referencias (carregar sob demanda)

- `references/headline-formulas.md` — fórmulas de headline em 20 categorias de gatilho + tabela de escolha por estado do avatar
- `references/gatilhos-mentais.md` — os 8 gatilhos mentais, estrutura de storytelling, checklist de objeções universais
- `references/instagram-engagement.md` — copy para Instagram (legenda, CTA de interação, hashtags, stories)

Carregar apenas a referência que a peça pedida exige.

## Quando Usar

- escrever headline de anúncio, criativo de ads, e-mail de venda ou sequência de lançamento
- escrever página de vendas / VSL de infoproduto ou serviço
- escrever legenda de Instagram, copy de stories ou comentário de aquisição
- escolher o gatilho mental certo para o estado de consciência do avatar
- revisar copy de venda existente contra gatilhos, objeções e integridade de claims

## Quando Nao Usar

- landing page estrutural de produto SaaS, microcopy, empty states, brand voice → skill 13 (marketing-copy)
- SEO técnico, meta tags, schema → skill 14 (seo-specialist)
- texto editorial de blog → skill 41 (blog-publisher)
- definição de funil/eventos de tracking → skill 21 (data-analytics)

## Entradas Esperadas

- a peça pedida (headline, anúncio, e-mail, legenda, página de vendas)
- avatar: quem é, dor principal, objeções, estado de consciência (frio/morno/quente)
- oferta: o que entrega, prova disponível (depoimentos, números reais), preço/condições
- canal e restrições (limite de caracteres, política de ads da plataforma)

## Saidas Esperadas

- a peça de copy pronta, no tom do avatar, com gatilho declarado ("usei Comprovação porque o avatar é cético")
- variações quando fizer sentido (3-5 headlines para teste A/B)
- lista de claims usados + a prova que cada um exige do cliente
- handoff sinalizado (skill 13 para a página, skill 21 para tracking do funil)

## Protocolo

### 1. Pesquisa do avatar (obrigatória antes de escrever)

Sem avatar mapeado, gatilho é tiro no escuro. Coletar (do usuário ou de material existente no repo):
- dor principal nas palavras do próprio avatar
- desejo final (estado B)
- objeções (usar o checklist universal de `references/gatilhos-mentais.md`)
- estado de consciência: frio (não sabe que tem o problema), morno (busca solução), quente (compara ofertas)

Se o usuário não fornecer, perguntar o mínimo: avatar + oferta + prova disponível. Não inventar avatar.

### 2. Escolher gatilho pelo estado do avatar

Usar a tabela de `references/headline-formulas.md`. Regra rápida:
- frio → Curiosidade, Números, Descoberta, Medo
- morno → Facilidade, Desejo, Comprovação, Autoridade
- quente → Prova Social, Escassez/Urgência, Dúvidas (espelhar ceticismo)

### 3. Escrever a peça

- headline primeiro — ela carrega 80% do resultado; gerar 3-5 variações de categorias diferentes
- corpo segue Dor×Prazer (A→B) ou storytelling (estrutura em `references/gatilhos-mentais.md`)
- antecipar as 2-3 objeções mais fortes do avatar dentro do texto
- todo "porquê" declarado (gatilho 6): preço, prazo, limite — sempre com motivo real
- UMA ação por peça; CTA com verbo + benefício
- escrever como o avatar fala — ler em voz alta mentalmente; se soa anúncio, reescrever

### 4. Gate de integridade + anti-AI

Rodar os dois gates de governança. Entregar com a lista de claims e a prova que cada um exige.

## Regras de Integridade (gate obrigatório)

As fórmulas vêm de material agressivo de direct response. O kit usa as estruturas, não as promessas vazias:

1. **Claim verificável ou claim cortado.** "100% garantido" só com garantia formal real (reembolso). "{N} clientes" só com N real. Sem prova → reformular para o que é provável
2. **Escassez/urgência reais.** Vagas limitadas porque há limite real; prazo que será cumprido. Escassez fabricada queima a marca e viola políticas de ads
3. **Depoimento existe ou não entra.** Nunca gerar depoimento, número ou estudo de caso fictício — nem como placeholder sem marcação explícita `[PLACEHOLDER: cliente real aqui]`
4. **Promessa de resultado ≠ garantia de resultado.** Saúde, dinheiro e relacionamento têm regras de plataforma estritas (Meta/Google ads) — promessas de ganho específico ("R$5 mil/mês") só em estudo de caso real e identificado
5. **Medo sem terrorismo.** Gatilho de medo aponta risco real e oferece saída; não inventa ameaça

## Anti-Padroes

- **Headline genérica de slot vazio:** preencher `{resultado}` com abstração ("melhore sua vida") — slot pede específico e mensurável
- **Salada de gatilhos:** empilhar escassez + medo + autoridade + segredo na mesma headline. Um gatilho dominante por peça
- **Copy de venda para avatar não mapeado:** escrever direto da oferta sem pesquisa — inverte o processo
- **CAIXA ALTA E TRÊS EXCLAMAÇÕES!!!** — grito não é urgência; data e motivo são
- **Traduzir fórmula ao pé da letra para B2B/SaaS sofisticado:** avatar técnico reconhece padrão de infoproduto e descarta. Adaptar registro ou usar skill 13
- **Prometer o crescimento da fonte:** "10k seguidores em 90 dias" e afins — não verificável, não prometa

## Evidencia de Conclusao

- peça entregue com gatilho declarado e justificado pelo estado do avatar
- variações de headline quando a peça é anúncio/teste
- lista de claims + prova exigida anexada
- gates de integridade e anti-AI passados

## Handoff

- **Marketing Copy (skill 13):** quando a peça evolui para landing page completa, microcopy ou brand voice
- **SEO Specialist (skill 14):** se a copy vai para página indexável
- **Data Analytics (skill 21):** definir eventos de conversão do funil que a copy alimenta
- **Image Generator (skill 17):** criativo visual do anúncio que acompanha a copy
- **/humanize:** passe final em qualquer peça antes de publicar

## Integracao com Pipeline

- **Orchestrator (09):** roteia para cá pedidos de copy de venda/anúncio/social; para copy de produto roteia para 13
- **Context Manager (08):** persistir avatar mapeado para reuso entre peças da mesma campanha
- **Documenter (10):** registrar brand claims aprovados para consistência entre campanhas
- **Reviewer (11):** valida gate de integridade em campanhas pagas antes de publicar
