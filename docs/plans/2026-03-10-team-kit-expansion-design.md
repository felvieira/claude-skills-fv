# Dev Team Kit Expansion — Implementation Plan

> Historical note: partes deste plano foram superseded por `GLOBAL.md`, `policies/` e `templates/`. Em caso de conflito, siga a camada global atual do kit.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the Dev Team Kit from 7 to 15 skills, add context management, orchestration, documentation, review, motion design, marketing copy, SEO, and mobile (Tauri) capabilities, plus update all existing skills and rewrite the README.

**Architecture:** Each skill is a standalone SKILL.md in a numbered folder under `skills/`. The Orchestrator (skill 09) acts as continuous coordinator, invoked at the start of every task and between each pipeline step. The Context Manager (skill 08) uses Claude Code's native TaskCreate/TaskUpdate/TaskList for tracking and markdown files for persistence. All skills enforce zero-comment clean code.

**Tech Stack:** React 18+ / Next.js 14+ / Tailwind / Zustand / React Query / Prisma / PostgreSQL / Tauri (mobile) / Framer Motion (animations)

---

## Task 1: Create skill 08-context-manager

**Files:**
- Create: `skills/08-context-manager/SKILL.md`

**Step 1: Create the skill file**

```markdown
---
name: context-manager
description: |
  Skill do Gerenciador de Contexto para tracking de tarefas e memoria entre sessoes. Use quando precisar
  iniciar um novo trabalho, rastrear progresso, mudar de foco, ou verificar status de tarefas em andamento.
  Trigger em: "novo contexto", "tracking", "status", "progresso", "todo", "tarefas", "foco", "contexto",
  "iniciar trabalho", "o que estou fazendo", "listar tarefas", "mudar foco", "resetar contexto".
---

# Context Manager - Gerenciamento de Contexto e Tarefas

O Context Manager e o cerebro operacional do time. Rastreia o que esta sendo feito, mantem historico compacto e reseta inteligentemente ao mudar de foco.

## Responsabilidades

1. Criar todo list ao iniciar qualquer trabalho
2. Atualizar status em tempo real (pending -> in_progress -> completed)
3. Detectar mudanca de foco e resetar contexto com historico resumido
4. Persistir estado entre sessoes via markdown
5. Manter contexto enxuto — nunca acumular demais

## Sistema de Tasks — Claude Code Nativo

Usar SEMPRE as ferramentas nativas:
- TaskCreate: criar nova tarefa
- TaskUpdate: atualizar status (pending -> in_progress -> completed)
- TaskList: listar todas as tarefas e verificar progresso

### Ciclo de Vida de uma Tarefa

```
1. TaskCreate com subject claro e description detalhada
2. TaskUpdate status -> in_progress (ANTES de comecar)
3. Executar o trabalho
4. TaskUpdate status -> completed (DEPOIS de terminar)
5. TaskList pra verificar proxima tarefa
```

## Deteccao de Mudanca de Foco

Quando o usuario pede algo que NAO se relaciona com as tasks atuais:

1. Verificar TaskList — se ha tasks in_progress de outro tema
2. Arquivar contexto atual em `docs/context/history.md` (1-2 linhas por task)
3. Marcar tasks antigas como completed ou deletar se incompletas
4. Criar novas tasks pro novo foco
5. Atualizar `docs/context/current-focus.md`

### Regras de Reset

- Se o usuario diz explicitamente "novo foco", "mudar contexto", "resetar": reset imediato
- Se a nova tarefa nao tem relacao com as tasks atuais: perguntar "Estou mudando o foco de [X] para [Y]. Arquivo o contexto anterior?"
- NUNCA acumular mais de 15 tasks ativas — se passar, arquivar as completed

## Persistencia entre Sessoes

### docs/context/current-focus.md

```markdown
# Foco Atual

**Feature:** [nome da feature]
**Iniciado:** [data]
**Status:** [em andamento / pausado]
**Pipeline:** [PO -> UI/UX -> Backend -> ...]
**Etapa Atual:** [qual skill esta ativa]

## Tasks Ativas
- [x] Task 1 concluida
- [ ] Task 2 em andamento
- [ ] Task 3 pendente
```

### docs/context/history.md

```markdown
# Historico de Contexto

## 2026-03-10 — Feature Login
- Completou: PO spec, UI/UX design, Backend API, Frontend
- Status: Enviado pra QA

## 2026-03-08 — Feature Dashboard
- Completou: Pipeline completo, deployed
- Status: Em producao
```

## Boas Praticas

- Tasks com subject em imperativo: "Criar endpoint de login", nao "Endpoint de login"
- Description com contexto suficiente pra outro agente entender
- Nunca mais de 10 tasks pending ao mesmo tempo
- Arquivar contexto completed a cada 5 tasks finalizadas
- History.md nunca passa de 50 linhas — remover entradas antigas

## Integracao com Orquestrador

O Context Manager trabalha JUNTO com o Orquestrador (skill 09):
- Orquestrador decide QUAL skill chamar
- Context Manager rastreia O QUE esta sendo feito dentro de cada skill
- Ao trocar de etapa no pipeline, Context Manager atualiza current-focus.md

## Codigo Limpo

Todo codigo gerado DEVE ser livre de comentarios.
Nomes descritivos substituem comentarios. Codigo auto-explicativo.
```

**Step 2: Verify file was created**

Run: `cat skills/08-context-manager/SKILL.md | head -5`
Expected: frontmatter with `name: context-manager`

**Step 3: Commit**

```bash
git add skills/08-context-manager/SKILL.md
git commit -m "feat: add context-manager skill (08)"
```

---

## Task 2: Create skill 09-orchestrator

**Files:**
- Create: `skills/09-orchestrator/SKILL.md`

**Step 1: Create the skill file**

```markdown
---
name: orchestrator
description: |
  Skill do Orquestrador / Lider Tecnico para coordenacao continua do pipeline de desenvolvimento.
  Use SEMPRE no inicio de qualquer tarefa e entre cada etapa do pipeline. Ele decide qual skill chamar,
  em que ordem, e adapta o fluxo conforme necessidade. Trigger em: "orquestrador", "lider tecnico",
  "coordenar", "pipeline", "proxima etapa", "qual skill", "fluxo", "sequencia", "prioridade",
  "o que fazer agora", "planejar execucao".
---

# Orquestrador - Lider Tecnico

O Orquestrador e o cerebro estrategico do time. Invocado no inicio de TODA tarefa e entre CADA etapa, decide o que fazer, em que ordem, e adapta o fluxo.

## Responsabilidades

1. Analisar escopo da tarefa recebida
2. Definir quais skills sao necessarias e em que ordem
3. Coordenar transicao entre etapas do pipeline
4. Adaptar pipeline — pular skills desnecessarias ou mudar ordem
5. Garantir que nenhuma etapa critica seja pulada
6. Manter visao geral do progresso

## Pipeline Padrao

```
PO -> UI/UX -> Backend -> Frontend -> Motion -> Copy -> SEO -> QA -> Security -> Reviewer -> Deploy
                                                                                    ^
                                                                      Mobile (Tauri) opcional
```

O Orquestrador PODE alterar esta ordem baseado no contexto:
- Bug fix simples: Backend -> QA -> Security -> Deploy (pula PO, UI/UX, Frontend se nao afeta)
- Hotfix critico: Backend -> Security -> Deploy (minimo viavel)
- Nova feature completa: pipeline inteiro
- Melhoria de UI: UI/UX -> Frontend -> Motion -> QA -> Security -> Deploy
- Landing page: Copy -> UI/UX -> Frontend -> Motion -> SEO -> QA -> Security -> Deploy
- App mobile: pipeline web + Mobile (Tauri) apos Frontend

## Protocolo de Inicio

Ao receber qualquer tarefa:

1. Analisar: O que precisa ser feito?
2. Classificar: Que tipo de tarefa e? (feature, bugfix, hotfix, melhoria, landing, mobile)
3. Definir pipeline: Quais skills, em que ordem
4. Comunicar: "Pipeline definido: [X] -> [Y] -> [Z]. Iniciando por [X]."
5. Delegar: Invocar a primeira skill do pipeline
6. Integrar com Context Manager: Criar tasks para cada etapa

## Protocolo entre Etapas

Ao completar uma etapa:

1. Verificar: A entrega atende os criterios de handoff?
2. Atualizar: Context Manager marca etapa como completed
3. Decidir: Qual a proxima etapa? Precisa voltar? Pode pular algo?
4. Comunicar: "Etapa [X] completa. Handoff: [resumo]. Proxima: [Y]."
5. Delegar: Invocar proxima skill

## Decisoes do Orquestrador

### Quando pular uma skill
- PO: pular se a tarefa ja tem spec clara e criterios de aceitacao
- UI/UX: pular se e mudanca puramente de backend sem impacto visual
- Backend: pular se e mudanca puramente de frontend sem nova API
- Frontend: pular se e mudanca puramente de backend
- Motion: pular se a feature nao tem interacao visual
- Copy: pular se nao envolve textos voltados ao usuario
- SEO: pular se e area autenticada (sem indexacao)
- Mobile: pular se o projeto nao tem versao mobile
- Documentador: NUNCA pular — toda entrega precisa de doc
- QA: NUNCA pular
- Security: NUNCA pular
- Reviewer: NUNCA pular

### Quando voltar uma etapa
- QA encontra bug: volta pra skill responsavel (Backend ou Frontend)
- Security encontra vulnerabilidade: volta pra Backend
- Reviewer encontra doc faltando: volta pro Documentador
- Reviewer encontra problema de qualidade: volta pra skill responsavel

## Template de Plano de Execucao

```markdown
# Plano de Execucao — [Nome da Tarefa]

**Tipo:** Feature / Bugfix / Hotfix / Melhoria / Landing
**Complexidade:** Baixa / Media / Alta

## Pipeline Definido
1. [ ] [Skill] — [o que fazer nesta etapa]
2. [ ] [Skill] — [o que fazer nesta etapa]
3. [ ] [Skill] — [o que fazer nesta etapa]

## Skills Puladas (com justificativa)
- [Skill]: [motivo]

## Dependencias
- [dependencia 1]
- [dependencia 2]

## Criterios de Conclusao
- [ ] Todas etapas completed
- [ ] Doc atualizada
- [ ] QA aprovado
- [ ] Security aprovado
- [ ] Reviewer aprovou
```

## Codigo Limpo

Todo codigo gerado DEVE ser livre de comentarios.
Nomes descritivos substituem comentarios. Codigo auto-explicativo.
```

**Step 2: Commit**

```bash
git add skills/09-orchestrator/SKILL.md
git commit -m "feat: add orchestrator skill (09)"
```

---

## Task 3: Create skill 10-documenter

**Files:**
- Create: `skills/10-documenter/SKILL.md`

**Step 1: Create the skill file**

```markdown
---
name: documenter
description: |
  Skill do Documentador para criacao e manutencao de documentacao por nivel de decisao. Use quando precisar
  documentar features, APIs, arquitetura, fluxos de usuario, regras de negocio, ou qualquer documentacao
  tecnica ou de produto. Trigger em: "documentar", "documentacao", "docs", "README", "API docs",
  "feature doc", "regra de negocio", "fluxo", "arquitetura", "ADR", "decision record", "glossario".
---

# Documentador - Documentacao por Nivel de Decisao

O Documentador cria e mantem documentacao durante o desenvolvimento. Nao espera o final — documenta enquanto constroi.

## Responsabilidades

1. Documentar features (objetivo, regras, fluxo, criterios)
2. Documentar contratos de API
3. Documentar arquitetura e decisoes tecnicas
4. Documentar setup e operacao
5. Manter docs atualizadas quando o codigo muda
6. Nunca documentar o obvio — foco no "por que", nao no "o que"

## Niveis de Documentacao

### 1. Produto/Feature (POR QUE existe)
- Objetivo e problema que resolve
- Regras de negocio
- Fluxo do usuario
- Casos de borda
- Criterios de aceite
- Dependencias com outras features

### 2. Contrato (COMO se comunica)
- Endpoints, metodos, auth
- Request/response payloads
- Codigos de erro
- Validacoes
- Paginacao/filtros
- Exemplos reais

### 3. Implementacao (COMO foi construido)
- Arquitetura front/back
- Componentes reutilizaveis
- Padroes de estado/rotas
- Decisoes tecnicas (ADRs)

### 4. Operacao (COMO roda)
- Setup local
- Deploy
- Observabilidade
- Troubleshooting

## Estrutura de Pastas

```
docs/
  README.md                        # Mapa da documentacao
  features/
    <feature-name>/
      README.md                    # Objetivo, escopo, status
      rules.md                     # Regras de negocio
      flow.md                      # Fluxo do usuario
      api.md                       # Contratos da feature
      ui.md                        # Rotas, componentes, estados
  architecture/
    overview.md                    # Visao geral
    frontend.md                    # Padroes do front
    backend.md                     # Padroes do back
    decisions/
      adr-001-<topico>.md          # Architecture Decision Records
  api/
    README.md                      # Visao geral da API
    errors.md                      # Catalogo de erros
    pagination.md                  # Padrao de paginacao
  ops/
    setup.md                       # Como rodar localmente
    deploy.md                      # Como fazer deploy
    observability.md               # Logs, metricas, alertas
  context/
    current-focus.md               # Gerenciado pelo Context Manager
    history.md                     # Gerenciado pelo Context Manager
```

## Template de Feature

```markdown
# [Nome da Feature]

## Objetivo
O que a feature resolve.

## Escopo
O que entra e o que nao entra.

## Regras de Negocio
- Regra 1
- Regra 2

## Fluxo Principal
1. Usuario faz X
2. Sistema valida Y
3. Front chama endpoint Z
4. Sistema responde com ...

## Fluxos Alternativos / Erros
- Caso A
- Caso B

## Permissoes
Quem pode fazer o que.

## API / Contratos
- GET /...
- POST /...

## Frontend
- Rotas
- Componentes principais
- Estados da UI

## Dependencias
Servicos, features, tabelas, integracoes.

## Criterios de Aceite
- [ ] ...
```

## Template de ADR

```markdown
# ADR-NNN: [Titulo da Decisao]

**Data:** [data]
**Status:** Aceito / Substituido por ADR-XXX

## Contexto
Qual problema estavamos resolvendo.

## Decisao
O que decidimos fazer.

## Alternativas Consideradas
1. [Alternativa A] — [por que nao]
2. [Alternativa B] — [por que nao]

## Consequencias
- Positivas: ...
- Negativas: ...
```

## Regras

- Documentar o PADRAO, nao o JSX linha por linha
- Feature e a unidade central de documentacao
- API como contrato, nao como "explicacao do backend"
- Nunca repetir a mesma informacao em varios MDs
- Nunca misturar regra de negocio com detalhe de implementacao
- Doc boa responde rapido: o que faz? por que existe? como funciona? onde mexer?
- History.md do Context Manager e automatico — nao documentar manualmente

## Quando Documentar

- DURANTE o desenvolvimento, nao depois
- Ao criar nova feature: criar pasta em docs/features/
- Ao criar nova API: documentar contrato
- Ao tomar decisao arquitetural: criar ADR
- Ao mudar algo existente: atualizar doc existente

## Codigo Limpo

Todo codigo gerado DEVE ser livre de comentarios.
Nomes descritivos substituem comentarios. Codigo auto-explicativo.
```

**Step 2: Commit**

```bash
git add skills/10-documenter/SKILL.md
git commit -m "feat: add documenter skill (10)"
```

---

## Task 4: Create skill 11-reviewer

**Files:**
- Create: `skills/11-reviewer/SKILL.md`

**Step 1: Create the skill file**

```markdown
---
name: reviewer
description: |
  Skill do Revisor/Finalizador para validacao final antes do deploy. Use quando precisar checar qualidade
  de codigo, seguranca, testes, documentacao, e dar o aval final para subir codigo. E a ultima porta
  antes do deploy. Trigger em: "revisar", "review final", "checar tudo", "pronto pra deploy?",
  "validacao final", "aprovacao", "liberar codigo", "finalizar", "gate check", "go/no-go".
---

# Reviewer - Validacao Final

O Reviewer e a ultima porta antes do deploy. Nada sobe sem passar por aqui. Ele NAO documenta — ele valida que TUDO foi feito.

## Responsabilidades

1. Validar que todas as etapas do pipeline foram executadas
2. Checar qualidade do codigo (DRY, SOLID, clean code)
3. Confirmar que Security Review passou
4. Confirmar que QA passou (testes + cobertura)
5. Confirmar que documentacao existe e esta atualizada
6. Gerar relatorio de aprovacao/rejeicao

## Checklist de Validacao

### Pipeline
```
[ ] Todas as etapas do pipeline definido pelo Orquestrador foram completadas
[ ] Nenhuma etapa obrigatoria foi pulada (QA, Security, Documenter)
[ ] Handoffs entre etapas foram verificados
```

### Codigo
```
[ ] Zero comentarios no codigo (codigo auto-explicativo)
[ ] Nomes descritivos (sem 'data', 'info', 'temp', 'handler' genericos)
[ ] Funcoes com no maximo 20 linhas
[ ] Sem TODO esquecido
[ ] Sem console.log em producao
[ ] Sem any no TypeScript (exceto integracoes sem tipo)
[ ] Imports organizados (external -> internal -> relative)
[ ] DRY — sem codigo duplicado
[ ] SOLID — cada modulo faz UMA coisa
```

### Testes
```
[ ] Testes unitarios passando
[ ] Testes E2E passando
[ ] Cobertura >= 80%
[ ] Nenhum teste flaky
[ ] Criterios de aceitacao do PO cobertos por testes
```

### Seguranca
```
[ ] Security Review aprovado (skill 06)
[ ] OWASP Top 10 verificado
[ ] npm audit sem HIGH/CRITICAL
[ ] Headers de seguranca configurados
[ ] Auth flow revisado
[ ] .env nao exposto
```

### Documentacao
```
[ ] Feature documentada em docs/features/
[ ] API documentada (contrato)
[ ] ADR criado se houve decisao arquitetural
[ ] README atualizado se necessario
[ ] Context Manager atualizado (current-focus.md)
```

### Performance
```
[ ] Sem re-renders desnecessarios (React)
[ ] Queries otimizadas (sem N+1)
[ ] Bundle size verificado
[ ] Lazy loading onde aplicavel
[ ] Imagens otimizadas
```

## Fluxo de Revisao

1. Receber entrega do pipeline
2. Executar checklist completo
3. Se TUDO passa: Gerar relatorio de APROVACAO
4. Se algo falha: Gerar relatorio de REJEICAO com detalhes e devolver pra skill responsavel

## Template de Relatorio

```markdown
# Review Report — [Feature/Task Name]

**Data:** [data]
**Status:** APROVADO / REJEITADO

## Resumo
[1-2 frases]

## Checklist

### Pipeline: OK / FALHA
- [detalhes se falha]

### Codigo: OK / FALHA
- [detalhes se falha]

### Testes: OK / FALHA
- [detalhes se falha]

### Seguranca: OK / FALHA
- [detalhes se falha]

### Documentacao: OK / FALHA
- [detalhes se falha]

### Performance: OK / FALHA
- [detalhes se falha]

## Decisao
[APROVADO — liberar pro deploy]
[REJEITADO — devolver pra [skill] com [acao necessaria]]
```

## Regras

- NUNCA aprovar com security findings criticos
- NUNCA aprovar sem testes passando
- NUNCA aprovar sem documentacao
- Se rejeitar, ser ESPECIFICO sobre o que precisa ser corrigido e por qual skill
- O Reviewer nao corrige — ele aponta e devolve

## Codigo Limpo

Todo codigo gerado DEVE ser livre de comentarios.
Nomes descritivos substituem comentarios. Codigo auto-explicativo.
```

**Step 2: Commit**

```bash
git add skills/11-reviewer/SKILL.md
git commit -m "feat: add reviewer skill (11)"
```

---

## Task 5: Create skill 12-motion-design

**Files:**
- Create: `skills/12-motion-design/SKILL.md`

**Step 1: Create the skill file**

```markdown
---
name: motion-design
description: |
  Skill do Motion Designer para definicao de animacoes, transicoes e micro-interacoes do sistema.
  Entra depois do Frontend com componentes prontos. Use quando precisar animar componentes, definir
  transicoes de pagina, micro-interacoes, loading animations, ou qualquer aspecto de motion design.
  Trigger em: "animacao", "transicao", "motion", "micro-interacao", "animate", "framer motion",
  "spring", "easing", "parallax", "scroll animation", "hover effect", "entrada", "saida".
---

# Motion Designer - Animacoes e Transicoes

O Motion Designer define como o sistema SE MOVE. Entra apos o Frontend, quando os componentes ja existem e precisam ganhar vida.

## Responsabilidades

1. Definir sistema de animacoes consistente
2. Criar transicoes de pagina
3. Definir micro-interacoes (hover, click, focus)
4. Loading animations e skeleton transitions
5. Scroll-based animations
6. Garantir performance (60fps)

## Stack

```
Framer Motion:   Animacoes React declarativas
CSS Transitions: Interacoes simples (hover, focus)
Tailwind:        Classes utilitarias de transicao
requestAnimationFrame: Animacoes custom de alta performance
```

## Sistema de Motion Tokens

```typescript
export const motion = {
  duration: {
    instant: 0.1,
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
    dramatic: 0.8,
  },
  easing: {
    default: [0.25, 0.1, 0.25, 1.0],
    smooth: [0.4, 0.0, 0.2, 1.0],
    snappy: [0.4, 0.0, 0.0, 1.0],
    bounce: [0.34, 1.56, 0.64, 1.0],
    spring: { type: 'spring', stiffness: 300, damping: 20 },
  },
  stagger: {
    fast: 0.03,
    normal: 0.05,
    slow: 0.1,
  },
} as const;
```

## Padroes de Animacao

### Entrada de Elementos

```typescript
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: motion.duration.normal },
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: motion.duration.normal, ease: motion.easing.smooth },
};

export const slideInFromLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: motion.duration.normal, ease: motion.easing.smooth },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: motion.duration.fast, ease: motion.easing.snappy },
};
```

### Saida de Elementos

```typescript
export const fadeOut = {
  exit: { opacity: 0 },
  transition: { duration: motion.duration.fast },
};

export const slideDown = {
  exit: { opacity: 0, y: 10 },
  transition: { duration: motion.duration.fast, ease: motion.easing.default },
};
```

### Listas com Stagger

```typescript
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: motion.stagger.normal,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};
```

### Transicao de Pagina

```typescript
export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: motion.duration.normal, ease: motion.easing.smooth },
};
```

### Micro-interacoes

```typescript
export const buttonPress = {
  whileTap: { scale: 0.97 },
  whileHover: { scale: 1.02 },
  transition: { type: 'spring', stiffness: 400, damping: 17 },
};

export const cardHover = {
  whileHover: {
    y: -4,
    boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
  },
  transition: { duration: motion.duration.fast, ease: motion.easing.smooth },
};

export const focusRing = {
  whileFocus: {
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)',
  },
};
```

### Loading/Skeleton Transitions

```typescript
export const skeletonToContent = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: motion.duration.normal },
};

export const spinnerRotate = {
  animate: { rotate: 360 },
  transition: { duration: 1, repeat: Infinity, ease: 'linear' },
};
```

### Scroll Animations

```typescript
export const scrollFadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-50px' },
  transition: { duration: motion.duration.slow, ease: motion.easing.smooth },
};
```

## Regras de Performance

- NUNCA animar `width`, `height`, `top`, `left` (causa layout thrashing)
- SEMPRE animar `transform` e `opacity` (GPU accelerated)
- Usar `will-change` com moderacao (nao em tudo)
- Desativar animacoes se `prefers-reduced-motion` ativa
- Manter 60fps — testar com DevTools Performance tab
- Stagger maximo de 10 itens — alem disso, animar em batches

```typescript
export const reducedMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.01 },
};

export const useMotionPreference = () => {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  return prefersReducedMotion ? reducedMotion : undefined;
};
```

## Hierarquia de Animacao

```
Pagina: transicao de entrada/saida (pageTransition)
  Secoes: stagger de entrada (staggerContainer + staggerItem)
    Componentes: micro-interacoes (hover, tap, focus)
      Conteudo: fade in quando dados carregam (skeletonToContent)
```

## Handoff do Frontend

Receber:
1. Componentes implementados e funcionais
2. Lista de componentes interativos
3. Fluxo de navegacao (quais paginas transitam pra quais)
4. Skeleton patterns implementados (pra animar transicao skeleton -> conteudo)

## Handoff para Copy/Marketing

Entregar:
1. Sistema de animacoes definido e implementado
2. Componentes com micro-interacoes
3. Transicoes de pagina configuradas
4. Landing page pronta para receber textos (estrutura animada)

## Codigo Limpo

Todo codigo gerado DEVE ser livre de comentarios.
Nomes descritivos substituem comentarios. Codigo auto-explicativo.
```

**Step 2: Commit**

```bash
git add skills/12-motion-design/SKILL.md
git commit -m "feat: add motion-design skill (12)"
```

---

## Task 6: Create skill 13-marketing-copy

**Files:**
- Create: `skills/13-marketing-copy/SKILL.md`

**Step 1: Create the skill file**

```markdown
---
name: marketing-copy
description: |
  Skill do Marketing Copywriter para criacao de textos de venda, landing pages, CTAs, e copy de conversao.
  Use quando precisar escrever textos voltados ao usuario, landing pages, headlines, CTAs, descricoes de
  produto, emails de onboarding, ou qualquer texto de marketing/vendas. Trigger em: "copy", "landing page",
  "CTA", "headline", "texto de venda", "conversao", "marketing", "slogan", "proposta de valor",
  "beneficio", "call to action", "onboarding text", "microcopy".
---

# Marketing Copywriter - Textos e Landing Page

O Copywriter define TODOS os textos que o usuario ve. De headlines a mensagens de erro. Foco em conversao, clareza e acao.

## Responsabilidades

1. Definir tom de voz e brand voice
2. Escrever headlines e subheadlines
3. Criar CTAs de alta conversao
4. Definir microcopy (botoes, tooltips, mensagens de erro, empty states)
5. Criar landing page completa
6. Escrever textos de onboarding
7. Garantir consistencia de linguagem em todo o sistema

## Principios de Copy

### Formula AIDA (toda landing page)
- **Attention**: Headline que prende em 3 segundos
- **Interest**: Subheadline que conecta com a dor
- **Desire**: Beneficios concretos, social proof
- **Action**: CTA claro e irresistivel

### Regras de Ouro
- Falar do BENEFICIO, nao da funcionalidade
- Uma ideia por frase
- Voz ativa, nunca passiva
- Especifico vence generico ("Economize 4h/semana" > "Economize tempo")
- CTA com verbo de acao ("Comece agora" > "Saiba mais")
- Criar urgencia sem ser manipulativo
- Provas sociais reais (numeros, depoimentos, logos)

## Estrutura de Landing Page

```
HERO
  - Headline (max 10 palavras)
  - Subheadline (1-2 frases, conecta com a dor)
  - CTA primario
  - Imagem/video hero
  - Social proof rapido (logos, "usado por X empresas")

PROBLEMA
  - 3 dores do usuario
  - Empatia: "Voce ja..."

SOLUCAO
  - Como o produto resolve
  - 3 beneficios principais com icones

COMO FUNCIONA
  - 3-4 passos simples
  - Screenshots/GIFs do produto

FEATURES
  - Grid de features com icone + titulo + descricao curta
  - Foco em beneficio, nao funcionalidade

SOCIAL PROOF
  - Depoimentos reais com foto + nome + cargo
  - Numeros (usuarios, empresas, uptime)
  - Logos de clientes

PRICING (se aplicavel)
  - 2-3 planos max
  - Destaque pro plano recomendado
  - CTA em cada plano

FAQ
  - 5-8 perguntas mais comuns
  - Respostas curtas e diretas

CTA FINAL
  - Headline de fechamento
  - CTA identico ao hero
  - Garantia/seguranca
```

## Templates de Copy

### Headlines
```
[Resultado desejado] sem [obstaculo principal]
A forma mais [adjetivo] de [acao desejada]
[Numero] [tipo de pessoa] ja [resultado]. E voce?
Pare de [dor]. Comece a [solucao].
[Produto]: [Beneficio em 5 palavras]
```

### CTAs
```
Primario: "Comece gratis agora" / "Experimente por 14 dias" / "Criar minha conta"
Secundario: "Ver demonstracao" / "Falar com especialista"
Urgencia: "Ultimas X vagas" / "Oferta valida ate [data]"
```

### Microcopy
```
Botao salvar: "Salvar alteracoes" (nao "Submit")
Botao deletar: "Remover permanentemente" (nao "Delete")
Empty state: "Nenhum [item] ainda. Crie o primeiro!" (nao "Sem resultados")
Erro de form: "Email precisa ter formato valido" (nao "Input invalido")
Loading: "Carregando seus dados..." (nao "Loading...")
Sucesso: "Pronto! [Acao] feita com sucesso." (nao "Operacao concluida")
404: "Pagina nao encontrada. Volte pro inicio?" (nao "Error 404")
```

## Tom de Voz

Definir para cada projeto:

```markdown
## Brand Voice

**Personalidade:** [ex: profissional mas acessivel]
**Tom:** [ex: confiante, direto, amigavel]
**Evitar:** [ex: jargao tecnico, linguagem formal demais, humor forcado]

### Exemplos
- Certo: "Seus dados estao seguros conosco"
- Errado: "Implementamos criptografia AES-256 end-to-end"
- Certo: "Vamos resolver isso juntos"
- Errado: "Ocorreu um erro inesperado no servidor"
```

## Handoff do Motion Designer

Receber:
1. Landing page estruturada com animacoes
2. Componentes interativos prontos
3. Transicoes entre secoes definidas

## Handoff para SEO Specialist

Entregar:
1. Todos os textos finalizados
2. Headlines e meta descriptions sugeridas
3. Estrutura de headings (H1, H2, H3)
4. Textos alt pra imagens
5. CTAs definidos

## Codigo Limpo

Todo codigo gerado DEVE ser livre de comentarios.
Nomes descritivos substituem comentarios. Codigo auto-explicativo.
```

**Step 2: Commit**

```bash
git add skills/13-marketing-copy/SKILL.md
git commit -m "feat: add marketing-copy skill (13)"
```

---

## Task 7: Create skill 14-seo-specialist

**Files:**
- Create: `skills/14-seo-specialist/SKILL.md`

**Step 1: Create the skill file**

```markdown
---
name: seo-specialist
description: |
  Skill do SEO Specialist para otimizacao de busca, performance, meta tags, e acessibilidade.
  Use quando precisar otimizar SEO, meta tags, Open Graph, schema markup, sitemap, performance web,
  Core Web Vitals, ou qualquer otimizacao para motores de busca. Trigger em: "SEO", "meta tags",
  "Open Graph", "sitemap", "schema markup", "Core Web Vitals", "performance", "LCP", "CLS", "FID",
  "indexacao", "Google", "search engine", "ranking", "canonical", "robots.txt".
---

# SEO Specialist - Otimizacao para Busca

O SEO Specialist otimiza o sistema e landing page para serem encontrados, carregarem rapido, e converterem bem nos motores de busca.

## Responsabilidades

1. Otimizar meta tags (title, description, OG, Twitter)
2. Implementar schema markup (JSON-LD)
3. Garantir Core Web Vitals excelentes
4. Configurar sitemap e robots.txt
5. Otimizar imagens e fonts
6. Garantir acessibilidade (impacta SEO)
7. Estrutura semantica de HTML

## Meta Tags - Template

```typescript
export function generateMetadata({
  title,
  description,
  path,
  image,
}: MetaProps): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: [{ url: image || DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      locale: 'pt_BR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image || DEFAULT_OG_IMAGE],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}
```

## Schema Markup (JSON-LD)

```typescript
export function WebsiteSchema({ name, url, description }: SchemaProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name,
          url,
          description,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${url}/search?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }),
      }}
    />
  );
}

export function OrganizationSchema({ name, url, logo, socials }: OrgProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name,
          url,
          logo,
          sameAs: socials,
        }),
      }}
    />
  );
}

export function FAQSchema({ items }: { items: Array<{ q: string; a: string }> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        }),
      }}
    />
  );
}
```

## Core Web Vitals - Metas

```
LCP (Largest Contentful Paint): < 2.5s
FID (First Input Delay): < 100ms
CLS (Cumulative Layout Shift): < 0.1
INP (Interaction to Next Paint): < 200ms
TTFB (Time to First Byte): < 800ms
```

### Otimizacoes Obrigatorias

```typescript
// next.config.js
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },
  experimental: {
    optimizeCss: true,
  },
  compress: true,
  poweredByHeader: false,
};
```

### Imagens
- Usar `next/image` SEMPRE (lazy loading, responsive, formatos modernos)
- Formatos: AVIF > WebP > PNG/JPG
- Alt text descritivo em TODA imagem
- Dimensoes explicitas (width/height) pra evitar CLS
- Preload hero image com `priority`

### Fonts
- Usar `next/font` (self-hosted, zero CLS)
- Preload apenas as variantes usadas
- `font-display: swap`

```typescript
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
```

### Lazy Loading
- Componentes abaixo do fold: `dynamic(() => import(...), { ssr: false })`
- Imagens fora da viewport: loading="lazy" (automatico com next/image)
- Terceiros (analytics, chat): carregar apos interacao

## HTML Semantico

```
<header>          nao <div class="header">
<nav>             nao <div class="nav">
<main>            nao <div class="content">
<section>         nao <div class="section">
<article>         nao <div class="post">
<aside>           nao <div class="sidebar">
<footer>          nao <div class="footer">
<h1> (unico)      nao <div class="title">
<h2>, <h3>        hierarquia correta, nunca pular niveis
<figure>/<figcaption> pra imagens com legenda
<time datetime>   pra datas
<address>         pra contato
```

## Checklist SEO

### Tecnico
```
[ ] Sitemap.xml gerado e enviado pro Search Console
[ ] robots.txt configurado
[ ] Canonical URLs em todas as paginas
[ ] HTTPS obrigatorio
[ ] Sem conteudo duplicado
[ ] URLs amigaveis (slug em portugues se pt-BR)
[ ] Redirect 301 pra URLs antigas
[ ] 404 customizada com navegacao
[ ] Velocidade < 3s em 3G
```

### On-Page
```
[ ] H1 unico por pagina com keyword principal
[ ] Title tag < 60 caracteres, com keyword
[ ] Meta description < 160 caracteres, com CTA
[ ] Alt text em todas as imagens
[ ] Links internos entre paginas relevantes
[ ] Breadcrumbs com schema markup
[ ] Conteudo minimo de 300 palavras por pagina indexavel
```

### Acessibilidade (impacta SEO)
```
[ ] Contraste minimo 4.5:1 (AA)
[ ] Tab navigation funcional
[ ] ARIA labels em elementos interativos
[ ] Skip to content link
[ ] Formularios com labels associados
[ ] Foco visivel em todos os elementos interativos
```

### Performance
```
[ ] Core Web Vitals no verde
[ ] Imagens otimizadas (AVIF/WebP)
[ ] Fonts com next/font
[ ] Bundle splitting
[ ] Preload recursos criticos
[ ] CDN configurado
```

## Handoff do Marketing Copy

Receber:
1. Textos finalizados com headlines e descricoes
2. Estrutura de headings sugerida
3. Textos alt sugeridos
4. CTAs definidos

## Handoff para QA

Entregar:
1. Meta tags implementadas e testadas
2. Schema markup validado (Google Rich Results Test)
3. Sitemap e robots.txt configurados
4. Core Web Vitals no verde
5. Checklist SEO completo
6. Lighthouse score > 90 em todas as categorias

## Codigo Limpo

Todo codigo gerado DEVE ser livre de comentarios.
Nomes descritivos substituem comentarios. Codigo auto-explicativo.
```

**Step 2: Commit**

```bash
git add skills/14-seo-specialist/SKILL.md
git commit -m "feat: add seo-specialist skill (14)"
```

---

## Task 8: Create skill 15-mobile-tauri

**Files:**
- Create: `skills/15-mobile-tauri/SKILL.md`

**Step 1: Create the skill file**

```markdown
---
name: mobile-tauri
description: |
  Skill do Especialista Mobile com Tauri para criacao de apps nativos (Android APK, Windows, Linux, macOS)
  a partir do frontend web. Skill OPCIONAL — ativada apenas quando o projeto tem versao mobile/desktop.
  Trigger em: "mobile", "Tauri", "APK", "app nativo", "desktop app", "Windows app", "macOS app",
  "Android", "iOS", "multiplataforma", "cross-platform", "build nativo".
---

# Mobile Specialist - Tauri

O Mobile Specialist usa Tauri para transformar o frontend web em apps nativos. Skill OPCIONAL — so e ativada quando o projeto tem versao mobile ou desktop.

## Responsabilidades

1. Configurar projeto Tauri
2. Adaptar frontend pra contexto mobile/desktop
3. Gerar builds nativos (APK, .exe, .dmg, .deb, .AppImage)
4. Configurar permissoes nativas
5. Implementar funcionalidades nativas (notificacoes, file system, etc)
6. Otimizar performance pra dispositivos moveis

## Stack

```
Framework:    Tauri v2
Frontend:     Mesmo React/Next.js do projeto web
Backend:      Rust (side-car Tauri)
Build:        Cargo + Tauri CLI
Android:      APK via Tauri Android plugin
iOS:          Em desenvolvimento (Tauri v2)
Desktop:      Windows (.exe/.msi), macOS (.dmg), Linux (.deb/.AppImage)
```

## Setup Inicial

```bash
# Instalar Tauri CLI
npm install -D @tauri-apps/cli@latest

# Inicializar projeto Tauri
npx tauri init

# Instalar plugins necessarios
npm install @tauri-apps/plugin-notification
npm install @tauri-apps/plugin-fs
npm install @tauri-apps/plugin-shell
npm install @tauri-apps/plugin-http
```

## Configuracao Base

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../out"
  },
  "package": {
    "productName": "AppName",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "notification": { "all": true },
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "scope": ["$APPDATA/*", "$DOWNLOAD/*"]
      },
      "shell": { "open": true },
      "http": {
        "all": false,
        "request": true,
        "scope": ["https://api.seudominio.com/*"]
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.seudominio.appname",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://api.seudominio.com"
    },
    "windows": [
      {
        "title": "AppName",
        "width": 1200,
        "height": 800,
        "minWidth": 375,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ]
  }
}
```

## Adaptacoes Mobile

### Deteccao de Plataforma

```typescript
import { platform } from '@tauri-apps/plugin-os';

export async function getPlatform() {
  try {
    return await platform();
  } catch {
    return 'web';
  }
}

export function isTauri(): boolean {
  return '__TAURI__' in window;
}
```

### Navegacao Mobile

```typescript
export function useMobileNavigation() {
  const isMobile = useBreakpoint().mobile;
  const isTauriApp = isTauri();

  return {
    showBackButton: isTauriApp && isMobile,
    showBottomNav: isTauriApp && isMobile,
    showSidebar: !isMobile,
    safeAreaInsets: isTauriApp,
  };
}
```

### Safe Area (notch/status bar)

```css
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

## Build Commands

```bash
# Dev
npx tauri dev

# Build desktop
npx tauri build

# Build Android APK
npx tauri android build

# Build Android (debug)
npx tauri android dev
```

## Android Setup

```bash
# Prerequisitos
# 1. Android Studio instalado
# 2. Android SDK (API 33+)
# 3. NDK instalado
# 4. JAVA_HOME configurado

# Inicializar Android
npx tauri android init

# Gerar APK
npx tauri android build --apk
```

## Funcionalidades Nativas

### Notificacoes

```typescript
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

export async function notify(title: string, body: string) {
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === 'granted';
  }
  if (granted) {
    sendNotification({ title, body });
  }
}
```

### File System

```typescript
import { readTextFile, writeTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';

export async function saveData(filename: string, data: string) {
  await writeTextFile(filename, data, { dir: BaseDirectory.AppData });
}

export async function loadData(filename: string): Promise<string> {
  return readTextFile(filename, { dir: BaseDirectory.AppData });
}
```

## Checklist Pre-Build

```
[ ] Tauri config com permissoes minimas (principle of least privilege)
[ ] CSP configurado (nao usar unsafe-inline/unsafe-eval)
[ ] Icons gerados pra todas as plataformas
[ ] Splash screen configurada
[ ] Deep links configurados (se aplicavel)
[ ] Auto-update configurado (se aplicavel)
[ ] Testado em dispositivo real (nao so emulador)
[ ] Performance aceitavel em dispositivo low-end
[ ] Offline fallback implementado (se aplicavel)
```

## Handoff do Frontend

Receber:
1. Frontend web completo e funcional
2. Componentes responsivos (mobile-first)
3. PWA manifest se houver
4. Lista de funcionalidades que precisam de acesso nativo

## Handoff para QA

Entregar:
1. Builds de todas as plataformas alvo
2. APK de teste
3. Lista de funcionalidades nativas implementadas
4. Permissoes necessarias documentadas
5. Como instalar/testar em cada plataforma

## Codigo Limpo

Todo codigo gerado DEVE ser livre de comentarios.
Nomes descritivos substituem comentarios. Codigo auto-explicativo.
```

**Step 2: Commit**

```bash
git add skills/15-mobile-tauri/SKILL.md
git commit -m "feat: add mobile-tauri skill (15)"
```

---

## Task 9: Update existing skills (01-07) — Add zero-comments rule and orchestrator/context references

**Files:**
- Modify: `skills/01-po-feature-spec/SKILL.md`
- Modify: `skills/02-ui-ux-design/SKILL.md`
- Modify: `skills/03-backend-api/SKILL.md`
- Modify: `skills/04-frontend-integration/SKILL.md`
- Modify: `skills/05-qa-testing/SKILL.md`
- Modify: `skills/06-security-review/SKILL.md`
- Modify: `skills/07-deploy-docker/SKILL.md`

**Step 1: Add the following block to the END of each SKILL.md (before the last line)**

For each skill file, append:

```markdown

## Codigo Limpo

Todo codigo gerado DEVE ser livre de comentarios.
Nomes descritivos substituem comentarios. Codigo auto-explicativo.

## Integracao com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill e invocada e define a proxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
```

**Step 2: Commit**

```bash
git add skills/01-po-feature-spec/SKILL.md skills/02-ui-ux-design/SKILL.md skills/03-backend-api/SKILL.md skills/04-frontend-integration/SKILL.md skills/05-qa-testing/SKILL.md skills/06-security-review/SKILL.md skills/07-deploy-docker/SKILL.md
git commit -m "feat: add zero-comments rule and pipeline integration to all existing skills"
```

---

## Task 10: Rewrite README.md

**Files:**
- Modify: `README.md`

**Step 1: Replace the entire README with the new version**

The new README should include:
- Updated team structure diagram showing all 15 roles
- Orchestrator as central coordinator
- Context Manager as tracking system
- Updated pipeline with optional branches
- Complete skill listing (15 skills)
- Explanation of how the Orchestrator works
- Explanation of how Context Manager works
- Documentation structure
- Step-by-step usage guide
- Flow examples (full feature, bugfix, landing page, mobile)
- All existing sections updated (hooks, stack, etc)

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README with full 15-skill team kit"
```

---

## Task 11: Create docs directory structure

**Files:**
- Create: `docs/context/current-focus.md`
- Create: `docs/context/history.md`
- Create: `docs/README.md`

**Step 1: Create context files**

`docs/context/current-focus.md`:
```markdown
# Foco Atual

Nenhum foco ativo. Use o Context Manager para iniciar um novo trabalho.
```

`docs/context/history.md`:
```markdown
# Historico de Contexto

Nenhuma entrada ainda.
```

`docs/README.md`:
```markdown
# Mapa da Documentacao

## Estrutura

- `features/` — Documentacao por feature (objetivo, regras, fluxo, API, UI)
- `architecture/` — Visao geral, padroes front/back, ADRs
- `api/` — Contratos de API, erros, paginacao
- `ops/` — Setup, deploy, observabilidade
- `context/` — Gerenciado automaticamente pelo Context Manager
- `plans/` — Planos de implementacao

## Como Usar

1. Nova feature? Crie pasta em `features/<nome>/`
2. Decisao arquitetural? Crie ADR em `architecture/decisions/`
3. Novo endpoint? Documente em `api/` ou na feature
4. Mudanca de infra? Atualize `ops/`
```

**Step 2: Commit**

```bash
git add docs/
git commit -m "feat: create docs directory structure with context files"
```

---

## Execution Order

Tasks 1-8 are independent (new skill files) and CAN be parallelized.
Task 9 depends on nothing (updates existing files).
Task 10 depends on Tasks 1-8 being defined (references all skills in README).
Task 11 is independent.

Recommended order: Tasks 1-8 in parallel → Task 9 → Task 10 + Task 11 in parallel
