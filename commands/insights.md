---
description: Analisa telemetria de uso dos hooks e sessions para recomendar próximas configurações — gate calibrado? perguntas mais bloqueadas? tools repetidos? Similar ao /Insights nativo do Claude Code mas lê os dados do kit.
---

# /insights — Recomendações Baseadas em Uso Real

**Em uma frase:** lê os JSONLs de telemetria dos hooks desta sessão (e sessões recentes) e recomenda o que configurar, calibrar ou desabilitar.

**Inspiração:** `/Insights` mencionado em "Claude Code Was Confusing Me Until I Found This One Plugin Nobody Talks About" (Nitin Gavhane, May 2026) — analisa últimas 30 dias de uso e recomenda automações. Nossa versão lê os dados que o kit já coleta.

## Quando usar

- Após 1-2 semanas de uso do kit — dados suficientes pra padrões emergirem
- Quando hooks parecem disparar demais ou de menos
- Antes de migrar de `standard` → `strict` ou `minimal` (ver impacto real)
- "Quero saber o que o kit está fazendo por mim"
- Onboarding num projeto novo — ver o que o kit detectou de incomum

## Fontes de dados lidas

| Arquivo | Hook origem | O que contém |
|---|---|---|
| `.bot/pre-execution-gate.jsonl` | UserPromptSubmit | decision, score, ambiguidade por prompt |
| `.bot/investigate-first-guard.jsonl` | PreToolUse | perguntas auto-descobríveis bloqueadas (labels) |
| `.bot/tool-usage.json` | PreToolUse | tools mais usados, reads repetidos, bytes lidos |
| `.bot/conflict-resolution.jsonl` | PostToolUse | conflitos de policy resolvidos |
| `.bot/session-events.jsonl` | PostToolUse | eventos de sessão (tool calls, stops, errors) |
| `.bot/hook-session.json` | vários | estado da sessão atual |
| `D:\claude-memory\logs\*.md` | Stop hook | logs das últimas sessões (se vault configurado) |

## Protocolo de execução

### Fase 1 — Coletar dados disponíveis

```bash
# Verificar quais arquivos de telemetria existem
ls -la .bot/*.jsonl .bot/*.json 2>/dev/null
```

Ler cada arquivo existente e agregar:
- Total de eventos por tipo
- Distribuição de decisions (pass_through / enrich / guided_enrich / concrete_bypass)
- Labels de perguntas bloqueadas pelo investigate-first-guard
- Tools mais chamados e com mais repetições
- Conflitos de policy mais frequentes

### Fase 2 — Calcular métricas-chave

**Gate calibration score:**
```
enrich_rate = (enrich + guided_enrich) / total_prompts
pass_rate   = pass_through / total_prompts
bypass_rate = concrete_bypass / total_prompts

Saudável: enrich_rate 20-40%, pass_rate 50-70%, bypass_rate 10-30%
Alto enrich (>50%): gate muito sensível — baixar enrich_threshold
Baixo enrich (<10%): gate pouco ativo — subir enrich_threshold ou revisar CLAUDE.md
```

**Investigate-first effectiveness:**
```
bloqueios = contagem por label (github-user, branch, package-manager, etc.)
Top 3 labels = perguntas que a IA mais tentou fazer antes do guard existir
Zero bloqueios = guard não está sendo testado (normal em projetos sem interação CLI)
```

**Tool repetition index:**
```
reads_3x = arquivos lidos 3+ vezes (sinalizados pelo pre-tool-enforcer)
Alto (>5 arquivos): contexto mal gerenciado — usar /compact mais cedo
```

### Fase 3 — Gerar recomendações

Para cada métrica fora do range saudável, gerar recomendação acionável com comando exato:

```markdown
## Recomendações

### 🔴 Alta (aplicar agora)
- Gate disparando em 65% dos prompts (threshold muito baixo).
  Fix: editar hooks/config.json → pre_execution_gate.enrich_threshold: 0.55
  Impacto: ~25% menos interrupções sem perder cobertura de casos ambíguos reais.

### 🟡 Média (considerar)
- investigate-first-guard bloqueou "github-user" 8x nesta semana.
  Isso indica que a IA ainda tenta perguntar o user do GitHub mesmo com o guard.
  Diagnóstico: verificar se `gh` está disponível no ambiente (gh auth status).

### 🟢 Informativo
- Tool usage: README.md lido 6x em 3 sessões.
  Considere criar .bot/learned-skills/readme-key-facts.md com as seções que você consulta.

### 💡 Oportunidades de configuração
- Você usa Bash 40x/semana. Adicionar ao allowlist de permissões evita prompts:
  Editar .claude/settings.json → permissions.allow: ["Bash(npm:*)"]
- Nenhuma MCP tool de banco de dados detectada, mas projeto tem Drizzle/Prisma.
  Considerar: Postgres MCP ou Supabase MCP para schema introspection automático.
```

## Output esperado

```
/insights — Dev Team Kit Usage Analysis
═══════════════════════════════════════════════════════

Período: últimas 7 sessões (2026-05-22 a 2026-05-29)
Fonte: .bot/ + D:\claude-memory\logs\

📊 Gate Decisions (pre-execution-gate)
  Total prompts:        127
  pass_through:          73  (57%) ✅ saudável
  concrete_bypass:       21  (17%) ✅ saudável
  enrich:                19  (15%) ✅ saudável
  guided_enrich:         14  (11%) ✅ saudável
  Score médio de ambiguidade: 0.51

🔍 Investigate-First Guard
  Total bloqueios:       12
  Top labels bloqueados:
    github-user        ×5   → gh api user --jq .login
    package-manager    ×4   → detectar lockfile
    current-branch     ×3   → git branch --show-current
  Perguntas legítimas passadas: ~estimativa baseada em sessões

🔧 Tool Usage
  Total tool calls:    384
  Bash:                142  (37%)
  Read:                 89  (23%)
  Edit:                 61  (16%)
  Grep:                 45  (12%)
  Outros:               47  (12%)

  ⚠ Reads repetidos (3x+):
    policies/investigate-first.md  ×4
    GLOBAL.md                      ×3
  Bytes lidos: ~1.2MB total

⚔ Conflitos de Policy
  Total: 8
  bash-multi-policy    ×5  (falso positivo frequente — trigger muito broad)
  write-without-read   ×3  (legítimos — edições sem read prévio)

═══════════════════════════════════════════════════════
RECOMENDAÇÕES (3 encontradas)
───────────────────────────────────────────────────────

🟡 conflict-resolution-reminder dispara muito em bash composto
   É falso positivo (nenhuma policy real em conflito).
   Fix: aumentar throttle para 20min em hooks/config.json:
   "conflict_resolution": { "min_interval_ms": 1200000 }

💡 policies/investigate-first.md lida 4x — candidata a learned skill
   Criar .bot/learned-skills/investigate-first-key-rules.md com as
   regras que você consulta frequentemente (lista de comandos por label).

💡 Bash alto (37% do total)
   Considerar adicionar ao allowlist pra reduzir prompts de permissão:
   .claude/settings.json → permissions.allow: ["Bash(git:*)", "Bash(gh:*)"]
```

## Flags

```
/insights                    # última semana (default)
/insights --days 30          # últimos 30 dias
/insights --session          # só sessão atual
/insights --json             # output machine-readable
/insights --focus gate       # só análise do pre-execution-gate
/insights --focus tools      # só tool usage
/insights --focus hooks      # todos os hooks
```

## Integração com o kit

- **/savings** → mostra o que o kit economizou (tokens, $). `/insights` → o que o kit fez e como calibrar.
- **/drift-scan** → analisa o codebase. `/insights` → analisa o comportamento do agente.
- **Stop hook** → salva session summary. `/insights` → lê esses summaries pra recomendar.
