# Diagnóstico de interface

Use esta matriz como apoio à observação, não como detector automático. Um padrão só vira achado quando é possível explicar seu impacto na tarefa ou na identidade do produto.

| Dimensão | Investigue | Evidência útil | Possível ação |
|---|---|---|---|
| Entendimento | O usuário consegue distinguir objetivo, contexto e ação seguinte? | Título, rótulos, ordem de leitura, resposta a uma tarefa | Reescrever com fatos existentes e reorganizar por prioridade |
| Identidade | A tela usa elementos reconhecíveis e adequados ao público? | Marca, conteúdo próprio, componentes e decisões visuais documentadas | Reforçar elementos existentes; registrar hipótese se a marca não estiver definida |
| Consistência | Elementos equivalentes comunicam funções equivalentes? | Comparação entre telas, tokens e componentes reais | Corrigir a camada compartilhada quando a divergência for recorrente |
| Hierarquia | É possível localizar itens essenciais sem competição indevida? | Captura real, ordem do DOM, densidade de informação | Ajustar destaque, agrupamento ou disposição sem apagar informação útil |
| Dados | Valores, período, unidades e estados são compreensíveis? | Dados e formatos reais, situações vazias e erros | Nomear contexto e preservar fidelidade dos dados |
| Inclusão | Há foco visível, nomes acessíveis e contraste adequado? | Teclado, árvore acessível, medições e estados | Corrigir semântica, foco ou cores conforme o problema medido |
| Resiliência | Conteúdo extenso, zoom e telas estreitas continuam utilizáveis? | Viewports e estados reais, crescimento de texto | Reorganizar com CSS responsivo e testar ações |
| Custo | Fontes, imagens e efeitos prejudicam carregamento ou interação? | Tamanho, comportamento observado e métricas disponíveis | Remover trabalho desnecessário ou otimizar recursos existentes |

Registre cada achado como **local · observação · impacto · evidência · ação proposta**. Classifique gravidade pela consequência para a tarefa, não pela quantidade de efeitos. Priorize barreiras de acesso ou conclusão, depois incoerências compartilhadas e acabamento. Se a evidência estiver ausente, marque como hipótese.

Gradientes, ícones, fundos escuros, animação, cards repetidos e fontes populares podem ser apropriados. Investigue contraste, adequação e propósito antes de substituí-los. Consulte `../../89-ui-facelift/SKILL.md` quando a mudança abranger vários fluxos.
