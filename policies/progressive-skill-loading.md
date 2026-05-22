# Progressive Skill Loading

## Objetivo

Carregar skills **só quando a tarefa atual precisa**, nunca todas de uma vez. Mantém context window enxuto e o kit utilizável mesmo com modelos token-sensitive.

Convenção absorvida de [bytedance/deer-flow](https://github.com/bytedance/deer-flow) 2.0 (MIT), que tornou explícita uma propriedade que o nosso kit já tinha implícita em 4 hooks distintos.

## Princípio

> Skills são markdown. Não carregar SKILL.md no contexto antes de existir trigger explícito (palavra-chave, intent classification, pedido direto).

Custo: cada skill numerada tem **300-1500 tokens**. 39 skills × média 800 = ~31k tokens. Pré-carregar é meio token budget de Sonnet jogado fora.

## Mecanismo

O kit já implementa loading progressivo via 4 hooks coordenados. Esta policy só **nomeia o padrão** pra documentação externa.

| Hook | Quando dispara | O que carrega | Onde mora |
|---|---|---|---|
| `keyword-detector` | UserPromptSubmit | Skill numerada cujos triggers batem com o prompt | `hooks/scripts/keyword-detector.mjs` |
| `pre-execution-gate` | UserPromptSubmit (score>0.7) | Pergunta antes de carregar | `hooks/scripts/pre-execution-gate.mjs` |
| `session-start` | SessionStart | Apenas `skill-discovery.md` (decision tree), não as skills em si | `hooks/scripts/session-start.mjs` |
| `pre-tool-enforcer` | PreToolUse:Edit/Write | Relê arquivo antes de editar (não é skill, é stale-state) | `hooks/scripts/pre-tool-enforcer.mjs` |

## Fluxo típico

```
User: "criar feature de login social"
   ↓
[keyword-detector] match: "feature" → skill 01-po-feature-spec
   ↓
emite hookSpecificOutput: [SkillDetected: 01-po-feature-spec]
   ↓
[Claude] invoca Skill({ skill: "dev-team-kit-fv:01-po-feature-spec" })
   ↓
SKILL.md carregado **agora**, não antes
```

## Anti-padrões

| Anti-padrão | Por que evita |
|---|---|
| Pré-carregar todas as skills no SessionStart | Queima 30k tokens antes de qualquer trabalho |
| Listar skill por nome dentro do prompt do user pra "ativar" | Modelo não aciona Skill tool automaticamente — só por hook ou intent |
| Skill que depende de outra skill sem declarar | Loading não-determinístico; ver PR2 `requires` no manifest |
| `Skill({...})` no início de turno "por garantia" | Mata o ganho de tokens; só carregue quando o trabalho exigir |

## Como medir

- `devkit_session_events --tool Skill` → quantas skills foram realmente carregadas
- `devkit_seen_files --filter "SKILL.md"` → distribuição de skills por sessão
- `/savings` → tokens economizados por skills **não** carregadas

## Como estender

Pra adicionar gatilho novo (ex: nova trigger word):

1. Editar `triggers` no frontmatter da skill (`skills/NN-name/SKILL.md`)
2. `keyword-detector.mjs` lê via `mcp-server/src/services/file-reader.ts::extractTriggers`
3. Triggers viram regex no hook — adicionar com cuidado pra não over-trigger

Pra skills externas (publicáveis), ver `policies/skill-manifest.md` (frontmatter v2 com `version`/`author`/`compatibility`/`requires`).

## O que **não** está aqui

- **LangGraph state machines** — não usamos
- **Skill versioning runtime** — coberto em `policies/skill-manifest.md`
- **Cache de SKILL.md entre sessões** — fora do escopo; relê todo turno é cheap

## Referências cruzadas

- `policies/context-engineering.md` — hierarquia de 5 níveis e trust levels
- `policies/cost-optimization.md` — métrica de tokens economizados
- `hooks/scripts/keyword-detector.mjs` — implementação do match por trigger
- `docs/skill-guides/skill-discovery.md` — decision tree task→skill (carregada no SessionStart)
- DeerFlow upstream: README.md → seção "Skills & Tools" descreve o framing original
