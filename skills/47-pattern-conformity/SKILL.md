---
name: pattern-conformity
description: |
  Extrai e codifica os padroes de coding do projeto existente (naming, estrutura de arquivos, error
  handling, testing style, import style, API design, async patterns) e usa esses padroes como
  restricao sobre novo codigo. Garante que o agente code "igual ao resto do projeto" em vez de
  inventar convencoes proprias. Produce um "code style map" salvo em memory/patterns.md que
  todas as skills de geracao de codigo devem consultar.
  Trigger em: "segue o padrao do projeto", "coda igual ao resto", "nao reinventa padrao",
  "detecta padroes do codebase", "code style do projeto", "padrao do projeto", "convencao do projeto",
  "coda consistente", "mesma convencao", "sem reinventar roda", "padrao de codigo",
  "patterns do codebase", "pattern enforcement", "conformidade de padrao",
  "convencoes de naming", "padrao de tratamento de erro", "mesma estrutura do projeto",
  "detecta as convencoes", "extrai padroes de coding", "como o projeto estrutura".
argument-hint: "[area-alvo] [--update]"
allowed-tools: Read, Grep, Glob, Bash
---

# Pattern Conformity — Code Like the Codebase

> **Principio:** Um agente que ignora as convencoes do projeto existente produz codigo tecnicamente
> correto mas arquiteturalmente dissonante — cria divida tecnica suave que se acumula silenciosamente.
> Esta skill impoe "codigo com sotaque do projeto".

## Quando Usar

- ao iniciar feature em codebase existente com convencoes estabelecidas
- quando usuario diz "coda igual ao resto", "segue o padrao", "nao inventa"
- antes de gerar novo modulo, service, test, hook, componente, CLI command
- quando novo dev ou agente esta sendo integrado a um projeto consolidado
- como prerequisito de skills 01 (feature-development), 02 (frontend-components), 03 (api-design)

## Quando NAO Usar

- projeto greenfield sem codigo existente (sem padrao pra detectar)
- task pontual de 1 arquivo onde o contexto local e obvio
- ja existe `memory/patterns.md` atualizado (<14 dias) e task e pequena
- quando usuario quer explicitamente divergir do padrao existente (ex: "vamos mudar o estilo")

## Distincao de Skills Similares

| Skill | Foco | Output |
|-------|------|--------|
| 18 (repo-auditor) | Stack, frameworks, riscos, harnessability | `docs/repo-audit/current.md` — fotografia do repo |
| 33 (detective-spec) | Regras de negocio implicitas no codigo | `_detective_sdd/` — SDD retroativo |
| 44 (zoom-out) | Mapa de modulos e callers | Mapa de bairro, orientacao topologica |
| **47 (pattern-conformity)** | **Convencoes de codificacao concretas** | `memory/patterns.md` — restricoes de estilo |

Skill 18 diz "o projeto usa NestJS + TypeORM". Esta skill diz "services injetam repositorios via
constructor, metodos publicos sao sempre `async`, erros sao lancados como `AppException(code, message)`".

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/code-exploration.md`, `policies/token-efficiency.md`,
`policies/persistence.md`, `policies/handoffs.md`.

## Protocolo

### Fase 0 — Cache Hit (evitar retrabalho)

Antes de qualquer exploracao, verificar:

```bash
test -f memory/patterns.md && head -5 memory/patterns.md
# checar campo "last_extracted:" no frontmatter
```

Se `memory/patterns.md` existir e `last_extracted` < 14 dias, **pular para Fase 3** (usar diretamente).
Se usuario passou `--update`, ignorar cache e re-extrair.

### Fase 1 — Coleta de Amostras Representativas

Coletar amostras de codigo existente por categoria. Estrategia: nao ler tudo — ler **exemplos
canonicos** (arquivos grandes e centrais sao mais representativos que utilitarios).

#### 1a. Ponto de entrada (entry points)

```bash
# Encontrar arquivos de entrada principais
find . -maxdepth 3 -name "index.*" -o -name "main.*" -o -name "app.*" -o -name "server.*" | head -10
```

Ler 1-2 arquivos centrais completos (sem pular).

#### 1b. Modulos de dominio (services, usecases, handlers)

Buscar 3-5 arquivos representativos na camada de negocio:

```bash
# Services/usecases (adaptar ao projeto)
find . -path "*/services/*" -o -path "*/usecases/*" -o -path "*/handlers/*" | grep -v node_modules | grep -v dist | head -20
```

Ler 2-3 arquivos de tamanho medio (200-400 linhas) — sao os mais ricos em convencoes.

#### 1c. Componentes ou modulos de interface (se houver)

```bash
find . -path "*/components/*" | grep -v node_modules | head -20
```

Ler 2-3 componentes que nao sejam atomicos demais (botoes) nem grandes demais (paginas).

#### 1d. Testes

```bash
find . \( -name "*.test.*" -o -name "*.spec.*" -o -path "*/__tests__/*" \) | grep -v node_modules | head -20
```

Ler 2-3 arquivos de teste cobrindo diferentes camadas (unit + integration se existir).

#### 1e. Utilitarios e helpers

```bash
find . -path "*/utils/*" -o -path "*/helpers/*" -o -path "*/lib/*" | grep -v node_modules | head -20
```

Ler 1-2 arquivos — revelam tratamento de erro e estilo funcional.

### Fase 2 — Extracao de Padroes

Para cada categoria abaixo, analisar as amostras e extrair o padrao OBSERVADO (nao o ideal):

#### P1 — Naming Conventions

Extrair da leitura das amostras:

- Arquivos: `camelCase.ts` vs `kebab-case.ts` vs `PascalCase.ts`
- Classes: PascalCase? sufixos (`Service`, `Repository`, `Controller`, `Handler`)?
- Funcoes/metodos: `camelCase`? prefixos (`get`, `fetch`, `handle`, `process`, `on`)?
- Variaves: `camelCase`? constantes: `SCREAMING_SNAKE_CASE`?
- Tipos/interfaces: `I` prefix? `T` prefix? `Type` suffix? nenhum?
- Exportacoes: `export default` vs named? barrel (`index.ts`) ou direto?

#### P2 — Estrutura de Arquivos e Modulos

- Organizacao: feature-first vs type-first vs camadas (MVC/hexagonal/clean)?
- Co-location: testes junto com codigo ou em pasta separada?
- Imports: absolutos (`@/services/...`) vs relativos (`../services/...`)? aliases?
- Re-exports: usa barrel `index.ts` ou importa direto?

#### P3 — Async e Controle de Fluxo

- `async/await` vs `.then()/.catch()`?
- `Promise.all` vs chamadas sequenciais?
- Onde as funcoes sao async (todas? so as I/O-bound?)?

#### P4 — Tratamento de Erros

Este e critico e frequentemente o padrao mais especifico do projeto:

- Throw ou return? (`throw new Error` vs `return { error, data }` vs `Result<T>`)
- Classe de erro customizada? (ex: `AppError`, `DomainException`, `ApiError`)
- Try/catch no handler ou no service ou em middleware?
- Logging de erros: onde, como, com que nivel?
- Erros de validacao: Zod / Joi / class-validator / manual?

#### P5 — Estilo de Testes

- Framework: Jest, Vitest, pytest, go test, etc.
- Setup/teardown: `beforeEach`/`afterEach`? fixtures? factories?
- Mocking: `jest.mock`, `vi.mock`, `sinon`, manual mocks, DI?
- Naming de testes: "should ...", "it ...", "given ... when ... then ..."?
- Cobertura por camada: unitario so de domain? integration so de API?

#### P6 — Injecao de Dependencia e Composicao

- DI container (tsyringe, inversify, NestJS DI) vs manual vs closures?
- Constructor injection vs property vs function parameter?
- Composicao preferida sobre heranca?

#### P7 — API / Protocolo de Interface (se aplicavel)

- REST com response envelope `{data, error, meta}` vs flat?
- GraphQL: code-first ou schema-first? mutations nomeadas como?
- Validacao de input: middleware ou no handler?
- Paginacao: cursor ou offset? campo `page`/`limit` vs `cursor`/`after`?

#### P8 — Estado e Efeitos Colaterais

- (Frontend) State management: local state, context, Zustand, Redux?
- Side effects em hooks, services, ou handlers?
- Mutacoes: immer, spread, ou direto no state?

### Fase 3 — Producao do Code Style Map

Salvar em `memory/patterns.md` (criar diretorio se necessario):

```markdown
---
last_extracted: YYYY-MM-DD
source_sample: <N arquivos analisados>
confidence: high|medium|low
---

# Code Style Map — <nome do projeto>

> Gerado por skill 47 (pattern-conformity). Atualizar com `--update` se o projeto evoluir.

## P1 — Naming

- Arquivos: <padrao observado>
- Classes: <padrao>
- Funcoes: <padrao>
- Tipos: <padrao>
- Exportacoes: <padrao>
- **Exemplos canonicos:** `<arquivo1>`, `<arquivo2>`

## P2 — Estrutura de Modulos

- Organizacao: <feature-first|type-first|camadas>
- Co-location de testes: <junto|separado>
- Imports: <absoluto|relativo|alias>
- **Exemplos canonicos:** `<pasta1>`, `<pasta2>`

## P3 — Async

- Padrao: <async/await|promises|callback>
- Regra: <todas as I/O|so handlers|etc>

## P4 — Tratamento de Erros ⚠️

- Mecanismo: <throw|return Result|discriminated union>
- Classe customizada: <nome ou "nenhuma">
- Camada de captura: <middleware|handler|service>
- Logging: <padrao de log>
- **Exemplos canonicos:** `<arquivo com melhor exemplo>`

## P5 — Testes

- Framework: <jest|vitest|pytest|etc>
- Naming: <"should ..."|"it ..."|etc>
- Mocking: <padrao>
- Factories: <usa|nao usa>
- **Exemplos canonicos:** `<arquivo de teste representativo>`

## P6 — Dependencias e Composicao

- DI: <container|manual|closures>
- Composicao: <padrao observado>

## P7 — API/Interface (se houver)

- Envelope de resposta: <padrao>
- Validacao: <onde e como>
- Paginacao: <padrao>

## P8 — Estado (se frontend)

- State management: <padrao>
- Efeitos: <padrao>

## Alertas de Anti-padrao

> Padroes que existem mas devem ser EVITADOS (legado, inconsistencia):
- <ex: arquivos antigos ainda usam `var` em vez de `const` — ignorar>
- <ex: `UserService.ts` usa `.then()` — estilo antigo, nao copiar>

## Restricoes para Geracao de Novo Codigo

Ao gerar qualquer novo arquivo neste projeto:

1. <restricao especifica 1>
2. <restricao especifica 2>
3. <restricao especifica 3>
...
```

**Nivel de confianca:**
- `high`: padrao absolutamente consistente em >90% das amostras
- `medium`: padrao predominante (>70%) com algumas excecoes
- `low`: padrao sugerido mas com inconsistencias — notar na secao "Alertas"

### Fase 4 — Gate de Conformidade (Inline)

Quando esta skill esta ativa E o agente vai gerar codigo, antes de escrever:

1. Ler `memory/patterns.md` (ou o que foi extraido nesta execucao)
2. Para cada bloco de codigo a ser escrito, verificar:
   - naming segue P1?
   - estrutura de arquivo segue P2?
   - erros seguem P4?
   - se e teste, segue P5?
3. Se houver desvio intencional (padrao do projeto e ruim/legado), **comentar o desvio** com justificativa

Exemplo de comentario de desvio intencional:

```typescript
// [pattern-conformity] desvio: projeta usa throw AppError mas aqui
// retornamos Result<T> porque esta funcao e usada em contexto de pipeline
// onde propagar excecao quebraria o fluxo. Ver patterns.md P4.
```

## Output Minimo

Ao final da skill, reportar:

```
Pattern Conformity — <projeto>
Arquivos analisados: <N>
Padroes extraidos: P1-P8 (ou subset)
Confianca: high|medium|low
Salvo em: memory/patterns.md
Cache valido por: 14 dias

Restricoes ativas para proximo codigo:
1. <mais importante>
2. <segundo mais importante>
3. <terceiro mais importante>
```

## Handoffs

- **Input pra skill 01 (feature-development):** passar `memory/patterns.md` como restricao
- **Input pra skill 02 (frontend-components):** estilo de componentes (P2, P8)
- **Input pra skill 03 (api-design):** envelope de resposta, validacao, paginacao (P7)
- **Input pra skill 05 (test-engineer):** framework, naming, mocking, factories (P5)
- **Input pra skill 09 (orchestrator):** orquestrador sabe que patterns.md existe e deve referencia-lo no plano
- **Alimentado por skill 18 (repo-auditor):** usa `docs/repo-audit/current.md` pra saber onde olhar

## Anti-padroes

- ❌ Inventar restricoes "ideais" que nao estao no codigo — so extrair o que EXISTE
- ❌ Reportar tudo que viu em vez de extrair o padrao — patterns.md deve ser conciso (<150 linhas)
- ❌ Ignorar inconsistencias — seccao "Alertas" existe pra isso
- ❌ Reextrair a cada task — verificar cache primeiro (Fase 0)
- ❌ Tratar `patterns.md` como substituicao do CLAUDE.md — e complemento; ambos devem ser lidos
- ❌ Forcar padrao legado ruim quando usuario quer evolucao — skill descreve o que existe, usuario decide se segue
