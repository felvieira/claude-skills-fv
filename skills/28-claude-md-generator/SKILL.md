---
name: claude-md-generator
description: |
  Gera CLAUDE.md inteligente para projetos consumidores. Consome output do Repo Auditor,
  faz entrevista guiada com o dev e produz um CLAUDE.md especifico, conciso e acionavel.
  Use apos o Repo Auditor (18) ter mapeado o repositorio.
  Trigger em: "gerar claude.md", "criar claude.md", "onboarding", "setup claude md",
  "contexto do projeto", "documentar projeto para agente".
argument-hint: "[caminho-do-projeto]"
allowed-tools: Read, Grep, Glob, Edit, Write
---

# CLAUDE.md Generator

Gera um CLAUDE.md especifico e acionavel para o projeto consumidor, baseado na auditoria do Repo Auditor e entrevista com o desenvolvedor.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/handoffs.md`, `policies/quality-gates.md` e `policies/evals.md`.

## Quando Usar

- apos o Repo Auditor (18) ter gerado `docs/repo-audit/current.md`
- quando o projeto consumidor nao tem CLAUDE.md
- quando o CLAUDE.md existente esta generico ou desatualizado
- quando um novo dev precisa de onboarding rapido

## Quando Nao Usar

- em scaffolds vazios sem codigo
- como substituto do Repo Auditor — esta skill consome output da auditoria, nao produz
- para editar uma unica secao de um CLAUDE.md existente — editar manualmente
- no repositorio do kit em si (claude-skills-fv)

## Entradas Esperadas

- `docs/repo-audit/current.md` (ou `.bot/docs/repo-audit/current.md`)
- respostas do dev na entrevista interativa

## Saidas Esperadas

- `CLAUDE.md` na raiz do projeto consumidor
- conteudo especifico, conciso e em ingles

## Prerequisito e Fallback

Se `docs/repo-audit/current.md` nao existir quando esta skill for invocada:
1. Emitir aviso: "Auditoria nao encontrada. Executando Repo Auditor (18) primeiro."
2. Invocar Repo Auditor (18) no repositorio alvo
3. Continuar com a Fase 1 apos a auditoria estar disponivel

## Responsabilidades

1. Consumir `docs/repo-audit/current.md` e classificar cada secao como `inferida`, `parcial` ou `desconhecida`
2. Conduzir entrevista interativa com o dev, perguntando apenas sobre gaps (1 pergunta por vez, com opcoes pre-populadas baseadas no audit)
3. Gerar draft do CLAUDE.md com ate 11 secoes, omitindo secoes vazias
4. Apresentar draft para aprovacao do dev e iterar ate aprovacao
5. Escrever CLAUDE.md na raiz do projeto consumidor

## Fase 1 — Ingestao do Audit

Ler `docs/repo-audit/current.md` (ou `.bot/docs/repo-audit/current.md`).

Extrair informacoes sobre: stack, comandos, estrutura de diretorios, testes, deploy, riscos.

Classificar cada uma das 11 secoes do CLAUDE.md como:
- `inferida` — dados suficientes no audit para gerar a secao
- `parcial` — tem algo mas precisa confirmar com o dev
- `desconhecida` — precisa perguntar ao dev

### Secoes do CLAUDE.md

| # | Secao | Classificacao Tipica |
|---|-------|---------------------|
| 1 | Project Overview | parcial ou desconhecida (objetivo de negocio nao esta no audit) |
| 2 | Tech Stack | geralmente inferida |
| 3 | Architecture | geralmente inferida |
| 4 | Key Files | sempre inferida (entry points, configs, modulos-chave) |
| 5 | Commands | parcial (package.json/Makefile cobre parte, mas pode ter scripts manuais) |
| 6 | Code Style | parcial (eslint/prettier configs dão pistas, mas convencoes verbais nao) |
| 7 | Design System | inferida se frontend; omitir inteiramente se nao houver frontend |
| 8 | Environment | parcial (.env.example ajuda, mas pode haver vars nao documentadas) |
| 9 | Testing | parcial (framework detectavel, patterns nao) |
| 10 | Gotchas | sempre desconhecida — conhecimento tacito do dev |
| 11 | Workflow | parcial (CI/CD config ajuda, branch strategy nao) |

## Fase 2 — Entrevista Inteligente (~5-8 perguntas)

Perguntar APENAS sobre secoes `parcial` ou `desconhecida`. Cada pergunta deve vir pre-populada com dados do audit.

### Padroes de Pergunta por Secao

| Secao | Se inferida | Se parcial | Se desconhecida |
|-------|-------------|------------|-----------------|
| Project Overview | Pular | "Detectei X. Qual o objetivo de negocio?" | "O que este projeto faz e pra quem?" |
| Tech Stack | Pular | "Encontrei A, B, C. Faltou algo?" | "Qual a stack principal?" |
| Architecture | Pular | "Estrutura parece X. Algum pattern relevante?" | "Como o codigo esta organizado?" |
| Key Files | Sempre inferida | Sempre inferida | Sempre inferida |
| Code Style | Pular | "Vi convencao X. Outras regras?" | "Alguma convencao de estilo?" |
| Design System | Pular (sem frontend: omitir) | "Usando X. Tokens customizados?" | Pular se nao houver frontend |
| Commands | Pular | "Encontrei X comandos. Outros fora dos scripts?" | "Quais os comandos principais?" |
| Environment | Pular | "Encontrei .env com X vars. Outros necessarios?" | "Vars de ambiente obrigatorias?" |
| Testing | Pular | "Encontrei framework X. Patterns de teste?" | "Abordagem de testes?" |
| Gotchas | **Sempre perguntar** | **Sempre perguntar** | **Sempre perguntar** |
| Workflow | Pular | "Deploy via X. Branch strategy?" | "Workflow de dev?" |

### Regras da Entrevista

- 1 pergunta por mensagem via conversa direta (nao via tool)
- Oferecer opcoes inline quando possivel (ex: "A) X  B) Y  C) outro")
- Fallback aberto quando opcoes nao se aplicam
- Dev pode pular qualquer pergunta (secao omitida ou usa dados inferidos)
- **Gotchas sao sempre perguntadas** — conhecimento tacito que analise de codigo nao captura
- **Design System e omitido inteiramente** para repos sem frontend detectado no audit

## Fase 3 — Geracao do Draft

Montar CLAUDE.md com ate 11 secoes. Omitir secoes vazias.

### Ordem das Secoes

1. Project Overview
2. Tech Stack
3. Architecture
4. Key Files (sempre inferida do audit)
5. Commands
6. Code Style
7. Design System (omitir para repos sem frontend)
8. Environment
9. Testing
10. Gotchas
11. Workflow

### Referencia ao Kit

Se o diretorio `.bot/` existir no repo alvo, adicionar secao no topo:

```
## Skills Kit

This repo uses a skills kit at `.bot/`. Reading order:
1. `.bot/GLOBAL.md`
2. `.bot/policies/`
3. `.bot/docs/repo-audit/current.md` (if exists)
4. `.bot/AGENTS.md`
```

### Principios de Qualidade

- Conciso: cada secao max 10-15 linhas
- Acionavel: todo comando deve ser copy-paste ready
- Especifico: zero conselho generico. "Use meaningful names" → fora. "Always prefix API routes with /api/v1" → dentro
- Atual: validar comandos contra package.json / Makefile / pyproject.toml
- YAGNI: se uma secao teria so 1 linha vaga, omitir

### Template de Output

Usar `templates/claude-md-output.md` como base para o CLAUDE.md gerado.

### Monorepos

Para monorepos com multiplos packages/workspaces:
- Gerar UM unico CLAUDE.md na raiz
- Incluir tabela de packages na secao Architecture
- Nao gerar CLAUDE.md por package
- Mencionar convencoes complexas de packages especificos em Gotchas

## Fase 4 — Review com o Dev

- Apresentar o draft completo na conversa
- Dev aprova ou pede ajustes
- Iterar ate aprovacao

## Fase 5 — Escrita do Arquivo

- Escrever `CLAUDE.md` na raiz do projeto consumidor
- Se ja existir um CLAUDE.md, mostrar diff e perguntar antes de sobrescrever
- Sem backup — git cuida do historico

## Evidencia de Conclusao

- `CLAUDE.md` criado ou atualizado na raiz do projeto
- secoes relevantes preenchidas com dados reais (nao placeholders)
- dev aprovou o conteudo
- comandos documentados validados contra o repo

## Handoff

Entregar:
- caminho do CLAUDE.md gerado
- quais secoes foram inferidas vs perguntadas
- gaps que o dev escolheu pular
- recomendacao: rerodar apos mudancas grandes de stack

Seguir `policies/handoffs.md`.
