# Vertical Plugins — Padrao de Empacotamento Modular

**Data:** 2026-05-23
**Status:** Fundacao para decisao futura — nao executar refactor agora
**Autoria:** Dev Team Kit

## TL;DR

- Os repos `anthropics/financial-services` e `anthropics/claude-for-legal` empacotam capacidades como plugins verticais self-contained ao inves de um bundle monolitico.
- Cada plugin agrupa skills + commands + connectors por dominio (vertical) ou por agente nomeado (named agent), permitindo install seletivo.
- Nosso kit hoje e all-or-nothing: 50 skills + 16 subagents + 43 commands instalados juntos em `.bot/`.
- Este doc descreve o pattern e propoe um caminho de adocao incremental — sem comprometer com refactor imediato.

## Problema

O Dev Team Kit funciona, mas o modelo de empacotamento tem limites visiveis:

1. **Install all-or-nothing** — quem precisa so de Backend leva tambem Marketing Copy, Motion Design, Video Integration. Custo: tokens desperdicados em descoberta de skill, ruido no autocompletar de commands.

2. **Discover dificil** — 42 skills + 31 commands soltos forcam o usuario a memorizar nomes ou rodar `/list-skills`. Nao existe boundary visual entre o que faz parte de "Backend stack" vs "Release stack" vs "Discovery stack".

3. **Sem boundaries claras entre verticais** — uma skill pode chamar qualquer outra. Isso e flexivel mas dificulta saber o que e responsabilidade de quem. Quando algo quebra, o blast radius e o kit inteiro.

4. **Partner contributions exigem PR ao core** — terceiros que quisessem contribuir uma vertical especifica (ex: GIS, FinOps, gaming) precisariam abrir PR alterando `skills/`, `commands/`, `subagents/` na raiz.

5. **Sem path claro de deploy via Anthropic Managed Agents** — a API `/v1/agents` espera artefatos com formato definido. Nosso layout atual nao mapeia direto.

## Pattern Observado

Estrutura adotada por `anthropics/financial-services` (Apache-2.0) e `anthropics/claude-for-legal` (Apache-2.0):

```
financial-services/
  plugins/
    agent-plugins/                    # Named agents self-contained
      pitch-agent/
        agent.yaml                    # Metadata + entry point
        system-prompt.md              # Instrucoes do agente
        skills/                       # Skills bundleadas (copias ou refs)
          deck-builder/
          market-research/
        commands/
          /pitch                      # Comando principal do agente
        connectors/
          salesforce.yaml
          gmail.yaml
      nda-triager/
        agent.yaml
        system-prompt.md
        skills/
          contract-parser/
          risk-classifier/
        commands/
          /triage-nda
    vertical-plugins/                 # Skills + commands + connectors por dominio
      research/
        skills/
        commands/
        connectors/
      compliance/
        skills/
        commands/
        connectors/
    partner-built/                    # Plugins contribuidos por terceiros
      acme-trading-desk/
        agent.yaml
        skills/
        commands/
  managed-agent-cookbooks/            # Receitas para deploy via API
    pitch-agent.cookbook.json
    nda-triager.cookbook.json
```

A diferenca de filosofia: o **agent** (ou a **vertical**) e a unidade de empacotamento, nao a skill individual.

## Tres Tipos de Plugin

### 1. Named Agent Plugin

Um agente nomeado, self-contained, com identidade propria e um (ou poucos) comando principal.

**Caracteristicas:**
- `agent.yaml` declara nome, descricao, modelo, system prompt path
- Bundle de skills que o agente usa internamente (copias ou referencias versionadas)
- Connectors pre-configurados para servicos externos
- Geralmente 1 comando principal (ex: `/pitch`, `/triage-nda`) que aciona o agent
- Pode ser deployado standalone via Managed Agents API

**Exemplo do financial-services:** `Pitch Agent` — recebe nome de empresa, gera deck de investimento usando skills `market-research`, `deck-builder`, `competitor-analysis` bundleadas internamente.

### 2. Vertical Plugin

Skills + commands + connectors agrupados por dominio. Nao tem identidade de "agente" — e um toolkit para um vertical.

**Caracteristicas:**
- Sem `agent.yaml` — nao e um agente, e uma colecao
- Skills que compartilham dominio (ex: todas as skills de "Compliance")
- Commands tematicos (ex: `/check-aml`, `/file-sar`)
- Connectors comuns ao vertical
- Reutilizavel por multiplos agent plugins

**Exemplo do financial-services:** `Compliance` vertical — skills de KYC, AML, sanction screening, regulatory reporting. Usado por `Onboarding Agent` e `Risk Analyst Agent`.

### 3. Partner Plugin

Plugins contribuidos por terceiros, isolados do core. Mesma forma que Agent ou Vertical, mas em `partner-built/`.

**Caracteristicas:**
- Vive em pasta separada — sem PR ao core
- Versionamento independente
- Pode depender de plugins do core via `agent.yaml` ou manifest
- Lifecycle de aprovacao mais leve (review de seguranca/qualidade vs review de design)

## Mapeamento Pro Nosso Kit

Hoje temos algumas composicoes naturais que se encaixariam bem em agent plugins:

| Composicao atual | Vira agent plugin | Skills bundleadas |
|------------------|-------------------|-------------------|
| `/pipeline-discovery` | `pipeline-discovery-agent` | 01 (PO) + 09 (Orchestrator) + 33 (Detective Spec) + 37 (TDD) |
| `/pipeline` | `pipeline-classico-agent` | 01 + 09 + 03 + 04 + 05 + 06 + 11 + 24 + 07 |
| `/swarm` | `swarm-agent` | 09 + 40 (Parallel Dispatcher) + worktree + 11 + 06 + 34 |
| `/loop` | `loop-agent` | 09 + 40 + multi-agente |
| `/best` | `best-practices-agent` | 11 + 06 + 05 |

E verticais naturais:

| Vertical | Skills agrupadas |
|----------|------------------|
| `frontend` | 02 (UI/UX) + 04 (Frontend) + 12 (Motion) + 22 (A11y) + 29 (Design Intel) |
| `backend` | 03 (Backend) + 20 (Observability) + 34 (Static Analysis) |
| `qa-security` | 05 (QA) + 06 (Security) + 11 (Reviewer) + 34 (Static Analysis) |
| `release-ops` | 07 (Deploy) + 24 (Release Manager) + 20 (Observability) + 18 (Repo Auditor) |
| `ai-integration` | 17 (Image Gen) + 25 (AI Architect) + 26 (Prompt Eng) + 27 (Video Integration) + 36 (Web Assets) |
| `discovery-spec` | 01 (PO) + 33 (Detective Spec) + grill-me + to-prd + to-issues |

## Vantagens

1. **Install seletivo** — um dev de Backend instala so `frontend` ou so `backend + qa-security + release-ops`. Reduz tokens de descoberta, reduz commands no autocompletar.

2. **Boundaries claras** — cada vertical/agent declara dependencias explicitas. Quebra em um vertical nao contamina os outros.

3. **Partner contributions sem PR ao core** — uma agencia parceira pode publicar `acme-figma-bridge` em `partner-built/` sem tocar no core.

4. **Compat com Anthropic Managed Agents API** — cada agent plugin pode virar cookbook em `managed-agent-cookbooks/` e ser deployado via `/v1/agents`. Mesma fonte, dois targets (local Claude Code vs cloud managed).

5. **Versionamento independente** — `pipeline-discovery-agent@2.0` pode coexistir com `swarm-agent@1.3` sem lockstep no kit inteiro.

6. **Discover melhor** — `claude plugins list` mostra "Backend Stack", "Discovery Stack", "Release Stack" em vez de 42 skills soltas.

## Custos / Por Que Nao Fazer Agora

1. **Refactor grande** — 42 skills, 14 subagents, 31 commands espalhados. Migrar tudo de uma vez e risco alto de regressao em quem ja usa o kit em producao.

2. **Duplicacao de skills compartilhadas** — skill 09 (Orchestrator) seria usada por quase todo agent plugin. Manter copias em cada bundle gera divergencia; manter referencias gera acoplamento.

3. **Risco de divergencia de versao entre plugins** — se `pipeline-discovery-agent` bundlea skill 09 v1.5 e `swarm-agent` bundlea v2.0, conflitos de comportamento entre commands ficam dificeis de debugar.

4. **Loss da composicao livre atual** — hoje qualquer skill chama qualquer outra. Plugins introduzem boundaries que precisam ser respeitadas; isso e bom pra producao mas reduz flexibilidade de prototipagem.

5. **Maior superficie de manutencao** — cada plugin precisa de seu README, sua matriz de skills, seus testes. O kit como bundle unico tem menos cerimonia.

6. **Quebra de invocacao implicita** — varios commands hoje assumem que todas as skills estao disponiveis. Forcar declaracao de dependencias quebra invocacoes do tipo "se precisar de X, chama X".

## Caminho de Adocao Incremental

### Fase 1 — Documentar pattern (este doc)
Capturar a referencia e o vocabulario. Sem mudanca de codigo. Permite que outras decisoes futuras citem este pattern por nome.

### Fase 2 — Piloto com 1 agent plugin
Escolher candidato com escopo pequeno e composicao ja clara. Sugestao: `pipeline-discovery-agent`.
- Criar pasta `plugins/agent-plugins/pipeline-discovery-agent/`
- Copiar (nao mover) skills 01, 09, 33, 37 pra dentro
- Criar `agent.yaml`, `system-prompt.md`, `commands/discovery.md`
- Manter `/pipeline-discovery` atual funcionando em paralelo
- Validar com 2-3 projetos reais antes de prosseguir

### Fase 3 — Migracao de 3-5 verticais
Quando o piloto provar valor, migrar verticais com fronteiras claras:
- `frontend` (02, 04, 12, 22, 29)
- `backend` (03, 20, 34)
- `qa-security` (05, 06, 11, 34)
- `release-ops` (07, 24, 20, 18)
- `ai-integration` (17, 25, 26, 27, 36)

Skills compartilhadas (09 Orchestrator, 18 Repo Auditor) ficam em vertical `core/` referenciado pelas demais.

### Fase 4 — Opt-in pro install seletivo
Manter bundle completo como default (`devkit-install-fv` continua instalando tudo). Adicionar variantes:
- `devkit-install-fv --plugins=frontend,backend,qa-security`
- `devkit-install-fv --agent=pipeline-discovery-agent`

Quem nao opta por nada continua com bundle completo — zero quebra para usuarios atuais.

### Fase 5 (eventual) — Managed Agents cookbooks
Quando 3+ agent plugins estiverem estaveis, gerar cookbooks em `managed-agent-cookbooks/` pra deploy via `/v1/agents`. Permite oferecer agentes do kit como SaaS sem o usuario instalar Claude Code localmente.

## Decisao Atual

Documentar o pattern. Nao executar refactor agora. O bundle completo continua sendo o produto principal do kit.

Razoes:
- Kit em uso ativo, refactor grande tem custo de regressao alto
- Falta evidencia de demanda real por install seletivo (perguntar nos proximos 30 dias)
- O esforco de Fase 2-4 e estimado em 2-3 semanas dedicadas — precisa janela de baixa atividade

Este doc fica como referencia. Se em algum momento aparecer demanda concreta (partner querendo contribuir, usuario reclamando de overhead de install, oportunidade de deploy via Managed Agents), reabrir essa discussao com este doc como ponto de partida.

## Fontes

- `anthropics/financial-services` — https://github.com/anthropics/financial-services (Apache-2.0)
- `anthropics/claude-for-legal` — https://github.com/anthropics/claude-for-legal (Apache-2.0)
- Anthropic Managed Agents API — `/v1/agents`
- Padrao de plugin do Claude Code — `.claude-plugin/` em repos consumidores
