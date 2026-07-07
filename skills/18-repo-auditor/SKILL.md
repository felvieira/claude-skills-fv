---
name: repo-auditor
description: |
  Skill de auditoria inicial e continua do repositorio. Use quando precisar mapear stack real, convencoes,
  assets, testes, docs, riscos e pontos de integracao antes de executar outras skills. O resultado deve ser
  persistido em markdown reutilizavel para reduzir releitura e economizar tokens.
  Trigger em: "repo audit", "auditar repositorio", "mapear stack do projeto", "harnessability score", "repo-audit", "auditoria de repo", "fotografia do repo", "current.md", "mapear convencoes do projeto", "inventariar o codebase".
argument-hint: "[caminho-do-repo]"
allowed-tools: Read, Grep, Glob, Bash(git *), Bash(ls *), Bash(wc *), Bash(find *)
---

# Repo Auditor

O Repo Auditor cria uma fotografia operacional do repositorio para que o restante do sistema trabalhe com contexto persistido e enxuto.

## Harnessability Score (v2.5.0+)

> Inspirado em Birgitta Böckeler — "ambient affordances" tornam o codebase mais governável pelo agente. Ver `policies/harness-categories.md` + `docs/inspiration/harness-engineering.md`.

Junto com a auditoria, calcule e reporte o **harnessability score** do projeto (0-100):

| Sinal | Pontos | Como detectar |
|---|---|---|
| Linguagem com static typing forte (TS strict, Rust, Go, Java) | +20 | `tsconfig.json` com `strict:true`, `Cargo.toml`, `go.mod`, `pom.xml` |
| Linter configurado | +15 | `.eslintrc*`, `ruff.toml`, `clippy.toml`, `golangci.yml` |
| Module boundaries claros | +15 | DDD (`domains/`), hexagonal (`adapters/` + `ports/`), feature folders, monorepo tooling |
| Testes existentes c/ cobertura > 60% | +15 | `tests/`, `__tests__/`, coverage report ou badge ≥60% |
| CI configurado | +10 | `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, etc |
| `AGENTS.md` ou `CLAUDE.md` presente | +10 | grep no root |
| Repo-audit recente (<30d) | +5 | `docs/repo-audit/current.md` modtime |
| Constitution definida | +5 | `memory/constitution.md` existe |
| Dependency scanner | +5 | dependabot config, `.snyk`, renovate config |

**Deduções por Risco:**

Além dos sinais positivos acima, certos marcadores de risco SUBTRAEM pontos quando detectados. Este é um modelo conceitual — os pesos abaixo são pontos de partida heurísticos a calibrar por projeto, não números empiricamente validados.

| Sinal de risco | Pontos | Como detectar |
|---|---|---|
| TODO/FIXME mencionando segurança sem issue rastreada | -10 | grep `TODO`/`FIXME` + termos de security/auth sem link de issue |
| Funções >100 linhas sem cobertura de teste | -5 (por instância, com cap) | análise de tamanho de função cruzada com coverage report |
| Dependência com CVE conhecido não tratado | -10 | `npm audit`, `pip-audit`, dependabot alerts abertos |
| God-file/god-class acima do threshold sem dono/doc | -5 | tamanho de arquivo + ausência de `CODEOWNERS`/doc de módulo |

**Cap por categoria:** nenhuma categoria de dedução sozinha pode subtrair mais que -20 pontos do total de 100 — isso evita que um único tipo de risco zere o score sozinho e preserva o sinal das outras categorias.

Score final = `max(0, soma dos sinais positivos + soma das deduções, cada categoria capada)`.

**Fontes:** modelo de dedução-com-cap inspirado na abordagem de health-scoring calibrado do projeto [repowise-dev/repowise](https://github.com/repowise-dev/repowise) (AGPL-3.0) — só o modelo conceitual foi adaptado, nenhum código ou peso específico de marcador foi copiado (a licença AGPL é o motivo de não herdar código).

**Interpretação:**

| Score | Nível | Recomendação |
|---|---|---|
| 0-30 | Baixa harnessability | Considerar skill 23 (migration-refactor) antes de feature work pesado. Modo `/swarm` autonomous arriscado — preferir `/auto` ou `/loop` com supervisão. |
| 31-60 | Média | Kit funcional, alguns gaps. Considerar skills 38 (architecture-deepener) + 06 (security-review) pra fortalecer. |
| 61-85 | Boa | Kit roda com pouca supervisão. Modo `/swarm` aceitável. |
| 86-100 | Alta | Modo `/swarm` autonomous totalmente viável. |

**Ambient affordances:** liste os 3 maiores presentes E os 3 maiores gaps no relatório, com recomendações concretas. Exemplo:

```markdown
## Ambient Affordances

**Top 3 presentes:**
- TypeScript strict habilitado
- Feature folders em `src/features/` com co-location
- Husky + lint-staged em pre-commit

**Top 3 gaps:**
- Sem dependency scanner (recomendado: dependabot)
- Coverage < 40% (skill 05 sugere meta de 60%)
- ADRs ausentes (`docs/adr/` vazio)

**Score: 65/100 (Boa harnessability)**
```

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/token-efficiency.md`, `policies/handoffs.md`, `policies/tool-safety.md` e `policies/evals.md`.

### Deteccao de governanca

Durante a auditoria, registrar em `docs/repo-audit/current.md` na secao "Governanca":
- `memory/constitution.md` existe? (Se nao e o projeto e maduro/tem ADRs/PRDs: **sugerir `/constitution` como acao recomendada** no relatorio)
- ADRs em `docs/adr/`? Quantos e status (accepted/proposed/superseded)
- `policies/` customizadas no projeto consumidor

Isso permite que as proximas skills saibam se podem ancorar decisoes em principios formais.

Para auditorias mais completas e revisoes incrementais, consultar `docs/skill-guides/repo-auditor.md` apenas quando necessario.

## Quando Usar

- no primeiro contato com um repositorio
- quando a stack real divergir da stack de referencia do kit
- quando houver duvida sobre convencoes, assets, testes, docs ou risco tecnico
- antes de features grandes, migracoes ou automacoes novas

## Quando Nao Usar

- para reanalisar tudo a cada task sem mudanca relevante
- para substituir investigacao pontual muito localizada

## Entradas Esperadas

- repositorio atual
- estrutura de arquivos e docs existentes
- sinais de stack, tooling, testes, deploy e identidade visual

## Saidas Esperadas

- auditoria curta e reutilizavel em markdown
- resumo executivo para o Orchestrator
- gaps, riscos e recomendacoes priorizadas

## Responsabilidades

1. Detectar stack, framework, ferramentas e convencoes reais do repositorio
2. Identificar documentacao, testes, assets, pipeline e sinais de observabilidade
3. Registrar identidade visual e contexto de imagens quando houver
4. Persistir um resumo operacional reutilizavel para reduzir releitura futura
5. Atualizar a auditoria apenas quando houver mudanca relevante no repositorio
6. Encaminhar para `Asset Librarian` quando o inventario visual precisar de organizacao dedicada
7. **Recomendar automacoes Claude Code** apropriadas ao codebase (modo `--recommend-automation`)

## Modo Recommend-Automation

Quando rodado com flag `--recommend-automation` (ou usuario pede explicitamente "recomendar automacoes"), apos a auditoria padrao gerar secao `## Automacoes Recomendadas` no relatorio com:

### Hooks recomendados (analisar o que o codebase pede)

| Detectado no repo | Hook sugerido | Why |
|---|---|---|
| Testes em CI demorando > 5min | `PostToolUse` rodando subset de tests afetados | Feedback rapido |
| `.env*` files com secrets | `PreToolUse` block em commits que tocam `.env*` | Prevent leaks |
| Migrations SQL na raiz | `PreToolUse` warning ao editar migration ja aplicada | Safety |
| `package.json` com 50+ deps | `SessionStart` mostrando audit/outdated | Awareness |
| Monorepo (turborepo/nx) | `SessionStart` listando workspaces ativos | Context |

### Subagents recomendados

| Detectado | Subagent sugerido |
|---|---|
| Codebase grande (> 100 files) | `code-reviewer` para PRs |
| Codigo de seguranca (auth, payments, crypto) | `security-auditor` antes de release |
| Suite de testes complexa | `test-engineer` para gerar/revisar |
| Bug recorrente em log de issues | `debugger` para diagnostico sistematico |

### Skills do kit recomendadas

Apontar quais das 37 skills se aplicam ao projeto:
- Frontend? → skills 02, 04, 22 (a11y), 36 (web-assets)
- Backend? → skills 03, 06 (security), 20 (observability)
- Mobile? → skill 15 (mobile-tauri)
- IA features? → skills 25, 26, 27 + patterns/ai-integration/

### MCP servers recomendados

Se o projeto usa serviços externos sem MCP server:
- GitHub heavy → MCP server do GitHub
- Banco frequente → MCP server do Postgres/Mongo
- Design system → Figma MCP

### Slash commands relevantes

Sugerir 3-5 commands do kit que se aplicam ao workflow detectado.

### Output format do recommend-automation

```markdown
## Automacoes Recomendadas (skill 18 — modo recommend)

### Alta prioridade
- [ ] Instalar hook `pre-execution-gate.mjs` — detectado: testes em CI demoram 8min
- [ ] Adicionar subagent `security-auditor` — detectado: 23 files em src/auth/
- [ ] `/constitution` — projeto maduro (> 6m, 12 ADRs) sem governanca formal

### Media prioridade
- [ ] Skills 02/22/36 — projeto e frontend-heavy sem cobertura a11y
- [ ] MCP server do GitHub — 230 issues abertas, gh CLI usado em 14 scripts

### Baixa prioridade
- [ ] /consolidate-memory weekly schedule — vault tem 320 logs
```

## Arquivo de Persistencia

Persistir em `docs/repo-audit/current.md` (indice) e splits dinamicos no mesmo diretorio.

Se o kit estiver instalado em `.bot/`, persistir em `.bot/docs/repo-audit/`.

Se houver reauditoria relevante, arquivar snapshots curtos em `docs/repo-audit/history/`.

## Output Split

Ao auditar, gerar arquivos focados por tipo alem do `current.md`. Decidir quais gerar baseado no que o repo contem — nao gerar arquivos vazios.

### Catalogo de Splits

| Arquivo | Gerar quando detectar | Conteudo |
|---|---|---|
| `current.md` | **sempre** | Indice enxuto: stack, convencoes, riscos, gaps. Aponta para splits: `Ver routes.md para endpoints` |
| `routes.md` | API routes (Express, Fastify, Next API, Django urls, Flask, etc.) | Endpoints por recurso, metodos HTTP, middlewares, auth |
| `schema.md` | ORM/schema (Prisma, Drizzle, TypeORM, Sequelize, migrations) | Models, campos-chave, relacoes FK, enums |
| `components.md` | Framework de componentes (React, Vue, Svelte, Angular) | Arvore por feature, props, client/server, lazy |
| `services.md` | Camada de servicos/usecases (classes com patterns service/usecase) | Servicos, dependencias, metodos publicos |
| `infra.md` | Docker, CI/CD, Terraform, k8s, serverless | Containers, pipelines, environments, secrets ref |

### Regras do Split

1. **current.md nunca duplica conteudo dos splits** — apenas referencia com ponteiro
2. **Cada split cabe em ~200 linhas** — se passar, resumir mais agressivamente
3. **Notacao compacta** — usar `fn nome(args): tipo`, `[auth,db]` pra tags, `(c)` pra client components
4. **Geracao incremental** — so re-gerar split se arquivos relevantes mudaram (verificar via git diff)
5. **Path dos splits** — mesmo diretorio do `current.md` (`docs/repo-audit/` ou `.bot/docs/repo-audit/`)

### Deteccao

Para decidir quais splits gerar, verificar:
- `routes.md`: existencia de `app.get/post/put/delete`, `router.`, `@Get/@Post`, `urlpatterns`, `api/` dir com handlers
- `schema.md`: existencia de `schema.prisma`, `*.entity.ts`, `models.py`, diretorio `migrations/`
- `components.md`: existencia de `.tsx`/`.vue`/`.svelte` em `src/components/` ou `app/`
- `services.md`: existencia de `*Service.ts`, `*UseCase.ts`, `services/` dir, `usecases/` dir
- `infra.md`: existencia de `Dockerfile`, `.github/workflows/`, `terraform/`, `k8s/`, `docker-compose`

## Quando Reauditar

- auditoria ausente
- auditoria com sinais claros de desatualizacao
- mudanca relevante de stack, assets, testes, deploy ou observabilidade
- reestruturacao grande do repositorio

## Conteudo Minimo da Auditoria

- stack principal e ferramentas detectadas
- estrutura de codigo e docs relevantes
- padroes de auth, testes, deploy e observabilidade
- assets e identidade visual existentes
- riscos, gaps e areas que exigem cuidado extra
- ultima data de revisao

## Estrutura Recomendada do Markdown

Usar `templates/audit.md` como base e manter secoes curtas, atualizaveis e reutilizaveis.

## Regras de Economia de Token

- ler primeiro a auditoria existente antes de explorar o repo novamente
- atualizar apenas as secoes afetadas quando a base nao mudou muito
- evitar revarrer arquivos grandes se a auditoria ainda estiver valida

## Evidencia de Conclusao

- `docs/repo-audit/current.md` criado ou atualizado (indice enxuto)
- splits relevantes gerados (`routes.md`, `schema.md`, etc.) conforme deteccao
- stack e convencoes reais mapeadas
- riscos e gaps principais registrados

## Handoff

Entregar:

- caminho do arquivo de auditoria
- o que foi confirmado
- o que ainda esta incerto
- proxima skill que pode usar a auditoria

Seguir `policies/handoffs.md` e, quando util, `templates/audit.md`.
