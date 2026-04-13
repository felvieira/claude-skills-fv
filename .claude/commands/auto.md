---
description: Agente autônomo — executa task completa sem intervenção humana até estar pronto, funcional e testado
---

# /auto — Agente Autônomo

**Objetivo:** Executar uma task completa de ponta a ponta sem perguntar ao usuário, usando todo o kit como base. Só para quando estiver **pronto, funcional e testado**.

**Protocolo:** Ver `docs/skill-guides/autonomous-loop.md` para o loop completo.

## Regras Invioláveis

1. **Nunca perguntar ao usuário** — decidir com base no kit, codebase e policies
2. **Nunca entregar código sem testes passando** — se não testa, não está pronto
3. **Nunca pular security review** — todo código passa por OWASP checklist
4. **Nunca expandir scope** — implementar exatamente o que foi pedido, nada mais
5. **Parar se estiver stuck** — após 3 tentativas no mesmo erro, declarar bloqueio com diagnóstico

## Loop Autônomo

```
PLAN → BUILD → TEST → FIX → VALIDATE → REVIEW → COMMIT
  ↑                              |
  └──────── se falhar ───────────┘
```

### Fase 1 — Plan (máx 2 iterações)
1. Pesquisar o codebase (`policies/search-first.md`) para entender patterns existentes
2. Classificar a task (feature/bugfix/refactor) e montar pipeline mínimo
3. Emitir plano inline com arquivos-alvo, testes esperados e critérios de done
4. Se a task for ambígua, usar `policies/source-driven.md` para resolver — **não perguntar**

### Fase 2 — Build (máx 5 iterações)
1. Implementar seguindo patterns do projeto (stack-flexibility)
2. Cada iteração gera código funcional, não placeholders
3. Se encontrar código duplicado, refatorar inline (Senior Dev Override)
4. Após cada mudança significativa, rodar os testes existentes como sanity check

### Fase 3 — Test (máx 3 iterações)
1. Escrever testes para: happy path, erro principal, edge case
2. Rodar testes e confirmar que passam
3. Se testes falharem, corrigir código (não os testes) — voltar a Fase 2 se necessário
4. Reportar cobertura de cenários

### Fase 4 — Validate (máx 2 iterações)
1. Lint e type-check se disponíveis no projeto
2. Build de produção se o projeto tiver build step
3. Se falhar, corrigir e re-validar

### Fase 5 — Review (1 iteração)
1. Self-review usando `personas/code-reviewer.md` — 5 eixos
2. Security check rápido usando `personas/security-auditor.md` — foco em inputs, auth, secrets
3. Se encontrar finding 🔴 Critical — corrigir antes de continuar
4. Gerar relatório resumido

### Fase 6 — Commit
1. Commit com mensagem semântica descritiva
2. Não fazer push (deixar para o usuário decidir)

## Circuit Breaker

O agente DEVE parar se:
- Mesmo erro ocorrer 3 vezes consecutivas sem progresso
- Mais de 10 iterações totais sem completar
- Testes que passavam começam a falhar (regressão introduzida)
- Erro requer decisão de negócio que não está na spec ou codebase

Ao parar, emitir:
```
## 🛑 Bloqueio Autônomo
**Erro:** [descrição]
**Tentativas:** [N]
**Diagnóstico:** [análise da causa raiz]
**Sugestão:** [o que o usuário pode fazer para desbloquear]
**Progresso até aqui:** [o que foi feito com sucesso]
```

## Policies Aplicáveis
- `policies/search-first.md` — pesquisar antes de implementar
- `policies/anti-rationalization.md` — não racionalizar atalhos
- `policies/context-engineering.md` — hierarquia de contexto
- `policies/confusion-management.md` — resolver confusão sem perguntar
- `policies/source-driven.md` — decisões baseadas em fontes
- `policies/quality-gates.md` — critérios de qualidade

## Uso

```
/auto [descrição completa da task]
```

Exemplos:
- `/auto criar endpoint REST para CRUD de usuários com validação Zod e testes`
- `/auto corrigir bug de autenticação onde refresh token não rotaciona`
- `/auto refatorar módulo de pagamentos para eliminar duplicação`
