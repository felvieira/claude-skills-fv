# Program: spec-driven-development

## Intent
Pipeline canonico com constituicao governante + cross-artifact consistency. Adapta o classico `pipeline-discovery` para projetos com `memory/constitution.md` e gates de coerencia entre artefatos.

Inspirado em [github/spec-kit](https://github.com/github/spec-kit).

## Sequence
```
/constitution{mode='bootstrap-or-update', if_missing='create'}
→ /grill-me{turns='until-convergence', output='requirements'}
→ /spec{input=requirements, anchor='memory/constitution.md'}
→ /checklist{spec=spec_path, depth='standard', cross_constitution=true}
→ /plan{input=spec+checklist_resolved, anchor='memory/constitution.md'}
→ /to-issues{input=prd, slices='vertical', tracker='github'}
→ /analyze{strict=true, all_artifacts=true}
→ /build{per_issue=true, tdd=true}
→ /review{rubric='memory/constitution.md'}
→ /security-review
→ /ship{gate='constitution', changelog=true}
```

## Protocol / Command refs
- `/constitution` → `.claude/commands/constitution.md`
- `/grill-me` → `.claude/commands/grill-me.md`
- `/spec` → `.claude/commands/spec.md` (ou `/to-prd` para tracker externo)
- `/checklist` → `.claude/commands/checklist.md`
- `/plan` → `.claude/commands/plan.md`
- `/to-issues` → `.claude/commands/to-issues.md`
- `/analyze` → `.claude/commands/analyze.md`
- `/build` → `.claude/commands/build.md`
- `/review` → `.claude/commands/review.md`
- `/security-review` → `.claude/agents/security-auditor.md`
- `/ship` → `.claude/commands/ship.md`

## Inputs
```yaml
input:
  feature_description: string             # initial description (can be vague)
  constitution_required: boolean          # default: true
  tracker: enum(github|linear|jira)       # default: github
  tdd: boolean                            # default: true (or from constitution)
  analyze_mode: enum(default|strict)      # strict treats MEDIUM as blocking
```

## Gates de bloqueio (constituicao vence)

- `/constitution`: nenhum (se faltar, sugere `/constitution` antes de prosseguir)
- `/checklist`: nenhum (avisa se checks nao marcados; nao bloqueia)
- `/analyze` (default): bloqueia em **5+ CRITICAL** ou **3+ HIGH**
- `/analyze --strict`: bloqueia em qualquer **CRITICAL** ou em **2+ HIGH** ou em **5+ MEDIUM**
- `/review`: rejeicao automatica se conflito implementacao ↔ constituicao
- `/ship`: bloqueia se gate de Security/Performance/Testing da constituicao nao satisfeito

## Quando usar

**Sim:**
- projeto com constituicao formal
- feature critica (auth, payments, deploy)
- mudanca cross-team que precisa de rastreabilidade
- onboarding de kit em projeto maduro

**Nao:**
- bug fix isolado → use `/pipeline` classico
- task mecanica (rename, format) → `/build` direto
- ainda sem constituicao formal → comecar com `/pipeline-discovery` e bootstrap depois

## Diferenca de `pipeline-discovery`

| Aspecto | pipeline-discovery | spec-driven-development |
|---|---|---|
| Ancora | nenhuma | `memory/constitution.md` (autoridade hierarquica) |
| Quality gate intermediario | nenhum | `/checklist` apos spec, `/analyze` antes de build |
| Conflito implementacao vs principio | passa | bloqueia automaticamente |
| Ship gate | review + security | review + security + constituicao |

## Abort conditions
- `/constitution` falha → halt (precisa de bootstrap manual)
- `/analyze` retorna `blocking` → halt e listar findings CRITICAL
- `/review` rejeita por conflito constitucional → halt e abrir item para `/constitution` em commit dedicado
- `/ship` gate falha → halt; nao publicar; sugerir ADR de exception se justificavel

## Notes
- O agente deve consultar `memory/constitution.md` no inicio de cada passo, nao so no ship gate
- Se constituicao muda durante execucao, re-rodar `/analyze` imediatamente
- Para projetos sem constituicao: usar `pipeline-discovery` ou rodar `/constitution` antes
