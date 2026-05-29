# Investigate-First Policy

## Princípio

**Antes de perguntar ao usuário, esgote o que você mesmo pode descobrir.**

Toda pergunta cujo a resposta está disponível via terminal, filesystem, config ou rede é uma pergunta proibida. Investigar é barato; interromper o usuário é caro. O usuário delegou a tarefa justamente pra não ter que responder coisas que a máquina já sabe.

Regra mental: antes de cada `AskUserQuestion` (ou pergunta em prosa), responda a si mesmo:

> "Existe um comando, arquivo ou request que me daria essa resposta em <5s?"

Se sim → **rode o comando, não pergunte.** Só pergunte o que depende de **preferência, intenção ou contexto que não existe em lugar nenhum do ambiente**.

## O que é auto-descobrível (NUNCA perguntar)

| Pergunta proibida | Como descobrir sozinho |
|---|---|
| "Qual seu usuário do GitHub?" | `gh api user --jq .login` ou `gh auth status` ou `git config user.name` |
| "Você tem o gh instalado/logado?" | `gh auth status` (exit 0 = logado) |
| "Qual seu email do git?" | `git config user.email` |
| "Qual o nome do repositório / remote?" | `git remote -v` / `gh repo view --json nameWithOwner` |
| "Qual branch você está?" | `git branch --show-current` |
| "Qual o package manager do projeto?" | detectar lockfile: `pnpm-lock.yaml` / `yarn.lock` / `package-lock.json` / `bun.lockb` |
| "Qual a versão do Node/Python/Go?" | `node -v` / `python --version` / `go version` / ler `.nvmrc` `.python-version` |
| "Qual o framework / stack?" | ler `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `docs/repo-audit/current.md` |
| "Tem testes? qual runner?" | grep `package.json` scripts, procurar `vitest`/`jest`/`pytest`/`go test` |
| "Qual o script de build/dev?" | ler `package.json` scripts / `Makefile` / `justfile` |
| "Onde estão os arquivos X?" | `Glob`/`Grep` antes de perguntar localização |
| "Qual a estrutura do projeto?" | `git ls-files`, árvore de diretórios, `graphify-out/` se existir |
| "Que linguagem esse arquivo está?" | extensão do arquivo + shebang |
| "O servidor está rodando? em qual porta?" | `curl -s localhost:PORT` / `lsof -i` / `ss -tlnp` |
| "Qual o gerenciador de container?" | `docker ps`, existência de `docker-compose.yml` / `Dockerfile` |
| "Quais variáveis de ambiente existem?" | ler `.env.example` / `.env` / `printenv` (cuidado com secrets) |
| "Qual o usuário/conta de um MCP conectado?" | a maioria dos MCP tem tool `whoami`/`get_me` — chame-a |
| "Qual versão do plugin/lib está instalada?" | ler `package.json`, `requirements.txt`, lockfile, `--version` |
| "Esse comando/binário existe?" | `command -v <bin>` / `which <bin>` (exit code) |
| "Qual o conteúdo/decisão da sessão passada?" | ler `.bot/`, `D:\claude-memory\logs\`, working-set |

## O que NÃO é auto-descobrível (PODE perguntar)

Pergunte apenas quando a resposta é **genuinamente do usuário** — não existe no ambiente:

- **Preferência subjetiva:** "Prefere dark ou light theme no dashboard?"
- **Intenção/escopo ambíguo:** "Esse refactor é só no módulo de auth ou no repo todo?"
- **Trade-off de produto:** "Prioriza velocidade de entrega ou cobertura de testes?"
- **Decisão de negócio:** "Esse campo deve ser obrigatório no cadastro?"
- **Credencial/secret que não está no ambiente:** "Qual a API key de produção?" (e mesmo assim, cheque `.env`/secret manager primeiro)
- **Direção de design sem precedente no código:** "Quer manter o padrão atual de erro ou mudar pra Result type?"
- **Confirmação de ação destrutiva/irreversível:** "Posso forçar push na main?" (ver `policies/tool-safety.md`)

Regra de ouro: **se o ambiente tem a resposta, investigue. Se só a cabeça do usuário tem, pergunte.**

## Protocolo operacional

1. **Detecte** que você está prestes a perguntar algo.
2. **Classifique:** auto-descobrível ou genuinamente-do-usuário?
3. Se auto-descobrível → **rode o comando/leitura agora**, sem anunciar "vou verificar" — apenas faça e use o resultado.
4. Se o comando falhar ou for inconclusivo → aí sim, pergunte, **mas mencione o que você já tentou**: "Rodei `gh auth status` e não está logado — qual conta você quer usar?"
5. Se genuinamente-do-usuário → pergunte direto (respeitando o `pre-execution-gate`: 1 pergunta focada por rodada).

## Enforcement

- **Hook ativo:** `hooks/scripts/investigate-first-guard.mjs` (PreToolUse) intercepta `AskUserQuestion` e, se detectar uma pergunta com padrão auto-descobrível, injeta `additionalContext` instruindo a IA a rodar o comando correspondente antes de perguntar. Não bloqueia (não usa `continue:false`) — educa e deixa a IA refazer a decisão.
- **Toggle:** desabilitável via `hooks/config.json` → `"investigate_first": { "enabled": false }` ou variável de disable padrão (ver `policies/hooks.md`).
- O hook é **conservador** (precisão > cobertura): só dispara em padrões claros (github user, gh instalado, git email, package manager, branch, porta, etc). Pergunta de preferência/intenção passa livre.

## Relação com outras policies

- **`pre-execution-gate`** age no prompt do *usuário* (clarificar intenção ambígua). Esta policy age na *IA* (impedir que ela pergunte o auto-descobrível). São complementares: o gate pode mandar "faça 1 pergunta" e esta policy garante que essa pergunta não seja sobre algo investigável.
- **`policies/code-exploration.md`** — mesma filosofia aplicada a código: prefira investigar (graph/symbol/semantic) antes de Grep bruto. Esta policy generaliza pra todo o ambiente, não só código.
- **`policies/tool-safety.md`** — a exceção: ações destrutivas/externas de alto risco SEMPRE pedem confirmação, mesmo que "descobríveis". Investigar ≠ executar irreversível sem aval.
