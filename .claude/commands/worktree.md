---
description: Cria um git worktree isolado para trabalhar em paralelo sem afetar o branch atual
---

# /worktree — Worktree Isolado

Cria um git worktree em `../[repo]-[branch]`, copia `.env*`, e valida o ambiente antes de começar.
Inspirado no padrão rtk: isolamento total sem perder contexto de ferramentas.

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

Flags: `--existing` (branch já existe), `--no-install`, `--no-validate`.

## O que o comando faz

### Criação (`/worktree [branch]`)

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

**Passo 6 — Relatório**
Exibir:
- Caminho do worktree criado
- Branch ativo
- Arquivos `.env*` copiados
- Resultado das validações (quando disponível)
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
