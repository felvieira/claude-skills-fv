---
name: context-manager
description: |
  Skill de gerenciamento de contexto e tarefas usando ferramentas nativas do Claude Code (TaskCreate, TaskUpdate,
  TaskList) com persistencia em arquivos markdown. Use quando precisar organizar tarefas, acompanhar progresso,
  trocar foco de trabalho, ou manter historico entre sessoes. Trigger em: "criar tarefa", "nova task", "to-do",
  "lista de tarefas", "status", "progresso", "trocar foco", "resetar contexto", "o que falta", "proxima tarefa",
  "contexto atual", "historico", "arquivar", "pipeline", "acompanhar".
---

# Context Manager - Gerenciamento de Contexto e Tarefas

O Context Manager mantém o foco e a rastreabilidade do trabalho. Toda sessão de desenvolvimento deve ter contexto claro e tarefas rastreáveis.

## Responsabilidades

1. Criar listas de tarefas a partir de specs, issues ou pedidos do usuário
2. Atualizar status das tarefas em tempo real conforme progresso
3. Detectar mudança de foco quando o usuário muda de assunto
4. Resetar contexto com histórico compacto ao trocar de feature
5. Persistir estado entre sessões via arquivos markdown em `docs/context/`

## Ciclo de Vida de uma Tarefa

Toda tarefa segue o ciclo usando as ferramentas nativas do Claude Code:

```
TaskCreate (pending) → TaskUpdate (in_progress) → Execução → TaskUpdate (completed) → TaskList (verificação)
```

### Fluxo Detalhado

1. **Criação**: Usar `TaskCreate` com título imperativo e descrição curta
2. **Início**: Antes de começar a executar, `TaskUpdate` para `in_progress`
3. **Execução**: Realizar o trabalho (código, análise, revisão)
4. **Conclusão**: `TaskUpdate` para `completed` com resumo do que foi feito
5. **Verificação**: `TaskList` para confirmar estado geral e decidir próxima tarefa

### Regras de Nomeação

- Título sempre no imperativo: "Criar endpoint de login", "Corrigir validação de email"
- Máximo 60 caracteres no título
- Descrição opcional com 1 frase de contexto

## Detecção de Mudança de Foco

Quando o usuário pede algo não relacionado às tarefas ativas:

1. **Identificar**: O novo pedido não se encaixa em nenhuma tarefa ativa
2. **Confirmar**: Perguntar ao usuário se deseja trocar de foco
3. **Arquivar**: Mover tarefas do contexto atual para `docs/context/history.md` (1-2 linhas por tarefa)
4. **Atualizar**: Reescrever `docs/context/current-focus.md` com o novo foco
5. **Criar**: Novas tarefas para o novo contexto

### Sinais de Mudança de Foco

- Usuário menciona feature/módulo diferente do atual
- Pedido não tem relação com nenhuma tarefa `in_progress` ou `pending`
- Usuário diz explicitamente: "agora vamos para...", "muda o foco", "esquece isso"

## Regras de Reset

### Reset Explícito

Quando o usuário pedir para resetar ("reset", "limpa tudo", "começa do zero"):

1. Arquivar todas as tarefas ativas em `docs/context/history.md`
2. Limpar `docs/context/current-focus.md`
3. Confirmar reset com o usuário
4. Aguardar novo foco

### Reset por Mudança de Foco

1. Perguntar confirmação antes de arquivar
2. Só arquivar após confirmação explícita do usuário
3. Manter tarefas `completed` no histórico com status final

### Limite de Tarefas Ativas

- Nunca acumular mais de 15 tarefas ativas (pending + in_progress)
- Ao atingir 15, forçar priorização: completar ou arquivar antes de criar novas
- Alertar o usuário quando atingir 12 tarefas ativas

## Arquivos de Persistência

### docs/context/current-focus.md

```markdown
# Foco Atual

- **Feature**: [nome da feature em desenvolvimento]
- **Data início**: [YYYY-MM-DD]
- **Status**: em andamento | pausado | aguardando revisão
- **Pipeline**: PO → UI/UX → Backend → Frontend → QA → Security → Deploy
- **Etapa atual**: [em qual etapa do pipeline está]

## Tarefas Ativas

| # | Tarefa | Status | Início |
|---|--------|--------|--------|
| 1 | [título imperativo] | pending / in_progress / completed | YYYY-MM-DD |
| 2 | [título imperativo] | pending / in_progress / completed | YYYY-MM-DD |
```

### docs/context/history.md

```markdown
# Histórico de Contextos

| Data | Feature | Resultado | Status |
|------|---------|-----------|--------|
| YYYY-MM-DD | [nome da feature] | [resumo do que foi completado em 1 frase] | concluída / pausada / abandonada |
| YYYY-MM-DD | [nome da feature] | [resumo do que foi completado em 1 frase] | concluída / pausada / abandonada |
```

### Tracking Multi-Feature

Quando multiplas features rodam em paralelo:

current-focus.md suporta multiplos blocos:
```markdown
# Foco Atual

## Feature: Login Social
**Status:** Backend (em andamento)
**Pipeline:** PO -> UI/UX -> Backend* -> Frontend -> QA -> Security -> Reviewer -> Deploy

## Feature: Dashboard
**Status:** Pausado (depende de Login Social API)
**Dependencia:** Login Social → endpoint /auth/social

## Bugfix: Calculo de Frete
**Status:** QA (testes passando)
**Pipeline:** Backend -> QA* -> Security -> Reviewer -> Deploy
```

Regras:
- Maximo 3 features ativas simultaneamente
- Dependencias entre features DEVEM ser registradas
- Feature bloqueada por dependencia fica com status "Pausado"
- Ao completar a dependencia, notificar e retomar feature bloqueada

## Boas Práticas

1. **Títulos imperativos**: "Criar componente X", nunca "Componente X" ou "Criando componente X"
2. **Máximo 10 tarefas pending**: Se passar de 10, priorizar antes de criar novas
3. **Arquivar a cada 5 completed**: A cada 5 tarefas concluídas, mover para histórico
4. **Histórico máximo 50 linhas**: Ao passar de 50, manter apenas as 30 mais recentes
5. **Uma tarefa in_progress por vez**: Foco em terminar antes de começar outra
6. **Atualizar current-focus.md a cada mudança de etapa do pipeline**
7. **Zero comentários no código**: Todo código gerado deve ser autoexplicativo, sem comentários

## Integração com Orchestrator

O Context Manager trabalha em conjunto com o Orchestrator (skill 09):

- O Orchestrator decide **qual skill** deve executar uma tarefa
- O Context Manager rastreia **o progresso** dessas tarefas
- Quando o Orchestrator delega para uma skill, o Context Manager atualiza o status
- Quando uma skill conclui, o Context Manager registra a conclusão
- O Context Manager informa ao Orchestrator quais tarefas estão pendentes para decidir próximos passos

### Fluxo Integrado

```
Usuário pede feature → Context Manager cria tarefas → Orchestrator distribui para skills →
Skills executam → Context Manager atualiza status → Orchestrator verifica próxima etapa
```

## Código Limpo

Todo código produzido sob gerenciamento deste contexto segue a regra de zero comentários. O código deve ser autoexplicativo através de:

- Nomes de variáveis e funções descritivos
- Funções pequenas com responsabilidade única
- Estrutura de pastas que reflete a arquitetura
- Types/interfaces como documentação viva
