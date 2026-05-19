# Auto-Orchestration

**Objetivo:** definir quando o kit auto-sugere/auto-roda programs vs quando espera invocação manual do usuário. Equilibrar autonomia útil com controle humano em pontos críticos.

## Princípio

**Sugerir é cheap; executar é caro.** Auto-sugerir programs (via hook `intent-classifier`) custa zero overhead. Auto-executar custa tokens + risco. Default: **sugerir + perguntar**.

## Níveis de autonomia

### Nível 0 — Manual (default seguro)
- Usuário invoca `/run-program <nome>` explicitamente
- Hook não sugere nada
- Use quando: usuário quer controle total, fluxos exploratórios, prototipagem

Ativação:
```yaml
# hook config
intent_classifier:
  enabled: false
```

### Nível 1 — Sugestão passiva (default do kit)
- Hook `intent-classifier` analisa prompt
- Detecta padrões → emite `additionalContext` sugerindo program
- Claude **não executa automaticamente** — apresenta a sugestão ao usuário
- Usuário decide: aceita / ignora / modifica

Ativação (default):
```yaml
intent_classifier:
  enabled: true
  suppress: []     # programs a não sugerir nunca
```

### Nível 2 — Sugestão ativa
- Hook sugere E Claude **auto-roda em modo `--dry-run`** sem perguntar
- Apresenta o plano resolvido (variables substituídas, gates listados)
- Usuário aprova plano antes da execução real

Ativação:
```yaml
intent_classifier:
  enabled: true
  auto_dry_run: true
```

### Nível 3 — Autônomo
- Hook sugere E Claude **auto-roda completo com `--auto-yes`**
- Gates auto-aprovam
- **Só para CI/cron, nunca interativo**
- Risco alto: programs destrutivos podem rodar sem revisão

Ativação:
```yaml
intent_classifier:
  enabled: true
  autonomous: true   # CUIDADO
```

## Mapeamento intent → program

Implementado em `hooks/scripts/intent-classifier.mjs`:

| Intent patterns | Program | Confidence |
|---|---|---|
| "nova feature", "criar feature", "spec-driven" | `spec-driven-development` | high |
| "ideia vaga", "discovery", "grill-me", "precisa de PRD" | `pipeline-discovery` | medium |
| "comprehensive review", "5-agent", "review PR crítico" | `comprehensive-review` | high |
| "from scratch", "do zero", "greenfield", "construir app" | `adversarial-dev` | medium |
| "legacy", "legado", "reverse engineering", "sem docs" | `detective-spec` | high |
| "auto-loop", "autônomo", "fire and forget" | `loop-polishing` | medium |

## Quando NÃO sugerir

Hook skip automaticamente em:
- Prompts informacionais ("o que é X", "como funciona Y", "explica Z")
- Prompts triviais ("typo", "format", "rename", "lint fix")
- Prompts < 15 caracteres
- Prompts iniciados com `/` (slash command explícito)

## Confidence levels

| Level | Significado | Comportamento default |
|---|---|---|
| `high` | Match forte de padrão específico | Sugerir + recomendar dry-run |
| `medium` | Match de keyword geral, intent inferida | Sugerir + perguntar |
| `low` | (não usado atualmente) | — |

## Override por skill

A skill 09 (orchestrator) pode **forçar** um program específico ignorando a sugestão do hook quando:
- Constituição (`memory/constitution.md`) declara pipeline obrigatório
- Task é classificada como pertencente a uma categoria com pipeline fixo (ex: deploy → sempre `/ship`)

## Override por usuário

Usuário pode:
- Adicionar `--no-suggest` ao próprio prompt → hook skip
- Configurar suppress no `intent_classifier.suppress: [program]` → never suggest
- Desabilitar hook completamente via `intent-classifier.enabled: false`

## Anti-padrões

- **Auto-executar programs destrutivos** sem gate humano — risco de loss
- **Sugerir em chat conversacional** ("como você está?") — ruído inútil
- **Múltiplas sugestões empilhadas** — escolher 1 (highest confidence) ou nenhuma
- **Auto-mode em programs com `bash:` destrutivo** — combina mal com `rm -rf`
- **Hook silenciar erros** — se classifier falha, log warning, não bloqueia

## Integração com outras policies

- `policies/handoffs.md` — pipeline canônico documentado lá; auto-orch sugere programs que implementam essas cadeias
- `policies/execution.md` — auto-orch respeita "perguntar quando ambíguo" (sugere mas não executa)
- `policies/programs-schema.md` — programs disponíveis para sugestão
- `policies/constitution.md` — constituição pode forçar pipeline (override autoriza skill 09)

## Verificação

Listar sugestões emitidas na sessão:
```bash
grep "intent-classifier" .auto/session-events.jsonl
```

Testar classifier sem rodar Claude:
```bash
echo '{"prompt": "criar feature de login social"}' | node hooks/scripts/intent-classifier.mjs
```

Deve emitir JSON com `hookSpecificOutput.additionalContext` contendo "spec-driven-development".
