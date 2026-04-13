# Autonomous Loop — Guia Operacional do /auto

Protocolo completo para execução autônoma de tasks sem intervenção humana.

## Princípios

1. **Autonomia total** — o agente decide tudo com base no kit, codebase e policies
2. **Qualidade obrigatória** — código sem testes passando não é código pronto
3. **Escopo fechado** — implementar exatamente o que foi pedido
4. **Fail fast** — parar cedo se estiver preso, com diagnóstico claro
5. **Progresso verificável** — cada fase produz artefato concreto

## Arquitetura do Loop

```
┌─────────────────────────────────────────────┐
│                  /auto                       │
│                                              │
│  ┌──────┐   ┌───────┐   ┌──────┐           │
│  │ PLAN │──▶│ BUILD │──▶│ TEST │           │
│  └──────┘   └───────┘   └──┬───┘           │
│                              │               │
│                    ┌─────────▼────────┐      │
│                    │ Testes passam?   │      │
│                    └─────────┬────────┘      │
│                     não │        │ sim       │
│                         ▼        ▼           │
│                    ┌────────┐ ┌──────────┐   │
│                    │  FIX   │ │ VALIDATE │   │
│                    └────┬───┘ └────┬─────┘   │
│                         │          │         │
│                         ▼          ▼         │
│                    volta a    ┌────────┐     │
│                    BUILD      │ REVIEW │     │
│                               └────┬───┘     │
│                                    │         │
│                               ┌────▼───┐    │
│                               │ COMMIT │    │
│                               └────────┘    │
└─────────────────────────────────────────────┘
```

## Fase 1 — Plan

**Objetivo:** Entender o que construir e como, sem perguntar.

**Ações:**
1. `policies/search-first.md` — pesquisar codebase para patterns existentes
2. Ler `docs/repo-audit/current.md` se existir (stack, convenções, entry points)
3. Classificar task: feature | bugfix | refactor | hotfix
4. Identificar arquivos-alvo (criar vs modificar)
5. Emitir plano inline:

```markdown
## Plano Autônomo
**Task:** [descrição]
**Tipo:** [feature/bugfix/refactor]
**Arquivos:**
- Criar: [lista]
- Modificar: [lista]
**Testes:** [quais cenários cobrir]
**Critérios de done:** [lista verificável]
```

**Resolução de ambiguidade:**
- Ambiguidade técnica → resolver via codebase patterns (`policies/source-driven.md`)
- Ambiguidade de negócio → escolher o caminho mais conservador e documentar a suposição
- Conflito de patterns → seguir o pattern mais recente no repo

**Circuit breaker:** Se após 2 iterações o plano não está claro, parar e reportar.

## Fase 2 — Build

**Objetivo:** Implementar código funcional seguindo patterns do projeto.

**Ações:**
1. Implementar arquivo por arquivo, na ordem do plano
2. Após cada arquivo, verificar sintaxe (type-check se disponível)
3. Se encontrar código duplicado no caminho, refatorar inline
4. Rodar testes existentes como sanity check periódico

**Padrões obrigatórios:**
- Seguir naming conventions do projeto
- Respeitar `policies/stack-flexibility.md` — usar o que o projeto já usa
- Aplicar `GLOBAL.md` Senior Dev Override — corrigir smells óbvios
- Não deixar TODOs no código

**Context narrowing:** Após primeira iteração, focar apenas nos arquivos do plano + erros.

**Circuit breaker:** Se o mesmo arquivo for editado 5+ vezes sem progresso, parar.

## Fase 3 — Test

**Objetivo:** Provar que o código funciona com testes automatizados.

**Ações:**
1. Escrever testes cobrindo:
   - Happy path (fluxo principal)
   - Erro principal (falha mais provável)
   - Edge case (limites, valores extremos)
2. Rodar testes
3. Se testes falharem: analisar erro, corrigir **código** (não testes), re-rodar
4. Se correção exigir mudança estrutural, voltar a Fase 2

**Framework detection:**
- `package.json` tem vitest/jest → usar esse framework
- `pytest.ini` ou `pyproject.toml` → usar pytest
- Sem framework → criar teste simples executável via node/python

**Output esperado:**
```
✅ N testes passando
📊 Cenários: happy path, erro, edge case
⚠️ Gaps: [cenários não cobertos e por quê]
```

**Circuit breaker:** Se testes falharem 3 vezes no mesmo cenário, parar e reportar.

## Fase 4 — Validate

**Objetivo:** Garantir que o código compila, passa lint e build.

**Ações:**
1. Detectar ferramentas disponíveis:
   - `package.json` scripts: `lint`, `typecheck`, `build`
   - `Makefile`, `Cargo.toml`, `pyproject.toml` — build commands
2. Rodar lint (rápido, primeiro)
3. Rodar type-check se disponível
4. Rodar build se disponível
5. Se falhar: corrigir e re-validar (máx 2 tentativas)

**Se nenhuma ferramenta disponível:** Pular fase com nota no relatório.

**Circuit breaker:** Se build falhar 2 vezes com mesmo erro, parar.

## Fase 5 — Review

**Objetivo:** Self-review antes de entregar.

**Ações:**
1. Revisar diff completo usando `personas/code-reviewer.md`:
   - Correctness — lógica correta?
   - Design — responsabilidades claras?
   - Readability — nomes claros, funções focadas?
   - Performance — N+1, re-renders, bundle size?
   - Security — inputs validados, auth correta?

2. Security check usando `personas/security-auditor.md`:
   - Inputs validados?
   - Secrets protegidos?
   - Auth flow correto?
   - Headers configurados?

3. Se finding 🔴 Critical encontrado:
   - Corrigir imediatamente
   - Re-rodar testes após correção
   - Re-review apenas o finding corrigido

4. Emitir relatório resumido:
```markdown
## Review Autônomo
**Status:** ✅ Aprovado / ❌ Findings corrigidos
**Eixos:** Correctness ✅ | Design ✅ | Readability ✅ | Performance ✅ | Security ✅
**Findings corrigidos:** [N] (se houver)
**Risco residual:** [nenhum / baixo — descrição]
```

## Fase 6 — Commit

**Ações:**
1. Stage apenas arquivos relevantes (não `git add .`)
2. Commit com mensagem semântica:
   - `feat:` para features
   - `fix:` para bugfixes
   - `refactor:` para refatorações
3. **Não fazer push** — decisão do usuário
4. Emitir resumo final

## Relatório Final

Ao completar, emitir:

```markdown
## ✅ Task Completa — /auto

**Task:** [descrição]
**Iterações:** [N total]
**Arquivos criados:** [lista]
**Arquivos modificados:** [lista]
**Testes:** [N passando] / [N cenários cobertos]
**Commit:** [hash] — [mensagem]

### O que foi feito
[3-5 bullets descrevendo as mudanças]

### Decisões tomadas
[Suposições feitas, patterns seguidos, alternativas descartadas]

### Risco residual
[Nenhum / lista de riscos aceitos com justificativa]
```

## Circuit Breaker Global

O loop DEVE parar se:

| Condição | Ação |
|---|---|
| Mesmo erro 3x consecutivas | Parar com diagnóstico |
| 10+ iterações totais | Parar com progresso parcial |
| Regressão em testes que passavam | Reverter última mudança, parar |
| Decisão de negócio requerida | Parar com opções listadas |
| Context decay detectado (auto-compact) | Salvar progresso, re-read tudo, continuar |

## Integração com o Kit

| Fase | Skills/Policies usadas |
|---|---|
| Plan | search-first, source-driven, orchestrator (09), repo-auditor (18) |
| Build | backend (03), frontend (04), stack-flexibility |
| Test | QA (05), test-engineer persona |
| Validate | Ferramentas do projeto |
| Review | reviewer (11), security (06), code-reviewer persona, security-auditor persona |
| Commit | Convenções do projeto |

## Diferenças do /pipeline

| Aspecto | `/pipeline` | `/auto` |
|---|---|---|
| Interação | Pode perguntar entre fases | Zero perguntas |
| Scope | Feature completa com todas as skills | Só as skills necessárias |
| Testes | Delegados ao QA Engineer | Obrigatórios, inline |
| Review | Subagent separado | Self-review inline |
| Commit | Manual | Automático |
| Circuit breaker | Não tem | Obrigatório |
