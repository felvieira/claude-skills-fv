# PRD Validation Checklist

**Objetivo:** Validar qualidade de um PRD antes de publicar no tracker ou quebrar em issues. Checklist de 13 itens adaptado de [anombyte93/prd-taskmaster](https://github.com/anombyte93/prd-taskmaster), desacoplado do Taskmaster.

**Quando aplicar:**
- antes de `/to-issues` (PRD vai virar várias issues)
- antes de `gh issue create` em `/to-prd`
- ao revisar PRD existente (`/to-prd` modo update)

**Como usar:** rodar o checklist mentalmente OU pedir ao agente para auditar o PRD seção por seção. Pontuar 0–60 (cada check vale 0/2/4 pontos: ausente / parcial / completo).

## Os 13 checks

### Estrutura (4 checks)

1. **Problem Statement presente** — descreve dor do usuário + impacto de negócio quantificado. Não é apenas "users want X".
2. **Solution Statement presente** — descreve a solução do ponto de vista do usuário, não da implementação.
3. **User Stories numeradas** — formato `Como <ator>, eu quero <feature>, para <benefício>`. Mínimo 3, cobrem todos os aspectos da feature.
4. **Out of Scope explícito** — lista o que NÃO está sendo construído. Sem isso o escopo expande sozinho.

### Testabilidade (3 checks)

5. **Métricas SMART** — Specific, Measurable, Achievable, Relevant, Time-bound. **Anti-padrão:** "improve UX". **Bom:** "increase NPS from 45 to 60 in Q2".
6. **Acceptance Criteria por User Story** — cada story tem critério de aceite verificável. Sem AC, story não é testável.
7. **Requisitos testáveis** — cada requisito pode virar teste automatizado OU teste manual com passos claros.

### Qualidade de linguagem (3 checks)

8. **Sem linguagem vaga não-qualificada** — "fast", "secure", "scalable", "user-friendly", "robust" sem número/critério ao lado. Permitido se acompanhado: "fast (p95 < 200ms)".
9. **Vocabulário do domínio** — usa termos do glossário do projeto (`CONTEXT.md`, `docs/glossary.md`), não inventa sinônimos.
10. **Sem code snippets nem file paths** — PRD descreve comportamento, não implementação. Code/paths envelhecem rápido.

### Técnico (3 checks)

11. **Decisões arquiteturais documentadas** — módulos a criar/modificar, contratos de API, mudanças de schema. Respeita ADRs existentes.
12. **Dependências mapeadas** — o que depende de quê, ordem de implementação, integrações externas.
13. **Task breakdown hints** — sugestão de fases (foundation → core → polish) e estimativa de complexidade (simple/typical/complex). Não precisa ser exato; serve para `/to-issues` quebrar bem.

## Grading

- **EXCELLENT** ≥ 55/60 (91%+) — publicar direto
- **GOOD** 50–54 (83–90%) — publicar; flagar warnings
- **ACCEPTABLE** 45–49 (75–82%) — pedir refino antes de publicar
- **NEEDS_WORK** < 45 (<75%) — bloquear; voltar para `/grill-me` ou refinar manualmente

## Auto-fix sugerido

Para cada check que falha, o agente deve oferecer 3 opções:
1. **Proceder mesmo assim** (usuário aceita o risco)
2. **Auto-corrigir** (agente reescreve a seção)
3. **Voltar pro `/grill-me`** (precisa mais discovery)

## Anti-padrões comuns

- **"Make it fast"** sem definir p50/p95 → falha check 5 e 8
- **User Stories sem AC** → falha check 6
- **"As a user, I want to use the system"** → meta-story inútil, falha check 3
- **Solution descreve API endpoints específicos** → confunde com implementation, falha check 10
- **Out of Scope vazio** → escopo vai crescer no `/to-issues`

## Inspiração

Adaptado de [anombyte93/prd-taskmaster](https://github.com/anombyte93/prd-taskmaster) — `script.py validate-prd`. Removida dependência hard do Taskmaster; mantida a essência (13 checks de qualidade objetiva).
