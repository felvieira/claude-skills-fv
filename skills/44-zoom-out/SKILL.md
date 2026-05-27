---
name: zoom-out
description: |
  Produz mapa de modulos e callers quando o agente esta perdido numa area de codigo desconhecida.
  Sobe uma camada de abstracao e da visao de bairro antes de tocar codigo. Use quando estiver
  unfamiliar com uma area, ao iniciar trabalho em modulo novo, ou quando o usuario pedir
  "visao geral", "mapa", "estou perdido", "como isso encaixa".
  Trigger em: "zoom out", "mapa de modulos", "mapa dos modulos", "estou perdido", "perdido nesse codigo",
  "como isso encaixa", "como se conecta", "callers principais", "visao geral", "big picture",
  "neighborhood", "broader context", "higher level perspective".
argument-hint: "[caminho-alvo] [--depth=2]"
allowed-tools: Read, Grep, Glob, Bash
---

# Zoom Out — Mapa de Bairro Antes do Codigo

> **Inspiracao:** [mattpocock/skills/engineering/zoom-out](https://github.com/mattpocock/skills/tree/main/skills/engineering/zoom-out) (MIT).
> Adaptado: forca uso de `graphify-out/graph.json` antes de Grep/Read brutos (CLAUDE.md global).

## Quando Usar

- ao receber task em modulo que o agente nao conhece bem
- quando o usuario disse "estou perdido nessa parte"
- antes de propor refactor ou architecture change (input pra skill 38)
- antes de explorar com `Grep` ou `Read` direto (mais economico)
- como preludio de `detective-spec` em codigos legados

## Quando NAO Usar

- voce ja conhece o modulo (zoom out vira ruido)
- task pontual em arquivo unico ja identificado
- bug fix com stack trace claro

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/code-exploration.md` (graph > grep > read),
`policies/token-efficiency.md` (mapa enxuto, nao dump), `policies/handoffs.md`
(o mapa pode ser consumido por outras skills).

## Protocolo

### 1. Tentar graph primeiro

Antes de qualquer Read/Grep, tentar:

```bash
test -f graphify-out/graph.json && echo "graph disponivel" || echo "sem graph"
```

Se graph existir, ler `graphify-out/graph.json` + `graphify-out/GRAPH_REPORT.md` (god nodes, communities). Isso responde 80% das perguntas de mapa.

### 2. Fallback: descoberta estrutural

Sem graph, descobrir estrutura via Glob:

```bash
# Topologia
find <alvo> -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.py" -o -name "*.go" -o -name "*.rs" \) | head -50
```

Identificar:
- **entry points** (index.*, main.*, app.*, cli.*)
- **agrupamentos por pasta** (modulos logicos)
- **arquivos grandes** (provaveis hubs)

### 3. Mapear callers/callees principais

Para cada hub identificado, Grep por importacoes:

```bash
# Quem usa o modulo X?
rg "from ['\"].*<modulo-X>" --type ts --type tsx -l
```

### 4. Glossario do projeto

Antes de produzir output, capturar **vocabulario do dominio** lendo (em ordem de preferencia):

1. `memory/constitution.md` (se existir — termos canonicos)
2. `docs/repo-audit/current.md` (audit)
3. `README.md` (sintese)
4. Nomes de pastas/arquivos (fallback)

O mapa **fala a lingua do projeto**, nao termos genericos.

## Output

Tabela markdown ou hierarquia textual:

```markdown
# Mapa de <area>

## Vocabulario do dominio
- <termo>: <definicao curta>

## Arquitetura geral
<diagrama ASCII opcional — so se reduz complexidade>

## Modulos principais

| Modulo | Proposito | Callers principais | Callees principais |
|--------|-----------|-------------------|-------------------|
| ...    | ...       | ...               | ...               |

## God nodes (>X dependentes)
- <arquivo>: <numero> dependentes — provavel ponto de friccao

## Pendencias visiveis
- <TODO/FIXME publicos>
- <gaps documentacao>
```

## Handoffs

- **input pra skill 38 (architecture-deepener):** mapa identifica god nodes; skill 38 propoe deepening
- **input pra skill 33 (detective-spec):** mapa orienta quais modulos detective deve cavar primeiro
- **input pra skill 09 (orchestrator):** mapa informa onde a feature toca, qual pipeline montar
- **input pra skill 32 (smart-suggestions):** dado o mapa, sugerir proxima acao concreta

## Anti-padroes

- ❌ Dump completo de `find . -name "*.ts"` — isso e fuga, nao mapa
- ❌ Ler 50 arquivos pra entender 1 modulo — usa graph primeiro
- ❌ Mapa generico sem vocabulario do projeto
- ❌ "vou ler tudo e depois mapeio" — produz o mapa **enquanto** explora, nao depois
