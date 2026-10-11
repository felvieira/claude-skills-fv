---
name: anatomy
description: |
  Cria figuras isométricas ricas, interativas e detalhadas (SVG, WebGL, 3D) que explicam conceitos técnicos como máquinas e mecanismos físicos reais.
  Trigger em: "desenhar diagrama isométrico", "figura isométrica", "isometric svg", "desenho técnico Linear-style", "isometric explainer", "diagrama de arquitetura em máquina", "ilustração isométrica", "interativo em svg", "shader webgl no svg", "anatomy diagram".
argument-hint: "<ideia técnica ou conceito a explicar> [standalone-html|react] [--light|--dark]"
allowed-tools: Read, Grep, Glob, Bash(node *), Edit, Write
metadata:
  version: "1.0.0"
---

# Anatomy — Figuras Isométricas Explicativas como Máquinas Reais

Transforma conceitos técnicos, algoritmos e sistemas de software em instrumentos e máquinas físicas interativas em SVG isométrico com sombreamento em quatro tons, física precisa e opcionais de WebGL ou 3D.

## Governança Global

Siga `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md`, `policies/cost-optimization.md`, `policies/verification-before-completion.md` e `policies/anti-ai-writing.md`.

Regras de execução:
1. **O objeto é a explicação:** invente um mecanismo físico concreto cuja operação espelhe o conceito de software (ex.: cache como fechadura de pinos, gantry plotter para pooling de GPU, gaveteiro graduado para buffers de render). Evite caixas flutuantes e setas genéricas.
2. **Geometria determinística:** utilize o motor puro em Node (`kit/iso-kit.mjs`) ou TypeScript (`kit/iso-kit.ts`). Toda geometria estática é pré-computada; partes móveis utilizam vetores e matrizes determinísticas.
3. **Auditoria obrigatória:** toda figura complexa com tubulações, cabos ou eixos giratórios deve rodar `node build.mjs --audit` (`kit/audit.mjs`) e zerar folgas, penetrações e problemas de profundidade antes da entrega.

## Quando Usar

- Explicar um conceito técnico, algoritmo ou fluxo de sistema transformando-o em um objeto físico funcional em corte ou bancada de teste.
- Criar diagramas técnicos no estilo visual "Linear", figuras de destaque para documentação, artigos de engenharia, landing pages ou posts de blog.
- Desenvolver ilustrações vetoriais isométricas em SVG puro (standalone ou React/Next.js) compostas por sólidos detalhados, ranhuras, parafusos, manípulos serrilhados e réguas graduadas.
- Integrar efeitos visuais contínuos que linhas vetoriais não conseguem reproduzir (chamas, exaustão, fluidos em movimento, cáusticas e reflexos de água) por meio de shaders WebGL projetados na mesma câmera isométrica.
- Animar componentes em rotação 3D real (mostradores, alavancas, garras robóticas) preservando o restante da cena estático em 60 quadros por segundo.

## Quando Não Usar

- Diagramas lógicos simples de blocos ou fluxo de telas sem metáfora física: prefira `76-diagram-validated` ou Mermaid.
- Microinterações cotidianas de UI em interfaces web (hover de botões, modais, drawer): use `12-motion-design`.
- Vídeos sequenciais completos com trilha de áudio e múltiplos cortes: use `86-code-motion-film` ou `84-ai-video-direction`.
- Conjuntos simples de ícones de navegação ou ilustrações 2D planas: use `85-illustration-studio`.
- Cenas tridimensionais livres em primeira ou terceira pessoa sem a estética isométrica craft: use `74-web3d-scene-runtime`.

## Entradas Esperadas

- Conceito ou arquitetura a representar (ex.: rate limiter token bucket, pool de conexões de banco de dados, edge cache de CDN).
- Formato de destino: página HTML standalone (`pageHtml`), componente React (`kit/react/draw.tsx` + `kit/react/live.tsx`) ou arquivo SVG isolado (`figureSvg`).
- Tema visual pretendido (`--light` ou `--dark`, com o tema claro sendo a referência inicial para equilíbrio de shaders).
- Tamanho e complexidade pretendidos: Figure (40 a 80 peças), Hero (80 a 150 peças) ou Epic (sistema amplo).

## Saídas Esperadas

- Script gerador executável (`build.mjs` ou módulo `.tsx`) importando as funções utilitárias de `kit/`.
- Página HTML independente ou componente React funcional com moldura padronizada: número da figura, título, dica de controle e mostrador numérico em tempo real.
- Relatório de auditoria geométrica sem inconsistências (`node build.mjs --audit` encerrando com código zero).
- Arquivo visual exportado e verificado via script de inspeção de linhas (`node scripts/lines.mjs`).

## Protocolo de Construção

1. **Dimensionar a figura:** determine a escala do projeto antes de iniciar o código:
   - **Figure:** mecanismo único, 40 a 80 partes, SVG com no máximo uma camada WebGL.
   - **Hero:** objeto denso, múltiplas camadas WebGL ou objeto articulado em 3D, 80 a 150 partes.
   - **Epic:** veículo ou instalação inteira com múltiplos subsistemas móveis.
2. **Modelo físico de dados:** extraia os dados e coeficientes reais do conceito. Isole o modelo em módulo puro (`model.mjs` ou `rig.ts`) para alimentar tanto o movimento quanto os mostradores numéricos.
3. **Mapeamento da máquina:** defina a analogia mecânica direta. A peça em destaque iluminado (`lit`) é o foco que o leitor deve acompanhar.
4. **Inventário de componentes:** estruture as peças em camadas: base (placa, pés de borracha, parafusos nos cantos, régua graduada), estrutura (colunas, trilhos, batentes), mecanismo (carros, buchas, molas, êmbolo, agulha) e comandos (manípulo serrilhado, fuso, parafusos borboleta). Consulte receitas detalhadas em `references/craft.md`.
5. **Plano de coordenadas e projeção:** posicione elementos em coordenadas tridimensionais (x e y no solo, z na vertical). Aplique a câmera padrão em azimute de 45 graus e elevação de 30 graus via `fitProjection()`.
6. **Construção geométrica única:** pré-calcule caminhos estáticos com primitivas do kit (`slabOf`, `cylinder`, `extrude`, `planOutline`, `topTicks`, `knurl`, `coil`). Formas de revolução utilizam `kit/lathe.mjs` e tubulações/cabos utilizam `kit/tube.mjs`.
7. **Ordem do pintor e profundidade:** ordene sólidos do fundo para a frente e da base para o topo com `depthOf`. Utilize o gravador `A.recorder()` e o resolvedor `A.settle()` de `kit/audit.mjs` para garantir profundidade física de sobreposição sem cruzamentos acidentais.
8. **Moldura e interface:** posicione a figura no cartão padrão contendo `Fig n` no topo esquerdo, título no topo direito, orientação de interação no rodapé esquerdo e leitura numérica sincronizada no rodapé direito.
9. **Movimento orgânico:** aplique amortecimento exponencial ou molas elásticas. Quando em repouso, execute uma demonstração contínua e suave, pausando quando o elemento sair do campo visual ou sob preferência de movimento reduzido.
10. **Shaders WebGL integrados:** utilize shaders apenas para fenômenos fluidos ou luminosos (fogo, vapor, água, brilho). Monte a estrutura em sanduíche: SVG traseiro, lona Canvas intermediária com a mesma câmera matemática (`GLSL_ISO`), e SVG frontal para os elementos de oclusão.

## Regras de Crafting Visual

- **Sólidos opacos:** cada peça deve possuir preenchimento sólido com a cor do papel e ordem de pintura estrita. Nunca utilize linhas pontilhadas de faces ocultas ou malhas de arame transparentes.
- **Quatro tons automáticos:** preserve a iluminação calculada por `extrude`, atribuindo tons de lateral conforme o ângulo da face em relação à luz e topo mais claro.
- **Hierarquia de luminosidade:** base e apoios recebem tom `lo`, estrutura recebe tom `mid`, e o objeto sujeito recebe tom `hi`. Apenas um elemento focal recebe tom `lit`.
- **Término rigoroso de linhas:** toda aresta, linha de textura ou condutor elétrico deve terminar exatamente em uma superfície, outra aresta ou ponto de solda (`terminal dot`). Linhas flutuando no vazio configuram defeito visual.
- **Tubulações sem colisão:** nenhum tubo ou fiação cruza outro sólido sem flange, união ou furo de passagem explícito. Mantenha no mínimo 1.5 raios de distância livre.
- **Superfícies curvas contínuas:** perfis curvos gerados por `kit/lathe.mjs` utilizam curvas suaves para evitar sombreamento em degrau.

## Evidência de Conclusão

- A página gerada abre no navegador executando a animação de repouso e respondendo a ponteiro e teclado.
- A auditoria geométrica (`node build.mjs --audit`) retorna aprovação com zero problemas de penetração, extremidades soltas ou ordem de sobreposição incorreta.
- O validador de traços (`node scripts/lines.mjs`) confirma zero linhas desconectadas.
- Inspeções em ampliação de 4x nas junções entre tubos, flanges e painéis comprovam assentamento correto em temas claro e escuro.

## Handoff

- Para inclusão em aplicações web ou documentação técnica interativa: entregue para `04-frontend-integration`.
- Para publicação em guias, artigos de blog ou landing pages institucionais: entregue para `10-documenter` e `41-blog-publisher`.
- Para auditoria de acessibilidade, contraste e taxas de quadros: entregue para `22-accessibility-specialist` e `11-reviewer`.

## Integração com Pipeline

- `09-orchestrator`: aciona esta skill quando o plano de desenvolvimento exige figuras técnicas de alta definição ou explicadores mecânicos interativos.
- `02-ui-ux-design`: estabelece as variáveis de cor e espaçamento para garantir harmonia entre o cartão da figura e o layout da aplicação consumidora.
- `08-context-manager`: restringe a leitura aos guias específicos em `references/` (`craft.md`, `kit.md`, `webgl.md`, `3d.md`) conforme a necessidade de cada implementação.

## Fontes Externas

Adaptação direta de [wheresryan22/anatomy](https://github.com/wheresryan22/anatomy) (MIT, Copyright 2026 Ryan). O conjunto de ferramentas em `kit/`, as referências em `references/`, os scripts de teste em `scripts/` e os exemplos em `examples/` derivam do repositório original. O texto integral da licença MIT e os créditos do autor original estão preservados no arquivo local `LICENSE-ANATOMY`.
