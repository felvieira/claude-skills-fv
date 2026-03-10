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

Quando o repo consumidor tiver documentacao operacional estruturada, manter runbooks em `docs/ops/runbooks/`.

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

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/doc-update.md`.
