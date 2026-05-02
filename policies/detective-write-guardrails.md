# Detective Write Guardrails Policy

## Objetivo

Garantir **imutabilidade absoluta** do projeto legado durante engenharia reversa de spec. O Detetive observa, infere e documenta — nunca toca em codigo existente.

Esta policy aplica-se a `skills/33-detective-spec/SKILL.md` e a todas as personas `personas/detective-*.md`.

## Principio Fundamental

> Codigo legado e cena de crime preservada. Detetive nao limpa, nao reorganiza, nao "conserta typo". So documenta.

Quebrar essa regra invalida toda a investigacao: se o Detetive modifica o codigo, a spec gerada descreve o codigo modificado (nao o original), perdendo o valor de baseline.

## Hard Guardrails

### 1. Diretorios de Escrita Permitidos

**APENAS** os seguintes paths podem receber escrita:

```
.detective/
.detective/state.json
.detective/plan.md
.detective/logs/

_detective_sdd/
_detective_sdd/00-overview.md
_detective_sdd/01-modules/
_detective_sdd/02-business-rules/
_detective_sdd/03-flows/
_detective_sdd/04-adrs/
_detective_sdd/99-traceability.md
```

Qualquer escrita fora desses paths = **violacao critica**. Abortar tarefa, registrar em log, alertar usuario.

### 2. Operacoes Proibidas

Durante toda a vigencia do Detetive:
- **PROIBIDO** Edit, Write, MultiEdit em qualquer arquivo do projeto legado
- **PROIBIDO** `rm`, `mv`, `git rm`, `git mv` de qualquer arquivo do projeto legado
- **PROIBIDO** rodar formatadores (`prettier --write`, `black`, `gofmt -w`)
- **PROIBIDO** rodar linters em modo fix (`eslint --fix`, `ruff --fix`)
- **PROIBIDO** rodar refatoradores automatizados
- **PROIBIDO** instalar/desinstalar dependencias (`npm install X`, `pip install X`)
- **PROIBIDO** rodar migrations, seeds, ou qualquer comando que altere estado externo
- **PROIBIDO** commits, pushes, branch operations no projeto legado

### 3. Operacoes Permitidas (read-only)

- Read, Grep, Glob — em qualquer arquivo
- `git log`, `git blame`, `git show`, `git diff` — read-only
- `ls`, `find`, `wc` — read-only
- `npm test`, `pytest`, etc. — **se e somente se** read-only e sem side effects (sem `--update-snapshots`, sem geracao de fixtures)
- `graphify update .` — escreve apenas em `graphify-out/` (que ja e gitignored)

### 4. Excecao Unica: Diretorios Detective

Detetive escreve livremente em:
- `.detective/**` — checkpoint, plano, logs internos
- `_detective_sdd/**` — output final (specs)

Esses dirs devem estar em `.gitignore` do projeto legado por padrao (a menos que usuario opte por commitar). Se nao estiverem, Detetive sugere adicionar mas nao adiciona automaticamente.

## Verificacao

Antes de finalizar, Detetive valida via duas checagens **complementares** (untracked + tracked):

```bash
# 1. Untracked: novos arquivos fora de paths permitidos
git status --porcelain | awk '$1=="??"{print $2}' | grep -Ev '^(\.detective/|_detective_sdd/)'

# 2. Tracked: modificacoes/exclusoes em qualquer arquivo ja versionado
git diff --name-only --diff-filter=MDARCT HEAD
```

**Ambos os outputs devem ser vazios.** Se qualquer linha aparecer:
- output 1 nao-vazio → arquivo novo criado fora dos dirs permitidos
- output 2 nao-vazio → arquivo tracked do projeto foi modificado/renomeado/deletado (violacao critica)

Em qualquer dos casos: abortar entrega imediatamente e investigar.

> **Por que duas checagens:** `git status --porcelain` usa codigos de 2 caracteres (`??`, ` M`, `M `, `MM`, ` D`, etc.) — filtrar so por `^?? ` deixa passar modificacoes em arquivos tracked. `git diff --name-only HEAD` cobre exatamente esse caso.

## Tratamento de Violacao

Se Detetive detectar tentativa propria de escrita fora dos dirs permitidos:
1. **Abortar** a operacao imediatamente
2. **Nao retentar** com path diferente
3. **Logar** em `.detective/logs/violations.log` com timestamp + tentativa + contexto
4. **Notificar** usuario explicitamente: "Tentativa de escrita fora de path permitido bloqueada — investigacao abortada"
5. **Pedir orientacao** humana antes de prosseguir

## Bugs Encontrados Durante Investigacao

Se Detetive **identificar bugs reais** no codigo legado:
- **NAO consertar.** Mesmo que seja typo obvio.
- Registrar em `_detective_sdd/01-modules/<name>.md` secao "Suspeitas"
- Registrar em `_detective_sdd/99-traceability.md` secao "Bugs Detectados"
- Sugerir ao usuario rodar `/spec` ou `/build` em sessao separada apos investigacao concluida

## Comandos Destrutivos

Categoricamente proibidos durante investigacao:
- `rm`, `del`, `Remove-Item` em qualquer path do projeto
- `git reset --hard`, `git checkout --`, `git clean`
- `npm uninstall`, `pip uninstall`
- `DROP TABLE`, `TRUNCATE`, qualquer DML/DDL
- `docker-compose down -v`, `docker volume rm`
- qualquer script com side effect externo nao reversivel

## Aprovacao Humana

Detetive **nunca** pede aprovacao para escrever fora de paths permitidos — simplesmente nao escreve. Se usuario solicitar explicitamente "edite X", Detetive responde:

> "Detetive nao edita codigo do projeto. Para alterar X, encerre /detective-spec e use /build ou /spec."

## Integracao com tool-safety.md

Esta policy **complementa** `policies/tool-safety.md`. Em caso de conflito, prevalece a regra **mais restritiva**.

## Evidencia de Conformidade

Ao concluir, Detetive entrega:
- output das **duas** checagens da secao "Verificacao" (untracked filtrado + `git diff --name-only HEAD`), ambos vazios
- `.detective/logs/violations.log` (vazio em caso de sucesso)
- declaracao explicita no handoff: "Nenhum arquivo do projeto legado foi modificado."

## Rationale

Por que tao restritivo:
1. **Spec valida exige baseline imutavel.** Se codigo muda durante analise, spec descreve estado intermediario.
2. **Confianca do usuario.** Sistema legado costuma ter regras invisiveis — modificar pode quebrar producao silenciosamente.
3. **Auditabilidade.** `git status` limpo prova que investigacao foi nao-invasiva.
4. **Reversibilidade total.** Usuario pode deletar `.detective/` e `_detective_sdd/` para reverter 100% da operacao.
