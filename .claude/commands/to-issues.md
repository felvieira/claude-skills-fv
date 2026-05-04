---
description: Quebra PRD/plano em issues independentes (vertical slices) e publica no issue tracker — adaptado de mattpocock/skills
---

# /to-issues — PRD → Issues Independentes (Vertical Slices)

**Objetivo:** Transformar PRD/plano em issues do issue tracker, organizadas como **vertical slices** (tracer bullets) que podem ser pegas por workers diferentes em paralelo.

**Quando usar:**
- após `/to-prd` ter produzido um PRD aprovado
- quando equipe vai paralelizar — precisa issues atribuíveis a workers/agentes
- antes de `/loop --worktree --parallel N` (cada worker pega 1 issue)

**Quando NÃO usar:**
- task pequena que cabe em 1 issue só (não precisa quebrar)
- bug fix (1 bug = 1 issue, sem slicing)
- spec ainda em rascunho — rode `/to-prd` primeiro

**Skill ativada:** Orchestrator (skill 09) + `policies/vertical-slices.md`.

**Pré-requisitos:**
- PRD ou plano em conversa/issue/path
- vocabulário do issue tracker conhecido (label `needs-triage`)
- conhecimento dos ADRs do projeto

**Processo (adaptado de mattpocock/skills/engineering/to-issues):**

### 1. Reunir contexto
Trabalhar com o que já está na conversa. Se usuário passar referência (issue number, URL, path), buscar e ler corpo + comentários.

### 2. Explorar codebase (opcional)
Se ainda não explorado, mapear estado atual. Títulos e descrições devem usar vocabulário do glossário do projeto + respeitar ADRs.

### 3. Esboçar vertical slices

Quebrar o plano em **tracer bullet** issues. **Cada issue é uma fatia vertical fina cortando TODAS as camadas (schema + API + UI + testes), NÃO uma fatia horizontal de uma camada.**

Tipos de slice:
- **HITL** (Human-In-The-Loop) — exige interação humana (decisão arquitetural, design review)
- **AFK** (Away From Keyboard) — pode ser implementado e mergeado sem interação humana

**Preferir AFK sobre HITL** quando possível.

Regras de slice vertical (consistente com `policies/vertical-slices.md`):
- entrega caminho COMPLETO mas estreito por TODA a camada (schema, API, UI, tests)
- slice concluída é demoável ou verificável sozinha
- preferir muitas slices finas a poucas slices grossas

### 4. Quizz com o usuário

Apresentar a quebra como lista numerada. Para cada slice mostrar:

- **Título:** nome curto e descritivo
- **Type:** HITL / AFK
- **Blocked by:** quais slices precisam concluir antes (se houver)
- **User stories cobertas:** quais USs do PRD essa slice resolve

Perguntar:
- Granularidade ok? (muito grossa / muito fina)
- Dependências corretas?
- Alguma slice merge/split?
- HITL/AFK marcados corretamente?

Iterar até aprovação.

### 5. Publicar issues

Para cada slice aprovada, publicar issue. Aplicar label `needs-triage`.

**Publicar em ordem de dependência** (blockers primeiro) para referenciar IDs reais no campo "Blocked by".

**Template do issue:**

```markdown
## Parent
Referência ao issue pai (se origem foi issue existente, senão omitir).

## What to build
Descrição concisa desta slice vertical. Comportamento end-to-end, NÃO implementação camada-por-camada.

## Acceptance criteria
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

## Blocked by
- Referência ao ticket bloqueador (se houver)
Ou "None - can start immediately" se sem blockers.
```

**NÃO** fechar nem modificar issue pai.

**Publicação por tracker:**

Auto-detecção (bash executável — rodar antes do loop de publicação):

```bash
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  TRACKER="github"
elif [ -n "$LINEAR_API_KEY" ]; then
  TRACKER="linear"
elif command -v acli >/dev/null 2>&1; then
  TRACKER="jira"
else
  TRACKER="local"
fi
echo "Tracker: $TRACKER"
```

Despois iterar pelas slices em ordem de dependência, chamando o comando do tracker apropriado por slice:

**GitHub** (via `gh`):
```bash
gh issue create \
  --title "feat: <slice title>" \
  --body "<template above>" \
  --label needs-triage
```

**Linear** (via API):
```bash
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: $LINEAR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { issueCreate(input: {teamId: \\\"$TEAM_ID\\\", title: \\\"feat: <slice title>\\\", description: \\\"$BODY\\\", labelIds: [\\\"$NEEDS_TRIAGE_LABEL_ID\\\"]}) { issue { id url } } }\"}"
```

**Jira** (via `acli`):
```bash
acli create issue --project PROJ --type Story --summary "feat: <slice title>" --description "$BODY" --labels needs-triage
```

**Fallback local (sem CLI/API):**
Salvar cada slice como `docs/issues/YYYY-MM-DD-slice-NN-<slug>.md`. Output inclui:
- N caminhos de arquivo
- N comandos `gh issue create` prontos para copiar/colar quando autenticado
- aviso: "N slices salvas localmente — falta publicar no tracker"

Em todos os trackers: aplicar label `needs-triage` (ou equivalente do projeto). Publicar em **ordem de dependência** para referenciar IDs reais no campo "Blocked by".

**Inputs:**
- PRD existente (URL, path, ou contexto)
- (opcional) restrições de paralelização

**Output esperado:**
- N issues criadas, cada uma é vertical slice
- URLs de cada issue
- relação de dependência mapeada
- handoff para `/loop --worktree --parallel N` ou `/auto` por slice

**Policies relevantes:**
- `policies/vertical-slices.md` — **núcleo** desta skill
- `policies/handoffs.md` — formato consistente de handoff entre workers
- `policies/writing-clarity.md` — issues legíveis

**Handoff:**
- `/loop --worktree --parallel N` — N workers, cada um pega 1 issue independente
- `/auto` — 1 worker autônomo por issue
- `/build` (manual) — implementar 1 slice de cada vez

**Inspiração:** [mattpocock/skills/engineering/to-issues](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-issues).

**Uso:** `/to-issues [referência ao PRD ou plano]`
