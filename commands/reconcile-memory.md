---
description: Detecta e resolve contradições no vault de memória — decisões revertidas, fatos stale, decisões superadas que nunca foram atualizadas. O vault mantém a própria verdade.
---

# /reconcile-memory — Resolução de Contradições no Vault

**Objetivo:** o vault nunca deve conter duas notas que se contradizem sem saber que se contradizem. Cada contradição é **resolvida** ou **documentada como questão aberta**. Complementa `/consolidate-memory` (que faz dedup/archive) com uma capacidade nova: detecção semântica de conflitos.

> **Inspiração:** `/obsidian-reconcile` de [eugeniughelbur/obsidian-second-brain](https://github.com/eugeniughelbur/obsidian-second-brain) (MIT). Adaptado ao nosso vault (`D:\claude-memory\`) e à divisão mecânico/semântico do `memory-curator`.

**Quando usar:**
- após várias sessões no mesmo projeto (decisões podem ter evoluído sem o `decisions.md` ser atualizado)
- antes de um `/resume` importante (garantir que o contexto injetado não está contraditório)
- quando o `memory-curator` sinalizar candidatos em `.curator-pending.md`
- antes de release major (limpar decisões superadas)

**Quando NÃO usar:**
- vault recém-criado (< 10 decisões/logs — nada pra contradizer)
- logo após um `/reconcile-memory` sem novas sessões

**Skill ativada:** Context Manager (skill 08) em modo "vault truth-keeper".

## Pré-requisito inviolável

Antes de QUALQUER leitura, aplicar `policies/memory-write-rules.md`:
- **False absence**: nunca conclua "não há contradição" sem varredura exaustiva. Enumere, não amostre.
- **No fabrication**: nunca invente uma contradição que não existe pra parecer produtivo. Zero contradições é um resultado válido.

## Processo

### Passo 1 — Snapshot (igual ao consolidate)

```bash
VAULT="${1:-D:/claude-memory}"
TS=$(date +%Y-%m-%d-%H%M)
if [ -d "$VAULT/.git" ]; then
  cd "$VAULT" && git add -A && git commit -m "snapshot pre-reconcile $TS"
else
  cp -r "$VAULT" "$VAULT.bak.$TS"
fi
```

### Passo 2 — Varredura de contradições (4 eixos)

Argumento opcional `$ARGUMENTS` = tópico/projeto pra focar. Sem ele, varre o vault todo. Para escala, despachar subagents em paralelo (um por eixo):

- **Decisões revertidas** (`architecture/<projeto>/decisions.md`): pares de decisões sobre o mesmo tópico onde a mais nova reverte a antiga, mas a antiga nunca foi marcada `superseded`. Ex: "decidimos usar REST" depois "migramos pra GraphQL" sem atualizar a primeira.
- **Fatos stale entre logs**: claims factuais em logs diferentes que se contradizem (versão de lib, status de feature, nome de arquivo). O mais recente geralmente vence.
- **Decisões superadas sem ref**: decisões `status: active` que um log posterior descreve como abandonada/mudada.
- **Recency drift**: claim externo sem `(as of ...)` que um log mais novo atualiza com data — flag pra adicionar o marker.

### Passo 3 — Classificar cada conflito

Para cada contradição achada, decidir:

| Pergunta | Como avaliar |
|---|---|
| **Qual é mais nova?** | comparar `date`/`updated` do frontmatter ou data no nome do log |
| **Qual é mais autoritativa?** | decisão explícita > log de sessão > nota solta. Evidência verificada > inferência |
| **É contradição ou evolução?** | mudar de ideia com motivo NÃO é contradição — é crescimento. Documentar como evolução, não como conflito |

### Passo 4 — Resolver

- **Vencedor claro** → reescrever a nota desatualizada com a info atual + seção `## History`:
  ```markdown
  ## History
  - Antes: REST API (decidido 2026-05, logs/2026-05-10-projeto.md)
  - Atualizado para: GraphQL (2026-06, logs/2026-06-01-projeto.md) — motivo: N+1 queries no REST
  ```
- **Genuinamente ambíguo** → criar `architecture/<projeto>/conflicts/Conflito — <Tópico>.md` com os dois lados, evidência de cada, `status: open`, e flag pro usuário decidir.
- **Evolução** → atualizar a decisão pro estado atual + marcar a antiga `status: superseded` linkando a nova (consistente com `policies/memory-consolidation.md` § 2).

### Passo 5 — Apresentar relatório dry-run + confirmação

```markdown
# /reconcile-memory dry run — <data>
## Vault: D:\claude-memory · foco: <tópico ou "vault todo">
## Snapshot: <commit/bak>

### Auto-resolvíveis (vencedor claro) — N
- [ ] `decisions.md` § Auth: "JWT em cookie" → "JWT em header" (log 2026-06 mais novo, motivo: XSS)

### Ambíguos (flag pro usuário) — M
- [ ] Conflito "estratégia de cache": Redis (log A) vs in-memory (log B) — mesma data, sem motivo claro

### Evoluções (marcar superseded) — K
- [ ] decisão "monorepo" → superseded por "polyrepo" (decisão 2026-06)

### Recency markers faltando — J
- [ ] claim "Mem0 tem $24M" sem (as of) — adicionar data do log de origem
```

Confirmação via `AskUserQuestion`: **Apply all** / **Apply selected** (`multiSelect: true`) / **Cancel**.

### Passo 6 — Apply + Verify

- Reescrever notas aprovadas (nunca deletar — `## History` preserva o passado).
- Marcar superseded no frontmatter.
- Criar `conflicts/*.md` pros ambíguos.
- **Verify**: as notas tocadas ainda parseiam (frontmatter válido); nenhuma decisão ficou órfã; `search.py` ainda acha as notas.

### Passo 7 — Report + curator state

```bash
node scripts/curator-state.mjs --write --vault "$VAULT"
```

```markdown
# /reconcile-memory done — <data>
## Resolvido
- 3 contradições auto-resolvidas (com ## History)
- 2 evoluções marcadas superseded
- 1 conflito ambíguo → conflicts/ (aguarda você)
- 4 recency markers adicionados
## Vault: nunca mais 2 notas discordam sem saber que discordam.
```

## Inputs

- `[tópico/projeto]` — foca a varredura (opcional; sem ele = vault todo)
- `[--vault <path>]` — default `D:\claude-memory`
- `[--dry-run]` — só audita, não pede confirmação
- `[--auto-yes]` — aplica auto-resolvíveis sem confirmar (só com snapshot recente; ambíguos sempre viram flag)

## Anti-padrões

- ❌ Concluir "sem contradições" sem varredura exaustiva (false absence — `policies/memory-write-rules.md`).
- ❌ Tratar "mudou de ideia com motivo" como contradição — é evolução, documente como tal.
- ❌ Deletar a nota perdedora — sempre `## History` ou `superseded`, nunca perda do passado.
- ❌ Auto-resolver ambíguos — quando duas fontes empatam em data+autoridade, é decisão humana.
- ❌ Reconciliar sem snapshot — vault sem undo.

## Policies relevantes

- `policies/memory-write-rules.md` — anti-fabricação + recency (pré-requisito).
- `policies/memory-consolidation.md` — § decisões superseded (este command operacionaliza).
- `policies/memory-curator.md` — pode despachar este command como capacidade semântica delegada.
- `policies/memory-tiers.md` — hierarquia que as decisões habitam.

**Uso:** `/reconcile-memory [tópico] [--vault path] [--dry-run]`
