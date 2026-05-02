---
name: skill-author
description: |
  Meta-skill para criar, editar, avaliar e otimizar skills do kit. Use quando adicionar nova skill,
  refatorar skill existente, ou medir qualidade de descoberta de skill (description triggering).
  Trigger em: "criar nova skill", "nova capacidade", "skill author", "skill creator", "editar skill",
  "avaliar skill", "skill eval", "otimizar description", "meta-skill", "kit governance".
argument-hint: "[--action=create|edit|eval|optimize] [--skill=name] [--target=skills/NN-name/]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Skill Author — Meta-Skill de Governanca do Kit

Cria e mantem as outras skills com qualidade. Sem esta skill, o kit cresce por copia-cola e cada nova skill diverge das convencoes — divida tecnica acumula em meses.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/evals.md`, `policies/handoffs.md`, `policies/writing-clarity.md`, `policies/source-driven.md`.

Inspirado no padrao "skill-creator" da Anthropic (skill meta de criacao/avaliacao de skills disponivel no plugin oficial `anthropic-skills`), adaptado as convencoes deste kit: numeracao sequencial, frontmatter YAML, secao "Governanca Global", integracao com pipeline (orchestrator, context manager, documenter, reviewer). Esta skill nao depende do plugin Anthropic — e implementacao propria com convencoes do dev-team-kit.

## Quando Usar

- adicionar nova skill (numero >= 34, sequencial)
- refatorar skill existente (split, merge, deprecation)
- avaliar qualidade de skill (description triggering, completude, redundancia)
- otimizar description para melhor triggering em conversas reais
- onboarding: ensinar contribuidor novo a estrutura
- antes de publicar release: revisar todas as skills modificadas

## Quando Nao Usar

- editar conteudo de uma skill especifica que ja existe e funciona (use Edit direto)
- criar persona, policy, command (use template proprio de cada)
- documentar processo do projeto consumidor (use skill 28 CLAUDE.md Generator)

## Entradas Esperadas

- intencao: criar / editar / avaliar / otimizar
- (criar) nome da nova skill, dominio, gap que preenche
- (editar) caminho da skill alvo, mudanca proposta
- (eval) caminho da skill alvo + criterios

## Saidas Esperadas

- (criar) `skills/NN-nome/SKILL.md` + atualizacoes em plugin.json, README, AGENTS, CHANGELOG
- (editar) diff cirurgico + justificativa
- (eval) relatorio de qualidade com score + acoes
- handoff para reviewer (skill 11)

## Convencoes do Kit (obrigatorias)

### Numeracao
- sequencial (proxima livre): consultar `ls skills/`
- numero **nunca** se reutiliza apos deprecation (skill 16 e exemplo — absorvida pela model-routing policy, numero permanece vago)
- formato: `NN-nome-com-hifen`

### Estrutura de SKILL.md

Toda skill segue este template (campos obrigatorios marcados ★):

```markdown
---
name: nome-curto-com-hifen ★
description: | ★
  Resumo de 2-3 linhas explicando quando usar.
  Inclui triggers naturais para descoberta automatica.
  Trigger em: "palavra1", "palavra2", "frase tipica", ...
argument-hint: "[descricao dos argumentos opcional]"
allowed-tools: Read, Grep, Glob, Bash(comando *), Edit, Write
---

# Nome da Skill — Subtitulo Descritivo ★

Uma frase introdutoria sobre o proposito. ★

## Governanca Global ★
Lista de policies que esta skill segue.

## Quando Usar ★
3-7 bullets concretos.

## Quando Nao Usar ★
3-5 bullets concretos para evitar acionamento errado.

## Entradas Esperadas
O que a skill recebe.

## Saidas Esperadas ★
O que a skill produz (formato, caminho, criterios).

## Responsabilidades / Protocolo ★
Conteudo principal. Pode ter sub-secoes.

## Heuristicas / Boas Praticas
Especificas do dominio.

## Anti-Padroes
O que evitar (especifico, nao generico).

## Evidencia de Conclusao ★
Como saber se a skill cumpriu seu objetivo.

## Handoff ★
Para qual skill/persona/agente entregar resultado.

## Integracao com Pipeline ★
Como esta skill se conecta com Orchestrator (09), Context Manager (08), Documenter (10), Reviewer (11) e outras relevantes.
```

### Description: Triggering

A `description` no frontmatter e o que o orchestrator/Claude le para decidir invocar. Otimizar para descoberta:

**Boa description:**
```yaml
description: |
  Skill de scan automatizado de codigo para vulnerabilidades via Semgrep e CodeQL.
  Use antes de toda release ou em PRs grandes.
  Trigger em: "semgrep", "codeql", "static analysis", "scan de seguranca", "SAST", "varredura".
```

**Description ruim:**
```yaml
description: Skill que faz coisas relacionadas a seguranca.
```

Diferenca: a boa lista palavras-gatilho explicitas (que sao matched no input do usuario) + delimita quando usar.

### Allowed-tools

Listar o **minimo necessario**. Cada tool a mais e risco a mais.

- skills puramente de planejamento: `Read, Grep, Glob` apenas
- skills que escrevem doc: `+ Write, Edit`
- skills que rodam comando: `+ Bash(comando especifico *)` — escopar com glob
- skills destrutivas: explicitar e exigir aprovacao

### Verbosidade

- SKILL.md cabe em **300-400 linhas** quando possivel
- exemplos longos vao para `docs/skill-guides/<nome>.md` (carregado sob demanda)
- templates reutilizaveis vao para `templates/`

## Pipeline de Criacao de Skill Nova

### Fase 1: Spec da skill (antes de escrever)

Brainstorm:
- **Gap real?** Que problema esta skill resolve que nenhuma outra resolve hoje?
- **Overlap?** Que skills existentes tocam dominios proximos? Como evitar duplicacao?
- **Trigger natural?** Que palavras um usuario diria quando precisar disso?
- **Output?** O que esta skill produz que outras consomem?
- **Custo?** Vale criar skill ou e melhor adicionar secao em skill existente?

Se >50% das respostas indicarem que basta editar skill existente, **nao crie skill nova**.

### Fase 2: Numero + diretorio

```bash
# Proxima skill livre
ls skills/ | grep -oE '^[0-9]+' | sort -n | tail -5
# Ex: ultima e 33, proxima e 34

mkdir skills/34-novo-nome
```

### Fase 3: SKILL.md

Usar o template acima. Validar:
- todos os campos ★ preenchidos
- description com trigger words
- governance section listando policies relevantes
- integracao com pipeline declarada

### Fase 4: Registrar

5 lugares para atualizar (item 4 e condicional):

1. `.claude-plugin/plugin.json` — adicionar caminho na lista `skills`
2. `README.md` — adicionar linha na tabela "The N Specialists" + bump no contador (badge, hero, instalacao)
3. `README.pt-BR.md` — espelhar
4. `AGENTS.md` — **somente se** a skill introduzir slash command novo (adicionar na tabela de comandos). Se for skill so com trigger natural ou subagent, pular.
5. `CHANGELOG.md` — entrada `## [Unreleased]` ou data atual

Se a skill tiver subagent dispatchavel (`.claude/agents/X.md`):
- adicionar ao `agents` em `plugin.json`
- listar na tabela de Subagents do README (ambos idiomas)

Se a skill tiver slash command (`.claude/commands/X.md`):
- adicionar ao `commands` em `plugin.json`
- listar na tabela de comandos do README + AGENTS

### Fase 5: Eval

Rodar checklist (`evals/skill-quality.md` — criar se nao existir):

| Criterio | Score 0-3 |
|---|---|
| Triggering: description tem palavras-gatilho concretas? | 0-3 |
| Quando usar: 3+ bullets concretos? | 0-3 |
| Quando NAO usar: 3+ bullets concretos? | 0-3 |
| Output esperado: formato e caminho declarados? | 0-3 |
| Tools: minimo necessario? | 0-3 |
| Anti-padroes: lista de armadilhas reais? | 0-3 |
| Integracao: aponta para skills upstream/downstream? | 0-3 |
| Verbosidade: cabe em 400 linhas? | 0-3 |
| Writing clarity: respeita `policies/writing-clarity.md`? | 0-3 |
| Anti-rationalization: skill rigida tem tabela de vies? | 0-3 (N/A se flexivel) |

Score total / 30. Threshold para merge: >= 22.

### Fase 6: Handoff

Despachar reviewer (subagent ou skill 11) para validacao final antes de merge.

## Pipeline de Edicao

Para mudancas estruturais (>20 linhas alteradas):

1. **Spec da mudanca** — o que muda, por que, qual impacto downstream
2. **Diff cirurgico** — preservar estrutura existente
3. **Atualizar referencias cruzadas** — outras skills que mencionam esta
4. **Re-run eval** — score nao deve cair
5. **CHANGELOG** — registrar mudanca

Para mudancas pequenas (typo, clarification): Edit direto, mencionar em commit message.

## Pipeline de Avaliacao

```bash
# Avaliar uma skill
/skill-author --action=eval --skill=skills/05-qa-testing/

# Output esperado:
# - score 0-30 com breakdown
# - top 3 melhorias prioritarias
# - comparacao com skills do mesmo dominio
```

Skills com score < 18: rotular como `needs-rewrite` no CHANGELOG e priorizar.

## Pipeline de Otimizacao de Description

Description controla descoberta. Otimizar quando:
- skill nao e acionada quando deveria (usuario descreve, agente nao escolhe)
- skill e acionada erradamente (overlap com outra)

Tecnica:
1. Coletar 5-10 transcricoes onde a skill **deveria** ter sido acionada
2. Listar palavras/frases recorrentes
3. Adicionar como "Trigger em:" na description
4. Re-testar com transcricoes

## Anti-Padroes (em criacao de skill)

### "Skill kitchen-sink"
Skill que faz 8 coisas diferentes. Quebrar em 2-3 skills focadas.

### "Skill com description vaga"
"Skill que ajuda com codigo." → nao trigga nunca.

### "Skill que duplica outra"
Antes de criar, `grep -r "<dominio>" skills/`. Se 2+ skills tocam, e edicao, nao criacao.

### "Skill sem handoff"
Skill que produz output mas nao declara para quem entregar = dead end no pipeline.

### "Skill sem anti-padroes"
Lista de "boas praticas" generica, sem armadilhas concretas. Anti-padroes vem de bug real ou erro recorrente.

### "Skill com 1000 linhas"
Indica falta de modularizacao. Mover exemplos para `docs/skill-guides/`. Quebrar se for caso.

### "Tools demais"
`allowed-tools: *` — risco operacional. Listar so o que precisa.

## Evidencia de Conclusao

(Criacao)
- `skills/NN-nome/SKILL.md` criado
- registrada nos 5 lugares (plugin.json, README.md, README.pt-BR.md, AGENTS.md se houver slash command, CHANGELOG.md)
- score eval >= 22
- review aprovado

(Edicao)
- diff cirurgico aplicado
- referencias cruzadas atualizadas
- score eval mantido ou melhorado

(Eval)
- relatorio com score + breakdown + acoes priorizadas

## Handoff

- **Reviewer (skill 11):** valida qualidade final antes de merge
- **Documenter (skill 10):** atualiza docs externos se skill afeta interface publica
- **Orchestrator (skill 09):** registra nova capacidade no roteamento
- **Context Manager (skill 08):** atualiza working set se skill modifica fluxos comuns

## Integracao com Pipeline

- esta skill e **meta** — opera sobre as outras
- chamada por contribuidores quando adicionam capacidade
- chamada em release prep para auditar consistencia
- complementa Repo Auditor (skill 18) que opera sobre projetos consumidores
