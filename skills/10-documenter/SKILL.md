---
name: documenter
description: |
  Skill de Documentação por nível de decisão. Use quando precisar documentar features, APIs, arquitetura,
  setup, operação, ou manter documentação existente atualizada. Trigger em: "documentar", "documentação",
  "docs", "ADR", "architecture decision record", "README", "feature doc", "api doc", "setup doc",
  "runbook", "troubleshooting", "doc de operação", "registrar decisão", "atualizar docs",
  "documentar repositório", "repo wiki", "mapa de arquitetura", "C4", "documentação completa do código",
  "regras de negócio", "RPA", "automação", "segurança do app", "melhorias do repositório",
  "site da documentação", "HTML offline", "buscar na documentação".
---

# Documenter - Documentação por Nível de Decisão

Documentação existe para responder perguntas antes que alguém precise fazer a pergunta. Cada nível de decisão tem seu próprio tipo de documentação.

## Governanca Global

Esta skill herda comportamento base de `GLOBAL.md` e destas policies:

- `policies/execution.md`
- `policies/handoffs.md`
- `policies/persistence.md`
- `policies/token-efficiency.md`
- `policies/writing-clarity.md`
- `policies/anti-ai-writing.md` ← **antes de finalizar qualquer doc que humanos vão ler**
- `policies/evals.md`
- `policies/search-first.md`
- `policies/iterative-retrieval.md`
- `policies/source-driven.md`
- `policies/verification-before-completion.md`

Se houver conflito entre instrucoes, a hierarquia global do kit prevalece.

Para templates completos de feature, ADR, runbook e playbook, consultar `docs/skill-guides/documenter-templates.md` apenas quando necessario.

## Quando Usar

- Registrar feature, contrato, arquitetura, operacao ou runbook
- Atualizar documentacao apos decisao, mudanca de fluxo ou alteracao de contrato
- Consolidar conhecimento util para proxima iteracao

## Quando Nao Usar

- Para comentar linha de codigo obvia
- Para duplicar informacao ja existente em outra doc sem necessidade
- Para substituir review tecnico ou QA

## Entradas Esperadas

- Artefatos da feature ou da mudanca
- Decisoes tecnicas e trade-offs
- Contratos de API e regras de negocio
- Contexto operacional relevante

## Saidas Esperadas

- Documentacao atualizada no nivel correto
- Registro de decisao quando houver impacto arquitetural ou operacional
- Handoff curto com o que mudou e onde foi registrado

## Responsabilidades

1. Documentar features com objetivo, regras de negócio e critérios de aceitação
2. Documentar contratos de API como fonte de verdade entre front e back
3. Documentar arquitetura e decisões técnicas relevantes (ADRs)
4. Documentar setup, deploy e operação do sistema
5. Manter documentação atualizada junto com o código
6. Nunca documentar o óbvio — código limpo é a melhor documentação de implementação

## Os 4 Níveis de Documentação

### Nível 1: Produto/Feature — POR QUE existe

Responde: qual problema resolve, para quem, com quais regras.

Conteúdo obrigatório:
- **Objetivo**: o que a feature faz e por que existe
- **Regras de negócio**: todas as regras, sem exceção
- **Fluxo do usuário**: happy path completo
- **Casos de borda**: tudo que pode dar errado ou fugir do fluxo principal
- **Critérios de aceitação**: condições verificáveis de DADO/QUANDO/ENTÃO

### Nível 2: Contrato/API — COMO se comunica

Responde: qual endpoint chamar, com quais dados, e o que esperar de volta.

Conteúdo obrigatório:
- **Endpoints**: método, path, descrição
- **Autenticação**: tipo de token, headers necessários
- **Request**: body, query params, path params com tipos e validações
- **Response**: formato de sucesso e erro com exemplos reais
- **Códigos de erro**: todos os códigos possíveis com descrição
- **Paginação**: formato padrão de paginação
- **Exemplos**: curl ou equivalente para cada endpoint

### Nível 3: Implementação — COMO foi construído

Responde: qual a estrutura, quais padrões, por que essa decisão técnica.

Conteúdo obrigatório:
- **Arquitetura frontend**: estrutura de pastas, gerenciamento de estado, roteamento
- **Arquitetura backend**: camadas, patterns, fluxo de request
- **Componentes reutilizáveis**: catálogo de componentes compartilhados e como usar
- **Padrões adotados**: patterns do projeto com justificativa
- **ADRs**: toda decisão técnica significativa registrada

### Nível 4: Operação — COMO roda

Responde: como subir, como deployar, como monitorar, como resolver problemas.

Conteúdo obrigatório:
- **Setup local**: do zero ao projeto rodando, passo a passo
- **Deploy**: pipeline, ambientes, processo de release
- **Observabilidade**: logs, métricas, alertas, dashboards
- **Troubleshooting**: problemas conhecidos e como resolver

### Runbooks e Playbooks

Manter runbooks em `docs/ops/runbooks/`.

Para templates completos de runbook e playbook, consultar `docs/skill-guides/documenter-templates.md`.

## Estrutura de Diretórios

```
docs/
  README.md
  features/
    <feature-name>/
      README.md
      rules.md
      flow.md
      api.md
      ui.md
  architecture/
    overview.md
    frontend.md
    backend.md
    decisions/
      adr-NNN-*.md
  api/
    README.md
    errors.md
    pagination.md
  ops/
    setup.md
    deploy.md
    observability.md
  context/
    current-focus.md
    history.md
  plans/
```

O diretório `context/` é gerenciado pelo Context Manager. O diretório `plans/` armazena planos de implementação.

## Templates de Feature e ADR

Usar `templates/doc-update.md` para atualizacao curta e `docs/skill-guides/documenter-templates.md` quando precisar dos templates completos de feature, ADR, runbook e playbook.

## Regras de Documentação

1. **Documente PADRÕES, não JSX** — código muda toda hora, padrões não. Documente a convenção, não a linha de código
2. **Feature é a unidade central** — toda documentação gravita ao redor de features. Uma feature tem regras, fluxos, API, UI, tudo junto
3. **API é contrato** — a documentação de API é o contrato entre front e back. Se mudou na doc, muda no código. Se mudou no código, muda na doc
4. **Nunca repita informação** — se a regra de negócio está em `rules.md`, não repita em `api.md`. Faça referência
5. **Nunca misture regras de negócio com detalhes de implementação** — "Usuário só pode ter 3 posts por dia" é regra de negócio. "Usamos Redis para cache do contador" é implementação. Cada um no seu lugar
6. **Toda documentação responde**: O que é? Por que existe? Como funciona? Onde fica? O que fala com o que? O que pode quebrar?

**Checkpoint antes de finalizar:** buscar (`grep`) o mesmo fato/regra em outros arquivos de doc do projeto — se aparecer em 2+ lugares com texto divergente, isso já é a regra 4 quebrada, não uma coincidência inofensiva. Substituir a duplicata por referência ao arquivo canônico e reler o resultado; se ainda houver repetição, repetir a busca antes de considerar a doc pronta.

## Quando Documentar

Documentação é escrita DURANTE o desenvolvimento, não depois.

- Antes de codar: regras de negócio e critérios de aceitação
- Durante o design: contratos de API e decisões de arquitetura (ADRs)
- Durante a implementação: padrões e componentes reutilizáveis
- Antes do deploy: setup e operação

Documentação escrita depois do fato é incompleta por definição. Ninguém lembra de tudo.

## Código Limpo: Zero Comentários

Codigo bem escrito prioriza clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.

Exceções permitidas:
- Links para documentação externa ou RFCs
- Workarounds temporários com link para o ticket de correção
- Regex complexa com explicação do que faz

Tudo mais é sinal de que o código precisa de refatoração, não de comentário.

## Evidencia de Conclusao

- Mudanca documentada no nivel correto
- Arquivos de documentacao atualizados ou criados
- Relacao entre decisao e impacto registrada quando necessario

## Diagramas em Docs e ADRs

Nem toda decisão de nível 3 (arquitetura) ou nível 1 (fluxo de usuário) se explica melhor em prosa. Antes de desenhar, perguntar: *o leitor aprende mais com isso do que com um parágrafo bem escrito?* Se não, não desenhar — lista ou tabela resolve.

Quando vale desenhar, usar a skill global `artifact-diagramming` (carregada via Skill tool — builtin do harness, "Diagramming know-how for Artifacts") para a *técnica* de desenho em Artifact (SVG inline, legibilidade em ambos os temas). Esta seção cobre outra coisa: **qual tipo de diagrama** usar para cada tipo de decisão documentada aqui.

### Tipos de diagrama por nível de documentação

Tabela curada — não é a lista completa de 39 tipos do catálogo fonte (ver `## Fontes`), só os que mapeiam direto para os quatro níveis desta skill:

| Tipo | Uso no contexto desta skill |
|---|---|
| Architecture | Nível 3 — componentes + conexões (frontend, backend, DB, cache, filas) |
| Flowchart | Nível 1 — lógica de decisão de um fluxo de usuário ou regra de negócio |
| Sequence | Nível 2 — troca de mensagens entre client/API/serviço ao longo do tempo (bom para documentar um endpoint com retry/refresh de token) |
| ER / data model | Nível 3 — entidades + campos quando o schema em si não basta como documentação |
| State machine | Nível 3 — estados + transições de uma entidade com ciclo de vida (pedido, assinatura, job) |
| Swimlane | Nível 1 — fluxo cross-funcional (que atravessa mais de um ator/sistema) |
| Timeline | Nível 4 (runbook) ou release notes — eventos em ordem, útil em changelog complexo |
| Deployment | Nível 4 — zonas, hosts e artefatos; runbook de operação/deploy |
| Dependency graph | Nível 3 — fan-in entre módulos; complementa achado de god node do graphify |

Fora desses nove, o catálogo fonte cobre outros 30 tipos (quadrant, radar, kanban, gantt, treemap, venn, wardley, uml-class, db-schema físico, etc.) — úteis fora do escopo desta skill (planejamento, produto, dados). Consultar o repo diretamente se a decisão a documentar não se encaixar em nenhuma linha acima.

### Verificação geométrica como princípio, não como script

O catálogo fonte não confia em revisão visual para aprovar um diagrama — ele roda scripts que verificam a **geometria** do SVG (ex.: se uma label de seta ficou coberta pelo nó pintado depois dela, o defeito só aparece ao renderizar, não ao ler o código; revisão visual e até outros linters de estilo/acessibilidade passam sem notar). Essa disciplina é portável como prática, mesmo sem portar o script Python específico deles:

Depois de gerar um diagrama de arquitetura, sequência ou fluxo nesta skill, conferir manualmente (ou pedir ao agente que confira antes de considerar o diagrama pronto):

- toda seta tem origem e destino que existem no diagrama — nenhuma aponta para um nó que não foi desenhado
- não há nó órfão — todo componente desenhado participa de pelo menos uma conexão, ou está explicitamente marcado como isolado
- nenhuma label de seta ou anotação fica visualmente sobreposta por outro elemento desenhado depois dela na ordem de pintura
- a ordem de pintura (fundo → zonas → conexões → labels → nós) é intencional, não acidental — nós devem cobrir conexões que passam atrás deles, não labels

Isso não substitui teste automatizado quando o diagrama for gerado por script/CI; é o mínimo de rigor para um diagrama feito à mão ou por agente antes de entrar em doc publicada.

## Roteamento de Representação (além de diagrama)

Antes de decidir *qual tipo de diagrama*, decidir se o conteúdo é diagrama de verdade ou outra coisa que passa mais fácil como texto. Nem toda informação estruturada precisa virar desenho — a pergunta certa é "qual representação faz o leitor gastar menos esforço para extrair o dado".

| Natureza do conteúdo | Representação | Quando NÃO usar |
|---|---|---|
| Fluxo com decisão/branching, processo passo a passo | Mermaid flowchart | Se o fluxo é linear sem ramificação — vira lista numerada |
| Estrutura de componentes/camadas fixa | CSS Grid ou tabela | Se os componentes têm muitas relações cruzadas — vira diagrama de dependência (ver tabela acima) |
| Comparação de valores entre categorias, série temporal | Tabela HTML (estático) ou Chart.js (interativo/dashboard) | Se são só 2-3 números — prosa resolve, gráfico é ruído |
| Dados tabulares com múltiplas colunas | Tabela markdown/HTML | Se cada linha tem texto longo — vira lista com subitens, tabela fica ilegível |
| Relação hierárquica simples (pai/filho, categoria/item) | Lista aninhada ou Mermaid `graph TD` | Se a hierarquia tem 1 nível só — não precisa de estrutura visual |

Regra de decisão: se o conteúdo cabe numa tabela de até ~6 colunas sem quebrar, preferir tabela sobre diagrama — tabela é mais fácil de escanear e de manter atualizada que um SVG ou definição Mermaid.

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/doc-update.md`.

## Fontes

- Catálogo de 39 tipos de diagrama editorial (architecture, flowchart, sequence, ER, state, swimlane, timeline, deployment, dependency graph, entre outros) e o princípio de verificação geométrica de label (`scripts/verify-geometry.py`, documentado em `docs/adr/0005-label-geometry-is-verified.md`) vêm de [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) (MIT) — curados aqui como tabela de nove tipos mapeados aos quatro níveis de documentação desta skill, e como prática recomendada descrita em texto; os templates HTML+SVG completos e os scripts `verify-*.py` não foram portados — gap medido por grep em "diagram" no kit antes de curar (só menções esparsas nas skills 44, 51 e em `skills/02-ui-ux-design/data/charts.csv`, sem catálogo dedicado de tipos com verificação).
- Tabela de "Roteamento de Representação" acima (Mermaid vs. grid vs. tabela vs. Chart.js) inspirada no core de roteamento de conteúdo de [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer) (MIT) — os quatro slash commands do projeto original (`/diff-review`, `/plan-review`, `/project-recap`, `/generate-slides`) não foram adotados por sobreporem as skills 11, 53, 31/45 respectivamente.

## Integração com Pipeline

- **skill 48 (research-prep):** roda **antes** desta skill quando o tópico a documentar requer pesquisa externa (tecnologia nova, comparativo de abordagens, ADR baseado em evidência). Passar `memory/research/<slug>.md` como fonte de verdade para a documentação.

## Modo Repo-Wiki e inteligência de repositório

Quando o pedido for documentar um repositório inteiro, uma arquitetura desconhecida, um legado ou uma mudança transversal, carregar `docs/skill-guides/documenter-repository-intelligence.md`. Esse modo incorpora a análise estruturada do Litho/deepwiki-rs ao modelo do kit sem instalar um runtime Rust, depender de uma API externa ou transformar inferência em fato.

O modo Repo-Wiki deve:

1. excluir qualquer arquivo/pasta com componente iniciado por ponto, gitignored, symlink/junction, dependências, builds e logs ANTES de abrir arquivos; descobrir entry points e código permitido;
2. construir um inventário de símbolos, responsabilidades, interfaces, dependências e evidências;
3. pesquisar em trilhas independentes: contexto do sistema, regras de negócio, arquitetura, workflows, boundaries, contratos, segurança, automações/RPA, banco de dados quando houver SQL e módulos centrais;
4. compor Markdown e um site HTML estático, navegável, pesquisável, responsivo e sem dependências externas, incluindo arquitetura/organograma quando houver nós e relações revisados;
5. gerar uma matriz de melhorias do repositório cobrindo produto, UX/acessibilidade, arquitetura, segurança/privacidade, performance/custo, operação, dados/contratos, testes, DX/dependências/docs, automações/RPA e deploy;
6. validar links, fences, Mermaid/SVG, busca offline, cobertura, duplicatas, placeholders e ausência de requests externos antes do handoff;
7. registrar SHA/revisão analisada, escopo, lacunas, confiança, métricas do run e status de cada trilha.

### Modos de execução

- **Full:** descoberta + pesquisa + composição + verificação. Use para onboarding, legado ou arquitetura desconhecida.
- **Incremental:** recalcular apenas arquivos alterados e dependentes, preservando documentos não afetados.
- **Focused:** restringir a um módulo, boundary, workflow ou schema e gerar apenas o subconjunto correspondente.
- **Drift:** comparar a documentação existente com o código atual e produzir gaps, sem reescrever automaticamente.

### Contrato de evidência

Cada regra exige leitura semântica de código executável: condição, efeito, exceções, domínio, natureza (produto, operação ou exemplo), verificação e trecho exato. Listar arquivos, símbolos ou matches de palavras-chave NÃO extrai regras. Documentos, logs e instruções de agentes não são evidência de comportamento. Nunca abrir pastas ocultas para esse levantamento, nem reutilizar seu conteúdo via cache ou páginas de evidência antigas.

Registrar a revisão em `analysis.json` (schema de entrada 2, contrato no guia): arquivos lidos com SHA-256 e achados com trechos exatos. O compilador valida os hashes e gera âncoras `[evidence: caminho:linha]`; o `report.json` emitido usa schema 3. Snippets sensíveis são recusados e o builder aplica mascaramento em defesa adicional. `observed` significa observado estaticamente, não executado; `inferred` marca interpretação ou proposta. Verificação em runtime é relatada separadamente. Nunca escrever “sempre atualizado”, “completo” ou “funciona” sem prova correspondente.

O compilador marca trilhas como `partial` ou `not_reviewed`; ausência de achados não prova ausência no projeto. Publicar arquivos inventariados versus realmente revisados. RPA só é considerado operacional com processo e execução comprovados; um helper de instruções de browser não executa RPA.

Arquitetura é documentada em uma seção própria de `analysis.json`: resumo, nós e relações com evidência exata. `contexts` e `levels` opcionais separam contexto, containers e componentes, evitando misturar runtime, aplicação consumidora, template e benchmark. O gerador valida IDs, destinos, confiança e evidências, compõe `architecture.md` com mapa de módulos e bloco Mermaid, e o builder transforma o bloco em SVG local no site. Relações `observed` vêm de import/call/configuração visível; `inferred` são hipóteses rastreáveis. Não desenhar organograma de pessoas, ownership ou deploy sem evidência correspondente.

A página `overview.md` resume o sistema para onboarding: propósito, público/consumidor, tecnologias e versões, pontos de entrada, comandos úteis, estrutura relevante e limites. Cada item técnico deve ter evidência de manifesto, configuração ou código; templates e benchmarks são identificados como auxiliares, não misturados com a stack principal.

### Saída canônica

Por padrão, gerar em `docs/repo-wiki/` para não sobrescrever feature docs, contratos ou ADRs existentes:

```text
docs/repo-wiki/
  README.md                 # índice e escopo do snapshot
  overview.md               # contexto C4 nível 1
  architecture.md           # containers, componentes e dependências
  workflows.md              # fluxos e sequência de dados
  boundaries.md             # CLI, API, rotas, integrações e configuração
  database.md               # schema/SQL ou not_applicable explícito
  verification.md           # comandos executados e limites da prova
  modules/                  # índice e deep dives dos módulos centrais
  runtime.json              # resultado opcional do runner seguro de build/test
  site/                     # HTML offline + busca + evidências locais
  report.json               # métricas, warnings, SHA, delta e cobertura
```

### Execução local do Repo-Wiki

```bash
node scripts/run-repo-wiki-runtime.mjs --repo . --output docs/repo-wiki/runtime.json --allow-execution
node scripts/generate-repo-wiki.mjs --repo . --output docs/repo-wiki --mode Full --analysis docs/repo-wiki/analysis.json --runtime docs/repo-wiki/runtime.json
node scripts/build-repo-wiki.mjs --repo . --docs docs/repo-wiki --site docs/repo-wiki/site
node scripts/verify-repo-wiki.mjs --docs docs/repo-wiki --site docs/repo-wiki/site --json
```

Antes do comando, o agente deve ler as fontes permitidas e escrever a análise. Sem `--analysis`, o CLI produz apenas inventário e páginas pendentes. O runner opcional executa somente scripts `build` e `test` declarados no package escolhido, exige `--allow-execution` e grava saída sanitizada. O CLI aceita Full, Focused, Incremental e Drift: Focused restringe o inventário com `--focus`; Incremental registra delta e não reutiliza semântica sem reapresentação evidenciada; Drift escreve `drift.json` sem reescrever docs. A saída base publica README, overview, architecture, workflows, boundaries, database, verification e as cinco trilhas funcionais; `modules/index.md` e deep dives são adicionados quando houver módulos. Sem essas seções, as páginas correspondentes permanecem explicitamente `not_reviewed` ou `not_applicable`; não são preenchidas com texto ou diagrama genérico. O HTML usa apenas o manifesto do relatório, busca local, filtros por trilha, snippets citados e SVG local para Mermaid; não copia arquivos-fonte inteiros nem republica páginas antigas fora do manifesto.

### Destino e handoff obrigatório

Se `--repo` não for informado, o alvo é o diretório corrente (`process.cwd()`). Portanto, ao rodar a skill dentro de um projeto, a saída padrão fica nesse próprio projeto:

```text
<projeto>/docs/repo-wiki/README.md
<projeto>/docs/repo-wiki/report.json
<projeto>/docs/repo-wiki/site/index.html
```

O agente deve informar no handoff o caminho absoluto do repositório analisado, da pasta Markdown, do `report.json` e do `site/index.html`, além do número de arquivos inventariados/revisados, trilhas pendentes e verificações executadas. Se usar `--repo`, `--output` ou `--site`, deve informar os caminhos efetivos retornados pelos comandos, não repetir o default. O JSON de cada comando também retorna `repo`, `markdown_dir`, `report`, `site` e `index` para evitar ambiguidade.

Se o projeto já tiver uma árvore canônica, atualizar os arquivos correspondentes e registrar a decisão no handoff; não criar uma segunda fonte de verdade.

### Limites do porte

Foram portados os padrões e o fluxo de trabalho, não o código Rust do upstream. O leitor Litho Book e o produto Terrain ficam fora desta skill; Mermaid é validado pelo verificador local do kit, e a análise usa as ferramentas e políticas já disponíveis na superfície do agente.

O gate de conclusão exige Markdown válido e, quando o site é solicitado, HTML construído, links locais resolvidos, busca offline presente e `external_requests: 0`. Isso prova o artefato local; não substitui validação de domínio, teste de segurança em runtime ou execução real de uma automação.
