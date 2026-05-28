---
description: Passe reflexivo sobre memory vault — merge de duplicatas, fix de stale facts, prune do índice. Consolida D:\claude-memory\ ou vault local do projeto.
---

# /consolidate-memory — Manutenção do Vault de Memória

**Objetivo:** rotina de manutenção do vault persistente seguindo `policies/memory-consolidation.md`. Workflow seguro: snapshot → dry-run → confirmação → apply → verify → report.

**Quando usar:**
- semanalmente (rotina)
- após uso intenso (50+ sessions)
- antes de release major (limpar stale)
- vault crescer demais (> 500 arquivos)

**Quando NÃO usar:**
- vault recém-criado (< 20 arquivos)
- sem backup possível (não é repo git, não tem espaço para `.bak`)

**Skill ativada:** Context Manager (skill 08) em modo "vault janitor".

## Pré-requisitos

- vault em `D:\claude-memory\` ou path explícito via `--vault <path>`
- backup viável (espaço em disco para snapshot OU vault é repo git)

## Processo

### Passo 1 — Snapshot

```bash
VAULT="${1:-D:/claude-memory}"
TIMESTAMP=$(date +%Y-%m-%d-%H%M)

# Se é repo git: commit
if [ -d "$VAULT/.git" ]; then
  cd "$VAULT" && git add -A && git commit -m "snapshot pre-consolidate $TIMESTAMP"
else
  # Copy snapshot
  cp -r "$VAULT" "$VAULT.bak.$TIMESTAMP"
fi
```

### Passo 2 — Dry run (auditoria sem mudança)

Para cada categoria de `policies/memory-consolidation.md`, listar candidatos:

#### 2.1 Logs de sessão duplicados
- Buscar logs do mesmo dia/projeto: `ls $VAULT/logs/YYYY-MM-DD-<projeto>-*.md`
- Comparar similaridade (filename ou conteúdo > 80% similar) → marcar para merge
- Output: lista de pares `[A.md, B.md] → keep A, delete B`

#### 2.2 Logs órfãos / antigos
- Logs > 90 dias sem ser referenciado em outro lugar → archive candidate
- Logs de projetos inexistentes → archive candidate

#### 2.3 Architecture decisions
- Decisões com mesmo título em projetos iguais → merge candidate
- Decisões `status: superseded` sem newer ref → flag

#### 2.4 Working set / context packs
- Files referenciados que não existem mais → remove entry
- Entries duplicadas (mesmo path) → merge metadata

#### 2.5 Learned skills
- Score < 0.3 e idade > 30d → archive candidate
- Score ≥ 0.8 e 5+ usos → promote candidate
- Triggers conflitantes → resolve candidate

#### 2.6 Índice
- Tags inconsistentes → normalize candidate
- Backlinks quebrados → fix candidate

### Passo 3 — Apresentar relatório dry-run

Output estruturado para o usuário:

```markdown
# /consolidate-memory dry run — <data>

## Vault: D:\claude-memory (1234 arquivos, 87MB)
## Snapshot: D:\claude-memory.bak.2026-05-15-1430 (ou commit abc123)

## Candidatos por categoria

### Logs duplicados (3)
- [ ] keep `2026-05-15-claude-skills-fv-session.md` (1.2k tokens)
      delete `2026-05-15-claude-skills-fv-session-v2.md` (similar 92%)
- [ ] ...

### Logs antigos para archive (12)
- [ ] move `logs/2025-12-*.md` → `logs/archived/2025/` (12 files)

### Decisões superseded (2)
- [ ] mark `architecture/projeto-X/auth-decision.md` → `superseded` (linkar `auth-decision-v2.md`)

### Learned skills para promote (1)
- [ ] promote `learned-skills/parser-recovery.md` (score 0.87, 6 usos) → semantic tier

### Learned skills para archive (4)
- [ ] archive `learned-skills/old-pattern-X.md` (score 0.21, idade 45d)

### Files inexistentes em working-set (5)
- [ ] remove entry `src/legacy/foo.ts` (file não existe há 60d)

### Tags inconsistentes (2)
- [ ] normalize "claude-skills-fv" + "claude-skills" → "claude-skills-fv"

## Total: 29 mudanças propostas
```

### Passo 4 — Confirmação

Usar `AskUserQuestion`:
- **Apply all** — aplicar tudo
- **Apply selected** — usuário marca quais (mostrar checkbox, requer multi-select)
- **Cancel** — abortar (snapshot fica para próxima vez)

Para "apply selected", apresentar com `multiSelect: true`.

### Passo 5 — Apply

Executar apenas o aprovado:
- Merge: criar arquivo consolidado, mover originais para `.archive/`
- Archive: `mv` para `archived/<ano>/`
- Promote/demote: editar frontmatter `tier: semantic` ou similar
- Normalize tags: `sed` em todos os arquivos afetados
- Fix backlinks: regenerar `index.md` a partir dos arquivos restantes

### Passo 6 — Verify

- Checar que `index.md` ainda parseia (frontmatter válido)
- Sample 5 arquivos aleatórios e verificar que ainda têm conteúdo
- Total de arquivos antes vs depois (diff esperado vs real)
- Search funciona (`python D:\claude-memory\scripts\search.py "test query"`)

### Passo 6.5 — Regenerar Persona L3 (opcional, default ON)

Após o vault estar consolidado, regenerar a destilação L3 da pirâmide de memória (ver `policies/memory-pyramid.md`):

```bash
node scripts/l3-persona-generator.mjs --project "<slug-do-projeto>"
# → D:/claude-memory/architecture/<slug>/persona.md
```

Critérios pra rodar:
- Existem ≥ 5 atoms em `memory/feedback_*.md` ou ≥ 3 cenários em `architecture/<slug>/decisions.md`
- Última geração foi há > 7 dias OU mudanças significativas no consolidate

Pular se:
- Vault recém-criado (poucos atoms — persona viria pobre)
- User passou `--no-persona`

A persona é **regenerada do zero**, não editada — edits manuais são perdidos. Persona vira o L3 injetado no SessionStart de futuras sessões.

### Passo 7 — Report final + atualizar curator state

**Primeiro**, registrar a conclusão no `.curator-state.json` para resetar o nudge de inatividade (`hooks/scripts/memory-curator-nudge.mjs`). Sem isso, o nudge dispararia para sempre:

```bash
node scripts/curator-state.mjs --write --vault "$VAULT"
# → grava { last_curated_at: agora, files_at_last: <contagem pós-consolidação> }
```

Depois, o relatório:

```markdown
# /consolidate-memory done — <data>

## Aplicado
- 3 duplicatas merged
- 12 logs archived (logs/archived/2025/)
- 1 skill promoted (parser-recovery → semantic)
- 4 skills archived
- 5 working-set entries removed
- 2 tags normalized

## Vault depois
- Antes: 1234 arquivos, 87MB
- Depois: 1218 arquivos, 84MB
- Snapshot: D:\claude-memory.bak.2026-05-15-1430 (manter por 7d)

## Próximas ações sugeridas
- Re-rodar `/consolidate-memory` em 7 dias
- Review manual de `logs/flagged/` (3 arquivos com conteúdo suspeito)
```

## Inputs

- `[--vault <path>]` — default `D:\claude-memory`
- `[--dry-run]` — só auditoria, não pede confirmação
- `[--auto-yes]` — aplica tudo sem confirmar (CUIDADO; só com snapshot recente)
- `[--age-threshold <days>]` — idade para considerar stale (default 90)
- `[--score-threshold <float>]` — score mínimo para keep (default 0.3)
- `[--no-persona]` — pula o passo 6.5 (geração de Persona L3)

## Output esperado

- Snapshot do vault (commit ou .bak)
- Relatório de mudanças propostas (dry-run)
- Mudanças aplicadas (após confirmação)
- Relatório final + sugestões de próximas ações

## Anti-padrões

- Pular snapshot — vault não tem undo
- Apply sem dry-run — chance alta de surpresa
- Auto-yes sem entender o que vai mudar — vault corrompe silenciosamente
- Archive sem manter buscável — perde contexto de sessões antigas

## Policies relevantes

- `policies/memory-consolidation.md` — regras canônicas
- `policies/memory-curator.md` — gatilho de auto-lapidação (quando rodar este command sozinho)
- `policies/memory-tiers.md` — hierarquia 4-tier (Working/Episodic/Semantic/Procedural)
- `policies/memory-pyramid.md` — pirâmide L0→L3 (passo 6.5 regenera L3)
- `policies/persistence.md` — o que persistir (esta policy define o que limpar)

## Handoff

- Após consolidate: `/save` continua funcionando (vault menor + mais navegável)
- Próxima rodada: agendar via `/schedule weekly /consolidate-memory --dry-run`

**Uso:** `/consolidate-memory [--vault path] [--dry-run] [--auto-yes]`
