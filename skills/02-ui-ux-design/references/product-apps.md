# Product Apps — SaaS, Dashboard, Tabela, Navegação

Carregar quando o escopo for uma ferramenta que alguém usa repetidamente para realizar uma tarefa — não uma superfície que existe para converter.

Diferença de prioridade em relação a `marketing-surfaces.md`: aqui **eficiência e previsibilidade vencem impressão inicial**. Usuário recorrente notado polimento visual uma vez; nota fricção toda sessão.

## Adotar um Design System Existente

Antes de derivar tokens do zero, decidir se um design system maduro resolve. Adotar um DS existente entrega componentes, tokens, acessibilidade e documentação já resolvidos — inventar do zero só se justifica quando diferenciação visual é o produto.

**A âncora estética e o design system são decisões separadas.** O DS define componentes e estrutura; a âncora define a pele (ver "Direção Estética" no SKILL.md principal). Carbon com paleta e tipografia próprias continua Carbon na estrutura.

| Design system | Dono | Melhor encaixe | Custo |
| --- | --- | --- | --- |
| **Material 3** | Google | Android nativo, produto consumer, quando dynamic color agrega | Alto no Android (nativo no Compose); na web, avaliar o estado de manutenção da implementação escolhida |
| **Apple HIG** | Apple | iOS/iPadOS/macOS | Baixo se usar componentes nativos — o sistema aplica a linguagem atual sozinho |
| **Fluent 2** | Microsoft | Ferramenta de produtividade, ecossistema Microsoft, densidade média-alta | Médio, biblioteca React ampla |
| **Carbon** | IBM | Enterprise com muita tabela, formulário e dado denso | Médio, forte em padrão de dados |
| **Shadcn/Radix + tokens próprios** | — | Quando a marca precisa mandar, mas acessibilidade de primitiva não pode ser reinventada | Baixo, mas exige construir o sistema visual |

Regra de decisão por tipo de produto:

- **Enterprise / muito dado** → Carbon ou Fluent. Tabela densa é o caso onde card não substitui: comparar registros exige linha e coluna
- **Mobile nativo** → o DS da plataforma (M3 no Android, HIG no iOS). Forçar visual idêntico entre as duas quebra a expectativa adquirida do usuário de cada uma
- **Landing / marca forte** → primitiva acessível + tokens próprios; DS completo engessa sem devolver benefício (ver `marketing-surfaces.md`)
- **Dashboard** → Carbon/Fluent para diagnóstico; layout modular em cards para visão executiva

**Compartilhar entre plataformas:** regra de negócio, conteúdo, hierarquia e tokens semânticos. **Não compartilhar:** componente e interação onde a convenção nativa diverge — navegação, seletor de data, ação de linha, sheet.

## Navegação — Escolher pela Quantidade e Frequência

- **Poucas áreas principais** (até ~5-6) → navegação lateral ou superior persistente
- **Muitas áreas hierárquicas** → sidebar agrupada por categoria, com busca — não uma lista plana de 20 itens
- **Tarefa frequente** → acesso persistente (não enterrado em menu de 3 pontos)
- **Ação contextual** → perto do objeto que ela afeta, não centralizada num menu genérico
- **Ação destrutiva** → visualmente separada das rotineiras (ver "Confirmação de Ações" em `skills/56-responsive-conversion/SKILL.md`)

## Dashboard — Responder Pergunta, Não Só Exibir Número

Todo bloco de dado no dashboard precisa comunicar, na ordem:

1. o que aconteceu
2. se é bom ou ruim (comparação, não número solto)
3. causa provável, quando possível
4. próxima ação sugerida

Dez gráficos quando três indicadores + uma lista de exceções resolvem a decisão é ruído, não informação. O critério não é "quantos dados temos", é "quantas decisões isso precisa suportar".

## Tabelas — Checklist do Que Incluir Conforme o Contexto

- ordenação, filtro, busca
- paginação ou virtualização (nunca carregar 10 mil linhas de uma vez)
- seleção e ação em lote, quando a tarefa envolver múltiplos itens
- estado vazio e estado de erro próprios (ver "Estado Vazio" no SKILL.md principal)
- densidade ajustável quando o público mistura perfil de uso (visão geral vs. trabalho linha-a-linha)
- persistência de preferência de coluna/filtro entre sessões, quando o usuário é recorrente

Não esconder ação essencial atrás de menu de três pontos — se é usada com frequência, ela é um botão visível, não um item de menu secundário.

## Antipadrões Específicos de Produto Operacional

- **Embelezar às custas de densidade** — animação de entrada em cada linha de tabela que o usuário olha 40 vezes por dia é atrito, não polimento
- **Onboarding de tour guiado para função autoexplicativa** — se a interface precisa de tour pra ser entendida, o problema é a interface, não a ausência de tutorial (ver skill 57, taxonomia de onboarding)
- **Pedir permissão sem contexto do benefício** — notificação, localização, câmera solicitadas na primeira tela, antes do usuário ver por que precisa (permission priming, skill 57)
- **Dashboard sem estado vazio pensado** — "sem dados ainda" tratado como bug em vez de fase normal do produto novo

## Verificação Ao Fechar

- navegação reflete a quantidade real de áreas, não um padrão copiado de outro produto
- todo bloco de dashboard responde às 4 perguntas, não só exibe número
- tabela cobre estado vazio, erro e (se aplicável) grande volume de linhas
- nenhuma ação frequente está escondida atrás de menu secundário
