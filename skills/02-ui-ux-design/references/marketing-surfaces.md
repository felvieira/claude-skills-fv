# Marketing Surfaces — Site, Landing Page, Pricing, Conversão

Carregar quando o escopo da auditoria/implementação for uma superfície que existe para converter visitante em lead, cadastro ou venda — não uma ferramenta que alguém já usa.

## Fronteira com a Skill 61

Estratégia de conteúdo, priorização de pauta, esquema de precificação pública e arquitetura de aquisição são de `skills/61-content-growth-engine/SKILL.md` — não duplicado aqui. Este arquivo cobre a **auditoria da página em si**: hierarquia, CTA, confiança, e os antipadrões específicos de superfície de conversão.

## O Que Auditar Numa Landing Page

- **Uma tarefa por tela** — se a página tem 3 CTAs de peso igual competindo, nenhum vence (Von Restorff, ver SKILL.md principal)
- **A dobra inicial responde**: o que é, para quem, qual benefício, qual o próximo passo — sem isso, o resto da página não importa porque ninguém rola
- **Prova antes do CTA repetido** — depoimento, número, caso de uso — não decoração, evidência
- **CTA com verbo + resultado**, não rótulo genérico ("Enviar" vs. "Criar minha conta")
- **FAQ trata objeção real**, levantada de call de vendas ou suporte quando possível (ver skill 61, "perguntas de toda reunião comercial") — não pergunta inventada pra parecer completo

## Pricing — O Que Auditar

- **Unidade do preço explícita** — por mês, por usuário, por projeto, por crédito. Preço sem unidade força o visitante a adivinhar
- **3-4 planos**, não mais — cada plano a mais é uma decisão a mais que o visitante precisa tomar (Hick-Hyman)
- **Plano recomendado com destaque único** — se todos têm o mesmo peso visual, "recomendado" perde sentido
- **Condição de cancelamento visível antes da decisão**, não escondida nos termos — esconder isso é dark pattern de custo oculto (ver SKILL.md principal, seção Dark Patterns)

## Antipadrões Específicos de Superfície de Marketing

- **Carrossel automático na área principal** — some antes do usuário terminar de ler, e ninguém espera pra ver o próximo slide
- **Múltiplos CTAs com o mesmo peso visual** — decisão sem hierarquia é ausência de decisão
- **Ocultar preço ou condição relevante** até o checkout — sempre dark pattern de custo oculto, nunca só "estratégia de conversão"
- **Depoimento sem atribuição verificável** — nome genérico, sem foto/empresa/link, é indistinguível de fabricado. Se não pode ser verificado, não deveria estar na página
- **Prova social sem contexto** — "10.000 clientes" sem dizer o quê, desde quando, ou comparado a quê, é número decorativo

## Verificação Ao Fechar

- a dobra inicial responde as 4 perguntas (o quê / pra quem / benefício / próximo passo) sem rolar
- CTA principal é único por seção e usa verbo + resultado
- toda condição de preço/cancelamento está visível antes do momento de decisão, não escondida
- nenhum depoimento ou número de prova social é inverificável
