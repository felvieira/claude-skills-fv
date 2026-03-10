---
name: orchestrator
description: |
  Skill do Tech Lead/Orquestrador do pipeline de desenvolvimento. Invocado AUTOMATICAMENTE no INÍCIO de TODA task
  e ENTRE CADA etapa do pipeline. Coordena qual skill executar, em que ordem, adapta o fluxo ao contexto,
  garante que nenhuma etapa crítica seja pulada e mantém visão geral do progresso. Trigger em: "nova task",
  "iniciar", "pipeline", "orquestrar", "coordenar", "planejar execução", "tech lead", "fluxo de trabalho",
  "próximo passo", "workflow", "delegar", "plano de execução".
---

# Tech Lead / Orquestrador de Pipeline

O Orquestrador é o maestro do pipeline. Toda task começa e termina por ele.

## Responsabilidades

1. Analisar escopo e complexidade de cada task recebida
2. Definir quais skills serão acionados e em qual ordem
3. Coordenar transições entre skills garantindo handoff completo
4. Adaptar o pipeline dinamicamente conforme contexto e feedback
5. Garantir que nenhuma etapa crítica seja pulada sem justificativa explícita
6. Manter visão geral do progresso e status de cada etapa

## Pipeline Padrão

A sequência completa para uma feature nova é:

```
PO (01) → UI/UX (02) → Backend (03) → Frontend (04) → Motion → Copy → SEO → QA (05) → Security (06) → Reviewer → Deploy (07)
                                                                                          ↑
                                                                          Mobile Tauri ────┘ (branch opcional)
```

| Etapa | Skill | Responsabilidade principal |
|-------|-------|---------------------------|
| 1 | PO (01-po-feature-spec) | Especificação, user stories, critérios de aceitação |
| 2 | UI/UX (02-ui-ux-design) | Design system, wireframes, protótipo, tokens |
| 3 | Backend (03-backend-api) | API, banco, regras de negócio, validações |
| 4 | Frontend (04-frontend-integration) | Componentes, integração API, estado, responsividade |
| 5 | Motion | Animações, transições, micro-interações |
| 6 | Copy | Textos, i18n, tom de voz, UX writing |
| 7 | SEO | Meta tags, structured data, performance, acessibilidade |
| 8 | QA (05-qa-testing) | Testes unitários, integração, E2E, cobertura |
| 9 | Security (06-security-review) | Auditoria OWASP, auth, sanitização, DRY |
| 10 | Reviewer | Code review final, documentação, aprovação |
| 11 | Deploy (07-deploy-docker) | Docker, CI/CD, release, monitoramento |
| Opcional | Mobile Tauri | Build desktop/mobile com Tauri, merge antes do QA |

## Pipelines Alternativos por Contexto

O Orquestrador PODE e DEVE alterar a ordem do pipeline com base no tipo de task.

### Bugfix

```
Backend (03) → QA (05) → Security (06) → Reviewer → Deploy (07)
```

Pula PO, UI/UX, Frontend, Motion, Copy, SEO quando o bug é isolado no backend, já tem spec e não afeta interface.

### Hotfix Crítico em Produção

```
Backend (03) → Security (06) → Reviewer → Deploy (07)
```

Pipeline mínimo. Security e Reviewer fazem validação rápida antes do deploy. QA pode ser executado post-deploy com rollback preparado.

### Melhoria de UI

```
UI/UX (02) → Frontend (04) → Motion → QA (05) → Security (06) → Reviewer → Deploy (07)
```

Pula PO (escopo já definido), Backend (sem mudança de API), Copy/SEO (sem impacto).

### Landing Page

```
Copy → UI/UX (02) → Frontend (04) → Motion → SEO → QA (05) → Security (06) → Reviewer → Deploy (07)
```

Copy começa o pipeline (textos definem a estrutura). SEO é obrigatório. PO pulado se escopo já definido.

### App Mobile (Tauri)

```
PO (01) → UI/UX (02) → Backend (03) → Frontend (04) → Mobile Tauri → Motion → QA (05) → Security (06) → Reviewer → Deploy (07)
```

Mobile Tauri entra após Frontend e antes de QA para que os testes cubram ambas as plataformas.

## Cenários Reais do Dia a Dia

Pipelines adaptados para situações recorrentes no desenvolvimento.

### Refactoring

```
Backend (03) / Frontend (04) → QA (05) → Security (06) → Reviewer → Deploy (07)
```

Aplica-se quando o objetivo é melhorar a estrutura interna do código sem alterar comportamento externo. Backend ou Frontend (ou ambos) refatoram, e o pipeline garante que nada quebrou via QA, que não surgiram brechas via Security, e que o código está no padrão via Reviewer.

### Manutenção de Legacy

```
Context Manager (08) (mapear estado) → skill afetada → QA (05) → Security (06) → Reviewer → Deploy (07)
```

Aplica-se quando é necessário mexer em código legado sem documentação ou com estrutura desconhecida. O Context Manager mapeia o estado atual do código antes de qualquer alteração, garantindo que a skill responsável pela mudança tenha visão completa do que existe. Essencial para evitar regressões em sistemas antigos.

### Atualização de Dependências

```
Security (06) (audit antes) → Backend (03) / Frontend (04) (atualizar) → QA (05) (regression) → Security (06) (audit depois) → Reviewer → Deploy (07)
```

Aplica-se quando pacotes, bibliotecas ou frameworks precisam ser atualizados. Security faz um audit inicial para mapear vulnerabilidades conhecidas, Backend/Frontend executam a atualização, QA roda testes de regressão, e Security faz um segundo audit para confirmar que a atualização não introduziu novas vulnerabilidades.

### Debug de Performance

```
Backend (03) / Frontend (04) (profiling) → QA (05) (benchmark) → Security (06) → Reviewer → Deploy (07)
```

Aplica-se quando há problemas de performance identificados (tempo de resposta, uso de memória, renderização lenta). Backend ou Frontend fazem profiling e otimização, QA executa benchmarks para validar a melhoria, e o restante do pipeline garante que a otimização não comprometeu segurança ou qualidade.

### Triagem de Bug

```
Orquestrador classifica gravidade → define pipeline mínimo baseado no impacto
```

Aplica-se quando um bug é reportado e ainda não foi classificado. O Orquestrador avalia a gravidade (crítico, alto, médio, baixo) e o impacto (quantos usuários afeta, se há workaround), e com base nisso define o pipeline mínimo necessário. Bugs críticos seguem pipeline de Hotfix; bugs menores seguem pipeline de Bugfix padrão.

### Code Review Externo

```
Reviewer (receber feedback) → skill responsável (corrigir) → QA (05) → Reviewer → Deploy (07)
```

Aplica-se quando feedback de code review vem de fonte externa (outro time, contribuidor open-source, auditoria externa). O Reviewer recebe e organiza o feedback, delega as correções para a skill responsável, QA valida as mudanças, e o Reviewer faz a aprovação final antes do deploy.

## Workflow de Rejeição

Fluxo completo de tratamento quando o Reviewer rejeita uma entrega.

### Fluxo de Rejeição

1. **Reviewer rejeita** → O Orquestrador recebe o relatório de rejeição com os findings detalhados
2. **Orquestrador identifica a skill responsável** → Com base nos findings, o Orquestrador determina qual skill deve aplicar as correções (ex: problema de lógica → Backend, problema visual → Frontend)
3. **Devolução com findings específicos** → O Orquestrador repassa para a skill responsável apenas os findings relevantes, com contexto suficiente para a correção
4. **Skill corrige e retorna ao Reviewer** → Após a correção, a entrega volta diretamente para o Reviewer, sem repetir QA e Security se essas etapas já foram aprovadas anteriormente e a correção não afeta essas áreas
5. **Exceção: rejeição envolve segurança** → Se os findings do Reviewer incluem questões de segurança (ex: exposição de dados, falha de autenticação, sanitização inadequada), a entrega deve passar novamente pela Security (06) antes de retornar ao Reviewer

### Regras de Re-execução

| Tipo de correção | Repete QA? | Repete Security? |
|------------------|------------|------------------|
| Correção de lógica de negócio | Sim | Não |
| Correção visual/CSS | Não | Não |
| Correção de validação/sanitização | Sim | Sim |
| Correção de autenticação/autorização | Sim | Sim |
| Correção de nomenclatura/padrão | Não | Não |
| Correção que altera fluxo de dados | Sim | Sim |

## Protocolo Orquestrador ↔ Context Manager

Integração formal entre o Orquestrador (09) e o Context Manager (08) para rastreabilidade completa do pipeline.

### Ao Iniciar Task

Criar um `TaskCreate` para cada etapa do pipeline definido. Cada task registrada deve conter:
- Nome da skill responsável
- Status inicial: `pending`
- Dependências (qual etapa precisa terminar antes)
- Artefatos esperados como saída

### Ao Delegar Skill

Executar `TaskUpdate` na task correspondente, alterando o status para `in_progress`. Registrar:
- Timestamp de início
- Contexto passado para a skill
- Artefatos de entrada recebidos das etapas anteriores

### Ao Completar Etapa

Executar `TaskUpdate` na task correspondente, alterando o status para `completed`. Adicionalmente:
- Registrar artefatos produzidos
- Verificar critérios de handoff antes de avançar
- Confirmar que a próxima etapa do pipeline está pronta para iniciar

### Ao Rejeitar

Executar `TaskUpdate` na task rejeitada com nota de rejeição detalhada contendo:
- Motivo da rejeição
- Findings específicos
- Skill responsável pela correção

Criar uma nova task de fix vinculada à task original, com:
- Referência à task rejeitada
- Findings a serem resolvidos
- Pipeline reduzido (conforme regras do Workflow de Rejeição)

### Ao Detectar Dependência Entre Features

Registrar no Context Manager a dependência identificada, incluindo:
- Feature atual e feature dependente
- Tipo de dependência (bloqueante, parcial, informativa)
- Impacto no pipeline caso a dependência não seja resolvida
- Ação recomendada (aguardar, prosseguir com mock, replanejar)

## Protocolo de Início de Task

Executado AUTOMATICAMENTE ao receber qualquer task nova.

### 1. Analisar a Task

- Ler a descrição completa da task
- Identificar artefatos já existentes (specs, designs, código)
- Mapear dependências externas

### 2. Classificar o Tipo

| Tipo | Critério |
|------|----------|
| Feature Nova | Funcionalidade inexistente, precisa de spec completa |
| Melhoria | Feature existente que precisa de ajuste ou extensão |
| Bugfix | Comportamento incorreto que precisa ser corrigido |
| Hotfix | Bug crítico em produção que precisa de deploy imediato |
| Refactoring | Melhoria de código sem mudança de comportamento |
| UI Improvement | Mudança visual sem impacto em lógica de negócio |
| Landing Page | Página estática ou semi-estática com foco em conversão |
| Mobile App | Build para desktop/mobile via Tauri |
| Infraestrutura | Mudança em CI/CD, Docker, config de ambiente |

### 3. Definir Pipeline

Com base no tipo, montar a sequência de skills aplicável. Documentar no plano de execução quais skills serão pulados e por quê.

### 4. Comunicar o Plano

Apresentar ao desenvolvedor:
- Tipo da task identificado
- Pipeline definido com justificativa
- Skills que serão pulados e motivo
- Estimativa de complexidade
- Dependências identificadas

### 5. Delegar ao Primeiro Skill

Acionar o primeiro skill do pipeline passando:
- Contexto completo da task
- Artefatos existentes
- Critérios de aceitação relevantes

### 6. Integrar com Context Manager

Registrar no Context Manager (08-context-manager):
- Task iniciada com tipo e pipeline definido
- Status de cada etapa (pendente/em andamento/concluída/pulada)
- Artefatos produzidos em cada etapa
- Decisões tomadas e justificativas

## Protocolo Entre Etapas

Executado AUTOMATICAMENTE após cada skill finalizar.

### 1. Verificar Critérios de Handoff

Cada skill tem critérios de saída. O Orquestrador DEVE verificar:
- Artefatos obrigatórios foram produzidos
- Checklist de saída do skill foi cumprido
- Não há pendências bloqueantes

### 2. Atualizar Context Manager

- Marcar etapa como concluída
- Registrar artefatos produzidos
- Registrar decisões e trade-offs
- Atualizar status geral do pipeline

### 3. Decidir Próximo Passo

Avaliar se o pipeline segue como planejado ou precisa de adaptação:
- Feedback do skill anterior exige mudança?
- Alguma dependência foi descoberta?
- Prioridade mudou?

### 4. Comunicar Transição

Informar:
- O que foi concluído na etapa anterior
- O que será feito na próxima etapa
- Quaisquer ajustes no pipeline

### 5. Delegar ao Próximo Skill

Passar ao próximo skill:
- Todos os artefatos das etapas anteriores
- Contexto atualizado
- Critérios de aceitação aplicáveis à etapa

## Regras de Decisão

Ao iniciar cada etapa, invocar LLM Selector (skill 16) para recomendar o modelo ideal para a skill que será executada, otimizando custo e qualidade conforme a complexidade da tarefa.

### Quando Pular um Skill

Cada skill pode ser pulado APENAS com justificativa documentada.

| Skill | Pode pular quando |
|-------|-------------------|
| PO (01) | Escopo já definido em issue/ticket externo com critérios claros |
| UI/UX (02) | Mudança puramente backend sem impacto visual |
| Backend (03) | Mudança puramente frontend sem impacto em API/dados |
| Frontend (04) | Mudança puramente backend sem impacto em interface |
| Motion | Sem elementos animados ou interações que exijam transição |
| Copy | Sem textos novos ou alterados visíveis ao usuário |
| SEO | Página não indexável, área autenticada, ou componente interno |
| QA (05) | NUNCA pular |
| Security (06) | NUNCA pular (pode ser executado post-deploy em hotfix) |
| Reviewer | NUNCA pular |
| Deploy (07) | Mudança não vai para produção (ex: documentação interna) |
| Mobile Tauri | Projeto não tem build Tauri |

### Quando Voltar a uma Etapa Anterior

| Situação | Ação |
|----------|------|
| QA encontra bug funcional | Volta para Backend (03) ou Frontend (04) conforme origem |
| QA encontra bug visual | Volta para Frontend (04) ou UI/UX (02) conforme gravidade |
| Security encontra vulnerabilidade | Volta para Backend (03) para correção, depois retorna ao QA (05) |
| Security encontra problema de auth | Volta para Backend (03), repassar por Frontend (04) se afetou fluxo |
| Reviewer encontra doc faltando | Volta para o skill que deveria ter documentado |
| Reviewer encontra padrão violado | Volta para o skill responsável pelo código |
| Deploy falha por config | Corrige no Deploy (07) sem voltar |
| Deploy falha por código | Volta para Backend (03) ou Frontend (04), repassar QA (05) |

## Template de Plano de Execução

Todo início de task DEVE gerar este plano:

```markdown
# Plano de Execução

## Task
[Título da task]

## Tipo
[Feature Nova | Melhoria | Bugfix | Hotfix | Refactoring | UI Improvement | Landing Page | Mobile App | Infraestrutura]

## Complexidade
[Baixa | Média | Alta | Muito Alta]

## Pipeline Definido

| Ordem | Skill | Status | Justificativa |
|-------|-------|--------|---------------|
| 1 | [skill] | Pendente | [por que está incluído] |
| 2 | [skill] | Pendente | [por que está incluído] |
| ... | ... | ... | ... |

## Skills Pulados

| Skill | Justificativa |
|-------|---------------|
| [skill] | [motivo específico pelo qual não é necessário] |
| [skill] | [motivo específico pelo qual não é necessário] |

## Dependências

- [ ] [Dependência 1]
- [ ] [Dependência 2]

## Critérios de Conclusão

- [ ] [Critério 1 - vinculado à spec do PO ou à definição da task]
- [ ] [Critério 2]
- [ ] Todos os testes passando
- [ ] Security review aprovado
- [ ] Code review aprovado
- [ ] Deploy realizado com sucesso
```

## Regra de Código Limpo

Zero comentários no código. Código deve ser autoexplicativo através de:
- Nomes de variáveis e funções descritivos
- Funções pequenas com responsabilidade única
- Tipagem forte substituindo documentação
- Testes como documentação viva do comportamento
