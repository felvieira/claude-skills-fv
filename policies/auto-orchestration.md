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

### Nível 1 — Sugestão passiva
- Hook `intent-classifier` analisa prompt
- Detecta padrões → emite `additionalContext` sugerindo program
- Claude **não executa automaticamente** — apresenta a sugestão ao usuário
- Usuário decide: aceita / ignora / modifica

Ativação:
```jsonc
// ~/.claude/settings.json
{
  "intent_classifier": {
    "enabled": true,
    "auto_dry_run": false,
    "autonomous": false,
    "suppress": []
  }
}
```

### Nível 2 — Sugestão ativa (DEFAULT do kit desde v1.9.0)
- Hook sugere E Claude **auto-roda em modo `--dry-run`** sem perguntar
- Apresenta o plano resolvido (variables substituídas, gates listados)
- Usuário aprova plano antes da execução real
- **Gates humanos dentro do program ainda pausam** — segurança preservada

Ativação (default):
```jsonc
// ~/.claude/settings.json — não precisa configurar, é o padrão
{
  "intent_classifier": {
    "enabled": true,
    "auto_dry_run": true,
    "autonomous": false,
    "suppress": []
  }
}
```

Por que default Active? Reduz fricção comum (usuário não precisa dizer "ok, mostre o plano" — Claude já mostra) sem sacrificar segurança (gates humanos ainda funcionam).

### Nível 3 — Autônomo
- Hook sugere E Claude **auto-roda completo com `--auto-yes`**
- Gates auto-aprovam — **zero confirmação humana**
- **Só para CI/cron, nunca interativo**
- Risco alto: programs destrutivos podem rodar sem revisão

Ativação:
```jsonc
// ~/.claude/settings.json
{
  "intent_classifier": {
    "enabled": true,
    "autonomous": true,
    "suppress": ["adversarial-dev"]
  }
}
```

⚠ **Recomendação:** sempre adicionar `suppress: ["adversarial-dev", "loop-polishing"]` ou outros programs com `bash:` destrutivo. Autonomous + destructive bash é receita de loss.

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

## Como mudar de nível (passo-a-passo)

### Os 2 lugares onde o hook lê config

| Path | Escopo | Quando usar |
|---|---|---|
| `hooks/config.json` (no repo) ou `.bot/hooks/config.json` (em projeto consumidor) | **Repo / projeto** — afeta todos os usuários que clonarem | Default do projeto |
| `~/.claude/dev-team-kit-config.json` | **User-wide** — só sua máquina, todos os projetos | Sua preferência pessoal sobrescrevendo o default do repo |

**Merge order:** `defaults do hook` → `hooks/config.json` → `~/.claude/dev-team-kit-config.json` → env vars (env wins).

### Caminho 1 — User-wide (sua máquina, todos os projetos) ⭐ RECOMENDADO

1. Criar/editar `~/.claude/dev-team-kit-config.json` (Windows: `C:\Users\<user>\.claude\dev-team-kit-config.json`):
   ```jsonc
   {
     "intent_classifier": {
       "enabled": true,
       "auto_dry_run": true,
       "autonomous": true,
       "suppress": ["adversarial-dev", "comprehensive-review"]
     }
   }
   ```
2. Salvar arquivo
3. **Restartar Claude Code**

**Vantagem:** sua config pessoal não vai no repo, não afeta outros usuários.

### Caminho 2 — Project-level (todos do projeto)

Editar `hooks/config.json` (ou `.bot/hooks/config.json` se kit instalado em `.bot/`):
```jsonc
{
  "intent_classifier": { ... }
}
```

**Atenção:** isso vai no git, afeta todo mundo que clonar o repo.

### Caminho 3 — Slash command `/update-config`

```
/update-config intent_classifier.autonomous = true
/update-config intent_classifier.suppress = ["adversarial-dev"]
```

(Edita o config apropriado — geralmente project se em projeto, user se rodando standalone.)

### Caminho 4 — Via env var (override temporário)

```bash
# bash/zsh
export DEVKIT_INTENT_CLASSIFIER_AUTONOMOUS=true
claude

# powershell
$env:DEVKIT_INTENT_CLASSIFIER_AUTONOMOUS="true"
claude
```

Útil pra sessões one-off (ex: rodar `--autonomous` num CI sem mudar config permanente).

### Setup Nível 3 (Autonomous) — modo CI/cron

```jsonc
// ~/.claude/settings.json
{
  "intent_classifier": {
    "enabled": true,
    "autonomous": true,
    "suppress": [
      "adversarial-dev",      // tem bash que pode mexer em $ARTIFACTS_DIR/app
      "comprehensive-review"  // postaria em PR sem revisão humana
    ]
  }
}
```

**Checklist antes de ativar Autonomous:**
- [ ] Backup do repo / working tree limpa
- [ ] Programs perigosos no `suppress`
- [ ] CI/cron tem timeout (ex: máx 30min)
- [ ] Logs persistentes (`.run-program/*.log.json`) acessíveis pra debug pós-mortem
- [ ] `git push --force` proibido por hook próprio (ver `policies/tool-safety.md`)
- [ ] Notification webhook em caso de falha

### Setup Nível 0 (Manual) — desabilitar completamente

```jsonc
{
  "intent_classifier": {
    "enabled": false
  }
}
```

Use quando: prefere controle total, exploração, prototipagem rápida, ou achou as sugestões irritantes.

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
