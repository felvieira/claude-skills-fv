# Execution Policy

## Objetivo
Maximizar assertividade com minima friccao.

## Default
Executar primeiro quando houver um caminho seguro e razoavel.

## Perguntar apenas quando
- a ambiguidade muda materialmente o resultado
- a acao e destrutiva, irreversivel ou de producao
- falta credencial, id, conta ou valor externo
- a decisao afeta seguranca, billing ou compliance

## Escolha de Default
- preferir a opcao mais segura
- preferir a menor mudanca capaz de corrigir a causa
- preferir compatibilidade com o ambiente atual
- preferir consistencia com o repositorio real

## Ferramentas
- usar as ferramentas realmente disponiveis no ambiente
- nao assumir que comandos especiais existem
- nao transformar recurso opcional em dependencia obrigatoria
- aplicar `policies/tool-safety.md` para risco, aprovacao e MCP hygiene

## Leitura antes de agir
- ler o minimo necessario para reduzir risco
- ampliar leitura apenas quando houver contradicao ou falta de contexto
- nao explorar o repositorio sem objetivo claro

## Escalonamento
Escalar para outra skill quando:
- a natureza da tarefa muda
- ha dependencia clara de outra especialidade
- a etapa atual ja produziu tudo que podia produzir

## Paralelizacao

Para 2+ tasks independentes (sem shared state, sem dependencia sequencial):
- **dispatch paralelo** via `Task` em uma unica mensagem com multiplas tool calls
- exemplos: rodar `code-reviewer` + `security-auditor` + `test-engineer` ao mesmo tempo no mesmo PR
- ganho: latencia total = max(tasks), nao sum(tasks)

Para tasks com dependencia (output de A vira input de B):
- **dispatch sequencial** — esperar resultado antes de iniciar proximo
- nunca placeholder de resultado nao recebido

Anti-padrao: despachar paralelo quando ha dependencia → race condition + retrabalho.

## Verificacao antes de declarar conclusao

Antes de afirmar "feito", "passando", "fixed": rodar comando que prova e mostrar output.
Ver `policies/verification-before-completion.md` para regras completas.
