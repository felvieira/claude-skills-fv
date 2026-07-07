---
name: migration-refactor-specialist
description: |
  Skill para migracoes, modernizacao de legacy e refactors estruturais. Use quando precisar fazer upgrades grandes,
  extracao incremental, strangler pattern, compatibilidade de transicao e rollout seguro.
  Trigger em: "migracao de framework", "modernizacao de legacy", "strangler pattern", "refactor estrutural", "upgrade grande", "extracao incremental", "migracao de runtime", "trocar ORM", "rollout incremental de refactor", "migrar para",
  "spring boot 3", "spring boot 2 para 3", "jakarta migration", "javax para jakarta", "openrewrite", "upgrade spring boot",
  "migrar jdk 21", "jdk 21 upgrade", "java 21 migration", "spring boot upgrade", "spring 3 migration".
---

# Migration Refactor Specialist

O Migration Refactor Specialist reduz risco em mudancas grandes que nao cabem no fluxo comum de feature ou bugfix.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/stack-flexibility.md` e `policies/evals.md`.

## Quando Usar

- migracoes de framework, runtime, auth, storage ou arquitetura
- refactors grandes com rollout incremental
- modernizacao de sistema legado com risco elevado

## Quando Nao Usar

- para pequenos refactors locais
- para upgrades mecanicos de baixa complexidade

## Entradas Esperadas

- estado atual do sistema
- objetivo da migracao ou refactor
- riscos, dependencias e restricoes de rollout

## Saidas Esperadas

- plano incremental de migracao/refactor
- fases, compatibilidades e rollback
- handoff claro para Orchestrator, Backend, Frontend, QA e Deploy

## Checklist Base

- estado atual e alvo definidos
- estrategia de compatibilidade temporaria explicita
- rollback e criterio de corte documentados
- validacao incremental por fase
- risco operacional e tecnico priorizados

## Evidencia de Conclusao

- plano de transicao definido
- fases e riscos registrados
- criterios de rollout e rollback claros

## Playbooks Disponíveis

Playbooks concretos por stack em `playbooks/`:

| Playbook | Quando usar |
|---|---|
| `spring-boot-2-to-3.md` | Spring Boot 2.x → 3.x + JDK 8/11/17 → 21 via OpenRewrite. Inclui 10 passos, rollback, geração de REPORT.md. |

Referências de suporte em `playbooks/references/`:
- `common-fixes.md` — troubleshooting por categoria (javax→jakarta, Hibernate dialects, properties renomeadas, Flyway, Virtual Threads)
- `custom-parent-strategy.md` — projetos com parent POM próprio: 3 estratégias (atualizar parent, BOM import, migrar JARs internos)

## Delete-List Review

Quando invocada via `/simplify --delete-list`, esta skill NÃO edita — só lista candidatos a remoção, cobrindo 5 categorias:

1. **Código morto** — branches/funções inalcançáveis
2. **Imports não usados** — sem referência no arquivo
3. **Variáveis não referenciadas** — declaradas e nunca lidas
4. **Funções não chamadas** — sem caller em todo o codebase (não só no arquivo)
5. **Branches inalcançáveis** — condição sempre falsa/verdadeira, dead code após return/throw

Para cada item, citar `arquivo:linha` e a justificativa concreta de por que é seguro remover — não basta "parece não usado": mostre a evidência (grep/symbol search sem match, sem export, sem import em nenhum outro arquivo).

**Carve-out de constraints imutáveis:** NUNCA listar como candidato a remoção código de segurança, validação de input, checagem de trust-boundary ou acessibilidade só porque parece não-referenciado — análise estática pode não enxergar uso dinâmico/reflection em caminhos críticos de segurança. Se encontrar código genuinamente sem referência nessas categorias, sinalizar **separado** da tabela normal, com aviso explícito pedindo confirmação humana antes de qualquer remoção.

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/migration-plan.md`.

## Integracao com Pipeline

- **skill 38 (Architecture Deepener):** roda **antes** desta skill em modulos candidatos a deepening — esta skill recebe o plano de deepening (modulos, interfaces propostas, deletion-test passing) e executa o refactor incremental com feature flags. Skill 38 propoe; esta skill executa.
- **skill 37 (TDD Engineer):** roda **junto** quando o refactor afeta comportamento testavel — TDD garante que comportamento nao muda durante a migracao (testes verdes antes e depois).
- **skill 11 (Reviewer):** valida o resultado final do refactor antes do merge.
