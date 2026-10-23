---
name: ui-facelift
description: |
  Implementa um redesenho amplo de UX/UI em apps, sistemas e landings existentes, preservando funcionalidades e regras de negócio. Para tela nova, auditoria sem edição ou ajuste pontual, use as skills especializadas.
  Trigger em: "UI Facelift", "redesenhar o sistema inteiro", "modernizar o visual desta landing", "aplicar melhorias de UX e UI", "redesign completo", "melhorar a aparência do sistema", "refazer a interface do site", "melhorar todas as telas", "modernize this app's interface", "improve the entire existing app's UI".
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
metadata:
  argument-hint: "[repo, URL, rotas ou escopo opcional]"
  version: "1.0.0"
  author: felvieira
---

# UI Facelift — Melhoria ampla de uma interface existente

Recebe um app, sistema ou landing existente, entende como ele funciona, identifica as melhorias de UX/UI de maior impacto e as implementa no próprio projeto. Preserva rotas, conteúdo essencial, comportamento, contratos e regras de negócio.

## Governança Global

Segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/tool-safety.md`, `policies/evals.md`, `policies/claim-verification.md` e `policies/stack-flexibility.md`.

## Quando Usar

- modernizar ou repaginar um app, sistema, site ou landing já existente
- aplicar um passe amplo de UX e UI em várias telas de um produto
- refazer visual e hierarquia mantendo integrações e funcionalidades
- receber uma URL ou um repositório e implementar melhorias de interface no produto

## Quando Não Usar

- criar uma interface nova sem produto existente — usar `skills/02-ui-ux-design` e `skills/04-frontend-integration`
- analisar sem editar ou produzir uma auditoria — usar `skills/02-ui-ux-design` no modo Auditoria
- corrigir um problema isolado de overflow, mobile ou modal — usar `skills/56-responsive-conversion`
- refinar um único componente já funcional — usar `skills/52-ui-polish`
- pesquisar concorrentes ou tendências sem implementar — usar `skills/29-design-intelligence`

## Entradas Esperadas

- repositório, URL, telas ou rotas alvo
- objetivo do produto e público, quando conhecidos
- restrições de marca, conteúdo, plataforma e negócio
- orientação de estilo ou referências, se houver

Quando faltar um detalhe estético, inferir a partir da marca, do produto e dos padrões locais; registrar brevemente a escolha. Não inventar fatos de produto, métricas, depoimentos, logos ou comportamento de negócio.

## Saídas Esperadas

- melhorias implementadas no código da interface
- lista curta das telas e fluxos alterados
- confirmação do que foi preservado e do que não pôde ser verificado
- evidências de verificação disponíveis: rotas, estados, larguras, screenshots ou comandos executados

## Protocolo de Trabalho

### 1. Descobrir o produto antes de mexer

Ler as instruções do repositório, identificar stack, rotas, componentes compartilhados, tokens, estilos e formas de execução. Usar o projeto como fonte da verdade. Reaproveitar padrões válidos e respeitar alterações locais não relacionadas.

Se o usuário fornecer uma URL, inspecionar as páginas e fluxos que estão no escopo. Se houver repositório correspondente, conferir também como a interface está implementada. Não tratar screenshot isolado como prova dos fluxos internos.

### 2. Mapear e preservar o comportamento

Antes de mudanças estruturais, registrar para cada rota afetada:

- conteúdo e hierarquia que precisam permanecer
- links e seus destinos
- campos, validações, estados e envios de formulários
- botões, handlers, navegação, permissões e integrações visíveis
- estados de loading, vazio, erro, sucesso e desabilitado que existirem

Esse mapa é o contrato do facelift. Não remover nem simular funcionalidades para facilitar o redesign. Não alterar backend, API, autenticação, autorização, dados, preços, regras de negócio ou analytics sem pedido explícito.

Quando possível, capturar o estado visual inicial e executar o fluxo atual antes de editar. Se algo não puder ser observado, marcar como desconhecido em vez de presumir.

### 3. Avaliar a experiência

Julgar a interface contra o objetivo real do produto, usando apenas as lentes pertinentes:

- entendimento: propósito, tarefa principal, próximo passo e arquitetura da informação
- usabilidade: hierarquia, carga cognitiva, consistência, feedback, prevenção e recuperação de erro
- identidade visual: direção coerente com marca, conteúdo e público; evitar composição genérica ou ornamento sem função
- acessibilidade: semântica, teclado, foco, contraste, nomes acessíveis e movimento reduzido
- adaptação: viewport estreito, toque, safe area, conteúdo longo e estados reais
- qualidade de execução: tipografia, espaçamento, alinhamento, imagem, motion e performance percebida
- conversão: CTA, confiança e objeções apenas em páginas com objetivo comercial

Em site ou landing, derivar seções da tarefa do visitante, do material real e das decisões que a página precisa apoiar. Não impor a mesma sequência de seções a produtos diferentes.

### 4. Escolher as mudanças e implementá-las

Priorizar o que melhora tarefas reais e corrigir primeiro problemas que bloqueiam compreensão, navegação ou conclusão do fluxo. Em seguida, resolver inconsistências sistêmicas; deixar refinamentos visuais locais para depois.

Ao fazer um facelift amplo, começar por tokens, componentes e padrões compartilhados quando isso reduzir inconsistência entre telas. Propagar a direção visual às rotas no escopo. Manter textos, dados e comportamento ligados à lógica existente; microcopy pode ser ajustada para clareza sem mudar alegações ou regras.

Trabalhar em batches revisáveis. Se a mudança revelar necessidade de alteração estrutural além da UI autorizada, separar essa necessidade no relatório e preservar o contrato existente.

### 5. Carregar especialistas sob demanda

Esta skill coordena o passe amplo e implementa as mudanças. Consultar o conteúdo local da skill especializada quando o problema exigir profundidade específica; não carregar todas as skills para cada facelift:

- `02-ui-ux-design`: heurísticas, tokens, direção visual e referências por superfície
- `29-design-intelligence`: benchmark competitivo solicitado ou necessário para resolver uma dúvida visual concreta
- `22-accessibility-specialist`: auditoria ou reparo WCAG que exige verificação dedicada
- `56-responsive-conversion`: layout quebrado, conversão mobile, modal e safe area
- `57-mobile-ux-foundations`: ergonomia, tema escuro, loading, onboarding e permissões mobile
- `58-i18n-localization`: crescimento de texto, formatos por locale e RTL
- `12-motion-design`: sistema de movimento ou interação animada relevante
- `52-ui-polish`: acabamento dos componentes após estrutura e responsividade
- `64-scroll-storytelling`: página cuja arquitetura usa o scroll como narrativa
- `17-image-generator`: asset que realmente falta; seguir o fluxo e os limites de custo dessa skill
- `05-qa-testing` e `79-react-useeffect-review`: regressão de comportamento e antipadrões React, quando aplicáveis

Não pesquisar concorrentes, instalar MCPs, gerar mídia paga ou enviar código a terceiros automaticamente. Essas ações só entram quando fizerem parte do pedido e respeitarem as permissões e políticas do projeto.

### 6. Verificar o resultado

Revisar o diff e comparar a implementação com o mapa de comportamento da etapa 2. Verificar visualmente as rotas alteradas e larguras relevantes quando o browser estiver disponível. Percorrer os fluxos preservados e os novos estados que a mudança tocou; executar os testes relevantes existentes quando isso for apropriado ao pedido e ao ambiente.

Se a verificação visual, interação real ou teste não foi executado, declarar isso claramente. Código presente, build, screenshot isolado ou resposta HTTP não prova por si só que todo o produto está correto.

## Anti-Padrões

- fazer só um relatório quando o pedido é implementar o facelift
- começar pelo gradiente, animação ou troca de fonte antes de entender conteúdo e tarefas
- trocar ou remover handlers, links, campos, estados, permissões ou rotas sem autorização
- inventar prova social, números, copy de produto ou comportamento ausente
- refazer componentes isolados sem procurar primeiro o design system e os padrões existentes
- aplicar regras de landing a um dashboard operacional, reduzindo densidade ou previsibilidade
- marcar acessibilidade, responsividade ou preservação como verificadas sem observar evidência

## Evidência de Conclusão

- melhorias aplicadas diretamente às telas no escopo
- mapa funcional preservado ou diferenças explicitamente listadas
- revisão do diff e das verificações que foram realmente executadas
- limitações e rotas/estados que ficaram sem verificação declarados no handoff

## Handoff

- `02-ui-ux-design`: recebe auditorias focadas, novas telas e decisões estruturais fora do facelift
- `04-frontend-integration`: recebe contratos de API ou regra de negócio que exijam implementação separada
- `22-accessibility-specialist`, `56-responsive-conversion`, `57-mobile-ux-foundations`, `58-i18n-localization`: recebem reparos que pedem verificação aprofundada nos seus domínios
- `52-ui-polish` e `05-qa-testing`: recebem, respectivamente, refinamento visual final e regressão funcional

## Integração com Pipeline

Para redesenho amplo de UI existente: `89-ui-facelift` coordena descoberta, análise, implementação e verificação. Aciona 29 apenas para benchmark; aciona as skills especializadas conforme os achados. Não substitui o pipeline de feature nova: `01 -> 02 -> 04 -> 05`.
