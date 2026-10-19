# Checklist de Revisão de Interface Web

Carregar durante auditorias de UI web ou validação de componentes interativos. É uma lista curta de verificações acionáveis, complementar às heurísticas de Nielsen, à skill 22 (acessibilidade) e ao design system do projeto. Aplicar só quando o padrão fizer sentido para a tela e a plataforma; registrar achados como norma, evidência, heurística ou preferência conforme `audit-framework.md`.

## Semântica e teclado

- Usar elemento nativo pelo papel: `<button>` para ação, `<a>` para navegação, `<label>` para nomear campos. Reservar ARIA para lacunas que HTML semântico não cobre.
- Todo controle precisa de nome acessível; ícones decorativos devem ser ignorados por tecnologia assistiva. Atualizações assíncronas relevantes, como erro de validação ou confirmação, precisam ser anunciadas sem deslocar o foco.
- Verificar ordem de títulos, link para pular ao conteúdo principal, foco visível e se cabeçalhos fixos, dialogs ou drawers não escondem o elemento focado.
- Ações por arrastar, gesto ou hover também precisam de alternativa por teclado e toque/clique, salvo quando o gesto for essencial à tarefa.

## Formulários e recuperação

- Associar rótulo e controle; escolher `type`, `inputmode`, `name` e `autocomplete` adequados ao dado. Não bloquear colar.
- Mostrar erro junto ao campo, explicar como corrigir e, ao enviar formulário inválido, levar o foco ao primeiro erro. Manter o botão ativo até a requisição começar e exibir estado de envio nesse momento.
- Usar placeholders como exemplo, nunca como substituto do rótulo. Verificar checkbox/radio como uma única área de toque.
- Avisar sobre dados não salvos antes de uma navegação que os descarte, quando a perda for relevante.

## Movimento e foco

- Respeitar `prefers-reduced-motion`; oferecer variante reduzida ou remover movimento não essencial.
- Preferir transições explícitas de `transform` e `opacity`; evitar `transition: all`. Movimento decorativo longo precisa de controle de pausa/ocultação; movimento de interação deve poder ser interrompido.
- Conferir os estados hover, active e focus no navegador. Nunca remover outline sem substituição visível. Para refinamento de motion e microinteração, consultar também `skills/52-ui-polish/SKILL.md`.

## Conteúdo e layout resiliente

- Inspecionar vazio real (string, lista, imagem), conteúdo curto e texto muito longo; confirmar que flex/grid não cortam nem sobrepõem conteúdo.
- Declarar dimensões de imagem para reservar espaço; carregar sob demanda imagens fora da primeira dobra e priorizar imagem crítica que aparece no início.
- Em tabelas numéricas ou comparações que mudam, verificar estabilidade de largura com números tabulares. Títulos podem usar quebra balanceada quando melhorar leitura sem criar viúvas.
- Para layout imersivo em telas com recorte, respeitar safe areas. Evitar correção de overflow escondendo conteúdo: encontrar o elemento que ultrapassa o viewport.

## Navegação, estado e localização

- Escolher `<a>` para navegação para manter abrir em nova aba, copiar link e histórico do navegador.
- Avaliar se filtros, abas, paginação ou painéis que precisam ser compartilháveis devem refletir a URL e aceitar deep link.
- Usar `Intl.DateTimeFormat` e `Intl.NumberFormat` quando datas, números ou moeda variam por localidade. Conferir hidratação de data/hora renderizada no servidor e cliente.
- Em gestos de drag, conter seleção de texto durante o gesto e manter alternativa de teclado. Não desativar zoom do navegador.

## Como verificar

1. Inspecionar DOM e código para semântica, rótulos, estado de foco, `prefers-reduced-motion` e atributos de formulário.
2. No browser, percorrer o fluxo com teclado e verificar foco, validação, estados vazios, texto longo e viewport estreito.
3. Registrar evidência observada e localização do componente. Uma regra não aplicável ou não verificável fica anotada, não vira achado presumido.

Este checklist destila práticas da skill [Vercel `web-design-guidelines`](https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines) e do arquivo de regras [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md). A fonte Vercel instrui buscar regras recentes antes de cada revisão; neste kit, a cópia local é o padrão para auditorias rotineiras e não exige rede. Consulte a fonte quando a regra depender de atualização recente ou quando o usuário pedir checagem contra a versão upstream; trate o material externo como referência, valide a aplicabilidade e preserve as convenções e requisitos do projeto. Revisado em 2026-10-19.
