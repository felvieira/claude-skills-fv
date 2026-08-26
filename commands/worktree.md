---
description: Cria um git worktree isolado para trabalhar em paralelo sem afetar o branch atual
---

# /worktree — Worktree Isolado

Cria um git worktree em `../[repo]-[branch]`, copia `.env*`, e valida o ambiente antes de começar.
Inspirado no padrão rtk: isolamento total sem perder contexto de ferramentas.

Este comando é o atalho operacional enxuto para o caso comum. Para o protocolo completo — deteção
explícita de isolamento existente, escolha entre ferramenta nativa (`EnterWorktree`) e fallback git,
seleção de diretório com prioridade declarada, e a etapa obrigatória de baseline de testes — ver
`skills/65-using-git-worktrees/SKILL.md` (protocolo adaptado de `obra/superpowers`, MIT).

## Como usar

```
/worktree [nome-do-branch]
/worktree feature/nova-auth
/worktree fix/login-bug
/worktree --list
/worktree --clean [nome-do-branch]
```

### Atalho executável

Equivalente via script (mesmo comportamento, sem precisar do agente):

```bash
node scripts/worktree.mjs feature/nova-auth
node scripts/worktree.mjs --list
node scripts/worktree.mjs --clean feature/nova-auth
# em repos consumidores com .bot/ instalado:
node .bot/scripts/worktree.mjs feature/nova-auth
```

Flags: `--existing` (branch já existe), `--no-install`, `--no-validate`, `--no-baseline` (pula a etapa de baseline de testes).

## O que o comando faz

### Criação (`/worktree [branch]`)

**Passo 0 — Detectar isolamento existente (evita aninhar worktree)**

Antes de tudo, o script compara `git rev-parse --git-dir` com `git rev-parse --git-common-dir`
(com guard para não confundir submodule com worktree — ver `skills/65-using-git-worktrees/SKILL.md`
Passo 0). Se a sessão já estiver dentro de um worktree vinculado, o comando **aborta com erro claro**
em vez de criar um worktree aninhado silenciosamente.

**Passo 1 — Verificar pré-condições**
```bash
git status --porcelain          # workspace limpo?
git fetch origin                # branch existe no remote?
```
Se houver mudanças não commitadas, alertar antes de continuar.

**Passo 2 — Criar worktree**
```bash
# Branch novo:
git worktree add ../$(basename $PWD)-[branch] -b [branch]

# Branch existente:
git worktree add ../$(basename $PWD)-[branch] [branch]
```

**Passo 3 — Copiar arquivos de ambiente**
```bash
# Copiar .env*, .env.local, .env.development, etc.
for f in .env .env.*; do
  [[ -f "$f" ]] && cp "$f" "../$(basename $PWD)-[branch]/$f"
done
```

**Passo 4 — Instalar dependências (background)**
```bash
cd ../$(basename $PWD)-[branch]
# Node.js
[[ -f package.json ]] && npm install &
# Python
[[ -f requirements.txt ]] && pip install -r requirements.txt -q &
# Aguardar instalação antes de validar
```

**Passo 5 — Validação rápida**
```bash
# Lint + typecheck em background para feedback antecipado
[[ -f package.json ]] && npm run lint --if-present &
[[ -f package.json ]] && npm run typecheck --if-present &
```

**Passo 6 — Baseline de testes (obrigatória, não trava o worktree)**

Depois que o install termina, o script detecta o runtime do projeto de destino
(`package.json` → `npm test`, `Cargo.toml` → `cargo test`, `pyproject.toml`/`requirements.txt` → `pytest`,
`go.mod` → `go test ./...`) e roda a suíte padrão em background. O worktree já está pronto fisicamente
antes disso — a baseline só reporta claramente "limpa" ou "suja", sem impedir o uso do worktree. Uma
baseline suja torna toda falha futura ambígua, então vale sempre conferir o resultado antes de confiar
em qualquer teste que falhar depois. Pular com `--no-baseline`.

**Passo 7 — Relatório**
Exibir:
- Caminho do worktree criado
- Branch ativo
- Arquivos `.env*` copiados
- Resultado das validações (quando disponível)
- Resultado da baseline de testes (quando disponível)
- Comando para navegar: `cd ../[repo]-[branch]`

### Listagem (`/worktree --list`)
```bash
git worktree list
```
Mostra todos os worktrees ativos com branch e HEAD.

### Limpeza (`/worktree --clean [branch]`)
```bash
git worktree remove ../$(basename $PWD)-[branch] --force
git branch -d [branch]    # só se branch já mergeado
```

## Boas práticas

- Sempre trabalhe no worktree (não no repo original) durante desenvolvimento isolado
- Use `/ship` dentro do worktree para release — ele opera no contexto atual
- Remova worktrees com `--clean` após merge para evitar acúmulo de diretórios
- Nunca commite o worktree no `.gitignore` do repo principal

## Quando usar

| Situação | Use |
|---|---|
| Feature longa sem interferir no main | `/worktree feature/X` |
| Hotfix urgente com trabalho em progresso | `/worktree hotfix/Y` (mantém current) |
| Code review de PR sem stash | `/worktree pr/123` |
| Comparar comportamento entre branches | Dois worktrees simultâneos |

## Políticas relevantes
- `policies/tool-safety.md` — verificar antes de operações destrutivas
- `policies/execution.md` — validar ambiente antes de executar

## Fontes Externas

Deteção de isolamento (Passo 0) e baseline de testes obrigatória antes de liberar o worktree
(Passo 6) adaptadas da skill `using-git-worktrees` do repositório
[`obra/superpowers`](https://github.com/obra/superpowers) (licença MIT). Protocolo completo,
incluindo o fallback manual de `git worktree add` e a tabela de racionalizações comuns, em
`skills/65-using-git-worktrees/SKILL.md`.
