# Handoff Policy

## Objetivo
Permitir transicao entre skills sem inflar contexto.

## Estrutura Obrigatoria
- Concluido
- Artefatos
- Decisoes
- Pendencias ou riscos
- Proximo passo

## Limites
- maximo de 5 bullets
- maximo de 1 linha por bullet sempre que possivel
- sem historico longo
- sem repetir regras globais

## Qualidade de Handoff
Um bom handoff deve permitir que a proxima skill:
- entenda o estado em segundos
- saiba o que recebeu
- saiba o que precisa fazer
- saiba o que nao deve quebrar

## Pipeline Canonico (Spec-Driven Development)

Cadeia recomendada quando ha constituicao + spec formal:

```
/constitution                              # bootstrap (uma vez por projeto)
   ↓
/grill-me                                  # discovery (10-50 perguntas, opcional)
   ↓
/spec ou /to-prd                           # spec inicial
   ↓
/checklist                                 # contextual ("unit tests for English")
   ↓ (resolver checks nao marcados editando spec)
/plan                                      # pipeline tecnico
   ↓
/to-issues                                 # quebrar em vertical slices
   ↓
/analyze                                   # cross-artifact consistency (CRITICAL/HIGH bloqueia)
   ↓ (resolver findings)
/build ou /auto                            # implementacao
   ↓
/test, /review, /security-review           # gates
   ↓
/ship                                      # release (consultar constituicao final)
```

**Quando pular passos:**
- bug fix isolado: pula `/grill-me`, `/checklist`, `/analyze`
- task mecanica (rename, format): vai direto pra `/build` ou edit manual
- spec aprovada em sessao anterior: pula `/grill-me`, comeca em `/plan` ou `/analyze`

**Quando NAO pular:**
- feature critica (auth, payments, deploy): pipeline completo obrigatorio
- mudanca cross-team: `/checklist` + `/analyze` obrigatorios

## Constituicao como ancora

Em todo handoff, a skill seguinte pode consultar `memory/constitution.md` para validar conformidade. Se constituicao foi atualizada entre handoffs, **re-rodar `/analyze`** para detectar artefatos inconsistentes.

## Pipeline Canonico (Spec-Driven Development)

Cadeia recomendada quando ha constituicao + spec formal:

```
/constitution                              # bootstrap (uma vez por projeto)
   ↓
/grill-me                                  # discovery (10-50 perguntas, opcional)
   ↓
/spec ou /to-prd                           # spec inicial
   ↓
/checklist                                 # contextual ("unit tests for English")
   ↓ (resolver checks nao marcados editando spec)
/plan                                      # pipeline tecnico
   ↓
/to-issues                                 # quebrar em vertical slices
   ↓
/analyze                                   # cross-artifact consistency (CRITICAL/HIGH bloqueia)
   ↓ (resolver findings)
/build ou /auto                            # implementacao
   ↓
/test, /review, /security-review           # gates
   ↓
/ship                                      # release (consultar constituicao final)
```

**Quando pular passos:**
- bug fix isolado: pula `/grill-me`, `/checklist`, `/analyze`
- task mecanica (rename, format): vai direto pra `/build` ou ediot manual
- spec aprovada em sessao anterior: pula `/grill-me`, comeca em `/plan` ou `/analyze`

**Quando NAO pular:**
- feature critica (auth, payments, deploy): pipeline completo obrigatorio
- mudanca cross-team: `/checklist` + `/analyze` obrigatorios

## Constituicao como ancora

Em todo handoff, a skill seguinte pode consultar `memory/constitution.md` para validar conformidade. Se constituicao foi atualizada entre handoffs, **re-rodar `/analyze`** para detectar artefatos inconsistentes.
