---
description: Simplificar e refatorar código (skill 23 — Migration & Refactor)
---

# /simplify — Simplificação e Refatoração

**Objetivo:** Reduzir complexidade, eliminar duplicação, melhorar legibilidade sem mudar comportamento.

**Skill ativada:** 23 — Migration & Refactor Specialist

**Input esperado:** Arquivo(s) ou módulo(s) alvo, motivo da simplificação.

**Output esperado:** Código refatorado, mais limpo e DRY, com testes garantindo que comportamento não mudou.

**Policies relevantes:**
- `policies/search-first.md` — entender dependências antes de refatorar
- `policies/anti-rationalization.md` — não simplificar demais nem de menos

**Uso:** `/simplify [arquivo ou módulo a simplificar]`

## Modo delete-list

`/simplify --delete-list [arquivo ou módulo]` — em vez de aplicar a refatoração direto, gera **só** uma lista de candidatos a remoção, sem tocar no arquivo:

| O que remover | Onde (arquivo:linha) | Por quê é seguro remover |
|---|---|---|
| ... | ... | ... |

Cobre 5 categorias: código morto, imports não usados, variáveis não referenciadas, funções não chamadas, branches inalcançáveis. Ver `skills/23-migration-refactor-specialist/SKILL.md` (seção "Delete-List Review") para o critério de segurança e o carve-out de código de segurança/validação/a11y.

Uso padrão (sem a flag) continua editando direto, sem mudança.

**Fontes:** modo delete-list adaptado do conceito de "delete-list review" do projeto [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT) — só o conceito, nenhum código copiado.
