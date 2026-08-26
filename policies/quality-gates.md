# Quality Gates Policy

## Objetivo
Definir o que realmente bloqueia uma entrega.

## Princípio: Keep quality left

> Inspirado em Birgitta Böckeler (Thoughtworks). Ver `docs/inspiration/harness-engineering.md`.

Gates não devem se concentrar no fim do pipeline. **Quanto mais cedo o feedback, mais barato o fix.** Distribuição correta:

| Estágio | Gates apropriados | Custo |
|---|---|---|
| **Antes do prompt** (UserPromptSubmit hooks) | ENRICH/GUIDED ENRICH p/ prompts vagos | ms — gratuito |
| **Antes da escrita** (PreToolUse hooks) | Skill-as-subagent validator, model routing | ms — gratuito |
| **Após cada tool call** (PostToolUse hooks) | Anti-AI writing, constitution drift watcher | ms-s — barato |
| **Pre-commit** (sob demanda ou hook git) | Linter, formatter, type-check, fast tests | s-min — barato |
| **Pipeline (CI)** | Schema validator, consistency check, full test suite, mutation testing | min — médio |
| **Pós-integração contínuo** (fora do change lifecycle) | `/drift-scan` (dead code, dep staleness, doc-vs-code) | h-d — caro |

**Princípio derivado:** gates inferenciais caros (LLM-based) só devem rodar nas etapas pipeline e contínuo. Gates pre-commit têm que ser computacionais e rápidos pra não bloquear o flow.

Ver `policies/harness-categories.md` pra tabela mestra de sensors categorizados.

## Gate Obrigatorio
- problema principal resolvido
- mudanca coerente com o contexto
- risco relevante explicitado
- validacao minima realizada ou impossibilidade explicada
- handoff claro quando houver proxima etapa
- **conformidade com `memory/constitution.md`** quando ela existir no projeto consumidor (ver abaixo)

## Constituicao como gate

Quando `memory/constitution.md` existe no repo consumidor, ela tem **autoridade hierarquica** — ver `policies/constitution.md`. Gates derivados, por eixo:

| Eixo | Gate concreto |
|---|---|
| Code Quality | linter/formatter passa; complexidade dentro do limite declarado |
| Testing | coverage minimo atingido; zero flaky test; tipos de teste exigidos presentes |
| UX | WCAG no nivel declarado; locales obrigatorios cobertos; perf percebida dentro dos budgets |
| Performance | p50/p95/p99 dentro dos alvos; custo IA/infra dentro do budget mensal |
| Security | SAST + dependency scan + secrets scan executados e limpos; compliance framework satisfeito |

**Bloqueio:** qualquer principio CRITICAL nao satisfeito = nao entregar. Exception requer ADR dedicado com aprovacao dos owners.

Recomendar rodar `/analyze --strict` antes de release para detectar violacoes cross-artifact.

## Guideline, nao Gate Absoluto
- tamanho de funcao
- quantidade de comentarios
- formato exato de pastas
- stack preferida
- estilo idealizado de arquitetura

## Gate de prosa (docs, PRDs, copy)

Qualquer entrega que inclua prosa que humanos vão ler (docs de usuário, PRDs, copy, release notes, changelogs narrativos) deve passar por `policies/anti-ai-writing.md` antes de finalizar.

Rodar `/humanize` ou checar manualmente os 29 padrões. Prosa com tells de IA visíveis não sai — afeta credibilidade e, em conteúdo publicado, E-E-A-T do Google.

## Rejeitar quando
- existe contradicao funcional
- ha regressao relevante nao tratada
- ha falha de seguranca importante
- falta validacao minima essencial
- falta documentacao obrigatoria do contexto

## Gate de arbitragem entre agentes (discordância)

Quando 2+ agentes/reviewers avaliam o **mesmo** achado, decisão de arquitetura ou veredito de aprovação e chegam a conclusões incompatíveis sobre correção/segurança/risco, a etapa seguinte do pipeline fica **bloqueada** até haver resolução — concordância original entre os agentes, ou veredito de um terceiro agente árbitro que julga a evidência de cada lado sem saber qual agente disse o quê (evita viés de ancoragem).

Fail-closed aqui significa: ausência de decisão nunca vira "segue com o achado mais otimista" nem "consenso por média". Divergência de estilo/preferência não entra nesse gate — só decisões que mudam o resultado entregue.

Mecanismo completo (quando aplicar, papel do árbitro, exemplo) em `skills/40-parallel-dispatcher/SKILL.md` seção "Arbitragem em caso de discordância" — esta entrada só formaliza que o gate é reusável por qualquer skill/comando que despache agentes em paralelo, não só a skill 40.

Diferença de escopo com as demais entradas desta policy: os gates acima tratam de conformidade do artefato final (constituição, prosa, revalidação); este trata especificamente de **discordância entre múltiplos agentes** sobre o mesmo ponto — problema distinto de `policies/trade-off-resolution.md` (que resolve conflito entre **regras do kit**, não entre agentes).

## Revalidacao
- repetir QA quando houver mudanca funcional
- repetir Security quando houver mudanca em auth, dados, validacao ou superficie de ataque
- repetir Reviewer quando houver correcao apos rejeicao

## Evals do Sistema
- seguir `policies/evals.md` quando a mudanca afetar prompts, skills, tools, templates ou governanca global

## Regra de Commit Trailers

Commits com decisao arquitetural, trade-off ou risco lateral DEVEM incluir trailers relevantes.

Aplicar `templates/commit-trailers.md`:
- `Constraint:` quando restricao externa limitou opcoes
- `Rejected:` quando alternativa foi desconsiderada
- `Not-tested:` quando algo ficou fora da cobertura por motivo valido
- `Scope-risk:` quando mudanca pode impactar outros modulos

Nao aplicar em commits triviais (typo, rename, lint, docs simples).

## Polish levels (auto-loop v2)

The auto-loop runner runs a configurable quality pass before commit, controlled by `--polish`:

| Level    | Skills run                                       | Retries on blocking issues |
|----------|--------------------------------------------------|----------------------------|
| `none`   | (none)                                           | 0                          |
| `light`  | `simplify`                                       | 0                          |
| `standard` (default) | `simplify` + `review`                | 1                          |
| `full`   | `simplify` + `review` + `security-review` + `test` | 3                        |

The polish pass runs **after** lint/typecheck/test/build pass and **before** commit. Blocking issues retry up to the configured budget; non-blocking issues are logged but don't block commit. If retries exhaust with blocking issues remaining, the run commits anyway and marks `polish_incomplete: true` in `.auto/session.json`.
