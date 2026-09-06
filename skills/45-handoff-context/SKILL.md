---
name: handoff-context
description: |
  Produz pacote prospectivo de handoff pra outro agente, modelo ou dev humano pegar a task de
  onde parou — sem contexto da sessao atual. Diferente de session-summary (skill 31) que e
  retrospectivo: handoff-context monta o briefing acionavel pra quem chega cego.
  Trigger em: "handoff", "passar bastao", "passar o bastao", "delega pra outro", "delega isso",
  "transfer context", "passar contexto", "outro dev vai pegar", "outro agente vai continuar",
  "preciso passar isso", "briefing prospectivo", "sessao fresh", "preparar handoff", "monta o pacote".
argument-hint: "[--feature=<nome>] [--target=human|agent|fresh-session]"
allowed-tools: Read, Write, Glob, Grep, Bash
---

# Handoff Context — Briefing Acionavel pra Quem Chega Cego

> **Inspiracao:** [mattpocock/skills/productivity/handoff](https://github.com/mattpocock/skills/tree/main/skills/productivity/handoff) (MIT).
> Adaptado pra distinguir explicitamente de `skill 31 (session-summary)` (retrospectivo).

## Diferenca vs skill 31 (session-summary)

|                     | Skill 31 session-summary | Skill 44 handoff-context (esta) |
|---------------------|--------------------------|---------------------------------|
| Foco temporal       | Retrospectivo (o que foi feito) | Prospectivo (o que falta + como continuar) |
| Audiencia           | Proxima sessao **minha** (mesmo modelo, contexto recuperavel) | Outro agente / dev humano / sessao fresh **cego** |
| Formato             | Log markdown com decisoes e wikilinks | Pacote acionavel: setup commands + estado + 1 proximo passo |
| Trigger natural     | Fim de sessao (auto-save) | "passar bastao", "delega", "outro vai continuar" |
| Output dir          | `D:\claude-memory\logs\` ou local | `docs/handoffs/YYYY-MM-DD-<feature>.md` |
| Reuso esperado      | "lembrar depois" | "executar agora sem perguntar" |

Resumo: **session-summary registra, handoff-context delega.**

## Quando Usar

- voce vai parar (fim do dia, fim de sprint) e outro vai pegar amanha
- voce esta esgotando o contexto e vai abrir sessao fresca (compactacao iminente)
- task vai ser delegada pra agente externo (codex:rescue, freelancer, outro time)
- voce identificou que outra skill/agent deve continuar (handoff entre skills do pipeline)

## Quando NAO Usar

- sessao curta sem interrupcao prevista — use skill 31 ao final
- task ja terminada — use skill 31 (resumo retrospectivo)
- duvida pontual — responda direto

## Governanca Global

Segue `GLOBAL.md`, `policies/handoffs.md` (canonica), `policies/persistence.md`,
`policies/token-efficiency.md`, `policies/verification-before-completion.md`
(handoff so quando estado e verificavel).

## Protocolo

### 1. Snapshot do estado real

```bash
git status --short
git branch --show-current
git log --oneline -5
```

Capturar:
- branch atual e divergencia vs main
- arquivos modificados nao commitados
- ultimos 5 commits (contexto recente)

### 2. Pendencias verificadas

Listar:
- **testes:** quais passam, quais falham, quais nao foram escritos
- **build:** verde, vermelho, ou nao tentado
- **TODOs novos** introduzidos nesta sessao (grep recente)

### 3. Proximo passo unico

Nao gerar roadmap. **Um proximo passo concreto** com:
- comando exato pra executar (ou arquivo:linha pra editar)
- resultado esperado
- criterio de sucesso

Se houver mais de um proximo passo possivel, escolher o **mais bloqueador** ou pedir AskUserQuestion.

### 4. Armadilhas conhecidas

Coisas que voce descobriu nesta sessao que **economizam tempo** pra quem chega:
- comandos que nao funcionam (e por que)
- arquivos que parecem relevantes mas nao sao
- decisoes ja tomadas (nao re-debater)
- dependencias com configuracao especial

### 5. Output canonico

Salvar em `docs/handoffs/YYYY-MM-DD-<slug>.md`:

```markdown
---
date: YYYY-MM-DD
feature: <nome>
target: human | agent | fresh-session
status: blocked | in-progress | ready-for-review
inspired-by: skill 44 handoff-context
---

# Handoff: <feature>

## Setup (execute primeiro)

\`\`\`bash
git checkout <branch>
git pull
<comandos de setup>
\`\`\`

## Estado atual

- **Branch:** <branch> (X commits ahead/behind main)
- **Build:** verde | vermelho | nao tentado
- **Testes:** <pass>/<total> passam
- **Modificado:** <arquivos nao commitados>

## O que foi feito

- <decisoes ja tomadas — link pra session log>
- <implementado e funcional>
- <implementado mas nao testado>

## Proximo passo (UM)

<comando ou edicao especifica>

**Resultado esperado:** <output ou comportamento>
**Sucesso:** <criterio verificavel>

## Armadilhas (do que descobri)

- ⚠️ <coisa nao obvia 1>
- ⚠️ <coisa nao obvia 2>

## NAO faca

- ❌ <abordagem ja tentada e rejeitada>
- ❌ <suposicao errada que parece certa>

## Referencias

- session log: [[D:/claude-memory/logs/YYYY-MM-DD-...]]
- spec: <link>
- PRs relacionados: <links>
```

## Handoffs (de saida desta skill)

- **pra outro agente Claude:** prompt = conteudo do `.md` salvo + "Continue daqui"
- **pra dev humano:** `.md` como issue/PR description
- **pra fresh session:** abrir nova sessao com primeiro prompt = ler `docs/handoffs/<arquivo>.md`

## Handoff cross-vendor (trajetória portável vs credenciais)

> Fonte: [bojieli/ai-agent-book](https://github.com/bojieli/ai-agent-book), book-en/chapter6.md — conceito absorvido, texto reescrito. Distinto do Output Canônico acima: aquele é um handoff humano-legível entre sessões de trabalho; isto é sobre serializar a trajetória de execução de um agente pra retomada programática por outro provider/harness (failover no meio de uma sessão, replay pra avaliação, extração de dados de treino).

Quando o handoff precisa ser consumido por **outro agente/provider**, não por um humano lendo o próximo passo, separar a trajetória em duas partes distintas:

- **Texto portável** — o raciocínio em prosa e as tool-calls reduzidas a `{name, args}` (nunca a resposta bruta da API do provider original, que pode ter formato proprietário). Isso é o que atravessa a troca de vendor.
- **Credenciais não-portáveis** — tokens de sessão, IDs de conversa do provider original, qualquer estado que só faz sentido dentro daquele vendor específico. **Descartadas** na troca, nunca reenviadas pro novo provider.

```
☐ Um log de trajetória pensado pra handover cross-vendor separa claramente as duas partes
  acima — não serializa a resposta bruta do provider como se fosse portável
☐ Falha de um provider no meio de um /loop ou /swarm não perde a trajetória — o texto
  portável permite retomar noutro provider a partir do mesmo ponto
```

Nível de aplicação: mais baixo que os providers/adapters de `patterns/ai-integration/providers.md` (que resolvem "qual provider chamar"), mais alto que uma chamada de API isolada — isto é sobre o formato do **log de execução completo**, não da requisição individual.

## Anti-padroes

- ❌ Roadmap de 10 passos — esta skill produz **1 proximo passo**
- ❌ Dump de tudo que foi feito — isso e skill 31, nao 44
- ❌ "Continue de onde parei" sem dizer onde parou
- ❌ Esconder armadilhas pra outro descobrir — registra
- ❌ Handoff sem comando de setup executavel
- ❌ Handoff cross-vendor que reenvia token/ID de sessão do provider original pro novo — vaza credencial não-portável
