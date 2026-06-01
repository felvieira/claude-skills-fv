---
description: Pipeline SDD unificado — specify → plan → tasks → implement com checkpoints explícitos entre fases. Inspirado no GitHub Spec Kit (88k stars). Versão nativa Claude Code, zero deps.
---

# /spec-kit — Spec-Driven Development Pipeline

**Em uma frase:** transforma um prompt em código verificado, passando obrigatoriamente por spec → plan → tasks → implement, com checkpoint humano entre cada fase.

**Inspiração:** [GitHub Spec Kit](https://github.com/speckit/speckit) (88k stars, 28 plataformas) + artigo "Spec-Driven Development with AI Coding Agents: The Definitive Guide" (pramodchandrayan, May 2026).

**Por que isso importa:** sem SDD, a IA preenche lacunas da spec com suposições plausíveis-mas-erradas. Quando o código é regerado, as lacunas ressurgem em formas diferentes. Consertar o código sem consertar a spec não resolve o problema raiz.

## Quando usar

- Feature nova com mais de 2-3 moving parts
- Qualquer mudança que envolva múltiplos arquivos ou módulos
- Quando `/auto` ou `/build` já produziram output incorreto — significa que a spec estava incompleta
- Antes de delegar pra `/swarm` ou `/loop` (spec de qualidade melhora output de qualquer executor)
- Brownfield: spec **apenas a área de mudança**, não o sistema todo (use `/detective-spec` pra entender o legado primeiro)

## Quando NÃO usar

- Typos, format, renomear variável → `/auto`
- R&D exploratório sem requisitos definíveis → explorar antes, speckar depois
- Prototipo descartável (days-to-feedback) → custo de overhead > benefício

## Fases e checkpoints

```
/spec-kit "feature description"
         │
         ▼
┌─────────────────────────────┐
│ FASE 1: SPECIFY             │  skill 01 (PO)
│ User stories                │  + grill-me se ambíguo
│ Acceptance criteria         │  + constituição se existir
│ Explicit out-of-scope       │
│ Constraints & assumptions   │
│ Decisions already made      │
└─────────────┬───────────────┘
              │ ← CHECKPOINT 1: "Aprovado? [s/n/editar]"
              ▼
┌─────────────────────────────┐
│ FASE 2: PLAN                │  skill 09 (orchestrator)
│ Task breakdown              │  tasks independentes
│ Dependencies                │  parallelizable = marcado
│ Model routing por task      │  risco por task
│ Rollback strategy           │
└─────────────┬───────────────┘
              │ ← CHECKPOINT 2: "Aprovado? [s/n/editar]"
              ▼
┌─────────────────────────────┐
│ FASE 3: TASKS               │  slash /to-issues (opcional)
│ Verification criteria       │  1 task = 1 verifiable outcome
│ edge cases explícitos       │  failing test = spec gap
│ Acceptance test por task    │
└─────────────┬───────────────┘
              │ ← CHECKPOINT 3: "Executar? [s/n/editar]"
              ▼
┌─────────────────────────────┐
│ FASE 4: IMPLEMENT           │  skill 04 (frontend) ou
│ Task por task               │  skill 03 (backend) etc.
│ Adversarial verify inline   │  Verifier com goal oposto
│ Spec atualizada em tempo    │  ao Implementor
│ real (drift tracking)       │
└─────────────────────────────┘
```

## Uso

```
/spec-kit "autenticação social com Google + GitHub"
/spec-kit --from-issue #42
/spec-kit --from-prd docs/prd/auth.md
/spec-kit --skip-checkpoints   # modo CI / unattended
/spec-kit --phase specify      # rodar só fase 1 (gera spec, para)
/spec-kit --phase plan         # rodar só fase 2 (lê spec existente)
/spec-kit --phase implement    # rodar só fase 4 (lê spec+plan existentes)
```

## Protocolo de execução

### Fase 1 — Specify

Invocar skill `01-po-feature-spec`. Output **obrigatório** inclui:

```markdown
## Spec: <feature>

### Outcomes when done (não "o que fazer", mas "o que é verdade quando terminar")
- [ ] Usuário pode fazer X sem erro
- [ ] Sistema retorna Y quando Z acontece
- [ ] Performance: P95 < 200ms em carga de N req/s

### In-scope
- ...

### Explicitamente OUT-OF-SCOPE
- OAuth PKCE: fora de escopo nesta iteração
- 2FA: fora de escopo

### Constraints & assumptions
- Stack: Next.js 15 + Better Auth + Drizzle (não reabrir)
- Rate limit da API do Google: 100k req/dia

### Decisions already made (não reabrir)
- Usar Better Auth, não implementar JWT custom
- Postgres como session store

### Verification criteria (spec fail = code fail)
- [ ] Test: signup com email válido → 200 + email de verificação enviado
- [ ] Test: signup com email duplicado → 409 com mensagem útil
- [ ] Test: sessão persiste após page refresh
- [ ] Edge: token expirado → redirect pra login com mensagem
```

Se algum critério não for verificável (não tem teste associado), **é uma lacuna na spec** — preencher antes de avançar.

### Fase 2 — Plan

Invocar skill `09-orchestrator`. Output:

```markdown
## Plan: <feature>

| Task | Tipo | Skill | Risco | Parallelizable |
|------|------|-------|-------|----------------|
| Setup DB schema (sessions table) | backend | 03 | LOW | não (blocker) |
| Better Auth config + providers | backend | 03 | MEDIUM | não (depende de schema) |
| Login/signup UI + forms | frontend | 04 | LOW | sim (após schema) |
| Email verification flow | backend | 03 | HIGH | não (depende de auth config) |
| Session persistence + tests | qa | 05 | MEDIUM | sim |

Rollback: cada task é um commit atômico. Revert = `git revert <sha>`.
Model routing: tasks HIGH → sonnet; tasks LOW → haiku.
```

### Fase 3 — Tasks

1 task = 1 outcome verificável. Para cada task da fase 2:

```markdown
### Task: Setup DB schema

**Done when:**
- Migration roda sem erro em dev e prod
- `users` + `sessions` tables criadas com índices corretos
- `drizzle-kit push` sem warnings

**Verification test:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'expires_at';
-- deve retornar 1 row
```

**Edge cases explícitos:**
- Migration em DB com dados pré-existentes → não quebra
- Rollback da migration → tabelas removidas limpo
```

### Fase 4 — Implement (com Adversarial Verifier)

Para cada task:
1. **Implementor** (skill da task) implementa contra a spec
2. **Adversarial Verifier** (goal oposto) tenta refutar:
   - "O que esta implementação deixa de cobrir na spec?"
   - "Qual edge case explícito NÃO está sendo testado?"
   - "Onde a spec diz X mas o código faz Y?"
3. Se Verifier encontra gap → Implementor corrige → Verifier re-verifica
4. Spec é **atualizada em tempo real** se algo descoberto durante implementação mudar o entendimento

**O Verifier não otimiza pra aprovar. Seu job é achar onde a spec e o código divergem.**

## Output esperado

```
spec-kit run: auth-social
─────────────────────────────
✓ Fase 1 SPECIFY   (45s)   Spec salva em .spec/auth-social.md
  ✓ 4 outcomes definidos
  ✓ 3 out-of-scope explícitos
  ✓ 6 verification criteria (todos testáveis)

[CHECKPOINT 1] Spec aprovada? (s/n/editar): s

✓ Fase 2 PLAN      (20s)   Plan salvo em .spec/auth-social-plan.md
  ✓ 5 tasks, 2 parallelizable
  ✓ Model routing aplicado

[CHECKPOINT 2] Plan aprovado? (s/n/editar): s

✓ Fase 3 TASKS     (15s)   Tasks salvas em .spec/auth-social-tasks.md
  ✓ 5 tasks com verification criteria
  ✓ 12 edge cases explícitos

[CHECKPOINT 3] Executar? (s/n/editar): s

  Implementando Task 1/5: Setup DB schema
    Implementor → done
    Adversarial Verifier → 1 gap encontrado (missing index)
    Implementor fix → done
    Verifier re-verify → PASS

  Implementando Task 2/5: Better Auth config
    [...]

✓ Fase 4 IMPLEMENT (8m)    5/5 tasks PASS (2 gaps corrigidos pelo verifier)

Artifacts:
  .spec/auth-social.md          ← spec final (atualizada)
  .spec/auth-social-plan.md     ← plan
  .spec/auth-social-tasks.md    ← tasks com verification criteria
  .spec/auth-social-report.md   ← verifier findings + resoluções
```

## Integração com o kit

- **Antes do `/swarm`:** `/spec-kit --phase specify,plan` → entrega spec+plan → `/swarm --prd .spec/<slug>.md`
- **Após `/detective-spec`** (legado): spec reverse-engineered → `/spec-kit --phase plan,implement` (pula specify, já tem spec)
- **Como gate do `/analyze`:** spec produzida pelo spec-kit passa automaticamente pelo `/analyze` antes da fase 4
- **Issue tracker:** `--from-issue` lê issue do GitHub; tasks da fase 3 podem ser publicadas de volta com `/to-issues`

## Políticas

- `policies/prd-validation.md` — 13 checks aplicados na Fase 1
- `policies/investigate-first.md` — spec não pergunta o que pode descobrir no repo
- `policies/model-routing.md` — model por fase (spec→sonnet, implement→sonnet, verify→haiku fast)
- `policies/verification-before-completion.md` — cada fase produz output verificável antes de avançar
