---
description: Converte conversa atual em PRD formatado para issue tracker (GitHub/Jira/Linear) — adaptado de mattpocock/skills
---

# /to-prd — Conversa → PRD para Issue Tracker

**Objetivo:** Converter contexto atual da sessão em um Product Requirements Document publicável no issue tracker do projeto. **Não** entrevista o usuário — sintetiza o que já está no contexto.

**Quando usar:**
- após `/grill-me` ter convergido
- quando ideia/feature está suficientemente discutida e precisa virar issue formal
- antes de `/to-issues` (que quebra o PRD em vertical slices)

**Quando NÃO usar:**
- contexto ainda vago — rode `/grill-me` primeiro
- spec interna do kit (use `/spec` que produz markdown em `docs/specs/`)
- bug fix — bug não vira PRD, vira issue direto

**Skill ativada:** PO (skill 01) em modo "PRD para issue tracker".

**Pré-requisitos:**
- vocabulário do issue tracker conhecido (label `needs-triage` aplicada)
- glossário de domínio do projeto (`CONTEXT.md` ou `docs/glossary.md`)
- ADRs do projeto (`docs/adr/`) — respeitar decisões registradas

**Processo (adaptado de mattpocock/skills/engineering/to-prd):**

1. **Explorar repo** se ainda não explorado. Usar vocabulário do glossário em todo o PRD. Respeitar ADRs.
2. **Esboçar módulos** principais que serão construídos/modificados. Buscar oportunidades de **deep modules** (interface pequena, implementação rica, testável isoladamente). Confirmar com usuário quais módulos batem com expectativa e quais devem ter testes escritos.
3. **Escrever PRD** no template abaixo + publicar no issue tracker com label `needs-triage`.

**Template do PRD:**

```markdown
## Problem Statement
O problema do ponto de vista do usuário.

## Solution
A solução do ponto de vista do usuário.

## User Stories
Lista LONGA, numerada. Formato:
1. Como <ator>, eu quero <feature>, para <benefício>

Exemplo:
1. Como cliente do banco mobile, eu quero ver saldo das minhas contas, para tomar decisões melhores sobre meus gastos

Cobrir TODOS os aspectos da feature.

## Implementation Decisions
- Módulos a construir/modificar
- Interfaces dos módulos modificados
- Esclarecimentos técnicos
- Decisões arquiteturais
- Mudanças de schema
- Contratos de API
- Interações específicas

NÃO incluir paths de arquivo nem snippets de código (envelhecem rápido).

## Testing Decisions
- Descrição do que faz um bom teste (testar comportamento externo, não detalhes de implementação)
- Quais módulos serão testados
- Prior art (testes similares no codebase)

## Out of Scope
O que está fora do escopo deste PRD.

## Further Notes
Notas adicionais.
```

**Publicação:**
- GitHub Issues: usar `gh issue create --title ... --body ... --label needs-triage`
- Sempre aplicar label `needs-triage` para entrar no fluxo normal de triagem

### Trackers alternativos (se não usar GitHub + gh CLI)

**Linear** (via API):
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { issueCreate(input: {teamId: \\\"$TEAM_ID\\\", title: \\\"$TITLE\\\", description: \\\"$BODY\\\", labelIds: [\\\"$NEEDS_TRIAGE_LABEL_ID\\\"]}) { issue { id url } } }\"}"
```

**Jira** (via Atlassian CLI ou REST):
```bash
acli create issue --project PROJ --type Story --summary "$TITLE" --description "$BODY" --labels needs-triage
```

**Sem CLI / sem API key — fallback local:**
Salvar PRD como `docs/prd/YYYY-MM-DD-<slug>.md` e abrir issue manualmente depois. Output do comando inclui:
- caminho do arquivo
- comando `gh issue create` pré-preenchido (copiar/colar quando estiver autenticado)
- aviso explícito: "PRD salvo localmente — falta publicar no tracker"

**Detecção automática:**
- `gh auth status` → usa GitHub
- `LINEAR_API_KEY` env var presente → oferece Linear
- senão → fallback local com aviso

**Inputs:**
- contexto da conversa atual
- (opcional) referência a issue/PR pai

**Output esperado:**
- PRD em markdown publicado como issue
- URL do issue criado
- handoff para `/to-issues`

**Policies relevantes:**
- `policies/vertical-slices.md` — User Stories devem ser organizáveis em slices verticais
- `policies/source-driven.md` — decisões ancoradas em ADRs e codebase
- `policies/writing-clarity.md` — PRD legível, sem fluff

**Handoff:** `/to-issues` para quebrar o PRD em issues independentes (vertical slices) prontas para execução paralela.

**Inspiração:** [mattpocock/skills/engineering/to-prd](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-prd).

**Uso:** `/to-prd [opcional: contexto adicional ou referência]`
