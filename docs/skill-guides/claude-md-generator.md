# CLAUDE.md Generator — Guia Estendido

![Skill](https://img.shields.io/badge/skill-28-blue)
![Role](https://img.shields.io/badge/role-claude--md--generator-0ea5e9)

Guia auxiliar da skill `28-claude-md-generator` para boas praticas de entrevista, estrutura do output e exemplos.

## Quando abrir este guia

- quando a entrevista guiada exige perguntas nao cobertas pela skill
- quando o projeto tem stack incomum e precisa de secoes extras no CLAUDE.md
- quando revisar um CLAUDE.md existente e decidir o que atualizar vs manter

## Fluxo de Entrevista — Perguntas Complementares

### Para projetos backend-heavy
- Qual e o ORM principal e existe migrations automatica?
- Existe rate limiting, auth middleware ou guard obrigatorio em todas as rotas?
- Qual e o padrao de resposta de erro da API?

### Para projetos frontend-heavy
- Qual e o framework de componentes (shadcn, radix, mui)?
- Existe Storybook ou design system documentado?
- Qual e a convencao de nomes de arquivos de componente?

### Para monorepos
- Qual e a ferramenta de workspace (turborepo, nx, pnpm workspaces)?
- Existe script root que coordena build de todos os packages?
- Qual package e o ponto de entrada principal para o agente?

## Estrutura do CLAUDE.md Gerado

Um CLAUDE.md bem gerado por esta skill deve ter:

1. **Cabecalho curto** — nome do projeto + uma linha sobre o que faz
2. **Stack real** — linguagens, frameworks, infra com versoes relevantes
3. **Comandos essenciais** — build, test, lint, dev — nao mais que 5
4. **Convencoes criticas** — nomes de arquivo, estrutura de pastas, padrao de PR
5. **Fluxo de trabalho** — como o agente deve comecar cada task
6. **Riscos e restricoes** — o que nunca fazer, migrações manuais, etc.
7. **Referencia ao kit** — apontar para `.bot/` se o kit estiver instalado

## Anti-patterns no Output

- listar mais de 5 comandos — o agente so precisa dos essenciais
- copiar a auditoria inteira — o CLAUDE.md e um resumo acionavel, nao dump
- descrever arquitetura obvio do framework (ex: "React usa componentes")
- adicionar secoes sobre features que nao existem ainda
- misturar instrucoes de setup de dev com instrucoes de agente

## Atualizacao vs Criacao

| Situacao | Acao |
|----------|------|
| CLAUDE.md nao existe | criar do zero via entrevista |
| CLAUDE.md generico (template) | substituir integralmente |
| CLAUDE.md existente com contexto real | atualizar secoes desatualizadas, preservar o resto |
| CLAUDE.md apontando para `.bot/` corretamente | verificar se `.bot/` esta atual, nao mexer no root |

## Evidencias de Qualidade

- o CLAUDE.md gerado cabe em menos de 100 linhas
- um novo dev consegue entender o projeto so lendo o CLAUDE.md
- nenhuma secao e especulativa — tudo foi confirmado na entrevista ou auditoria
