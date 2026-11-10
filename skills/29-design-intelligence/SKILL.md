---
name: design-intelligence
description: |
  Pesquisa referencias, identidade visual e direcao de design.
  Trigger em: "pesquisar concorrentes", "benchmark visual", "tendencias de design", "moodboard", "design competitivo", "analise visual dos concorrentes", "referencia visual de mercado", "referências de mercado", "melhores landings", "referencia UI pra dashboard".
metadata:
  argument-hint: "[nicho ou descricao do projeto]"
---

# Design Intelligence - Pesquisa Competitiva e Geracao de UI

Pesquisa referências e tendências quando isso ajuda uma decisão de design; entrega direção fundamentada para `92-design-director` e `02-ui-ux-design`. Moodboard é opcional.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`, `policies/tool-safety.md` e `policies/evals.md`.

## Quando Usar

- pesquisar concorrentes visuais de um nicho antes de construir interface
- pesquisar referências competitivas que alimentarão uma melhoria da interface existente
- gerar moodboard e direcao visual antes do UI/UX comecar
- analisar o que os melhores do nicho estao fazendo (paleta, tipografia, layout, CTAs)

## Quando Nao Usar

- para implementar a interface (responsabilidade do UI/UX + Frontend)
- para gerar imagens isoladas sem contexto de pesquisa (usar skill 17 direto)
- para definir regras de negocio ou spec de feature (responsabilidade do PO)

## Pontos de Entrada no Pipeline

1. **Criação ou redesign abrangente:** `Design Director (92)` coordena; acionar esta skill quando a pesquisa for solicitada ou necessária a uma decisão concreta.
2. **Facelift de UI existente:** `UI Facelift (89)` preserva e implementa os fluxos; esta skill fornece pesquisa ou análise quando pertinente.

## Entradas Esperadas

- descricao do projeto ou nicho (ex: "landing page de app fitness com IA focado em hipertrofia")
- tipo de interface (landing page, dashboard, app mobile, SaaS, e-commerce)
- restricoes de branding existentes (se houver)
- URLs de concorrentes especificos (opcional)

## Saidas Esperadas

- dossie completo em `docs/design-intelligence/dossier.md`
- screenshots e imagens de referencia quando úteis e acessíveis
- moodboard apenas quando ajudar a decisão e houver autorização aplicável
- handoff claro para UI/UX (skill 02)

## Responsabilidades

1. Pesquisar e identificar top 3-5 concorrentes do nicho
2. Capturar screenshots e imagens de referencia dos concorrentes
3. Analisar padroes visuais competitivos (paleta, tipografia, layout, CTAs, conversao)
4. Definir estrategia visual: o que copiar, o que evitar, o que diferenciar
5. Considerar moodboard ou asset apenas se ajudar a decisão, seguindo custo e autorização aplicáveis
6. Consolidar dossie estrategico para o UI/UX

## Stack de Ferramentas

### Busca de concorrentes

Use a ferramenta de pesquisa disponível e autorizada no host. Se a pesquisa não estiver disponível, declare o limite e use apenas o material acessível.

Buscar:
- top 5 concorrentes diretos do nicho
- referencias em Awwwards, Dribbble, Behance para o nicho
- tendencias de design do segmento

### Captura visual

Use o navegador disponível conforme as instruções do host; não instale um MCP ou ferramenta automaticamente.

Acoes:
- navegar em cada resultado encontrado
- tirar screenshot full-page de cada concorrente
- registrar apenas referências necessárias, respeitando direitos, privacidade e permissões; não baixar assets indiscriminadamente
- salvar em `docs/design-intelligence/screenshots/` e `docs/design-intelligence/references/`

### Analise Visual (obrigatorio)

**Selecao de modelo:** seguir `policies/model-routing.md`

O Model Routing define o tier adequado para analisar screenshots (tipicamente Deep para analise multimodal). Funciona independente do ambiente.

### Moodboard e geração de imagem (opcionais)

Use quando uma composição visual ajudar a resolver uma decisão concreta. Prefira assets existentes ou uma descrição quando suficientes. Se geração for apropriada, siga a skill 17 e as regras vigentes de autorização e custo; não presuma fornecedor, preço, quantidade de imagens ou geração paga.

## Modo Redesign — Auditoria de UI Existente

Ponto de entrada 2 (linha "Melhoria de UI existente") usa este protocolo em vez das Fases 1-2 abaixo — aqui não há concorrente pra pesquisar, a UI existente É o material de análise. Aplica-se quando o usuário pede pra melhorar/redesenhar algo que já está construído.

### Scan → Diagnose → Fix → Reverify

1. **Scan**: ler o código da UI existente — framework, método de estilização (Tailwind, CSS vanilla, styled-components), estrutura de componentes.
2. **Diagnose**: rodar o checklist de 7 dimensões abaixo, listando todo padrão genérico, ponto fraco e estado faltante encontrado.
3. **Fix**: quando implementação estiver autorizada, aplicar correções por prioridade com a stack existente; em pedido somente de análise, relatar os achados sem editar.
4. **Reverify**: rodar o checklist de 7 dimensões de novo contra o resultado — um fix de uma dimensão pode introduzir problema em outra (ex: trocar componente genérico por custom pode remover o estado de foco que o componente nativo tinha de graça). Item que ainda falhar volta pro passo 3, não segue pro artefato final.

### Checklist de 7 dimensões

| Dimensão | O que checar |
|---|---|
| Tipografia | fontes default do browser, hierarquia fraca, variação de peso insuficiente, largura de linha excessiva, palavra órfã |
| Cor e superfície | contraste, coerência com a marca, função da cor, saturação e qualidade de sombra no contexto |
| Layout | viés de centralização, grid de cards genérico, unidades de viewport, alinhamento e espaçamento inconsistentes |
| Interatividade e estados | hover state ausente, foco sem indicador, falta de estado de loading/empty/error, feedback de navegação |
| Conteúdo | nomes repetitivos, dados irreais, tom de copy genérico ("Elevate", "Seamless"), avatares idênticos |
| Componentes | cards genéricos, badges em formato pill, carrossel de 3 cards, modal-para-tudo, círculos de avatar padronizados |
| Código e omissões | HTML não-semântico, estilo inline, dimensões hardcoded, gaps de acessibilidade, ausência estratégica (link legal, página 404, validação de formulário) |

### Ordem de execução dos upgrades

Priorizar tarefas bloqueadas, controles e estados; depois corrigir inconsistências sistêmicas, hierarquia e acabamento. Trocar fonte, cor ou componente somente quando houver motivo no produto.

Preservar estrutura de URL, labels de navegação e nomes de campo de formulário existentes, salvo aprovação explícita do usuário — redesign visual não é desculpa pra quebrar link externo ou integração já em uso.

**Artefato:** `docs/design-intelligence/redesign-audit.md`, seguindo a mesma estrutura de dossiê da Fase 5, com a seção "7 dimensões" substituindo a análise competitiva.

## Fases de Execucao (pesquisa competitiva — ponto de entrada 1)

### Fase 1: Discovery

1. Consultar Asset Librarian (skill 19) para inventariar o que o projeto ja tem
2. Pesquisar concorrentes e referências adequados à pergunta usando a ferramenta disponível
3. Navegar e registrar capturas úteis quando possível; conferir se páginas dinâmicas foram capturadas integralmente

**Artefato:** `docs/design-intelligence/01-discovery.md`

### Fase 2: Analise Visual Competitiva

1. Model Routing (`policies/model-routing.md`) define tier para analise multimodal
2. Enviar screenshots para analise estruturada
3. Modelo retorna: paletas, tipografia, layouts, CTAs, hierarquia, padroes de conversao
4. Comparar concorrentes entre si: padrao do nicho vs diferencial

**Artefato:** `docs/design-intelligence/02-analysis.md`

### Fase 3: Estrategia e Briefing

1. Cruzar tendencias do nicho com identidade atual do projeto
2. Definir recomendacoes: paleta, tipografia, hierarquia, CTAs
3. Classificar: copiar (padroes que funcionam) / evitar (cliches) / diferenciar (oportunidades)
4. **Checar diversidade estrutural:** compare a proposta com referências pertinentes e com o próprio produto. Se a composição parecer intercambiável, investigue como o conteúdo e a tarefa podem orientar outra solução; não acesse outros projetos sem necessidade.
5. Se uma imagem for necessária e autorizada, montar briefing para Image Generator (skill 17)

**Artefato:** `docs/design-intelligence/03-strategy.md`

### Fase 4: Moodboard opcional

1. Definir que decisão o moodboard deve apoiar e verificar autorização e custo.
2. Usar referências permitidas, assets existentes ou, quando apropriado, a skill 17.
3. Registrar o resultado e seus limites; não gerar imagem só para preencher o dossiê.

**Artefato:** `docs/design-intelligence/04-moodboard/` (imagens geradas)

### Fase 5: Dossie Final e Handoff

Consolidar tudo num documento unico:

**Artefato:** `docs/design-intelligence/dossier.md`

```markdown
# Design Intelligence Report — [nicho/projeto]

## 1. Concorrentes Analisados
- Top 3-5 com screenshots e URLs

## 2. Analise Visual Competitiva
- Paletas dominantes
- Tipografia e hierarquia
- Padroes de layout (hero, CTA, sections)
- Estrategia de conversao (CTAs, copy patterns)

## 3. Tendencias do Nicho
- O que os melhores estao fazendo
- Diferenciais visuais encontrados

## 4. Recomendacoes Estrategicas
- Paleta sugerida (com tokens)
- Tipografia sugerida
- Hierarquia de informacao
- CTAs e copy direction

## 5. Moodboard e Referencias Visuais
- Moodboard, somente se produzido por necessidade e com autorização aplicável
- Screenshots curados dos concorrentes

## 6. Handoff para UI/UX
- Design tokens sugeridos
- Wireframe direction
- O que copiar, o que evitar, o que diferenciar
```

## Estrutura de Artefatos

```
docs/design-intelligence/
├── 01-discovery.md
├── 02-analysis.md
├── 03-strategy.md
├── 04-moodboard/       <- opcional, quando necessário e autorizado
├── screenshots/
│   └── (screenshots full-page dos concorrentes)
├── references/
│   └── (imagens extraidas dos concorrentes)
└── dossier.md          <- output final pro UI/UX
```

## Resiliencia

Se uma fase falhar, a skill retoma da ultima fase completa. Cada fase salva artefato independente.

## Integracao com Outras Skills

- `Asset Librarian (19)`: fornece inventario de assets e identidade visual existente
- `Model Routing (policy)`: define tier de modelo para analise de screenshots. Ver `policies/model-routing.md`
- `Image Generator (17)`: gera imagens quando necessárias e autorizadas
- `Design Director (92)`: coordena a criação ou redesign abrangente
- `UI/UX Designer (02)`: recebe o dossie final e executa a interface
- `Orchestrator (09)`: coordena quando esta skill entra no pipeline

## Evidencia de Conclusao

- concorrentes pesquisados e capturados
- analise visual estruturada produzida
- estrategia definida com copiar/evitar/diferenciar
- decisão sobre usar ou dispensar moodboard e evidência das imagens efetivamente produzidas
- dossie final consolidado em `docs/design-intelligence/dossier.md`
- handoff claro para UI/UX (skill 02)

## Handoff

Entregar para UI/UX (skill 02):

- `docs/design-intelligence/dossier.md` com toda a inteligencia visual
- referências e moodboard em `docs/design-intelligence/`, quando produzidos
- design tokens sugeridos para o projeto
- direcao clara: copiar / evitar / diferenciar

Seguir `policies/handoffs.md` e `templates/handoff.md`.

## Fontes

- Checagem de diversidade estrutural (Fase 3) inspirada na função "Redesign" de [usehallmark.com](https://www.usehallmark.com/) — garantir que a mesma forma estrutural não se repita sem justificativa entre projetos.
- Protocolo Scan → Diagnose → Fix e checklist de 7 dimensões ("Modo Redesign") inspirados em [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (redesign-skill).
