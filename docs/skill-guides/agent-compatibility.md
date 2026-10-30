# Compatibilidade entre agentes

O kit mantém as skills em `skills/NN-nome/SKILL.md`. O número identifica a pasta no repositório; o identificador disponibilizado no catálogo do host pode ser diferente. Consulte o catálogo da sessão e, quando não houver carregador de skills, leia o arquivo e suas referências sob demanda. Não presuma que uma ferramenta, slash command, hook ou subagente existe em todos os clientes.

| Host | Descoberta e execução | Limites |
|---|---|---|
| Claude Code | Plugin, skills e agentes registrados pelo host; use os nomes realmente anunciados. | Hooks e ferramentas de delegação dependem da instalação e das permissões da sessão. |
| Codex | Use as skills disponíveis no catálogo da sessão ou leia os arquivos do kit instalado. | Hooks precisam estar registrados no ambiente; delegação depende das ferramentas e instruções da sessão. |
| Grok Build | Leia as instruções do projeto e as skills instaladas; os hooks são opt-in. | A entrega de memória no perfil `memory-deferred` depende de evento posterior de ferramenta; se não houver evento, leia manualmente as learned-skills relevantes. |
| OMP (oh-my-pi) | Para um projeto, copie cada pasta completa de skill para `.omp/skills/<nome>/SKILL.md`, usando o campo `name` como nome da pasta. Para o usuário, o diretório documentado é `~/.omp/agent/skills/`. | Instalações, recursos disponíveis e permissões variam por versão. Cópias são snapshots e não se atualizam automaticamente. |

No OMP, confira conflitos de nomes e mantenha também os diretórios de referências e scripts de cada skill. Exemplo para uma skill, a partir da raiz do kit em PowerShell:

```powershell
New-Item -ItemType Directory -Force '<projeto>/.omp/skills/rag-engineering'
Copy-Item 'skills/90-rag-engineering/*' '<projeto>/.omp/skills/rag-engineering/' -Recurse
```

Esse exemplo é uma instalação manual: confira o destino antes de copiar e preserve qualquer skill existente. Em repositórios consumidores, os caminhos podem estar sob `.bot/`. Veja a [documentação de configuração do OMP](https://github.com/can1357/oh-my-pi/blob/main/docs/config-usage.md).

O `/loop` possui adaptadores para os quatro clientes. Grok e OMP recebem o prompt por arquivo, sem interpretação por shell, e usam o modelo configurado no host quando `--model` não é informado. A medição de tokens não está implementada nesses dois adaptadores: `--max-tokens` é recusado. O adaptador OMP recebeu uma resposta real em um teste mínimo; autenticação, provedor, permissões e tarefas com ferramentas ainda precisam ser verificados no ambiente de destino. O adaptador Grok tem testes simulados e depende de validação real. Consulte `commands/loop.md`.

O diagnóstico de uso conta somente eventos explícitos da ferramenta `Skill` que foram registrados. Leitura direta e uso em outros hosts não entram no contador; ausência de evento não comprova ausência de uso.
