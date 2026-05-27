---
description: Roda /plan em 2+ modelos paralelos (claude + codex) e surface só discordâncias (adaptado de affaan-m/ECC)
argument-hint: "<descrição da feature> [--models=claude,codex] [--depth=quick|deep]"
---

# /multi-plan — Disagreement Gate Multi-Modelo

**Objetivo:** Rodar o mesmo `/plan` em 2+ modelos diferentes (Claude + Codex), comparar outputs e surface só as **discordâncias** ao usuário pra decisão. Convergências são auto-aprovadas (alta confiança).

**Quando usar:**
- feature de **alto risco** (migração, segurança, arquitetura core)
- decisão de design controversa onde "1 modelo concorda consigo mesmo" é fraco demais
- antes de `/build` quando o plano precisa de validação externa
- quando user explicitamente pediu "outra opinião" / "stress test"

**Quando NÃO usar:**
- task trivial (rename, lint, doc) — 1 modelo basta
- já tem spec validada via `/grill-me` ou `/checklist`
- urgência de hotfix — overhead não compensa
- custo é fator dominante — multi-plan é ~2x mais caro

**Inputs:**
- `<descrição da feature>` (obrigatório)
- `--models=claude,codex` (default) — qual subset rodar
- `--depth=quick` (default) — plano rápido | `--depth=deep` — plano completo com riscos

**Output:**
- planos paralelos lado a lado
- **diff estruturado**: convergências (auto-aprovadas) + divergências (AskUserQuestion)
- plano final = união aprovada

**Protocolo:**

1. **Fan-out** (skill 40 parallel-dispatcher):
   - Worker A: `Agent(subagent_type='Plan', prompt='<descrição>')` (claude)
   - Worker B: `Agent(subagent_type='codex:codex-rescue', prompt='<descrição> — produza plano de implementação')` (codex)
   - (opcionais: outros modelos via subagent_type apropriado)

2. **Coleta** dos N planos retornados (cada um tem: steps, riscos, files-to-edit, tests-needed)

3. **Diff estruturado**:
   ```
   ## Convergências (auto-aprovadas)
   - Step X: ambos concordam em editar arquivo Y
   - Risco Z: ambos identificam

   ## Divergências (decisão necessária)
   1. Claude propõe estratégia A; Codex propõe B — qual?
   2. Codex flag risco que Claude não viu — investigar?
   3. Estimativa de esforço diverge — qual usar?
   ```

4. **AskUserQuestion** **apenas** nas divergências (1 por turno, max 4).

5. **Plano final** = convergências + divergências resolvidas → entrega como output normal de `/plan`.

**Dependências:**
- skill 40 (parallel-dispatcher) — fan-out paralelo
- subagent `codex:codex-rescue` — execução em Codex
- `policies/trade-off-resolution.md` — quando os modelos discordam e user pede "qual usa", a hierarquia decide
- `policies/model-routing.md` — definição de qual modelo cada worker usa

**Adaptado de:** [ECC](https://github.com/affaan-m/ECC) `/multi-plan` (MIT). Nosso ganho vs original: integração com skill 40 + reuso de `codex:rescue` (não exige infra própria de multi-model).

**Custo:** ~2x tokens de `/plan` único. Use seletivamente.

Cross-refs: `/plan`, skill 40 (parallel-dispatcher), `codex:rescue`, `policies/model-routing.md`.
