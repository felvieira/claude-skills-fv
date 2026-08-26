---
name: using-git-worktrees
description: |
  Skill de isolamento de workspace via git worktree, com deteccao de isolamento existente,
  preferencia por ferramenta nativa (`EnterWorktree`/`ExitWorktree` ou dispatcher do kit
  `/worktree`) antes de cair para `git worktree add` cru, e baseline de testes obrigatoria
  antes de liberar a task para trabalho. Eleva o comando `/worktree` do kit para protocolo
  completo quando a situacao exige as garantias extras (evitar aninhamento de worktree,
  confirmar workspace limpo antes de comecar).
  Trigger em: "worktree", "isolar workspace", "trabalhar isolado", "workspace isolado",
  "criar worktree", "ja estou num worktree", "aninhar worktree", "worktree dentro de worktree",
  "baseline de testes", "verificar baseline limpa", "detectar isolamento", "git worktree add",
  "ferramenta nativa de worktree", "EnterWorktree", "plano de implementacao isolado",
  "trabalho paralelo sem afetar o branch atual".
---

# Using Git Worktrees — Protocolo Completo de Isolamento

Garantir que o trabalho aconteça num workspace isolado, sem aninhar worktree dentro de worktree por engano e sem começar a implementar sobre uma baseline suja. Esta skill eleva o comando enxuto `commands/worktree.md` (que já cria worktree, copia `.env*` e roda install/lint em background) para o protocolo completo quando a situação exige as garantias extras que um dispatcher curto não cobre bem: detecção de isolamento existente e baseline de testes antes de liberar a task.

**Princípio central:** detectar isolamento existente primeiro. Depois preferir ferramenta nativa. Só then cair para git manual. Nunca lutar contra o harness.

**Anunciar no início:** "Estou usando a skill using-git-worktrees para preparar um workspace isolado."

## Governança Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md` e `policies/handoffs.md`.

## Quando Usar

- antes de executar um plano de implementação que pode conflitar com o branch atual
- quando o usuário pede trabalho paralelo sem afetar o workspace corrente ("worktree", "isolar", "sem mexer no que já tá aberto")
- antes de iniciar uma feature longa, hotfix urgente com trabalho em progresso, ou revisão de PR sem stash
- quando não há certeza se a sessão já está dentro de um worktree/workspace isolado e um novo pode ser criado por engano (aninhamento)

## Quando Não Usar

- mudança pontual de 1-2 arquivos sem risco de conflito — overhead de criar/validar workspace não compensa
- quando o usuário já negou explicitamente a preferência por worktree para a task atual — trabalhar no lugar e pular para setup
- para trocar de branch simples sem necessidade de isolamento — usar `git checkout`/`git switch` direto
- dentro de um monorepo onde o dispatcher `/worktree` já foi chamado nesta mesma sessão para o mesmo branch — não duplicar

## Passo 0 — Detectar Isolamento Existente

**Antes de criar qualquer coisa, verificar se a sessão já está num workspace isolado.**

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
BRANCH=$(git branch --show-current)
```

**Guard de submodule:** `GIT_DIR != GIT_COMMON` também é verdade dentro de submodules git. Antes de concluir "já estou num worktree", confirmar que não é um submodule:

```bash
# Se retornar um caminho, é submodule, nao worktree — tratar como repo normal
git rev-parse --show-superproject-working-tree 2>/dev/null
```

- **Se `GIT_DIR != GIT_COMMON` (e não é submodule):** já está num worktree vinculado. Pular para o Passo 2 (Setup de Projeto). NÃO criar outro worktree.
  - Em branch: "Já está num workspace isolado em `<path>`, branch `<nome>`."
  - HEAD destacada: "Já está num workspace isolado em `<path>` (detached HEAD, gerenciado externamente). Criação de branch necessária ao final."
- **Se `GIT_DIR == GIT_COMMON` (ou é submodule):** repo normal. Seguir para o Passo 1.

Se o usuário ou as instruções do projeto já declararam preferência por worktree, honrar sem perguntar de novo. Caso contrário, confirmar antes de criar: "Quer que eu prepare um worktree isolado? Protege o branch atual de mudanças."

## Passo 1 — Criar Workspace Isolado

**Duas ferramentas possíveis, nesta ordem de preferência.**

### 1a. Ferramenta Nativa (preferida)

Verificar primeiro se há uma ferramenta nativa disponível na sessão: no Claude Code isso é `EnterWorktree`/`ExitWorktree` (cria worktree em `.claude/worktrees/`, cuida de branch e cleanup automaticamente), ou o dispatcher do próprio kit `commands/worktree.md` / `scripts/worktree.mjs` (cria em `../[repo]-[branch]`, copia `.env*`, roda install/lint em background).

Usar `git worktree add` cru quando uma ferramenta nativa está disponível cria estado fantasma que o harness não enxerga nem gerencia — é o erro mais comum nesse protocolo. Só seguir para 1b se nenhuma ferramenta nativa se aplicar.

### 1b. Fallback Git Manual

**Só usar isto se 1a não se aplica** — sem `EnterWorktree` disponível e sem o dispatcher do kit fazendo sentido para o caso (ex: repo consumidor sem `.bot/scripts/worktree.mjs` instalado).

**Seleção de diretório**, nesta ordem de prioridade:

1. Preferência de diretório já declarada nas instruções do usuário/projeto — usar sem perguntar.
2. Diretório de worktree local já existente: `ls -d .worktrees 2>/dev/null` (preferido, oculto) ou `ls -d worktrees 2>/dev/null`. Se ambos existirem, `.worktrees` vence.
3. Sem nenhuma orientação, default para `.worktrees/` na raiz do projeto.

**Verificação de segurança (só para diretórios locais ao projeto) — MUST verificar que o diretório está ignorado antes de criar o worktree:**

```bash
git check-ignore -q .worktrees 2>/dev/null || git check-ignore -q worktrees 2>/dev/null
```

Se NÃO estiver ignorado: adicionar ao `.gitignore`, commitar a mudança, só então prosseguir. Isso evita commitar o conteúdo do worktree inteiro no repositório principal.

```bash
path="$LOCATION/$BRANCH_NAME"
git worktree add "$path" -b "$BRANCH_NAME"
cd "$path"
```

**Fallback de sandbox:** se `git worktree add` falhar por permissão (bloqueio de sandbox), avisar o usuário que a criação foi bloqueada e que o trabalho vai continuar no diretório atual. Rodar setup e baseline de testes no lugar mesmo assim.

## Passo 2 — Setup de Projeto

Auto-detectar e rodar o setup apropriado:

```bash
# Node.js
if [ -f package.json ]; then npm install; fi

# Rust
if [ -f Cargo.toml ]; then cargo build; fi

# Python
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
if [ -f pyproject.toml ]; then poetry install; fi

# Go
if [ -f go.mod ]; then go mod download; fi
```

O dispatcher `scripts/worktree.mjs` já roda essa etapa em background para Node/Python; para Rust/Go, seguir manualmente este passo até o script ganhar suporte equivalente.

## Passo 3 — Verificar Baseline Limpa

**Etapa obrigatória antes de liberar a task para trabalho.** Rodar a suíte de testes do projeto para garantir que o workspace começa limpo:

```bash
npm test / cargo test / pytest / go test ./...
```

- **Se os testes falharem:** reportar as falhas e perguntar se deve prosseguir mesmo assim ou investigar primeiro. Não travar a criação do worktree em si — ele já existe e está pronto fisicamente — mas deixar claro que a baseline está suja.
- **Se os testes passarem:** reportar pronto.

**Por que é obrigatório:** uma baseline suja torna toda falha futura ambígua — sem saber se um teste falhou por causa da mudança nova ou porque já estava quebrado antes, cada iteração de debug perde tempo reconfirmando o óbvio. Rodar agora custa uma vez; não rodar custa em cada falha subsequente.

### Relatório final

```
Worktree pronto em <path completo>
Testes: <N> passando, <M> falhando (ou "0 falhas")
Pronto para implementar <nome da feature>
```

## Referência Rápida

| Situação | Ação |
|---|---|
| Já num worktree vinculado | Pular criação (Passo 0) |
| Dentro de um submodule | Tratar como repo normal (guard do Passo 0) |
| `EnterWorktree` ou dispatcher do kit disponível | Usar (Passo 1a) |
| Nenhuma ferramenta nativa | Fallback git manual (Passo 1b) |
| `.worktrees/` já existe | Usar (verificar se está ignorado) |
| `worktrees/` já existe | Usar (verificar se está ignorado) |
| Ambos existem | Usar `.worktrees/` |
| Nenhum existe | Checar instruções, senão default `.worktrees/` |
| Diretório não ignorado | Adicionar ao `.gitignore` + commit |
| Erro de permissão ao criar | Fallback de sandbox, trabalhar no lugar |
| Testes falham na baseline | Reportar falhas + perguntar, sem travar o worktree |
| Sem `package.json`/`Cargo.toml`/etc | Pular install de dependência |

## Racionalizações Comuns

| Desculpa | Realidade |
|---|---|
| "Obviamente não estou num worktree — não preciso checar" | Rodar o Passo 0. Isolamento criado pelo harness e submodules enganam o olho; os comandos de detecção resolvem. |
| "`git worktree add` é mais rápido que procurar ferramenta nativa" | Uma ferramenta nativa (`EnterWorktree`, dispatcher do kit) já cuida de posicionamento, branch e cleanup. Pular ela é o erro nº 1 — cria estado fantasma que o harness não vê nem gerencia. |
| "O diretório de worktree certamente já está ignorado" | Rodar `git check-ignore`. Um diretório de worktree não ignorado commita a árvore inteira no repo. |
| "Qualquer nome de diretório serve" | Instrução explícita vence diretório local já existente, que vence o default `.worktrees/`. |
| "O workspace está fresco — a baseline de testes pode esperar" | Uma baseline suja torna toda falha futura ambígua. Rodar os testes agora; decidir se prossegue apesar de falha é call do parceiro humano, não automático. |

## Relação com `commands/worktree.md`

O comando `/worktree` (`commands/worktree.md` + `scripts/worktree.mjs`) continua sendo o atalho operacional enxuto para o caso comum: criar worktree em `../[repo]-[branch]`, copiar `.env*`, instalar dependências e rodar lint/typecheck em background. A partir da v2.65.0 o script também executa o Passo 0 (detecção de isolamento, com guard de submodule) antes de criar qualquer coisa, e o Passo 3 (baseline de testes) depois do install, reportando o resultado sem travar o worktree.

Esta skill existe para o protocolo completo: quando a task pede raciocínio explícito sobre qual ferramenta usar (nativa vs. fallback git), seleção de diretório com prioridade declarada, ou quando o comando `/worktree` não está disponível (ex: repo consumidor sem `.bot/` instalado) e o fallback manual (Passo 1b) precisa ser seguido à mão.

## Fontes Externas

Protocolo de detecção de isolamento (Passo 0, incluindo o guard de submodule), preferência por ferramenta nativa antes do fallback git (Passo 1a/1b), seleção de diretório com verificação de `.gitignore`, e a etapa obrigatória de baseline de testes (Passo 3, com a formulação "uma baseline suja torna toda falha futura ambígua") adaptados da skill `using-git-worktrees` do repositório [`obra/superpowers`](https://github.com/obra/superpowers) (licença MIT), path `skills/using-git-worktrees/SKILL.md`.
