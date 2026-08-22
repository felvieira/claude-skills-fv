---
name: documenter
description: |
  Skill de Documentação por nível de decisão. Use quando precisar documentar features, APIs, arquitetura,
  setup, operação, ou manter documentação existente atualizada. Trigger em: "documentar", "documentação",
  "docs", "ADR", "architecture decision record", "README", "feature doc", "api doc", "setup doc",
  "runbook", "troubleshooting", "doc de operação", "registrar decisão", "atualizar docs".
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

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/doc-update.md`.

## Fontes

- Catálogo de 39 tipos de diagrama editorial (architecture, flowchart, sequence, ER, state, swimlane, timeline, deployment, dependency graph, entre outros) e o princípio de verificação geométrica de label (`scripts/verify-geometry.py`, documentado em `docs/adr/0005-label-geometry-is-verified.md`) vêm de [cathrynlavery/diagram-design](https://github.com/cathrynlavery/diagram-design) (MIT) — curados aqui como tabela de nove tipos mapeados aos quatro níveis de documentação desta skill, e como prática recomendada descrita em texto; os templates HTML+SVG completos e os scripts `verify-*.py` não foram portados — gap medido por grep em "diagram" no kit antes de curar (só menções esparsas nas skills 44, 51 e em `skills/02-ui-ux-design/data/charts.csv`, sem catálogo dedicado de tipos com verificação).

## Integração com Pipeline

- **skill 48 (research-prep):** roda **antes** desta skill quando o tópico a documentar requer pesquisa externa (tecnologia nova, comparativo de abordagens, ADR baseado em evidência). Passar `memory/research/<slug>.md` como fonte de verdade para a documentação.
